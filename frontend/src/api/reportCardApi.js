import api from "./axiosConfig";

export const reportCardApi = {
  listForStudent: (studentId) =>
    api.get(`/report-cards/student/${studentId}`),

  create: (data) =>
    api.post("/report-cards", data),

  remove: (id) =>
    api.delete(`/report-cards/${id}`),

  // Get all exam types
  examTypes: (classId) =>
    api.get("/exam-types", {
      params: {
        classId,
      },
    }),

  // Download/Open PDF
  downloadPdf: (studentId, examTypeId) =>
    api.get(
      `/report-cards/student/${studentId}/exam/${examTypeId}/pdf`,
      {
        responseType: "blob",
      }
    ),
};