<template>
  <div class="profile container py-5">
    <h2 class="mb-4">User Profile</h2>
    
    <!-- Profile Form Section -->
    <div class="profile-form card shadow-sm p-4 mb-4">
      <div class="form-group mb-3">
        <label for="username" class="form-label">Username</label>
        <input type="text" id="username" class="form-control" v-model="profile.username" readonly />
      </div>
      <div class="form-group mb-3">
        <label for="email" class="form-label">Email</label>
        <input type="email" id="email" class="form-control" v-model="profile.email" readonly />
      </div>
    </div>
    
    <!-- Profile Stats Section -->
    <div class="profile-stats card shadow-sm p-4">
      <h3>Your Activity</h3>
      <ul class="list-group list-group-flush">
        <li class="list-group-item">
          <strong>Files Uploaded:</strong> {{ profile.filesCount }}
        </li>
        <li class="list-group-item">
          <strong>Shapes Created:</strong> {{ profile.shapesCount }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'Profile',
  setup() {
    const profile = ref({
      username: '',
      email: '',
      filesCount: 0,
      shapesCount: 0
    });

    const fetchProfile = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        profile.value = response.data;
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    onMounted(fetchProfile);

    return {
      profile
    };
  }
};
</script>

<style scoped>
/* You can add custom styles if needed */
.profile h2 {
  font-size: 2rem;
  font-weight: 600;
}

.profile-form .form-label {
  font-weight: 500;
}

.profile-form .form-control {
  font-size: 1rem;
}

.profile-stats h3 {
  font-size: 1.5rem;
  font-weight: 500;
}

.profile-stats .list-group-item {
  font-size: 1rem;
  padding: 0.75rem 1.25rem;
}
</style>
