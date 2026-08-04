import api from "./axiosConfig";

export const notificationApi = {
  list: (params) => api.get("/notifications", { params }),
  create: (data) => api.post("/notifications", data),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  remove: (id) => api.delete(`/notifications/${id}`),
};
