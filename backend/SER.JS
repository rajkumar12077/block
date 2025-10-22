const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Atlas connection string
const uri =
  "mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/?retryWrites=true&w=majority&appName=blockchain";
const client = new MongoClient(uri);

// Database and Collection
const dbName = "blockchain";
const collectionName = "tempdata";

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db(dbName);

    // Ensure collection exists
    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();
    const collectionExists = existingCollections.some(
      (col) => col.name === collectionName
    );

    if (!collectionExists) {
      await db.createCollection(collectionName);
      console.log(`🆕 Created collection: ${collectionName}`);
    } else {
      console.log(`📁 Using existing collection: ${collectionName}`);
    }

    const collection = db.collection(collectionName);

    // Endpoint to receive data
    app.post("/sensor_data", async (req, res) => {
      try {
        const { temperature, humidity, latitude, longitude } = req.body;

        // Basic validation
        if (temperature === undefined || humidity === undefined) {
          return res
            .status(400)
            .json({ error: "Missing temperature or humidity" });
        }

        // Add timestamp (both ISO and readable)
        const now = new Date();
        const readable = now.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });

        const data = {
          temperature: parseFloat(temperature),
          humidity: parseFloat(humidity),
          latitude: latitude || 0,
          longitude: longitude || 0,
          timestamp: now, // ✅ MongoDB stores this as an ISODate()
          readableTime: readable, // ✅ Human-readable string
        };

        const result = await collection.insertOne(data);
        console.log(data.timestamp);
        console.log("✅ Data inserted:", data);

        res.status(200).json({ status: "success", id: result.insertedId });
      } catch (err) {
        console.error("❌ Failed to insert data:", err);
        res.status(500).json({ error: err.message });
      }
    });

    // Test endpoint
    app.get("/", (req, res) => {
      res.send("✅ Node.js + MongoDB server is running!");
    });

    // Start server
    const PORT = 3000;
    app.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  }
}

startServer();
