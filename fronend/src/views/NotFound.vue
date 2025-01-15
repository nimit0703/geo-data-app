// src/views/NotFound.vue
<template>
  <div class="not-found">
    <h2>404 - Page Not Found</h2>
    <p>The page you're looking for doesn't exist.</p>
    <router-link to="/" class="home-link">Return to Home</router-link>
  </div>
</template>

<script>
export default {
  name: 'NotFound'
};
</script>