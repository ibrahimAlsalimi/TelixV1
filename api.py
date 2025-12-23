from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import paho.mqtt.publish as publish

app = Flask(__name__)

# Enable CORS properly
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# ============================================
# General Configuration
# ============================================
DB_PATH = 'data/database.db'  # Database path - must match recever.py path
MQTT_BROKER = "localhost"  # Change to your MQTT broker IP if different (e.g., "YOUR_MQTT_BROKER_IP")

def get_db_connection():
    """Open a connection to the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# ============================================
# 1. API Endpoint: Get all devices
# ============================================
@app.route('/api/devices', methods=['GET'])
def get_devices():
    """Retrieve a complete list of all registered devices"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        devices = conn.execute('SELECT * FROM client').fetchall()
        conn.close()
        
        devices_list = []
        for row in devices:
            # Process data types (Sensors)
            data_types_list = []
            if 'data_types' in row.keys() and row['data_types']:
                try:
                    data_types_list = json.loads(row['data_types'])
                except:
                    data_types_list = []
            
            # Process commands
            commands_list = []
            if 'commands' in row.keys() and row['commands']:
                try:
                    commands_list = json.loads(row['commands'])
                except:
                    commands_list = []
            
            # Process command_types from commands or type_of_commands
            command_types_list = []
            if 'type_of_commands' in row.keys() and row['type_of_commands']:
                try:
                    command_types_list = json.loads(row['type_of_commands'])
                except:
                    # Fallback: derive from commands if type_of_commands is empty
                    command_types_list = commands_list
            
            devices_list.append({
                "id": row['device_id'],
                "device_id": row['device_id'],
                "name": row['device_name'],
                "type": row['device_name'] if 'device_name' in row.keys() and row['device_name'] else 'Unknown',  # Default type from device_name
                "ssid": row['ssid'] if 'ssid' in row.keys() and row['ssid'] else None,
                "ip": row['ip'] if 'ip' in row.keys() and row['ip'] else None,
                "status": row['status'] if 'status' in row.keys() and row['status'] else 'Offline',
                "last_seen": row['last_seen'] if 'last_seen' in row.keys() and row['last_seen'] else None,
                "connected_at": row['last_seen'] if 'last_seen' in row.keys() and row['last_seen'] else None,  # Alias for compatibility
                "pub_topic": row['pub_topic'] if 'pub_topic' in row.keys() and row['pub_topic'] else None,
                "sub_topic": row['sub_topic'] if 'sub_topic' in row.keys() and row['sub_topic'] else None,
                "data_types": data_types_list,
                "command_types": command_types_list,  # For frontend compatibility
                "commands": commands_list,
                "recev_comands": row['recev_comands'] if 'recev_comands' in row.keys() and row['recev_comands'] else None,
                "type_of_commands": row['type_of_commands'] if 'type_of_commands' in row.keys() and row['type_of_commands'] else None
            })
            
        return jsonify(devices_list), 200
        
    except Exception as e:
        print(f"Error in get_devices: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 2. API Endpoint: Get device details
# ============================================
@app.route('/api/devices/<device_id>', methods=['GET'])
def get_device_details(device_id):
    """Retrieve complete details for a specific device"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        device = conn.execute(
            'SELECT * FROM client WHERE device_id = ?', 
            (device_id,)
        ).fetchone()
        conn.close()
        
        if device is None:
            return jsonify({"error": "Device not found"}), 404

        # Process data types
        data_types_list = []
        if 'data_types' in device.keys() and device['data_types']:
            try:
                data_types_list = json.loads(device['data_types'])
            except:
                data_types_list = []

        # Process commands
        commands_list = []
        if 'commands' in device.keys() and device['commands']:
            try:
                commands_list = json.loads(device['commands'])
            except:
                commands_list = []

        # Process command_types from commands or type_of_commands
        command_types_list = []
        if 'type_of_commands' in device.keys() and device['type_of_commands']:
            try:
                command_types_list = json.loads(device['type_of_commands'])
            except:
                # Fallback: derive from commands if type_of_commands is empty
                command_types_list = commands_list

        return jsonify({
            "id": device['device_id'],
            "device_id": device['device_id'],
            "name": device['device_name'],
            "type": device['device_name'] if 'device_name' in device.keys() and device['device_name'] else 'Unknown',
            "ssid": device['ssid'] if 'ssid' in device.keys() and device['ssid'] else None,
            "ip": device['ip'] if 'ip' in device.keys() and device['ip'] else None,
            "status": device['status'] if 'status' in device.keys() and device['status'] else 'Offline',
            "last_seen": device['last_seen'] if 'last_seen' in device.keys() and device['last_seen'] else None,
            "connected_at": device['last_seen'] if 'last_seen' in device.keys() and device['last_seen'] else None,
            "pub_topic": device['pub_topic'] if 'pub_topic' in device.keys() and device['pub_topic'] else None,
            "sub_topic": device['sub_topic'] if 'sub_topic' in device.keys() and device['sub_topic'] else None,
            "data_types": data_types_list,
            "command_types": command_types_list,  # For frontend compatibility
            "commands": commands_list,
            "recev_comands": device['recev_comands'] if 'recev_comands' in device.keys() and device['recev_comands'] else None,
            "type_of_commands": device['type_of_commands'] if 'type_of_commands' in device.keys() and device['type_of_commands'] else None
        }), 200
        
    except Exception as e:
        print(f"Error in get_device_details: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 3. API Endpoint: Get commandable devices only
# ============================================
@app.route('/api/devices/commandable', methods=['GET'])
def get_commandable_devices():
    """Retrieve devices that can be controlled"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        # Get devices that have commands
        devices = conn.execute(
            'SELECT * FROM client WHERE commands IS NOT NULL AND commands != "[]" AND commands != ""'
        ).fetchall()
        conn.close()
        
        devices_list = []
        for row in devices:
            commands_list = []
            if 'commands' in row.keys() and row['commands']:
                try:
                    commands_list = json.loads(row['commands'])
                except:
                    commands_list = []
            
            # Process command_types from commands or type_of_commands
            command_types_list = []
            if 'type_of_commands' in row.keys() and row['type_of_commands']:
                try:
                    command_types_list = json.loads(row['type_of_commands'])
                except:
                    # Fallback: derive from commands if type_of_commands is empty
                    command_types_list = commands_list
                    
            # Only add devices that have actual commands
            if commands_list or command_types_list:
                devices_list.append({
                    "id": row['device_id'],
                    "device_id": row['device_id'],
                    "name": row['device_name'] if 'device_name' in row.keys() and row['device_name'] else 'Unknown',
                    "type": row['device_name'] if 'device_name' in row.keys() and row['device_name'] else 'Unknown',
                    "status": row['status'] if 'status' in row.keys() and row['status'] else 'Offline',
                    "command_types": command_types_list,  # For frontend compatibility
                    "commands": commands_list
                })
            
        return jsonify(devices_list), 200
        
    except Exception as e:
        print(f"Error in get_commandable_devices: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 4. API Endpoint: Get commands for a specific device
# ============================================
@app.route('/api/devices/<device_id>/commands', methods=['GET'])
def get_device_commands(device_id):
    """Retrieve the list of available commands for a specific device"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        device = conn.execute(
            'SELECT device_name, commands FROM client WHERE device_id = ?',
            (device_id,)
        ).fetchone()
        conn.close()
        
        if device is None:
            return jsonify({"error": "Device not found"}), 404

        commands_list = []
        if 'commands' in device.keys() and device['commands']:
            try:
                commands_list = json.loads(device['commands'])
            except:
                commands_list = []
        
        return jsonify({
            "device_id": device_id,
            "device_name": device['device_name'],
            "commands": commands_list
        }), 200
        
    except Exception as e:
        print(f"Error in get_device_commands: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 5. API Endpoint: Get data types for a specific device
# ============================================
@app.route('/api/devices/<device_id>/datatypes', methods=['GET'])
def get_device_datatypes(device_id):
    """Retrieve the data types (Sensors) available for a specific device"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        device = conn.execute(
            'SELECT device_name, data_types FROM client WHERE device_id = ?',
            (device_id,)
        ).fetchone()
        conn.close()
        
        if device is None:
            return jsonify({"error": "Device not found"}), 404

        data_types_list = []
        if 'data_types' in device.keys() and device['data_types']:
            try:
                data_types_list = json.loads(device['data_types'])
            except:
                data_types_list = []
        
        return jsonify({
            "device_id": device_id,
            "device_name": device['device_name'],
            "data_types": data_types_list
        }), 200
        
    except Exception as e:
        print(f"Error in get_device_datatypes: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 6. API Endpoint: Get sensor readings (with enhancements)
# ============================================
@app.route('/api/devices/<device_id>/readings', methods=['GET'])
def get_readings(device_id):
    """Retrieve sensor readings with filtering by type and time"""
    try:
        # Receive filter parameters
        time_range = request.args.get('range', '24h')
        sensor_type = request.args.get('type', None)
        limit = request.args.get('limit', 1000)  # Maximum number of results
        
        # Build the query
        query = "SELECT * FROM senseor_data WHERE device_id = ?"
        params = [device_id]
        
        # Filter by sensor type
        if sensor_type:
            query += " AND data_type = ?"
            params.append(sensor_type)
            
        # Filter by time - supports same formats used in the frontend
        if time_range == '1h':
            query += " AND time_stmp >= datetime('now', '-1 hour')"
        elif time_range == '24h':
            query += " AND time_stmp >= datetime('now', '-1 day')"
        elif time_range == '7d':
            query += " AND time_stmp >= datetime('now', '-7 days')"
        elif time_range == 'week':
            query += " AND time_stmp >= datetime('now', '-7 days')"
        elif time_range == '30d':
            query += " AND time_stmp >= datetime('now', '-30 days')"
        elif time_range == 'month':
            query += " AND time_stmp >= datetime('now', '-30 days')"
        
        query += f" ORDER BY time_stmp DESC LIMIT {limit}"

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        readings = conn.execute(query, params).fetchall()
        conn.close()
        
        result = []
        for row in readings:
            result.append({
                "id": row['id'],
                "value": float(row['value']) if row['value'] is not None else 0,  # Ensure numeric value
                "type": row['data_type'],
                "timestamp": row['time_stmp']
            })
        
        # Reverse order to put newest last (for charts)
        result.reverse()
            
        return jsonify(result), 200

    except Exception as e:
        print(f"Error in get_readings: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 7. API Endpoint: Send command to device
# ============================================
@app.route('/api/devices/<device_id>/command', methods=['POST'])
def send_device_command(device_id):
    """Send a control command to a specific device via MQTT"""
    try:
        # Receive data from frontend
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        command = data.get('command')
        
        if not command:
            return jsonify({"error": "Command is required"}), 400

        # Verify device exists
        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database connection failed"}), 500
            
        device = conn.execute(
            'SELECT sub_topic FROM client WHERE device_id = ?',
            (device_id,)
        ).fetchone()
        conn.close()
        
        if not device:
            return jsonify({"error": "Device not found"}), 404

        # Build topic - same format used in recever.py
        topic = f"devices/{device_id}/command"
        
        # Convert command to string if it's a number
        command_str = str(command) if command is not None else ""
        
        # Send command via MQTT
        try:
            publish.single(
                topic, 
                payload=command_str, 
                hostname=MQTT_BROKER,
                port=1883
            )
            
            print(f"✅ Command sent: {command_str} to {topic}")
            
            return jsonify({
                "status": "success",
                "message": "Command sent successfully",
                "topic": topic,
                "command": command_str
            }), 200
            
        except Exception as mqtt_error:
            print(f"❌ MQTT Error: {mqtt_error}")
            return jsonify({
                "status": "error",
                "message": "Failed to send command via MQTT",
                "error": str(mqtt_error)
            }), 500
        
    except Exception as e:
        print(f"Error in send_device_command: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# 8. API Endpoint: Health check
# ============================================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Check that the API is working"""
    try:
        # Test database connection
        conn = get_db_connection()
        if conn:
            conn.close()
            db_status = "connected"
        else:
            db_status = "disconnected"
            
        return jsonify({
            "status": "running",
            "database": db_status,
            "mqtt_broker": MQTT_BROKER
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# ============================================
# Backward Compatibility - Legacy endpoint support
# ============================================
@app.route('/api/clients', methods=['GET'])
def get_clients():
    """Legacy endpoint support"""
    return get_devices()

# ============================================
# General Error Handling
# ============================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ============================================
# Start Server
# ============================================
if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Starting IoT API Server...")
    print(f"📊 Database: {DB_PATH}")
    print(f"📡 MQTT Broker: {MQTT_BROKER}")
    print("🌐 Server: http://0.0.0.0:5000")
    print("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        threaded=True
    )