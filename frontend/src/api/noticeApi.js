import api from "./axiosConfig";

export const noticeApi = {
  list: (params) => api.get("/notices", { params }),
  create: (data) => api.post("/notices", data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  remove: (id) => api.delete(`/notices/${id}`),
};
