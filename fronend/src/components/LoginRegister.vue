// components/LoginRegister.vue
<template>
  <div class="auth-form">
    <div class="form-toggle">
      <button 
        @click="isLogin = true" 
        :class="{ active: isLogin }"
      >
        Login
      </button>
      <button 
        @click="isLogin = false" 
        :class="{ active: !isLogin }"
      >
        Register
      </button>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>Username</label>
        <input 
          type="text" 
          v-model="formData.username" 
          required
        />
      </div>

      <div v-if="!isLogin" class="form-group">
        <label>Email</label>
        <input 
          type="email" 
          v-model="formData.email" 
          required
        />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input 
          type="password" 
          v-model="formData.password" 
          required
        />
      </div>

      <button type="submit" class="submit-btn">
        {{ isLogin ? 'Login' : 'Register' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';

export default {
  name: 'LoginRegister',
  emits: ['auth-success'],
  setup(props, { emit }) {
    const isLogin = ref(true);
    const formData = ref({
      username: '',
      email: '',
      password: ''
    });

    const API_BASE_URL = 'http://localhost:5000/api';

    const handleSubmit = async () => {
      debugger
      try {
        const endpoint = isLogin.value ? 'login' : 'register';
        const response = await axios.post(`${API_BASE_URL}/${endpoint}`, formData.value);
        debugger
        if (!isLogin.value) {
          // If registration successful, switch to login
          isLogin.value = true;
          formData.value = { username: '', email: '', password: '' };
          alert('Registration successful! Please login.');
          return;
        }

        // Handle login success
        emit('auth-success', response.data.token);
      } catch (error) {
        alert(error.response?.data?.message || 'An error occurred');
      }
    };

    return {
      isLogin,
      formData,
      handleSubmit
    };
  }
};
</script>

<style scoped>
.auth-form {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
}

.form-toggle {
  display: flex;
  margin-bottom: 2rem;
  gap: 1rem;
}

.form-toggle button {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
}

.form-toggle button.active {
  background: #4CAF50;
  color: white;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn:hover {
  background: #45a049;
}
</style>