// controllers/shapeController.js
const Shape = require("../models/Shape");

exports.createShape = async (req, res) => {
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
};

exports.getShapes = async (req, res) => {
  try {
    const shapes = await Shape.find({ userId: req.user.id });
    res.json(shapes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateShape = async (req, res) => {
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
};

exports.deleteShape = async (req, res) => {
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
};
