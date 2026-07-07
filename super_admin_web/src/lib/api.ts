import axios from 'axios';

// Create an Axios instance configured to point to our FastAPI backend
const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach the JWT token to every request automatically
api.interceptors.request.use(
  (config) => {
    // We only access localStorage on the client side (browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // If token is invalid/expired, forcefully clear it so the user has to login again
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        // We do not redirect here automatically to avoid infinite loops on /login, 
        // the AuthContext will handle state changes.
      }
    }
    return Promise.reject(error);
  }
);

export default api;
