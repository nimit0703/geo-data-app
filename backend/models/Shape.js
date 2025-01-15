// models/Shape.js
const mongoose = require('mongoose');

const shapeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  coordinates: { type: Array, required: true },
  properties: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Shape', shapeSchema);