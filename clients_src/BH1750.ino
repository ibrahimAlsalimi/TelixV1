#include <Wire.h>
#include <BH1750.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>


#define SDA_PIN 8
#define SCL_PIN 9

BH1750 lightMeter;


// --- WiFi Settings ---
const char* ssid = "YOUR_WIFI_SSID";  // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi password

// --- MQTT Settings ---
const char* mqtt_broker = "YOUR_MQTT_BROKER_IP";  // Replace with your MQTT broker IP (e.g., "192.168.1.100" or "localhost")
const int mqtt_port = 1883;


const char* device_id = "bh1750-001";  // Unique device identifier
const char* device_name = "Living Room Light";
const char* recev_comands = "false";
const char* type_of_commands = "null";




// --- MQTT Topics ---
// Note: Using String to easily combine ID, then convert to c_str when using
String topic_data_prefix = "data/" + String(device_id);  // For organizing data
String topic_config = "config";                         // Registration topic (name corrected)
String topic_command = "devices/" + String(device_id) + "/command";
String topic_status = "devices/" + String(device_id) + "/status";

// Array for commands that the device receives
const char* commands[1] = {"NULL"};

// Array for data types sent from the sensor (if sending more than one reading)
const char* data_type[1] = {"light"};



const unsigned long publishInterval = 5000;
unsigned long lastPublish = 0;

WiFiClient espClient;
PubSubClient mqtt_client(espClient);

void callback(char* topic, byte* message, unsigned int length) {
  Serial.print("Message arrived on [");
  Serial.print(topic);
  Serial.print("]: ");

  String messageTemp;
  
  // Assemble characters to form a meaningful message
  for (int i = 0; i < length; i++) {
    messageTemp += (char)message[i];
  }
  Serial.println(messageTemp);

  // Example: Execute received commands
  // Place all commands that are received here
  if (messageTemp == "UPDATE_CONFIG") {
    sendConfig();
  }
}


void setup() {
  Serial.begin(115200);
  setup_wifi();
  
  mqtt_client.setServer(mqtt_broker, mqtt_port);
  mqtt_client.setCallback(callback);
  
  // Increased KeepAlive time to ensure no frequent disconnections
  mqtt_client.setKeepAlive(15);
  delay(1000);
  
  Serial.println("BH1750 Light Sensor Test");
  
  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Initialize sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 initialized successfully!");
  } else {
    Serial.println("Error initializing BH1750!");
    Serial.println("Check wiring!");
    while (1) delay(10);
  }
  
  Serial.println("-----------------------------------");
}

void loop() {
    if (!mqtt_client.connected()) {
    reconnect_mqtt();
  }
  mqtt_client.loop();  // Essential for receiving messages

  // Publish data at specified intervals (Non-blocking)
  unsigned long currentMillis = millis();
  if (currentMillis - lastPublish >= publishInterval) {
    lastPublish = currentMillis;
  float lux = lightMeter.readLightLevel();
  publishData(data_type[0], lux);
  Serial.println(lux);

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

// ----------------------------------------------------------------
// Function to reconnect to broker + LWT + automatic registration
// ----------------------------------------------------------------
void reconnect_mqtt() {
  while (!mqtt_client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    String client_id = "ESP32_" + String(device_id);

    // Connect with "Last Will and Testament" configured
    // If device dies, broker will send "Offline" to the specified topic
    if (mqtt_client.connect(client_id.c_str(), NULL, NULL, topic_status.c_str(), 1, true, "Offline")) {
      
      Serial.println("connected");

      // 1. Announce we are "Online" immediately (Retained)
      mqtt_client.publish(topic_status.c_str(), "Online", true);

      // 2. Subscribe to command topic (once here)
      mqtt_client.subscribe(topic_command.c_str());

      // 3. Send device registration to server (automatic registration)
      sendConfig();

    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

// ----------------------------------------------------------------
// Function to send configuration (Config)
// ----------------------------------------------------------------
void sendConfig() {
  StaticJsonDocument<512> doc;  // Increased size slightly for safety

  doc["device_id"] = device_id;
  doc["device_name"] = device_name;
  doc["ssid"] = ssid;
  doc["ip"] = WiFi.localIP().toString();  // Must convert IP to string
  doc["pub_topic"] = topic_data_prefix;
  doc["sub_topic"] = topic_command;
  doc["recev_comands"] = recev_comands;
  
  // Add data types (data_types) as an array
  JsonArray data_types_array = doc.createNestedArray("data_types");
  for (byte i = 0; i < (sizeof(data_type) / sizeof(data_type[0])); i++) {
    if (strlen(data_type[i]) > 0) {  // Ensure element is not empty
      data_types_array.add(data_type[i]);
    }
  }
  
  // Add commands (commands) as an array
  JsonArray commands_array = doc.createNestedArray("commands");
  // If device doesn't receive commands, leave it empty
  // Or add commands if it does receive them
  if (strcmp(commands[0], "NULL") != 0) {
    for (byte i = 0; i < (sizeof(commands) / sizeof(commands[0])); i++) {
      if (strcmp(commands[i], "NULL") != 0) {
        commands_array.add(commands[i]);
      }
    }
  }
  
  // Command type
  if (strcmp(type_of_commands, "null") == 0 || strlen(type_of_commands) == 0) {
    doc["type_of_commands"] = "none";
  } else {
    doc["type_of_commands"] = type_of_commands;
  }

  char buffer[512];
  serializeJson(doc, buffer);

  Serial.print("Sending Config: ");
  Serial.println(buffer);

  // Send to config topic (corrected name)
  mqtt_client.publish(topic_config.c_str(), buffer);
}

// ----------------------------------------------------------------
// Unified function to publish data
// ----------------------------------------------------------------
void publishData(const char* type, float value) {
  StaticJsonDocument<256> doc;

  doc["device_id"] = device_id;
  doc["data_type"] = type;
  doc["value"] = value;

  char buffer[256];
  serializeJson(doc, buffer);

  // Publish to data topic
  // data/12
  if (mqtt_client.publish(topic_data_prefix.c_str(), buffer)) {
    Serial.print("Published ");
    Serial.print(type);
    Serial.println(": OK");
  } else {
    Serial.println("Publish failed");
  }
}









