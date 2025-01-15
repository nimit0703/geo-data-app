// controllers/userController.js
const User = require('../models/User');
const File = require('../models/File');
const Shape = require('../models/Shape');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userController = {
  register: async (req, res) => {
    try {
      const { username, password, email } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword, email });
      await user.save();
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      if (!user) throw new Error('User not found');

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) throw new Error('Invalid password');

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, userId: user._id });
    } catch (error) {
      res.status(401).json({ message: error.message });
    }
  },

  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('username email');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const filesCount = await File.countDocuments({ userId: req.user.id });
      const shapesCount = await Shape.countDocuments({ userId: req.user.id });

      res.json({
        username: user.username,
        email: user.email,
        filesCount,
        shapesCount,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },
};

module.exports = userController;