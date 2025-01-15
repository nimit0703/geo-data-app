// src/views/Home.vue
<template>
  <div class="home d-flex flex-column justify-content-center align-items-center">
    <div class="hero d-flex flex-column justify-content-center align-items-center">
      <h1>Welcome to GeoViz</h1>
      <p>Powerful geospatial visualization platform</p>
      <login-register v-if="!isAuthenticated" @auth-success="handleAuthSuccess" />
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import LoginRegister from '../components/LoginRegister.vue';

export default {
  name: 'Home',
  components: {
    LoginRegister
  },
  setup() {
    const router = useRouter();
    const isAuthenticated = ref(!!localStorage.getItem('token'));

    const handleAuthSuccess = (token) => {
      localStorage.setItem('token', token);
      isAuthenticated.value = true;
      router.push('/dashboard');
    };

    return {
      isAuthenticated,
      handleAuthSuccess
    };
  }
};
</script>
