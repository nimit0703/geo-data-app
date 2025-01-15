import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import 'bootstrap';

const app = createApp(App)
app.use(router)
app.mount('#app')