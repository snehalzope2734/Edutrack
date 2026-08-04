import api from "./axiosConfig";

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (email, otp, newPassword) => api.post("/auth/reset-password", { email, otp, newPassword }),
  me: () => api.get("/auth/me"),
};
