// server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const shapeRoutes = require('./routes/shapeRoutes');
const markerRoutes = require('./routes/markerRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

app.use('/api', userRoutes);
app.use('/api', fileRoutes);
app.use('/api', shapeRoutes);
app.use('/api', markerRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});