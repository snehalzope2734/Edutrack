import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { examApi } from "../../api/examApi";
import { marksApi } from "../../api/marksApi";

export default function MarksEntryPage() {
  const [profile, setProfile] = useState(null);
  const [subjectId, setSubjectId] = useState("");
  const [examTypes, setExamTypes] = useState([]);
  const [examTypeId, setExamTypeId] = useState("");
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState({}); // studentId -> { marksObtained, remarks }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const [typesRes, studentsRes, existingRes] = await Promise.all([
        examApi.listTypes(selectedSubject.classId),
        teacherApi.students(selectedSubject.classId),
        Promise.resolve(null),
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
      data.forEach((m) => { existing[m.studentId] = { marksObtained: m.marksObtained ?? "", remarks: m.remarks ?? "" }; });
      setRows(existing);
    })();
  }, [selectedSubject, examTypeId, subjectId]);

  const setRow = (studentId, field, value) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const submit = async () => {
    if (!examTypeId) {
      toast.error("Choose an exam type first");
      return;
    }
    setSaving(true);
    try {
      const records = students
        .filter((s) => rows[s.id]?.marksObtained !== undefined && rows[s.id]?.marksObtained !== "")
        .map((s) => ({
          studentId: s.id,
          marksObtained: Number(rows[s.id].marksObtained),
          remarks: rows[s.id].remarks || null,
        }));
      if (records.length === 0) {
        toast.error("Enter at least one mark");
        setSaving(false);
        return;
      }
      const { data } = await marksApi.enter({ classId: selectedSubject.classId, subjectId, examTypeId, records });
      toast.success(`Saved marks for ${data.recordsUpserted} student(s)`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save marks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Marks Entry" subtitle="Enter marks for a class, subject, and exam" />

      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {profile.subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName} — Class {s.className}</option>)}
            </select>
            <select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {examTypes.length === 0 && <option value="">No exam types configured</option>}
              {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name} (max {t.maxMarks})</option>)}
            </select>
            <button onClick={submit} disabled={saving} className="ml-auto flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save marks"}
            </button>
          </div>

          {students.length === 0 ? (
            <EmptyState title="No students in this class" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Roll No.</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Marks</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2">{s.rollNumber}</td>
                      <td className="px-4 py-2">{s.name}</td>
                      <td className="px-4 py-2">
                        <input type="number" step="0.01" value={rows[s.id]?.marksObtained ?? ""}
                          onChange={(e) => setRow(s.id, "marksObtained", e.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={rows[s.id]?.remarks ?? ""} onChange={(e) => setRow(s.id, "remarks", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
