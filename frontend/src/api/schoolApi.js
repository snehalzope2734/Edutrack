import api from "./axiosConfig";

export const schoolApi = {
  get: () => api.get("/school"),
  update: (data) => api.put("/school", data),
};
