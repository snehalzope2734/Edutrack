import api from "./axiosConfig";

export const studentApi = {
  me: () => api.get("/student/me"),
};
