const Marker = require("../models/Marker");

const markerController = {
  createMarker: async (req, res) => {
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
  },

  getMarkers: async (req, res) => {
    try {      
      const markers = await Marker.find({ userId: req.user.id });
      res.json(markers);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  getMarker: async (req, res) => {
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
  },

  updateMarker: async (req, res) => {
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
  },

  deleteMarker: async (req, res) => {
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
  },
};

module.exports = markerController;
