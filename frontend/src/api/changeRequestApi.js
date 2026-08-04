import api from "./axiosConfig";

export const changeRequestApi = {
  list: (params) => api.get("/change-requests", { params }),
  my: () => api.get("/change-requests/my"),
  create: (data) => api.post("/change-requests", data),
  review: (id, payload) => api.put(`/change-requests/${id}/review`, payload),
};
