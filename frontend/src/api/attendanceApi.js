import api from "./axiosConfig";

// Attendance is recorded ONLY through the Excel-import workflow — there is
// intentionally no "mark attendance" call here. Corrections happen by
// uploading a corrected file again (see preview/confirm below).
export const attendanceApi = {
  previewImport: (file, classId, subjectId, date) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/attendance/imports/preview", form, {
      params: { classId, subjectId, date },
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  confirmImport: (importId) => api.post(`/attendance/imports/${importId}/confirm`),
  discardImport: (importId) => api.post(`/attendance/imports/${importId}/discard`),
  importHistory: (params) => api.get("/attendance/imports", { params }),
  importDetail: (importId) => api.get(`/attendance/imports/${importId}`),

  classGrid: (classId, subjectId, date) => api.get(`/attendance/class/${classId}`, { params: { subjectId, date } }),
  studentRecords: (studentId, params) => api.get(`/attendance/student/${studentId}`, { params }),
  studentSummary: (studentId) => api.get(`/attendance/student/${studentId}/summary`),
};
