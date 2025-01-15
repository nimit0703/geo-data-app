<template>
  <div class="container-fluid">
    <div class="main-container d-flex">
      <!-- Sidebar -->
      <div class="sidebar bg-light p-4">
        <!-- Existing file upload section -->
        <div class="file-upload mb-4">
          <h3>Upload Data</h3>
          <input
            type="file"
            @change="handleFileUpload"
            accept=".geojson,.kml,.tiff,.tif"
            class="form-control"
          />
        </div>

        <!-- Files section -->
        <div class="layers-control mb-4">
          <h3>Files</h3>
          <div v-for="file in files" :key="file._id" class="layer-item mb-2">
            <label>
              <input
                type="checkbox"
                v-model="file.visible"
                @change="toggleLayer(file)"
                class="form-check-input"
              />
              {{ adjustFileName(file.filename) }}
            </label>
          </div>
        </div>

        <!-- Existing tools section -->
        <div class="tools mb-4">
          <h3>Tools</h3>
          <button
            @click="toggleDrawing"
            :class="['btn', 'btn-outline-primary', isDrawing ? 'active' : '']"
          >
            Draw Shape
          </button>
          <button
            @click="toggleMeasurement"
            :class="[
              'btn',
              'btn-outline-secondary',
              isMeasuring ? 'active' : '',
            ]"
          >
            Measure Distance
          </button>
          <button @click="addMarker" class="btn btn-outline-success">
            Add Marker
          </button>
        </div>

        <!-- Existing measurement result section -->
        <div v-if="measurementResult" class="measurement-result mt-4">
          <p>
            <strong>Distance:</strong> {{ measurementResult.km }} km /
            {{ measurementResult.miles }} miles
          </p>
        </div>

        <!-- New Shapes section -->
        <div class="shapes-control mb-4">
          <div class="d-flex justify-content-between align-items-baseline">
            <h3>Custom Shapes</h3>
            <p v-if="shapes.length > 5">
              {{ `${visibleShapesCount}/${shapes.length}` }}
            </p>
            <p v-else>{{ shapes.length }}</p>
          </div>
          <div
            v-for="(shape, index) in shapes.slice(0, visibleShapesCount)"
            :key="shape._id"
            class="shape-item mb-2"
          >
            <div class="d-flex justify-content-between align-items-center">
              <label class="flex-grow-1">
                <input
                  type="checkbox"
                  v-model="shape.visible"
                  @change="toggleShape(shape)"
                  class="form-check-input"
                />
                {{ shape.type }} Shape
              </label>
              <div class="btn-group btn-group-sm">
                <button
                  @click="editShape(shape._id)"
                  class="btn btn-warning btn-sm"
                  :disabled="isEditing"
                >
                  Edit
                </button>
                <button
                  @click="deleteShape(shape._id)"
                  class="btn btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          <button
            v-if="visibleShapesCount < shapes.length"
            @click="showMoreShapes"
            class="btn btn-outline-primary btn-sm w-100"
          >
            Show More
          </button>
        </div>
      </div>

      <!-- Map Container -->
      <div class="map-container flex-grow-1">
        <div id="map" class="h-100"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";
