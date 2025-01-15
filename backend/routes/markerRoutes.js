// routes/markerRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const markerController = require("../controllers/markerController");

router.get("/markers", authenticate, markerController.getMarkers);
router.post("/markers", authenticate, markerController.createMarker);
router.put("/markers/:id", authenticate, markerController.updateMarker);
router.delete("/markers/:id", authenticate, markerController.deleteMarker);
router.get("/markers/:id", authenticate, markerController.getMarker);

module.exports = router;
