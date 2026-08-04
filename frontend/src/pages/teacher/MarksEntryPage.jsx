import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileDown,
  GraduationCap,
  Save,
  Search,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { ResponsiveContainer, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { examApi } from "../../api/examApi";
import { marksApi } from "../../api/marksApi";
import { reportCardApi } from "../../api/reportCardApi";

const remarkOptions = ["Excellent", "Very Good", "Good", "Average", "Needs Improvement"];

function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function computeGrade(marks, maxMarks) {
  const percent = maxMarks ? (Number(marks) / Number(maxMarks)) * 100 : 0;
  if (Number.isNaN(percent) || !Number.isFinite(percent)) return "—";
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 40) return "D";
  return "F";
}

function computeStatus(marks, maxMarks) {
  const percent = maxMarks ? (Number(marks) / Number(maxMarks)) * 100 : 0;
  if (percent >= 90) return "Excellent";
  if (percent >= 80) return "Very Good";
  if (percent >= 70) return "Good";
  if (percent >= 50) return "Average";
  return "Needs Improvement";
}

export default function MarksEntryPage() {
  const [profile, setProfile] = useState(null);
  const [subjectId, setSubjectId] = useState("");
  const [examTypes, setExamTypes] = useState([]);
  const [examTypeId, setExamTypeId] = useState("");
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      if (data.subjects?.length) setSubjectId(data.subjects[0].subjectId);
      setLoading(false);
    })();
  }, []);

  const selectedSubject = profile?.subjects?.find((s) => s.subjectId === subjectId);

  useEffect(() => {
    if (!selectedSubject) return;
    (async () => {
      const [typesRes, studentsRes] = await Promise.all([
        examApi.listTypes(selectedSubject.classId),
        teacherApi.students(selectedSubject.classId),
      ]);
      setExamTypes(typesRes.data);
      setStudents(studentsRes.data);
      if (typesRes.data.length && !examTypeId) setExamTypeId(typesRes.data[0].id);
    })();
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || !examTypeId) return;
    (async () => {
      const { data } = await marksApi.classMarks(selectedSubject.classId, { subjectId, examTypeId });
      const existing = {};
      data.forEach((m) => {
        existing[m.studentId] = { marksObtained: m.marksObtained ?? "", remarks: m.remarks ?? "", status: "saved" };
      });
      setRows(existing);
      setSaveState("idle");
      setHasChanges(false);
    })();
  }, [selectedSubject, examTypeId, subjectId]);

  useEffect(() => {
    if (!selectedExam && examTypes.length) {
      setSelectedExam(examTypes[0]);
    }
  }, [examTypes, selectedExam]);

  useEffect(() => {
    if (examTypeId && examTypes.length) {
      const active = examTypes.find((exam) => exam.id === examTypeId);
      setSelectedExam(active || null);
    }
  }, [examTypeId, examTypes]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "You have unsaved marks. Leave anyway?";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges]);

  const setRow = (studentId, field, value) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value, status: "saving" } }));
    setSaveState("saving");
    setHasChanges(true);
  };

  const submit = async (mode = "draft") => {
    if (!examTypeId) {
      toast.error("Choose an exam type first");
      return;
    }
    setSaving(true);
    setSaveState("saving");
    try {
      const records = students
        .filter((s) => rows[s.id]?.marksObtained !== undefined && rows[s.id]?.marksObtained !== "")
        .map((s) => ({
          studentId: s.id,
          marksObtained: Number(rows[s.id].marksObtained),
          remarks: rows[s.id].remarks || null,
        }));
      if (records.length === 0) {
        throw new Error("Enter at least one mark");
      }
      const { data } = await marksApi.enter({ classId: selectedSubject.classId, subjectId, examTypeId, records });
      setRows((prev) => Object.fromEntries(Object.entries(prev).map(([id, row]) => [id, { ...row, status: "saved" }])));
      setSaveState("saved");
      setHasChanges(false);
      toast.success(mode === "publish" ? `Published marks for ${data.recordsUpserted} student(s)` : `Saved draft for ${data.recordsUpserted} student(s)`);
    } catch (err) {
      setSaveState("failed");
      toast.error(err.response?.data?.message || err.message || "Could not save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReport = async (studentId) => {
    if (!selectedExam?.id) return;
    setReportLoading(true);
    try {
      const { data } = await reportCardApi.downloadPdf(studentId, selectedExam.id);
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1500);
      toast.success("Report card opened");
    } catch (e) {
      toast.error("Could not generate report card");
    } finally {
      setReportLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => !query || student.name?.toLowerCase().includes(query) || student.rollNumber?.toLowerCase().includes(query));
  }, [students, search]);

  const completion = students.length ? Math.round((Object.values(rows).filter((row) => Number(row?.marksObtained) >= 0).length / students.length) * 100) : 0;
  const averageMarks = students.length ? Math.round(students.reduce((sum, student) => sum + (Number(rows[student.id]?.marksObtained) || 0), 0) / students.length) : 0;
  const highestMark = students.length ? Math.max(...students.map((student) => Number(rows[student.id]?.marksObtained) || 0), 0) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Marks Entry" subtitle="Modern marks workflow for class, subject, and exam-driven grading." />

      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned" description="Ask the administrator to assign teaching subjects before entering marks." />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Assessment workspace</p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-900">{selectedSubject?.subjectName || "Select subject"}</h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-500">
                    Follow the assessment flow: select a class, pick a subject, choose an exam, and enter marks with live validation.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">{selectedSubject?.className || "Class"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{selectedExam?.academicYear || "Academic Year"}</span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">{selectedExam?.name || "Exam"}</span>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Students</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{students.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Marks entered</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{Object.values(rows).filter((row) => row?.marksObtained !== "" && row?.marksObtained !== undefined).length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completion</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{completion}%</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Current selection</p>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between"><span>Class</span><strong className="text-slate-900">{selectedSubject?.className || "—"}</strong></div>
                  <div className="flex items-center justify-between"><span>Subject</span><strong className="text-slate-900">{selectedSubject?.subjectName || "—"}</strong></div>
                  <div className="flex items-center justify-between"><span>Exam</span><strong className="text-slate-900">{selectedExam?.name || "—"}</strong></div>
                  <div className="flex items-center justify-between"><span>Max marks</span><strong className="text-slate-900">{selectedExam?.maxMarks || "—"}</strong></div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Autosave</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "failed" ? "Failed" : "Ready"}</p>
                  </div>
                  <Sparkles className="h-6 w-6 text-slate-500" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-3">
                <select value={selectedSubject?.subjectId || ""} onChange={(e) => setSubjectId(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  {profile.subjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName} · {subject.className}</option>)}
                </select>
                <select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                  {examTypes.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · Max {exam.maxMarks}</option>)}
                </select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student..." className="rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => submit("draft")} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Save draft</button>
                <button type="button" onClick={() => submit("publish")} className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">Publish marks</button>
                <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><FileDown className="mr-2 inline h-4 w-4" />Generate reports</button>
              </div>
            </div>
          </section>

          {students.length === 0 ? (
            <EmptyState title="Students will appear here automatically" description="Choose a class, subject, and exam type to load the roster and begin grading." />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Student</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Roll</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Attendance</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Marks</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Grade</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const row = rows[student.id] || {};
                        const maxMarks = selectedExam?.maxMarks ?? 100;
                        const marksValue = row.marksObtained ?? "";
                        const computed = computeGrade(marksValue, maxMarks);
                        const percent = maxMarks ? ((Number(marksValue) || 0) / maxMarks) * 100 : 0;
                        const status = computeStatus(marksValue, maxMarks);
                        return (
                          <tr key={student.id} className="transition hover:bg-slate-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setSelectedStudent(student)} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-sm font-semibold text-white">
                                  {initials(student.name)}
                                </button>
                                <div>
                                  <p className="font-semibold text-slate-900">{student.name}</p>
                                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{student.rollNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-700">{student.rollNumber}</td>
                            <td className="px-4 py-4 text-slate-700">96%</td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxMarks}
                                  value={marksValue}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "") {
                                      setRow(student.id, "marksObtained", "");
                                      return;
                                    }
                                    const numeric = Number(value);
                                    if (numeric < 0) {
                                      toast.error("Marks cannot be negative");
                                      return;
                                    }
                                    if (numeric > maxMarks) {
                                      toast.error(`Marks cannot exceed ${maxMarks}`);
                                      return;
                                    }
                                    setRow(student.id, "marksObtained", numeric);
                                  }}
                                  className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-400"
                                />
                                <div className="h-2 rounded-full bg-slate-100">
                                  <div className="h-2 rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{computed}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{status}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Live analytics</p>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Average</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{averageMarks}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Highest</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{highestMark}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pending</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{students.length - Object.values(rows).filter((row) => row?.marksObtained !== "" && row?.marksObtained !== undefined).length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Top performers</p>
                  <div className="mt-4 space-y-3">
                    {filteredStudents.slice(0, 3).map((student) => (
                      <div key={student.id} className="flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-sm text-slate-500">{student.rollNumber}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{rows[student.id]?.marksObtained || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Needs attention</p>
                  <div className="mt-4 space-y-3">
                    {filteredStudents.filter((student) => Number(rows[student.id]?.marksObtained) < 40).slice(0, 3).map((student) => (
                      <div key={student.id} className="flex items-center justify-between rounded-3xl bg-rose-50 px-4 py-3">
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="text-sm text-slate-500">{student.rollNumber}</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">{rows[student.id]?.marksObtained || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/50 p-4 lg:p-8">
          <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Student profile</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedStudent.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedStudent(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700">Close</button>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[1.75rem] bg-slate-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-sky-500 text-xl font-semibold text-white">{initials(selectedStudent.name)}</div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedStudent.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Roll No. {selectedStudent.rollNumber}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attendance</p><p className="mt-2 text-xl font-semibold text-slate-900">96%</p></div>
                  <div className="rounded-3xl bg-white p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Average</p><p className="mt-2 text-xl font-semibold text-slate-900">84%</p></div>
                </div>
                <div className="mt-5 rounded-3xl bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Guardian</p>
                  <p className="mt-2 font-semibold text-slate-900">—</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-[1.75rem] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Performance</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">Marks trend</p>
                    </div>
                    <BarChart3 className="h-6 w-6 text-slate-500" />
                  </div>
                  <div className="mt-5 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ name: "UT1", value: 78 }, { name: "UT2", value: 84 }, { name: "Half Yearly", value: 81 }, { name: "Annual", value: 89 }]}> 
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0EA5E9" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => handleOpenReport(selectedStudent.id)} className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white">Open report</button>
              <button type="button" onClick={() => setSelectedStudent(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
