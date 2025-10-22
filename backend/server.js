// const express = require('express');
// const { MongoClient } = require('mongodb');
// const app = express();
// app.use(express.json());

// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// async function startServer() {
//     try {
//         await client.connect(); // Connect once at startup
//         console.log("Connected to MongoDB");

//         const collection = client.db("blockchain").collection("tempdata");

//         app.post('/sensor_data', async (req, res) => {
//             try {
//                 await collection.insertOne(req.body);
//                 res.send({ status: "success" });
//             } catch (err) {
//                 res.status(500).send({ error: err.message });
//             }
//         });

//         app.listen(3000, () => console.log("Server running on port 3000"));
//     } catch (err) {
//         console.error("Failed to connect to MongoDB:", err);
//         process.exit(1); // exit if DB connection fails
//     }
// }

// startServer();
/*"""import network
import time
import urequests
import dht
from machine import Pin, UART
import micropyGPS

# -----------------------------
# DHT22 Setup
# -----------------------------
sensor = dht.DHT22(Pin(15))

# -----------------------------
# GPS Setup (NEO-6M on UART 16/17)
# -----------------------------
uart = UART(2, baudrate=9600, tx=17, rx=16)  # TX/RX pins
gps = micropyGPS.MicropyGPS()

# -----------------------------
# Wi-Fi Setup
# -----------------------------
ssid = "Paul's Galaxy F23 5G"
password = "w tuv 9 8 4 1"

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(ssid, password)

while not wlan.isconnected():
    print("Connecting to Wi-Fi...")
    time.sleep(1)

print("Connected! IP:", wlan.ifconfig()[0])

# -----------------------------
# Server URL and constants
# -----------------------------
url = "http://192.168.21.181:3000/sensor_data"  # Replace with your PC IP
COLD_STORAGE_NAME = "cold1"
DEVICE_NAME = "exp1"

# -----------------------------
# Main Loop
# -----------------------------
while True:
    # Read DHT22
    sensor.measure()
    temp = sensor.temperature()
    hum = sensor.humidity()

    # Read GPS
    while uart.any():
        b = uart.read(1)                 # Read 1 byte
        if b:
            gps.update(b.decode('utf-8'))  # Decode byte to string

    # Convert GPS to decimal degrees
    latitude = gps.latitude[0] + gps.latitude[1]/60 if gps.latitude[0] != 0 else None
    longitude = gps.longitude[0] + gps.longitude[1]/60 if gps.longitude[0] != 0 else None

    print("Temp:", temp, "C Hum:", hum, "%")
    print("Latitude:", latitude, "Longitude:", longitude)

    data = {
        "temperature": temp,
        "humidity": hum,
        "coldstoragename": COLD_STORAGE_NAME,
        "devicename": DEVICE_NAME,
        "latitude": latitude,
        "longitude": longitude
    }

    # Send data to Node.js server
    try:
        r = urequests.post(url, json=data)
        print("Server response:", r.text)
        r.close()
    except Exception as e:
        print("Failed to send data:", e)

    time.sleep(2.5)

import network
import time
import urequests
import dht
from machine import Pin, UART
import micropyGPS

# -----------------------------
# DHT22 Setup
# -----------------------------
sensor = dht.DHT22(Pin(15))

# -----------------------------
# GPS Setup (NEO-6M on UART 16/17)
# -----------------------------
uart = UART(2, baudrate=9600, tx=17, rx=16)
gps = micropyGPS.MicropyGPS()

# -----------------------------
# Wi-Fi Setup
# -----------------------------
ssid = "Paul's Galaxy F23 5G"
password = "w tuv 9 8 4 1"

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(ssid, password)

while not wlan.isconnected():
    print("Connecting to Wi-Fi...")
    time.sleep(1)

print("Connected! IP:", wlan.ifconfig()[0])

# -----------------------------
# Server URL and constants
# -----------------------------
url = "http://192.168.104.181:3000/sensor_data"  # Replace with your PC IP
COLD_STORAGE_NAME = "cold1"
DEVICE_NAME = "exp1"

# -----------------------------
# Main Loop
# -----------------------------
while True:
    # Read DHT22
    sensor.measure()
    temp = sensor.temperature()
    hum = sensor.humidity()

    # Read GPS data
    while uart.any():
        b = uart.read(1)
        if b:
            try:
                gps.update(b.decode('utf-8'))
            except Exception:
                # Ignore incomplete/malformed NMEA sentences
                pass

    # Only send if GPS fix available
    if gps.latitude[0] != 0 and gps.longitude[0] != 0:
        latitude = gps.latitude[0] + gps.latitude[1]/60
        longitude = gps.longitude[0] + gps.longitude[1]/60

        print("Temp:", temp, "C Hum:", hum, "%")
        print("Latitude:", latitude, "Longitude:", longitude)

        data = {
            "temperature": temp,
            "humidity": hum,
            "coldstoragename": COLD_STORAGE_NAME,
            "devicename": DEVICE_NAME,
            "latitude": latitude,
            "longitude": longitude
        }

        # Send data to Node.js server
        try:
            r = urequests.post(url, json=data)
            print("Server response:", r.text)
            r.close()
        except Exception as e:
            print("Failed to send data:", e)
    else:
        print("Waiting for GPS fix...")

    time.sleep(2.5)
"""
import network
import time
import urequests
import dht
from machine import Pin

# -----------------------------
# DHT22 Setup
# -----------------------------
sensor = dht.DHT22(Pin(15))

# -----------------------------
# Wi-Fi Setup
# -----------------------------
ssid = "Paul's Galaxy F23 5G"
password = "w tuv 9 8 4 1"

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(ssid, password)

while not wlan.isconnected():
    print("Connecting to Wi-Fi...")
    time.sleep(1)

print("Connected! IP:", wlan.ifconfig()[0])

# -----------------------------
# Server URL and constants
# -----------------------------
url = "http://192.168.104.26:3000/sensor_data"  # Replace with your PC IP
COLD_STORAGE_NAME = "cold1"
DEVICE_NAME = "exp1"

# Hardcoded GPS coordinates
HARDCODED_LATITUDE = 12.9716
HARDCODED_LONGITUDE = 77.5946

# -----------------------------
# Main Loop
# -----------------------------
while True:
    # Read DHT22
    sensor.measure()
    temp = sensor.temperature()
    hum = sensor.humidity()

    print("Temp:", temp, "C Hum:", hum, "%")
    print("Latitude:", HARDCODED_LATITUDE, "Longitude:", HARDCODED_LONGITUDE)

    data = {
        "temperature": temp,
        "humidity": hum,
        "coldstoragename": COLD_STORAGE_NAME,
        "devicename": DEVICE_NAME,
        "latitude": HARDCODED_LATITUDE,
        "longitude": HARDCODED_LONGITUDE
    }

    # Send data to Node.js server
    try:
        r = urequests.post(url, json=data)
        print("Server response:", r.text)
        r.close()
    except Exception as e:
        print("Failed to send data:", e)

    time.sleep(2.5)

*/ 


