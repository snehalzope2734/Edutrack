// src/api/adminApi.js
import api from "./axiosConfig";

export const adminApi = {
  // Teachers
  listTeachers: (params) => api.get("/admin/teachers", { params }),
  createTeacher: (data) => api.post("/admin/teachers", data),
  getTeacher: (id) => api.get(`/admin/teachers/${id}`),
  updateTeacher: (id, data) => api.put(`/admin/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/admin/teachers/${id}`),

  // Students
  listStudents: (params) => api.get("/admin/students", { params }),
  createStudent: (data) => api.post("/admin/students", data),
  getStudent: (id) => api.get(`/admin/students/${id}`),
  updateStudent: (id, data) => api.put(`/admin/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/admin/students/${id}`),

  // Classes
  listClasses: (params) => api.get("/admin/classes", { params }),
  createClass: (data) => api.post("/admin/classes", data),
  getClass: (id) => api.get(`/admin/classes/${id}`),
  updateClass: (id, data) => api.put(`/admin/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/admin/classes/${id}`),
  classStudents: (id, params) => api.get(`/admin/classes/${id}/students`, { params }),
  classTimetable: (id) => api.get(`/admin/classes/${id}/timetable`),

  // Subjects
  listSubjects: (params) => api.get("/admin/subjects", { params }),
  createSubject: (data) => api.post("/admin/subjects", data),
  getSubject: (id) => api.get(`/admin/subjects/${id}`),
  updateSubject: (id, data) => api.put(`/admin/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),

  // Exam types + schedule
  listExamTypes: (params) => api.get("/admin/exam-types", { params }),
  createExamType: (data) => api.post("/admin/exam-types", data),
  updateExamType: (id, data) => api.put(`/admin/exam-types/${id}`, data),
  deleteExamType: (id) => api.delete(`/admin/exam-types/${id}`),

  listExamSchedule: (classId, examTypeId) => api.get("/admin/exam-schedule", { params: { classId, examTypeId } }),
  createExamSchedule: (items) => api.post("/admin/exam-schedule", items),
  deleteExamSchedule: (id) => api.delete(`/admin/exam-schedule/${id}`),

  // Timetable
  getTimetable: (classId) => api.get(`/timetable/${classId}`),
  saveTimetable: (classId, items) => api.post(`/admin/timetable?classId=${classId}`, items),
  deleteTimetableSlot: (id) => api.delete(`/admin/timetable/${id}`),
};