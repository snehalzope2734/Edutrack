import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { adminApi } from "../../api/adminApi";

export default function ExamManagementPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [types, setTypes] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeForm, setTypeForm] = useState({ name: "", maxMarks: 100, weightage: "" });
  const [scheduleForm, setScheduleForm] = useState({ subjectId: "", examTypeId: "", examDate: "", startTime: "", venue: "" });

  useEffect(() => {
    (async () => {
      const { data } = await adminApi.listClasses();
      setClasses(data);
      if (data.length) setClassId(data[0].id);
      setLoading(false);
    })();
  }, []);

  const loadClassData = async (cid) => {
    if (!cid) return;
    const [subjectsRes, typesRes, scheduleRes] = await Promise.all([
      adminApi.listSubjects(cid),
      adminApi.listExamTypes({ classId: cid }),
      adminApi.listExamSchedule(cid),
    ]);
    setSubjects(subjectsRes.data);
    setTypes(typesRes.data);
    setSchedule(scheduleRes.data);
  };

  useEffect(() => { loadClassData(classId); }, [classId]);

  const addType = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createExamType({ ...typeForm, classId, academicYear: "2026-2027", weightage: typeForm.weightage || null });
      toast.success("Exam type added");
      setTypeForm({ name: "", maxMarks: 100, weightage: "" });
      loadClassData(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add exam type");
    }
  };

  const removeType = async (id) => {
    try {
      await adminApi.deleteExamType(id);
      loadClassData(classId);
    } catch {
      toast.error("Could not delete — it may already have marks recorded");
    }
  };

  const addSchedule = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createExamSchedule([{ ...scheduleForm, classId }]);
      toast.success("Exam scheduled");
      setScheduleForm({ subjectId: "", examTypeId: "", examDate: "", startTime: "", venue: "" });
      loadClassData(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not schedule exam");
    }
  };

  const removeSchedule = async (id) => {
    await adminApi.deleteExamSchedule(id);
    loadClassData(classId);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle="Manage exam types and the exam schedule"
        action={
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {classes.map((c) => <option key={c.id} value={c.id}>Class {c.className}{c.section}</option>)}
          </select>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 font-medium text-slate-900">Exam types</p>
          <ul className="mb-4 space-y-2">
            {types.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{t.name} — max {t.maxMarks}{t.weightagePct ? ` (${t.weightagePct}%)` : ""}</span>
                <button onClick={() => removeType(t.id)}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" /></button>
              </li>
            ))}
            {types.length === 0 && <EmptyState title="No exam types yet" />}
          </ul>
          <form onSubmit={addType} className="flex flex-wrap gap-2">
            <input required placeholder="Name (e.g. UT1)" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <input required type="number" placeholder="Max marks" value={typeForm.maxMarks} onChange={(e) => setTypeForm({ ...typeForm, maxMarks: e.target.value })}
              className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <input type="number" placeholder="Weightage %" value={typeForm.weightage} onChange={(e) => setTypeForm({ ...typeForm, weightage: e.target.value })}
              className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <button className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="mb-3 font-medium text-slate-900">Exam schedule</p>
          <ul className="mb-4 space-y-2">
            {schedule.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>{format(new Date(s.examDate), "MMM d")} — {s.subjectName} ({s.examTypeName})</span>
                <button onClick={() => removeSchedule(s.id)}><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" /></button>
              </li>
            ))}
            {schedule.length === 0 && <EmptyState title="No exams scheduled yet" />}
          </ul>
          <form onSubmit={addSchedule} className="flex flex-wrap gap-2">
            <select required value={scheduleForm.subjectId} onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="">Subject…</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select required value={scheduleForm.examTypeId} onChange={(e) => setScheduleForm({ ...scheduleForm, examTypeId: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="">Exam…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input required type="date" value={scheduleForm.examDate} onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <input placeholder="Venue" value={scheduleForm.venue} onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })}
              className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            <button className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