// const express = require('express');
// const { MongoClient } = require('mongodb');
// const app = express();
// app.use(express.json());

// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// // Start the server
// async function startServer() {
//     try {
//         // Connect to MongoDB once
//         await client.connect();
//         console.log("Connected to MongoDB");

//         const collection = client.db("blockchain").collection("tempdata");

//         // Endpoint to receive sensor data
//         app.post('/sensor_data', async (req, res) => {
//             try {
//                 // Add a timestamp before saving
//                 const data = { ...req.body, timestamp: new Date() };
//                 await collection.insertOne(data);
//                 res.send({ status: "success" });
//                 console.log("Data saved:", data);
//             } catch (err) {
//                 console.error("Failed to save data:", err.message);
//                 res.status(500).send({ error: err.message });
//             }
//         });

//         // Start listening
//         app.listen(3000, () => {
//             console.log("Server running on port 3000");
//         });

//     } catch (err) {
//         console.error("Failed to connect to MongoDB:", err);
//         process.exit(1);
//     }
// }

// startServer();





// const express = require('express');
// const { MongoClient } = require('mongodb');
// const cors = require('cors');
// const app = express();
// app.use(express.json());
// app.use(cors());

// // MongoDB Atlas connection
// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// // Start server
// async function startServer() {
//     try {
//         await client.connect();
//         console.log("Connected to MongoDB Atlas");

