import api from "./axiosConfig";

export const materialApi = {
  list: (params) => api.get("/materials", { params }),
  create: (data) => api.post("/materials", data),
  remove: (id) => api.delete(`/materials/${id}`),
};
