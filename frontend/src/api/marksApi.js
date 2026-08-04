import api from "./axiosConfig";

export const marksApi = {
  enter: (data) => api.post("/marks/enter", data),
  classMarks: (classId, params) => api.get(`/marks/class/${classId}`, { params }),
  studentMarks: (studentId, params) => api.get(`/marks/student/${studentId}`, { params }),
  studentSummary: (studentId) => api.get(`/marks/student/${studentId}/summary`),
  update: (id, data) => api.put(`/marks/${id}`, data),
};
