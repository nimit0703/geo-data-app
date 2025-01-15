// routes/shapeRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const shapeController = require("../controllers/shapeController");

router.post("/shapes", authenticate, shapeController.createShape);
router.get("/shapes", authenticate, shapeController.getShapes);
router.put("/shapes/:id", authenticate, shapeController.updateShape);
router.delete("/shapes/:id", authenticate, shapeController.deleteShape);

module.exports = router;