import axios from "axios";
import LoginRegister from "../components/LoginRegister.vue";

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default {
  name: "MapView",
  components: {
    LoginRegister,
  },
  setup() {
    const API_BASE_URL = "http://localhost:5000/api";

    const map = ref(null);
    const markers = ref(new Map()); // Add this to track markers
    const drawControl = ref(null);
    const files = ref([]);
    const isAuthenticated = ref(false);
    const isDrawing = ref(false);
    const isMeasuring = ref(false);
    const measurementResult = ref(null);
    const layers = ref(new Map());
    const measurementLayer = ref(null);
    const measurementPoints = ref([]);

    const shapes = ref([]);
    const shapeLayers = ref(new Map());
    const isEditing = ref(false);
    const visibleShapesCount = ref(5);
    const editControl = ref(null);
    let drawnItems;

    const initializeMap = async () => {
      // Initialize the map
      map.value = L.map("map").setView([40, -74.5], 9);

      // Add OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map.value);

      // Initialize draw control
      drawnItems = new L.FeatureGroup();
      map.value.addLayer(drawnItems);

      drawControl.value = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems,
          // poly:{
          //   allowIntersection: false
          // }
        },
        draw: {
          polygon: true,
          polyline: true,
          // rectangle: true,
          // circle: true,
          // marker: true,
        },
      });

      map.value.addControl(drawControl.value);
      loadSavedMarkers();
      // Drawing events
      map.value.on(L.Draw.Event.EDITSTART, () => {
        isEditing.value = true;
      });
      map.value.on(L.Draw.Event.EDITSTOP, () => {
        isEditing.value = false;
      });
      map.value.on(L.Draw.Event.CREATED, handleDrawCreate);
      map.value.on(L.Draw.Event.EDITED, handleDrawEdit);
    };
    const convertCoordinates = (coordinates) => {
      return coordinates.map((ring) => 
        ring.map(([lon, lat]) => [lat, lon])
      );
    };

    const loadSavedShapes = async () => {
      try {
        shapes.value.forEach((shape) => {
          if (shapeLayers.value.has(shape._id)) {
            // If layer exists and shape is not visible, remove it
            if (!shape.visible) {
              drawnItems.removeLayer(shapeLayers.value.get(shape._id));
            }
            return;
          }

          let layer;

          // Determine the type of shape and create the appropriate layer
          if (shape.type === "Polygon" || shape.type === "MultiPolygon") {
            const coordinates = convertCoordinates(shape.coordinates);

            layer = L.polygon(coordinates, {
              color: "#3388ff",
              fillColor: "#3388ff",
              fillOpacity: 0.2,
              weight: 2,
            });
          } else if (
            shape.type === "LineString" ||
            shape.type === "MultiLineString"
          ) {        
            const coordinates = shape.coordinates.map(([lon, lat]) => [lat, lon]);
            layer = L.polyline(coordinates, {
              color: "#3388ff",
              weight: 2,
            });
          }

          if (layer) {
            // Add hover card functionality
            layer.bindPopup(() => {
              return `
            <div class="hover-card">
              <h4>Custom Shape</h4>
              <p>Type: ${shape.type}</p>
              <p>Created: ${new Date(shape.createdAt).toLocaleDateString()}</p>
              ${
                shape.properties
                  ? Object.entries(shape.properties)
                      .map(([key, value]) => `<p>${key}: ${value}</p>`)
                      .join("")
                  : ""
              }
              <button class="btn btn-warning btn-sm" onclick="window.editShape('${
                shape._id
              }')">Edit</button>
              <button class="btn btn-danger btn-sm mt-2" onclick="window.deleteShape('${
                shape._id
              }')">Delete</button>
            </div>
          `;
            },{ closeButton: true, autoClose: false });

            // Add hover events
            layer.on("mouseover", function () {
              this.setStyle({
                fillColor: "#ff7800",
                color: "#ff7800",
              });
              this.openPopup();
            });

            layer.on("mouseout", function () {
              this.setStyle({
                fillColor: "#3388ff",
                color: "#3388ff",
              });
              // this.closePopup();
            });

            // Set layer ID for reference
            layer.id = shape._id;
            shapeLayers.value.set(shape._id, layer);

            // Add the layer to the map if visible
            if (shape.visible) {
              drawnItems.addLayer(layer);
            }
          }
        });
      } catch (error) {
        console.error("Error loading shapes:", error);
      }
    };

    // Add this function to load shapes into sidebar
    const fetchShapes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/shapes`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        shapes.value = response.data.map((shape) => ({
          ...shape,
          visible: false, // Add visibility property
        }));
      } catch (error) {
        console.error("Error fetching shapes:", error);
      }
    };

    const toggleShape = async (shape) => {
      // shape.visible = !shape.visible;

      const layer = shapeLayers.value.get(shape._id);
      if (layer) {
        if (shape.visible) {
          drawnItems.addLayer(layer);
        } else {
          drawnItems.removeLayer(layer);
        }
      } else if (shape.visible) {
        // If layer doesn't exist and shape should be visible, reload shapes
        await loadSavedShapes();
      }
    };

    const editShape = async (shapeId) => {
      debugger;
      const layer = shapeLayers.value.get(shapeId);
      if (layer) {
        isEditing.value = true;

        // Remove existing draw control if present
        if (drawControl.value) {
          map.value.removeControl(drawControl.value);
        }

        // Create edit-only control for this specific shape
        editControl.value = new L.Control.Draw({
          edit: {
            featureGroup: drawnItems,
          },
          draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            marker: true,
          },
        });

        map.value.addControl(editControl.value);

        // Enable editing for the specific layer
        layer.editing.enable();

        // Start edit mode
      }
    };

    const deleteShape = async (shapeId) => {
      try {
        await axios.delete(`${API_BASE_URL}/shapes/${shapeId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const layer = shapeLayers.value.get(shapeId);
        if (layer) {
          drawnItems.removeLayer(layer);
          shapeLayers.value.delete(shapeId);
        }

        shapes.value = shapes.value.filter((shape) => shape._id !== shapeId);
      } catch (error) {
        console.error("Error deleting shape:", error);
      }
    };

    const showMoreShapes = () => {
      const increment = 10; // Number of additional shapes to display
      visibleShapesCount.value = Math.min(
        visibleShapesCount.value + increment,
        shapes.value.length
      );
    };

    const loadSavedMarkers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/markers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        response.data.forEach((markerData) => {
          createMarker(markerData.coordinates, markerData._id);
        });
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    };

    const createMarker = (coordinates, id = null) => {
      const marker = L.marker(coordinates, {
        draggable: true,
      }).addTo(map.value);

      // Add hover information
      marker.bindPopup(() => {
        return `
          <div class="hover-card">
            <h4>Point Marker</h4>
            <p>Latitude: ${marker.getLatLng().lat.toFixed(4)}</p>
            <p>Longitude: ${marker.getLatLng().lng.toFixed(4)}</p>
            <button class="btn btn-danger btn-sm" onclick="window.deleteMarker('${id}')">Delete</button>
          </div>
        `;
      });

      // Hover events
      marker.on("mouseover", function () {
        this.openPopup();
      });

      marker.on("mouseout", function () {
        // this.closePopup();
      });

      // Save marker position when dragged
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        if (id) {
          try {
            await axios.put(
              `${API_BASE_URL}/markers/${id}`,
              {
                coordinates: [pos.lat, pos.lng],
              },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
          } catch (error) {
            console.error("Update marker error:", error);
          }
        }
      });

      if (id) {
        markers.value.set(id, marker);
      }
      return marker;
    };

    const addMarker = async () => {
      // map.value.removeControl(drawControl.value); // Removes the drawing controls from the map
      map.value.off("click", handleMeasurementClick);
      measurementResult.value = null;
      if (measurementLayer.value) {
        map.value.removeLayer(measurementLayer.value);
        measurementLayer.value = null;
      }
      measurementPoints.value = [];
      const center = map.value.getCenter();
      try {
        const response = await axios.post(
          `${API_BASE_URL}/markers`,
          {
            coordinates: [center.lat, center.lng],
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        createMarker([center.lat, center.lng], response.data._id);
      } catch (error) {
        console.error("Save marker error:", error);
      }
    };

    const deleteMarker = async (markerId) => {
      try {
        await axios.delete(`${API_BASE_URL}/markers/${markerId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const marker = markers.value.get(markerId);
        if (marker) {
          map.value.removeLayer(marker);
          markers.value.delete(markerId);
        }
      } catch (error) {
        console.error("Delete marker error:", error);
      }
    };

    const fetchFiles = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/files`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        files.value = response.data;
      } catch (error) {
        console.error("Error fetching files:", error);
      }
    };
    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        await fetchFiles();
      } catch (error) {
        console.error("Upload error:", error);
      }
    };

    const loadFileLayers = async () => {
      for (const file of files.value) {
        file.visible = false;
        debugger
        if (layers.value.has(file._id)) continue;

        try {
          const response = await axios.get(
            `${API_BASE_URL}/upload/${file.filename}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          const layer = L.geoJSON(response.data, {
            style: {
              fillColor: "#3388ff",
              weight: 2,
              opacity: 1,
              color: "#3388ff",
              fillOpacity: 0.2,
            },
            onEachFeature: (feature, layer) => {
              // Enhanced hover card with more detailed information
              const popupContent = `
                <div class="hover-card">
                  <h4>${file.filename}</h4>
                  <div class="properties-list">
                    ${Object.entries(feature.properties || {})
                      .map(
                        ([key, value]) => `
                        <div class="property-item">
                          <strong>${key}:</strong>
                          <span>${value}</span>
                        </div>
                      `
                      )
                      .join("")}
                  </div>
                  <div class="metadata mt-2">
                    <small>Layer Type: ${feature.geometry.type}</small>
                  </div>
                </div>
              `;

              layer.bindPopup(popupContent);

              // Hover events with highlight effect
              layer.on("mouseover", function (e) {
                this.setStyle({
                  fillColor: "#ff7800",
                  color: "#ff7800",
                });
                this.openPopup();
              });

              layer.on("mouseout", function (e) {
                this.setStyle({
                  fillColor: "#3388ff",
                  color: "#3388ff",
                });
                // this.closePopup();
              });
            },
          });

          layers.value.set(file._id, layer);
        } catch (error) {
          console.error("Load layer error:", error);
        }
      }
    };

    // Make  available to the window object for popup button
    if (typeof window !== "undefined") {
      window.deleteMarker = deleteMarker;
      window.editShape = editShape;
      window.deleteShape = deleteShape;
    }

    const toggleLayer = (file) => {
      const layer = layers.value.get(file._id);
      if (layer) {
        if (file.visible) {
          map.value.addLayer(layer);
        } else {
          map.value.removeLayer(layer);
        }
      }
    };

    const handleMeasurementClick = (e) => {
      const point = [e.latlng.lat, e.latlng.lng];
      measurementPoints.value.push(point);

      if (measurementPoints.value.length === 1) {
        // First point
        L.marker(point).addTo(map.value);
      } else if (measurementPoints.value.length === 2) {
        // Second point - calculate distance
        L.marker(point).addTo(map.value);

        const distanceMeters = map.value.distance(
          measurementPoints.value[0],
          measurementPoints.value[1]
        );

        // Draw line between points
        if (measurementLayer.value) {
          map.value.removeLayer(measurementLayer.value);
        }

        measurementLayer.value = L.polyline(measurementPoints.value, {
          color: "red",
          weight: 3,
        }).addTo(map.value);

        // Update measurement result
        measurementResult.value = {
          km: (distanceMeters / 1000).toFixed(2),
          miles: (distanceMeters * 0.000621371).toFixed(2),
        };

        // Reset for next measurement
        measurementPoints.value = [];
      }
    };

    const handleDrawCreate = async (e) => {
      const layer = e.layer;
      const geoJson = layer.toGeoJSON();

      try {
        const response = await axios.post(
          `${API_BASE_URL}/shapes`,
          {
            type: geoJson.geometry.type,
            coordinates: geoJson.geometry.coordinates,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.status === 201) {
          // Add the shape to the map after saving
          alert("Shape created successfully");
          drawnItems.addLayer(layer);
          getShapes();
        } else {
          console.error("Failed to save shape:", response);
        }
      } catch (error) {
        console.error("Save shape error:", error);
      }
    };

    const handleDrawEdit = async (e) => {
      debugger;
      const layers = e.layers;
      layers.eachLayer(async (layer) => {
        if (!layer.id) return;
        const geoJson = layer.toGeoJSON();

        try {
          const res = await axios.put(
            `${API_BASE_URL}/shapes/${layer.id}`,
            {
              coordinates: geoJson.geometry.coordinates,
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (res.status === 200) {
            alert("Shape Edited successfully");
            drawnItems.addLayer(layer);
            getShapes();
          }
        } catch (error) {
          console.error("Update shape error:", error);
        }

        isEditing.value = false;
        if (editControl.value) {
          map.value.removeControl(editControl.value);
          map.value.addControl(drawControl.value);
        }
      });
    };

    const toggleMeasurement = () => {
      isMeasuring.value = !isMeasuring.value;
      if (isMeasuring.value) {
        map.value.removeControl(drawControl.value);
        map.value.on("click", handleMeasurementClick);
      } else {
        map.value.off("click", handleMeasurementClick);
        measurementResult.value = null;
        if (measurementLayer.value) {
          map.value.removeLayer(measurementLayer.value);
          measurementLayer.value = null;
        }
        measurementPoints.value = [];
      }
    };
    const toggleDrawing = () => {
      isDrawing.value = !isDrawing.value;
      if (isDrawing.value) {
        map.value.off("click", handleMeasurementClick);
        measurementResult.value = null;
        if (measurementLayer.value) {
          map.value.removeLayer(measurementLayer.value);
          measurementLayer.value = null;
        }
        measurementPoints.value = [];
        map.value.addControl(drawControl.value); // Adds the drawing controls to the map
      } else {
        map.value.removeControl(drawControl.value); // Removes the drawing controls from the map
      }
    };
    const adjustFileName = (name) => {
      let filename = name.split("-")[1];
      if (filename) return filename;
      return name;
    };

    const getShapes= async ()=>{
      await fetchShapes();
      await loadSavedShapes();
    } 
    onMounted(async () => {
      const token = localStorage.getItem("token");
      if (token) {
        isAuthenticated.value = true;
        await initializeMap();
        await fetchFiles();
        await loadFileLayers();
        await fetchShapes();
        await loadSavedShapes();
      }
    });

    return {
      isAuthenticated,
      files,
      isDrawing,
      isMeasuring,
      measurementResult,
      handleFileUpload,
      toggleLayer,
      toggleDrawing,
      toggleMeasurement,
      addMarker,
      deleteMarker,
      adjustFileName,
      shapes,
      isEditing,
      toggleShape,
      editShape,
      deleteShape,
      visibleShapesCount,
      showMoreShapes,
    };
  },
};
</script>

<style>
.main-container {
  height: 100vh;
}

.sidebar {
  width: 400px;
  overflow-y: auto;
}

.map-container {
  height: 100vh;
}

#map {
  width: 100%;
  height: 100%;
}

.hover-card {
  padding: 10px;
  max-width: 300px;
}

.btn {
  margin: 5px 0;
  width: 100%;
}

.shape-item {
  border: 1px solid #dee2e6;
  padding: 8px;
  border-radius: 4px;
}

.shape-item .btn-group {
  margin-left: 8px;
}

.btn-group-sm > .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.hover-card button {
  width: 100%;
  margin-top: 0.5rem;
}
</style>