//         const collection = client.db("b0").collection("tempdata");

//         // Endpoint to receive ESP32 sensor data
//         app.post('/sensor_data', async (req, res) => {
//             try {
//                 const data = { ...req.body, timestamp: new Date() };
//                 await collection.insertOne(data);
//                 console.log("Data saved:", data);
//                 res.json({ status: "success" });
//             } catch (err) {
//                 console.error("Failed to save data:", err.message);
//                 res.status(500).json({ error: err.message });
//             }
//         });

//         // Start listening on port 3000
//         app.listen(3000, () => {
//             console.log("Server running on port 3000");
//         });

//     } catch (err) {
//         console.error("Failed to connect to MongoDB:", err.message);
//         process.exit(1);
//     }
// }

// startServer();


// const express = require('express');
// const { MongoClient } = require('mongodb');
// const cors = require('cors');

// const app = express();
// app.use(express.json());
// app.use(cors()); // Allow cross-origin requests

// // MongoDB Atlas connection string
// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// // Start the server
// async function startServer() {
//     try {
//         // Connect to MongoDB
//         await client.connect();
//         console.log("Connected to MongoDB Atlas");

//         // Access database and collection
//         const db = client.db("blk");       // database will be created if not exist
//         const collection = db.collection("temp"); // collection auto-created on first insert

//         // Endpoint to receive ESP32 sensor data
//         app.post('/sensor_data', async (req, res) => {
//             try {
//                 const data = { ...req.body, timestamp: new Date() };
//                 await collection.insertOne(data);
//                 console.log("Data saved:", data);
//                 res.json({ status: "success" });
//             } catch (err) {
//                 console.error("Failed to save data:", err.message);
//                 res.status(500).json({ error: err.message });
//             }
//         });

//         // Start listening on port 3000
//         app.listen(3000, () => {
//             console.log("Server running on port 3000");
//         });

//     } catch (err) {
//         console.error("Failed to connect to MongoDB:", err.message);
//         process.exit(1);
//     }
// }

// startServer();



// const express = require("express");
// const { MongoClient } = require("mongodb");
// const cors = require("cors");

// const app = express();
// app.use(express.json());
// app.use(cors());

// // MongoDB Atlas connection string
// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// // Start the server
// async function startServer() {
//     try {
//         // Connect to MongoDB
//         await client.connect();
//         console.log("✅ Connected to MongoDB Atlas");

//         // Access or create database and collection
//         const db = client.db("blockchain"); // Database auto-created if missing
//         const collection = db.collection("tempdata"); // Collection auto-created on first insert

//         // API endpoint for ESP32
//         app.post("/sensor_data", async (req, res) => {
//             try {
//                 const data = { ...req.body, timestamp: new Date() };
//                 await collection.insertOne(data);
//                 console.log("📥 Data saved:", data);
//                 res.status(200).json({ status: "success", data });
//             } catch (err) {
//                 console.error("❌ Error saving data:", err.message);
//                 res.status(500).json({ error: "Failed to save data" });
//             }
//         });

//         // Root endpoint (for testing)
//         app.get("/", (req, res) => {
//             res.send("✅ Node.js + MongoDB Server is Running!");
//         });

//         // Start listening
//         const PORT = 3000;
//         app.listen(PORT, () => {
//             console.log(`🚀 Server running on http://localhost:${PORT}`);
//         });

//     } catch (err) {
//         console.error("❌ Failed to connect to MongoDB:", err.message);
//         process.exit(1);
//     }
// }

// startServer();



// const express = require("express");
// const { MongoClient } = require("mongodb");
// const cors = require("cors");

