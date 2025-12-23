#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define SDA_PIN 12
#define SCL_PIN 11

Adafruit_BMP280 bmp;

// --- WiFi Settings ---
const char* ssid = "YOUR_WIFI_SSID";  // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi password

// --- MQTT Settings ---
const char* mqtt_broker = "YOUR_MQTT_BROKER_IP";  // Replace with your MQTT broker IP (e.g., "192.168.1.100" or "localhost")
const int mqtt_port = 1883;

// --- Device Information ---
const char* device_id = "bmp280-001";  // Unique device identifier
const char* device_name = "BMP280 Pressure Sensor";
const char* recev_comands = "false";

// --- MQTT Topics ---
String topic_data_prefix = "data/" + String(device_id);
String topic_config = "config";
String topic_command = "devices/" + String(device_id) + "/command";
String topic_status = "devices/" + String(device_id) + "/status";

// Data types sent from the sensor
const char* data_types[] = {"temperature", "pressure", "altitude"};

// --- متغيرات التوقيت ---
const unsigned long publishInterval = 5000;
unsigned long lastPublish = 0;

WiFiClient espClient;
PubSubClient mqtt_client(espClient);

void callback(char* topic, byte* message, unsigned int length) {
  Serial.print("Message arrived on [");
  Serial.print(topic);
  Serial.print("]: ");

  String messageTemp;
  for (int i = 0; i < length; i++) {
    messageTemp += (char)message[i];
  }
  Serial.println(messageTemp);

  // Handle commands if needed
  if (messageTemp == "UPDATE_CONFIG") {
    sendConfig();
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("BMP280 Sensor Test with MQTT");
  
  // Initialize I2C first
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  
  // Initialize sensor
  if (!bmp.begin(0x76)) {
    Serial.println("Could not find BMP280 sensor!");
    Serial.println("Check wiring!");
    while (1) delay(10);
  }
  
  // Sensor configuration
  bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,
                  Adafruit_BMP280::SAMPLING_X2,
                  Adafruit_BMP280::SAMPLING_X16,
                  Adafruit_BMP280::FILTER_X16,
                  Adafruit_BMP280::STANDBY_MS_500);
  
  Serial.println("BMP280 initialized successfully!");
  Serial.println("-----------------------------------");
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  mqtt_client.setServer(mqtt_broker, mqtt_port);
  mqtt_client.setCallback(callback);
  mqtt_client.setKeepAlive(15);
}

void loop() {
  // Always ensure connection
  if (!mqtt_client.connected()) {
    reconnect_mqtt();
  }
  mqtt_client.loop();

  // Publish data regularly
  unsigned long currentMillis = millis();
  if (currentMillis - lastPublish >= publishInterval) {
    lastPublish = currentMillis;
    
    float temperature = bmp.readTemperature();
    float pressure = bmp.readPressure() / 100.0F;  // Convert to hPa
    float altitude = bmp.readAltitude(1013.25);
    
    publishData("temperature", temperature);
    delay(100);
    publishData("pressure", pressure);
    delay(100);
    publishData("altitude", altitude);
    
    Serial.println("-----------------------------------");
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect_mqtt() {
  while (!mqtt_client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String client_id = "ESP32_" + String(device_id);

    // Connect with Last Will and Testament configured
    if (mqtt_client.connect(client_id.c_str(), NULL, NULL, topic_status.c_str(), 1, true, "Offline")) {
      Serial.println("connected");

      // 1. Announce we are "Online" immediately (Retained)
      mqtt_client.publish(topic_status.c_str(), "Online", true);

      // 2. Subscribe to command topic
      mqtt_client.subscribe(topic_command.c_str());

      // 3. Send device registration (automatic registration)
      sendConfig();
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void sendConfig() {
  StaticJsonDocument<512> doc;

  doc["device_id"] = device_id;
  doc["device_name"] = device_name;
  doc["ssid"] = ssid;
  doc["ip"] = WiFi.localIP().toString();
  doc["pub_topic"] = topic_data_prefix;
  doc["sub_topic"] = topic_command;
  doc["recev_comands"] = recev_comands;
  
  // Add data types (data_types) as an array
  JsonArray data_types_array = doc.createNestedArray("data_types");
  for (byte i = 0; i < (sizeof(data_types) / sizeof(data_types[0])); i++) {
    data_types_array.add(data_types[i]);
  }
  
  // Add commands as empty array (sensor only, no commands)
  JsonArray commands_array = doc.createNestedArray("commands");
  
  // Command type
  doc["type_of_commands"] = "none";

  char buffer[512];
  serializeJson(doc, buffer);

  Serial.print("Sending Config: ");
  Serial.println(buffer);

  // Send to config topic
  mqtt_client.publish(topic_config.c_str(), buffer);
}

void publishData(const char* type, float value) {
  StaticJsonDocument<256> doc;

  doc["device_id"] = device_id;
  doc["data_type"] = type;
  doc["value"] = value;

  char buffer[256];
  serializeJson(doc, buffer);

  // Publish to data topic
  if (mqtt_client.publish(topic_data_prefix.c_str(), buffer)) {
    Serial.print("Published ");
    Serial.print(type);
    Serial.print(": ");
    Serial.print(value);
    Serial.println(" - OK");
  } else {
    Serial.println("Publish failed");
  }
}
