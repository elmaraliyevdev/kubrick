import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      const isAuthRoute =
        window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/register");
      if (!isAuthRoute) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
