CREATE TABLE IF NOT EXISTS client(
  device_id TEXT PRIMARY KEY,
  device_name TEXT ,
  data_types TEXT,
  ssid TEXT ,
  ip TEXT ,
  pub_topic TEXT ,
  sub_topic TEXT ,
  status TEXT DEFAULT 'Offline',
  commands TEXT,
  recev_comands TEXT,
  type_of_commands TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS senseor_data(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT,
  data_type TEXT,
  value INTEGER,
  time_stmp DATETIME DEFAULT CURRENT_TIMESTAMP ,
  FOREIGN KEY (device_id) REFERENCES client(device_id)
);


