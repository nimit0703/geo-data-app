// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authenticate = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/upload', authenticate, upload.single('file'), fileController.uploadFile);
router.get('/upload/:fileName', authenticate, fileController.getFile);
router.get('/files', authenticate, fileController.getUserFiles);

module.exports = router;