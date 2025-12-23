#include "DHT.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

/** --- Sensor Definition (commented out) ---

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);



*/ 


// --- WiFi Settings ---
const char* ssid = "YOUR_WIFI_SSID";  // Replace with your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";  // Replace with your WiFi password

// --- MQTT Settings ---
const char* mqtt_broker = "YOUR_MQTT_BROKER_IP";  // Replace with your MQTT broker IP (e.g., "192.168.1.100" or "localhost")
const int mqtt_port = 1883;

// --- Device Information ---
const char* device_id = "esp32-001";  // Unique device identifier
const char* device_name = "Living Room Lamp";
const char* recev_comands = "true";

// Array for commands that the device receives
const char* commands[] = {"ON", "OFF"};

// --- MQTT Topics ---
// Note: Using String to easily combine ID, then convert to c_str when using
String topic_data_prefix = "data/" + String(device_id);  // For organizing data
String topic_config = "config";                         // Registration topic (name corrected)
String topic_command = "devices/" + String(device_id) + "/command";
String topic_status = "devices/" + String(device_id) + "/status";


// Array for data types sent from the sensor (if sending more than one reading)
const char* data_type[3] = {};

int led = 26;

// --- متغيرات التوقيت (بدل delay) ---
const unsigned long publishInterval = 5000;
unsigned long lastPublish = 0;

WiFiClient espClient;
PubSubClient mqtt_client(espClient);

// ----------------------------------------------------------------
// Callback function (executed when command arrives from Python/backend)
// ----------------------------------------------------------------
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

  // Example: Execute command
  if (messageTemp == "UPDATE_CONFIG") sendConfig();
  if (messageTemp == "ON") digitalWrite(led, HIGH);
  if (messageTemp == "OFF") digitalWrite(led, LOW);
}

// ----------------------------------------------------------------
// Initial setup / Registration topic (name corrected)
//----------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(led, OUTPUT);
  //dht.begin();
  
  setup_wifi();
  
  mqtt_client.setServer(mqtt_broker, mqtt_port);
  mqtt_client.setCallback(callback);
  
  // Increased KeepAlive time to ensure no frequent disconnections
  mqtt_client.setKeepAlive(15); 
}

// ----------------------------------------------------------------
// Main loop
// ----------------------------------------------------------------
void loop() {
  // Always ensure connection
  if (!mqtt_client.connected()) {
    reconnect_mqtt();
  }
  mqtt_client.loop();  // Essential for receiving messages


  //string x = mqtt_client.subscribe(topic_command.c_str());
}

// ----------------------------------------------------------------
// Function to connect to WiFi
// ----------------------------------------------------------------
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
  // If you have a sensor, add data types here
  // Example: data_types_array.add("temperature");
  // Or leave it empty if device is for control only
  
  // Add commands (commands) as an array
  JsonArray commands_array = doc.createNestedArray("commands");
  for (byte i = 0; i < (sizeof(commands) / sizeof(commands[0])); i++) {
    commands_array.add(commands[i]);
  }
  
  // Add command type (type_of_commands) - can be "switch", "int", etc.
  // Automatically determine command type based on available commands
  String type_of_cmd = "switch";  // Default
  if (sizeof(commands) / sizeof(commands[0]) > 0) {
    // Can determine type based on commands
    type_of_cmd = "switch";
  }
  doc["type_of_commands"] = type_of_cmd;

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