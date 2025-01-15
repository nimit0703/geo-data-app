<template>
  <div class="dashboard container py-5">
    <h2 class="mb-4">Dashboard</h2>
    
    <!-- Stats Grid -->
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mb-4">
      <div class="col">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Total Files</h5>
            <p class="card-text">{{ stats.totalFiles }}</p>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card shadow-sm">
          <div class="card-body">
            <h5 class="card-title">Total Shapes</h5>
            <p class="card-text">{{ stats.totalShapes }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <!-- <div class="recent-activity">
      <h3 class="mb-3">Recent Activity</h3>
      <ul class="list-group">
        <li v-for="activity in recentActivity" :key="activity.id" class="list-group-item">
          {{ activity.description }}
        </li>
      </ul>
    </div> -->
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'Dashboard',
  setup() {
    const stats = ref({ totalFiles: 0, totalShapes: 0 });
    const recentActivity = ref([]);
    const API_BASE_URL = 'http://localhost:5000/api';

    const fetchStats = async () => {
      try {
        const [filesRes, shapesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/files`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }),
          axios.get(`${API_BASE_URL}/shapes`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        stats.value = {
          totalFiles: filesRes.data.length,
          totalShapes: shapesRes.data.length
        };
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    onMounted(fetchStats);

    return {
      stats,
      recentActivity
    };
  }
};
</script>

<style scoped>
/* You can add custom styles if needed */
.dashboard h2 {
  font-size: 2rem;
  font-weight: 600;
}
.card-body {
  text-align: center;
}
.card-title {
  font-size: 1.25rem;
  font-weight: 500;
}
.card-text {
  font-size: 1.5rem;
  font-weight: bold;
}
</style>
