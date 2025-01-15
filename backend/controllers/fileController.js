// controllers/fileController.js
const File = require('../models/File');
const path = require('path');
const fs = require('fs');
const turf = require('@turf/turf');
const { parse: parseKML } = require('kml-parse');

const fileController = {
  uploadFile: async (req, res) => {
    try {
      const { file } = req;
      if (!file) throw new Error('No file uploaded');

      let metadata = {};
      const ext = path.extname(file.originalname).toLowerCase();
      const filePath = path.join(__dirname, '..', 'uploads', file.filename);

      if (ext === '.geojson') {
        const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        metadata = {
          type: 'GeoJSON',
          features: geojson.features.length,
          bbox: turf.bbox(geojson),
        };
      } else if (ext === '.kml') {
        const kmlData = await parseKML(filePath);
        metadata = {
          type: 'KML',
          placemarks: kmlData.placemarks.length,
        };
      }

      const fileRecord = new File({
        filename: file.filename,
        fileType: ext,
        userId: req.user.id,
        metadata,
      });

      await fileRecord.save();
      res.status(201).json({ message: 'File uploaded successfully', file: fileRecord });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getFile: async (req, res) => {
    try {
      const fileName = req.params.fileName;
      if (!fileName) throw new Error('File name missing');

      const filePath = path.join(__dirname, '..', 'uploads', fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');

      if (fileName.endsWith('.geojson')) {
        res.setHeader('Content-Type', 'application/json');
      }

      res.status(200).send(fileContent);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getUserFiles: async (req, res) => {
    try {
      const files = await File.find({ userId: req.user.id });
      res.json(files);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};

module.exports = fileController;