// const app = express();
// app.use(express.json());
// app.use(cors());

// // MongoDB Atlas connection string
// const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
// const client = new MongoClient(uri);

// // Database and Collection Names
// const dbName = "blockchain";
// const collectionName = "tempdata";

// async function startServer() {
//     try {
//         await client.connect();
//         console.log("✅ Connected to MongoDB Atlas");

//         const db = client.db(dbName);

//         // Ensure collection exists (create if missing)
//         const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
//         const collectionExists = existingCollections.some(col => col.name === collectionName);

//         if (!collectionExists) {
//             await db.createCollection(collectionName);
//             console.log(`🆕 Created collection: ${collectionName}`);
//         } else {
//             console.log(`📁 Using existing collection: ${collectionName}`);
//         }

//         const collection = db.collection(collectionName);

//         // Endpoint to receive sensor data
//         app.post("/sensor_data", async (req, res) => {
//             try {
//                 const { temperature, humidity, latitude, longitude } = req.body;

//                 // Basic validation
//                 if (temperature === undefined || humidity === undefined) {
//                     return res.status(400).json({ error: "Missing temperature or humidity" });
//                 }

//                 const data = {
//                     temperature: parseFloat(temperature),
//                     humidity: parseFloat(humidity),
//                     latitude: latitude || 0,
//                     longitude: longitude || 0,
//                     timestamp: new Date()
//                 };

//                 const result = await collection.insertOne(data);

//                 console.log("✅ Data inserted successfully with _id:", result.insertedId);
//                 res.status(200).json({ status: "success", insertedId: result.insertedId });
//             } catch (err) {
//                 console.error("❌ Error inserting data:", err);
//                 res.status(500).json({ error: "Failed to insert data" });
//             }
//         });

//         // Test endpoint
//         app.get("/", (req, res) => {
//             res.send("✅ Node.js + MongoDB Server Running and Ready!");
//         });

//         // Start server
//         const PORT = 3000;
//         app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

//     } catch (err) {
//         console.error("❌ MongoDB Connection Error:", err.message);
//         process.exit(1);
//     }
// }

// startServer();
const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Atlas connection string
const uri = "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
const client = new MongoClient(uri);

// Database and Collection Names
const dbName = "blockchain";
const collectionName = "tempdata";

async function startServer() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB Atlas");

        const db = client.db(dbName);

        // Ensure collection exists (create if missing)
        const existingCollections = await db.listCollections({}, { nameOnly: true }).toArray();
        const collectionExists = existingCollections.some(col => col.name === collectionName);

        if (!collectionExists) {
            await db.createCollection(collectionName);
            console.log(`🆕 Created collection: ${collectionName}`);
        } else {
            console.log(`📁 Using existing collection: ${collectionName}`);
        }

        const collection = db.collection(collectionName);

        // Endpoint to receive sensor data
        app.post("/sensor_data", async (req, res) => {
            try {
                const { temperature, humidity, latitude, longitude } = req.body;

                // Basic validation
                if (temperature === undefined || humidity === undefined) {
                    return res.status(400).json({ error: "Missing temperature or humidity" });
                }

                // Get current date/time in both formats
                const now = new Date();
                const readableTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }); // IST format

                const data = {
                    temperature: parseFloat(temperature),
                    humidity: parseFloat(humidity),
                    latitude: latitude || 0,
                    longitude: longitude || 0,
                    timestamp: now,              // MongoDB Date object
                    timeString: readableTime     // Human-readable
                };

                const result = await collection.insertOne(data);

                console.log("✅ Data inserted successfully:", data);
                res.status(200).json({ status: "success", insertedId: result.insertedId });
            } catch (err) {
                console.error("❌ Error inserting data:", err);
                res.status(500).json({ error: "Failed to insert data" });
            }
        });

        // Test endpoint
        app.get("/", (req, res) => {
            res.send("✅ Node.js + MongoDB Server Running and Ready!");
        });

        // Start server
        const PORT = 3000;
        app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
}

startServer();
