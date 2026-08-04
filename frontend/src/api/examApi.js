import api from "./axiosConfig";

// Shared read endpoints usable by ADMIN, TEACHER, and STUDENT (backend enforces
// per-role/class ownership). Admin-only writes stay in adminApi.js.
export const examApi = {
  listTypes: (classId, academicYear) => api.get("/exam-types", { params: { classId, academicYear } }),
  listSchedule: (classId, examTypeId) => api.get("/exam-schedule", { params: { classId, examTypeId } }),
};
