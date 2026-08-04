import axios from "axios";

// In the monolith deployment the frontend is served by the same Spring Boot
// app it talks to, so a relative "/api" base works both in prod and in dev
// (Vite's dev server proxies /api to the backend — see vite.config.js).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("edutrack_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("edutrack_token");
      localStorage.removeItem("edutrack_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
