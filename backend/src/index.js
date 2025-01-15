// backend/index.js
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const turf = require("@turf/turf");
const { parse: parseKML } = require("kml-parse");
const fs = require("fs");

// const GeoTIFF = require('geotiff');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Enhanced MongoDB Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileType: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  metadata: { type: Object },
  uploadDate: { type: Date, default: Date.now },
});

const shapeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, required: true }, // polygon, marker, etc.
  coordinates: { type: Array, required: true },
  properties: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

const markerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function (v) {
        return (
          v.length === 2 &&
          v[0] >= -90 &&
          v[0] <= 90 && // latitude
          v[1] >= -180 &&
          v[1] <= 180
        ); // longitude
      },
      message: "Invalid coordinates",
    },
  },
  properties: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const File = mongoose.model("File", fileSchema);
const Shape = mongoose.model("Shape", shapeSchema);
const Marker = mongoose.model("Marker", markerSchema);

// Enhanced file upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".geojson", ".kml", ".tiff", ".tif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Authentication middleware
const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error("No token provided");
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Enhanced Routes

// User Management
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, email });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) throw new Error("User not found");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error("Invalid password");

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// Profile Route
app.get("/api/profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count files and shapes associated with the user
    const filesCount = await File.countDocuments({ userId: req.user.id });
    const shapesCount = await Shape.countDocuments({ userId: req.user.id });

    // Return user profile data
    res.json({
      username: user.username,
      email: user.email,
      filesCount,
      shapesCount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// File Management
app.post("/api/upload", authenticate, upload.single("file"), async (req, res) => {
    try {
      const { file } = req;
      if (!file) throw new Error("No file uploaded");

      let metadata = {};
      const ext = path.extname(file.originalname).toLowerCase();

      const filePath = path.join(__dirname, "..", "uploads", file.filename);

      // Process different file types
      if (ext === ".geojson") {
        console.log("heree", filePath);

        const geojson = JSON.parse(fs.readFileSync(filePath, "utf8"));
        console.log("after require");
        metadata = {
          type: "GeoJSON",
          features: geojson.features.length,
          bbox: turf.bbox(geojson),
        };
      } else if (ext === ".kml") {
        const kmlData = await parseKML(
          path.join(__dirname, "uploads", file.filename)
        );
        metadata = {
          type: "KML",
          placemarks: kmlData.placemarks.length,
        };
      }

      console.log("before create filerecord: " + file.filename);
      const fileRecord = new File({
        filename: file.filename,
        fileType: ext,
        userId: req.user.id,
        metadata,
      });
      console.log("created filerecord: " + fileRecord);

      await fileRecord.save();
      res
        .status(201)
        .json({ message: "File uploaded successfully", file: fileRecord });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
app.get("/api/upload/:fileName", authenticate, async (req, res) => {
  try {
    const fileName = req.params.fileName;
    if (!fileName) throw new Error("File name missing");

    const filePath = path.join(__dirname, "..", "uploads", fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Determine the file type for response headers
    if (fileName.endsWith(".geojson")) {
      res.setHeader("Content-Type", "application/json");
    }

    // Send the file content
    res.status(200).send(fileContent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Shapes Management
app.post("/api/shapes", authenticate, async (req, res) => {
  try {
    const { type, coordinates, properties } = req.body;
    const shape = new Shape({
      userId: req.user.id,
      type,
      coordinates,
      properties,
    });
    await shape.save();
    res.status(201).json(shape);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/shapes", authenticate, async (req, res) => {
  try {
    const shapes = await Shape.find({ userId: req.user.id });
    res.json(shapes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/shapes/:id", authenticate, async (req, res) => {
  try {
    const { coordinates, properties } = req.body;
    const shape = await Shape.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { coordinates, properties },
      { new: true }
    );
    if (!shape) throw new Error("Shape not found");
    res.json(shape);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/shapes/:id", authenticate, async (req, res) => {
  try {
    const shape = await Shape.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!shape) throw new Error("Shape not found");
    res.json({ message: "Shape deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// Markers
app.get("/api/markers", authenticate, async (req, res) => {
  try {
    const markers = await Marker.find({ userId: req.user.id });
    res.json(markers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/markers", authenticate, async (req, res) => {
  try {
    const { coordinates, properties } = req.body;

    const marker = new Marker({
      userId: req.user.id,
      coordinates,
      properties,
    });

    await marker.save();
    res.status(201).json(marker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put("/api/markers/:id", authenticate, async (req, res) => {
  try {
    const { coordinates, properties } = req.body;

    const marker = await Marker.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        coordinates,
        properties,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!marker) {
      return res.status(404).json({ message: "Marker not found" });
    }

    res.json(marker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/markers/:id", authenticate, async (req, res) => {
  try {
    const marker = await Marker.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!marker) {
      return res.status(404).json({ message: "Marker not found" });
    }

    res.json({
      message: "Marker deleted successfully",
      markerId: req.params.id,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/markers/:id", authenticate, async (req, res) => {
  try {
    const marker = await Marker.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!marker) {
      return res.status(404).json({ message: "Marker not found" });
    }

    res.json(marker);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
// Get user's files
app.get("/api/files", authenticate, async (req, res) => {
  try {
    const files = await File.find({ userId: req.user.id });
    res.json(files);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
