import paho.mqtt.client as paho
import sqlite3
import json
from datetime import datetime

# Database and broker configuration
DB_PATH = "data/database.db"  # Ensure the path is correct
BROKER_IP = "localhost"  # Change to YOUR_MQTT_BROKER_IP if broker is on different host

# ---------------------------------------------------------
# Helper function for database connection (ensures safe open/close)
# ---------------------------------------------------------
def get_db_connection():
    try:
        con = sqlite3.connect(DB_PATH)
        return con
    except Exception as e:
        print(f"Error connecting to DB: {e}")
        return None

# ---------------------------------------------------------
# 1. Sensor Data Handler
# ---------------------------------------------------------
def handling_data(client, userdata, msg):
    try:
        # Decode the message
        data_payload = msg.payload.decode('utf-8')
        print(f">> [DATA] Received: {data_payload}")
        
        reg_data = json.loads(data_payload)

        # Connect to database
        con = get_db_connection()
        if con:
            cur = con.cursor()
            # Use the senseor_data table as per schema design
            cur.execute("""
                INSERT INTO senseor_data(device_id, data_type, value)
                VALUES (?, ?, ?)
            """, (reg_data["device_id"], reg_data["data_type"], reg_data["value"]))
            
            con.commit()
            con.close()  # Closing connection is essential
            print("   -> Data saved successfully.")

    except json.JSONDecodeError:
        print("   -> Error: Invalid JSON format.")
    except Exception as e:
        print(f"   -> Error in handling_data: {e}")

# ---------------------------------------------------------
# 2. Device Registration & Update Handler
# ---------------------------------------------------------
def device_registering(client, userdata, msg):
    print(">> [CONFIG] New device request received!")
    try:
        data_payload = msg.payload.decode('utf-8')
        reg_data = json.loads(data_payload)
        
        device_id = reg_data["device_id"]
        
        # Convert data types to JSON string (for compatibility)
        data_types_list = reg_data.get('data_types', [])  # Use get to avoid error if key doesn't exist
        data_types_json = json.dumps(data_types_list)

        commands_list = reg_data.get('commands', [])  # Use get to avoid error if key doesn't exist
        commands_json = json.dumps(commands_list)

        con = get_db_connection()
        if con:
            cur = con.cursor()
            
            # --- Key improvement: INSERT OR REPLACE ---
            # This will insert the device if it's new
            # or update its data (IP, Topic, Sensors) if it already exists
            cur.execute("""
                INSERT OR REPLACE INTO client(device_id, device_name, ssid, ip, pub_topic, sub_topic, status, data_types, commands, recev_comands, type_of_commands, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                device_id, 
                reg_data["device_name"], 
                reg_data["ssid"],
                reg_data["ip"],
                reg_data["pub_topic"],
                reg_data["sub_topic"],
                "Online",  # When sending config, device is definitely online
                data_types_json,
                commands_json,
                reg_data["recev_comands"],
                reg_data["type_of_commands"]

            ))
            
            con.commit()
            con.close()
            print(f"   -> Device {device_id} registered/updated successfully.")
            
            # Send response to device (optional)
            send_command(client, device_id, "Registered_OK")

    except Exception as e:
        print(f"   -> Error in device_registering: {e}")

# ---------------------------------------------------------
# 3. Connection Status Handler (LWT - Last Will and Testament)
# ---------------------------------------------------------
def handling_status(client, userdata, msg):
    try:
        # Topic comes in format: devices/{id}/status
        topic_parts = msg.topic.split('/')
        if len(topic_parts) >= 3:
            device_id = topic_parts[1]
            status_val = msg.payload.decode('utf-8')  # Will be "Online" or "Offline"
            
            print(f">> [STATUS] Device {device_id} is now {status_val}")
            
            con = get_db_connection()
            if con:
                cur = con.cursor()
                cur.execute("""
                    UPDATE client 
                    SET status = ?, last_seen = CURRENT_TIMESTAMP 
                    WHERE device_id = ?
                """, (status_val, device_id))
                con.commit()
                con.close()
                
    except Exception as e:
        print(f"   -> Error in handling_status: {e}")

# ---------------------------------------------------------
# Function to send commands
# ---------------------------------------------------------
def send_command(client_obj, device_id, command):
    topic = f"devices/{device_id}/command"
    client_obj.publish(topic, command)
    print(f">> [CMD] Sent '{command}' to '{topic}'")

# ---------------------------------------------------------
# Callback function when connecting to broker (Resubscribe logic)
# ---------------------------------------------------------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
        # Resubscription is necessary here in case connection was lost and restored
        client.subscribe("devices/+/status")
        client.subscribe("config")  # Name corrected from conig
        client.subscribe("data/+")  # Better to separate sensor data from rooms for topic organization
    else:
        print(f"Failed to connect, return code {rc}")

# ---------------------------------------------------------
# Main execution
# ---------------------------------------------------------

# Note: In newer versions of paho it's preferred to specify the version, but current code works
client = paho.Client()

# Bind general callback functions
client.on_connect = on_connect

# Connect
print("Connecting to broker...")
try:
    client.connect(BROKER_IP, 1883, 60)  # 60 is the KeepAlive period
except Exception as e:
    print(f"Could not connect to broker: {e}")
    exit()

# Assign functions to topics (Routing)
# 1. Registration topic (name corrected to config)
client.message_callback_add("config", device_registering)

# 2. Data topic (set to receive anything starting with data/)
# Ensure Arduino sends to data/rt-1 instead of room/temp/rt-1 to simplify code
client.message_callback_add("data/+", handling_data) 
# You can keep "room/+" if you prefer the old structure

# 3. Status topic (Offline/Online)
client.message_callback_add("devices/+/status", handling_status)

print("Server is running and listening...")
client.loop_forever()




