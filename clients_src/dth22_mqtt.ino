#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define DHTPIN 4     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT22   // DHT 22 (AM2302)


// Broker connection definitions
const char* ssid = "YOUR_WIFI_SSID";  // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi password

const char* mqtt_broker = "YOUR_MQTT_BROKER_IP";  // Replace with your MQTT broker IP (e.g., "192.168.1.100" or "localhost")
const int mqtt_port = 1883;

const char* device_name = "esp32-DHT22";
const char* device_id = "dht22-001";  // Unique device identifier
const char* recev_comands = "false";

// --- MQTT Topics ---
String topic_data_prefix = "data/" + String(device_id);
String topic_config = "config";
String topic_command = "devices/" + String(device_id) + "/command";
String topic_status = "devices/" + String(device_id) + "/status";

// Data types sent from the sensor
const char* data_types[] = {"temperature", "humidity"};

String x;

const unsigned long publishInterval = 5000;  // Publish every 5 seconds
unsigned long lastPublish = 0;

WiFiClient espClient;
PubSubClient mqtt_client(espClient);



DHT dht(DHTPIN, DHTTYPE);  // DHT22 sensor

void setup() {
  Serial.begin(115200);
  Serial.println("DHT22 Sensor Example");
  delay(1000);

  dht.begin();

  // Connect to WiFi
   setup_wifi();
  
  // Connect to broker

  mqtt_client.setServer(mqtt_broker, mqtt_port);
  mqtt_client.setCallback(callback);
  mqtt_client.setKeepAlive(15);  // KeepAlive to ensure connection
  
  Serial.println("Setup complete!\n");





}

void loop() {
  // Maintain MQTT connection
  if (!mqtt_client.connected()) {
    reconnect_mqtt();
  }
  mqtt_client.loop();

  // Publish data regularly
  unsigned long currentMillis = millis();
  if (currentMillis - lastPublish >= publishInterval) {
    lastPublish = currentMillis;
    publishTempData();
    publishHumidityData();
  }


  /**Publish random data at interval
  unsigned long currentMillis = millis();
  if (currentMillis - lastPublish >= publishInterval) {
   lastPublish = currentMillis;
   publishRandomData();
 }***/
}










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
    deviceCon();
  }
}

void setup_wifi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm\n");
}

  



void reconnect_mqtt() {
  while (!mqtt_client.connected()) {
    Serial.print("Attempting MQTT connection... ");
    
    String client_id = "ESP32_" + String(device_id);
    
    // Connect with Last Will and Testament configured
    if (mqtt_client.connect(client_id.c_str(), NULL, NULL, topic_status.c_str(), 1, true, "Offline")) {
      Serial.println("Connected!");
      
      // Announce we are Online immediately (Retained)
      mqtt_client.publish(topic_status.c_str(), "Online", true);
      
      // Subscribe to command topic
      mqtt_client.subscribe(topic_command.c_str());
      
      // Send device registration (automatic registration)
      deviceCon();
    } else {
      Serial.print("Failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" - Retrying in 5 seconds");
      delay(5000);
    }
  }
}




void publishTempData() {
  // Create JSON document
  StaticJsonDocument<256> doc;
  
  // Add device identifier
  doc["device_id"] = device_id;
  
  // Generate random sensor data
  float temperature = dht.readTemperature();  // 15.0 to 35.0°C

  
  doc["data_type"] = "temperature"; 
  doc["value"] = temperature;

  // Serialize JSON to string
  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  // Publish to MQTT using proper topic format
  Serial.print("Publishing: ");
  Serial.println(jsonBuffer);
  
  if (mqtt_client.publish(topic_data_prefix.c_str(), jsonBuffer)) {
    Serial.println("✓ Published successfully\n");

  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C---");
  } else {
    Serial.println("✗ Publish failed\n");
  }
}


void publishHumidityData(){
  StaticJsonDocument<256> doc;

  doc["device_id"] = device_id;

  float humidity = dht.readHumidity();   

  doc["data_type"] = "humidity"; 
  doc["value"] = humidity;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  // Publish to MQTT using proper topic format
  Serial.print("Publishing: ");
  Serial.println(jsonBuffer);
  
  if (mqtt_client.publish(topic_data_prefix.c_str(), jsonBuffer)) {
    Serial.println("✓ Published successfully\n");

  Serial.print("humidity: ");
  Serial.print(humidity);
  Serial.println(" °%---");
  } else {
    Serial.println("✗ Publish failed\n");
  }


}





void deviceCon(){
  StaticJsonDocument<512> con;

  con["device_id"] = device_id;
  con["device_name"] = device_name;
  con["ssid"] = ssid;
  con["ip"] = WiFi.localIP().toString(); // تحويل IP لنص
  con["pub_topic"] = topic_data_prefix; 
  con["sub_topic"] = topic_command;
  con["recev_comands"] = recev_comands;
  
  // Add data types as an array
  JsonArray data_types_array = con.createNestedArray("data_types");
  for (byte i = 0; i < (sizeof(data_types) / sizeof(data_types[0])); i++) {
    data_types_array.add(data_types[i]);
  }
  
  // Add commands as an array (empty because this is a sensor only)
  JsonArray commands_array = con.createNestedArray("commands");
  // No commands for sensor
  
  // Command type
  con["type_of_commands"] = "none";

  char jsonBuffer[512];
  serializeJson(con, jsonBuffer);

  Serial.print("CONFIG: ");
  Serial.println(jsonBuffer);

  if (mqtt_client.publish(topic_config.c_str(), jsonBuffer)) {
    Serial.println("✓ Config published successfully\n");
  } else {
    Serial.println("✗ Config publish failed\n");
  }
}
  

