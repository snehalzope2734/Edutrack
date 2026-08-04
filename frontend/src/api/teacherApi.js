import api from "./axiosConfig";

export const teacherApi = {
  me: () => api.get("/teacher/me"),
  students: (classId) => api.get("/teacher/me/students", { params: { classId } }),
};
