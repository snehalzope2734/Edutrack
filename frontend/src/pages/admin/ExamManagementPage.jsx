import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  Filter,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { format, isFuture, isPast, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { adminApi } from "../../api/adminApi";

const initialTypeForm = { name: "", maxMarks: 100, weightage: "" };
const initialScheduleForm = { subjectId: "", examTypeId: "", examDate: "", startTime: "", venue: "", selectedSubjectIds: [] };

function getTodayValue() {
  return new Date().toISOString().split("T")[0];
}

function getStatusBadge(examDate, startTime) {
  const examDateTime = new Date(`${examDate}T${startTime || "00:00"}`);
  const now = new Date();

  if (isToday(examDateTime)) return { label: "Today", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (isFuture(examDateTime)) return { label: "Upcoming", tone: "bg-sky-50 text-sky-700 ring-sky-200" };
  if (isPast(examDateTime)) return { label: "Completed", tone: "bg-slate-100 text-slate-700 ring-slate-200" };
  return { label: "Upcoming", tone: "bg-sky-50 text-sky-700 ring-sky-200" };
}

export default function ExamManagementPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [types, setTypes] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("schedule");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeForm, setTypeForm] = useState(initialTypeForm);
  const [scheduleForm, setScheduleForm] = useState({ ...initialScheduleForm, examDate: getTodayValue() });
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await adminApi.listClasses();
        setClasses(data);
        if (data.length) setClassId(data[0].id);
      } catch {
        toast.error("Unable to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadClassData = async (cid) => {
    if (!cid) return;
    setLoading(true);
      try {
      const [subjectsRes, typesRes, scheduleRes] = await Promise.all([
        adminApi.listSubjects({ classId: cid }),
        adminApi.listExamTypes({ classId: cid }),
        adminApi.listExamSchedule(cid),
      ]);
      setSubjects(subjectsRes.data);
      setTypes(typesRes.data);
      setSchedule(scheduleRes.data);
    } catch {
      toast.error("Unable to refresh exam data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) loadClassData(classId);
  }, [classId]);

  const summaryCards = useMemo(() => {
    const upcoming = schedule.filter((item) => getStatusBadge(item.examDate, item.startTime).label === "Upcoming").length;
    const completed = schedule.filter((item) => getStatusBadge(item.examDate, item.startTime).label === "Completed").length;
    return [
      { label: "Total Exam Types", value: types.length, icon: ListChecks, tone: "from-brand-600 to-brand-500" },
      { label: "Scheduled Exams", value: schedule.length, icon: CalendarDays, tone: "from-sky-600 to-sky-500" },
      { label: "Upcoming", value: upcoming, icon: Sparkles, tone: "from-emerald-600 to-emerald-500" },
      { label: "Completed", value: completed, icon: CheckCircle2, tone: "from-slate-600 to-slate-500" },
    ];
  }, [schedule, types]);

  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      const matchesStatus = statusFilter === "all" || getStatusBadge(item.examDate, item.startTime).label.toLowerCase() === statusFilter;
      const matchesType = typeFilter === "all" || item.examTypeName?.toLowerCase() === typeFilter.toLowerCase();
      const matchesDateFrom = !dateFrom || item.examDate >= dateFrom;
      const matchesDateTo = !dateTo || item.examDate <= dateTo;
      return matchesStatus && matchesType && matchesDateFrom && matchesDateTo;
    });
  }, [schedule, statusFilter, typeFilter, dateFrom, dateTo]);

  const duplicateTypeName = useMemo(() => {
    const candidate = typeForm.name.trim().toLowerCase();
    if (!candidate) return false;
    return types.some((type) => type.name?.trim().toLowerCase() === candidate && type.id !== editingTypeId);
  }, [typeForm.name, types, editingTypeId]);

  const duplicateScheduleSubjects = useMemo(() => {
    const selectedSubjects = scheduleForm.selectedSubjectIds.length ? scheduleForm.selectedSubjectIds : scheduleForm.subjectId ? [scheduleForm.subjectId] : [];
    if (!scheduleForm.examTypeId || !selectedSubjects.length) return [];
    return selectedSubjects.filter((subjectId) => schedule.some((item) => item.subjectId === subjectId && item.examTypeId === scheduleForm.examTypeId));
  }, [schedule, scheduleForm.examTypeId, scheduleForm.selectedSubjectIds, scheduleForm.subjectId]);

  const canSubmitSchedule = scheduleForm.examTypeId && ((scheduleForm.selectedSubjectIds.length > 0) || scheduleForm.subjectId) && scheduleForm.examDate && scheduleForm.venue?.trim() && !duplicateScheduleSubjects.length;

  const resetTypeForm = () => {
    setTypeForm(initialTypeForm);
    setEditingTypeId(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({ ...initialScheduleForm, examDate: getTodayValue() });
    setEditingScheduleId(null);
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    if (!classId) {
      toast.error("Choose a class before creating an exam type");
      return;
    }
    if (!typeForm.name.trim()) {
      toast.error("Exam name is required");
      return;
    }
    if (duplicateTypeName) {
      toast.error("An exam type with that name already exists for this class");
      return;
    }

    setSubmitting(true);
    try {
      if (editingTypeId) {
        await adminApi.updateExamType(editingTypeId, { ...typeForm, classId, academicYear: "2026-2027", weightage: typeForm.weightage || null });
        toast.success("Exam type updated");
      } else {
        await adminApi.createExamType({ ...typeForm, classId, academicYear: "2026-2027", weightage: typeForm.weightage || null });
        toast.success("Exam type added");
      }
      resetTypeForm();
      await loadClassData(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save exam type");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditType = (type) => {
    setTypeForm({ name: type.name || "", maxMarks: type.maxMarks || 100, weightage: type.weightagePct ?? type.weightage ?? "" });
    setEditingTypeId(type.id);
  };

  const confirmDelete = (item) => setPendingDelete(item);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "type") {
      const hasSchedule = schedule.some((item) => item.examTypeId === pendingDelete.id);
      if (hasSchedule) {
        toast.error("This exam type is already used by a schedule and cannot be removed");
        setPendingDelete(null);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (pendingDelete.kind === "type") {
        await adminApi.deleteExamType(pendingDelete.id);
        toast.success("Exam type removed");
      } else {
        await adminApi.deleteExamSchedule(pendingDelete.id);
        toast.success("Schedule removed");
      }
      setPendingDelete(null);
      await loadClassData(classId);
    } catch {
      toast.error("The action could not be completed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!classId) {
      toast.error("Choose a class before scheduling exams");
      return;
    }
    if (!scheduleForm.examTypeId) {
      toast.error("Select an exam type");
      return;
    }
    if (!scheduleForm.examDate) {
      toast.error("Choose an exam date");
      return;
    }
    if (!scheduleForm.venue?.trim()) {
      toast.error("Venue is required");
      return;
    }
    if (duplicateScheduleSubjects.length) {
      toast.error("One or more selected subjects already have this exam scheduled");
      return;
    }

    const subjectsToCreate = (scheduleForm.selectedSubjectIds.length ? scheduleForm.selectedSubjectIds : [scheduleForm.subjectId]).filter(Boolean);
    if (!subjectsToCreate.length) {
      toast.error("Select at least one subject");
      return;
    }

    const payload = subjectsToCreate.map((subjectId) => ({
      subjectId,
      examTypeId: scheduleForm.examTypeId,
      examDate: scheduleForm.examDate,
      startTime: scheduleForm.startTime || null,
      venue: scheduleForm.venue.trim(),
      classId,
    }));

    setSubmitting(true);
    try {
      if (editingScheduleId) {
        await adminApi.deleteExamSchedule(editingScheduleId);
        await adminApi.createExamSchedule(payload);
        toast.success("Schedule updated");
      } else {
        await adminApi.createExamSchedule(payload);
        toast.success(`Created ${payload.length} schedule${payload.length > 1 ? "s" : ""}`);
      }
      resetScheduleForm();
      await loadClassData(classId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditSchedule = (item) => {
    setScheduleForm({
      subjectId: item.subjectId || "",
      selectedSubjectIds: item.subjectId ? [item.subjectId] : [],
      examTypeId: item.examTypeId || "",
      examDate: item.examDate || getTodayValue(),
      startTime: item.startTime || "",
      venue: item.venue || "",
    });
    setEditingScheduleId(item.id);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Management"
        subtitle="Plan exam types and schedule class-wise with a polished, production-ready experience"
        action={
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-medium text-slate-600">Class</span>
            <div className="relative">
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-sm font-medium text-slate-700 outline-none">
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>Class {item.className}{item.section}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5">
              <div className={`inline-flex rounded-2xl bg-gradient-to-r ${card.tone} p-2 text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Exam weightage overview removed. */}
      {/*
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900">Exam weightage overview</p>
            <p className="text-sm text-slate-500">Keep the scoring distribution balanced across exam types.</p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1 ${weightageTone.tone}`}>
            <AlertTriangle className="h-4 w-4" />
            {totalWeightage}% • {weightageTone.label}
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
            <span>Total Weightage</span>
            <span className="font-semibold text-slate-700">{totalWeightage}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${weightageTone.bar}`} style={{ width: `${Math.min(totalWeightage, 100)}%` }} />
          </div>
          {totalWeightage > 100 && <p className="mt-3 text-sm font-medium text-rose-600">⚠ Total weightage exceeds 100%</p>}
        </div>
      */}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">Exam Types</p>
                <p className="text-sm text-slate-500">Create and manage grade categories for this class.</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={handleTypeSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Exam name</label>
                  <input required value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="UT-1, Half Yearly..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                  {duplicateTypeName && <p className="mt-2 text-sm text-rose-600">A type with this name already exists.</p>}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Max marks</label>
                  <input required type="number" min="1" value={typeForm.maxMarks} onChange={(e) => setTypeForm({ ...typeForm, maxMarks: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Weightage %</label>
                  <input type="number" min="0" max="100" value={typeForm.weightage} onChange={(e) => setTypeForm({ ...typeForm, weightage: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{editingTypeId ? "Update the selected exam type" : "Add a new exam category for this class"}</p>
                <div className="flex gap-2">
                  {editingTypeId && <button type="button" onClick={resetTypeForm} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>}
                  <button disabled={submitting || duplicateTypeName} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingTypeId ? "Save changes" : "Create exam type"}
                  </button>
                </div>
              </div>
            </form>

            {types.length === 0 ? (
              <div className="mt-5">
                <EmptyState title="No exam types created yet" description="Use the form above to add UT-1, Half Yearly, or Annual exam categories." />
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Exam name</th>
                      <th className="px-4 py-3 font-medium">Max marks</th>
                      <th className="px-4 py-3 font-medium">Weightage</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {types.map((type) => (
                      <tr key={type.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{type.name}</td>
                        <td className="px-4 py-3 text-slate-600">{type.maxMarks}</td>
                        <td className="px-4 py-3 text-slate-600">{type.weightagePct ?? type.weightage ?? 0}%</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditType(type)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-brand-500 hover:text-brand-600" title="Edit"><Edit3 className="h-4 w-4" /></button>
                            <button onClick={() => confirmDelete({ kind: "type", id: type.id, name: type.name })} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-rose-300 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">Exam Schedule</p>
                <p className="text-sm text-slate-500">Coordinate assessments across subjects and venues.</p>
              </div>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => setView("schedule")} className={`rounded-lg px-3 py-2 text-sm font-medium ${view === "schedule" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}>Schedule</button>
                <button onClick={() => setView("calendar")} className={`rounded-lg px-3 py-2 text-sm font-medium ${view === "calendar" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}>Calendar</button>
              </div>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={handleScheduleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Exam type</label>
                  <select required value={scheduleForm.examTypeId} onChange={(e) => setScheduleForm({ ...scheduleForm, examTypeId: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500">
                    <option value="">Select exam type</option>
                    {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Exam date</label>
                  <input required type="date" min={getTodayValue()} value={scheduleForm.examDate} onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Start time</label>
                  <input type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Venue</label>
                  <input required value={scheduleForm.venue} onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })} placeholder="Hall A, Lab 2..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Subjects</p>
                    <p className="text-sm text-slate-500">Select one or more subjects for bulk scheduling.</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {subjects.map((subject) => {
                    const checked = scheduleForm.selectedSubjectIds.includes(subject.id) || scheduleForm.subjectId === subject.id;
                    return (
                      <label key={subject.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-400">
                        <input type="checkbox" checked={checked} onChange={() => {
                          const next = checked ? scheduleForm.selectedSubjectIds.filter((id) => id !== subject.id) : [...scheduleForm.selectedSubjectIds, subject.id];
                          setScheduleForm({ ...scheduleForm, selectedSubjectIds: next, subjectId: next[0] || "" });
                        }} />
                        <span>{subject.name}</span>
                      </label>
                    );
                  })}
                </div>
                {subjects.length === 0 && <p className="mt-3 text-sm text-slate-500">No subjects available for this class yet.</p>}
              </div>

              {duplicateScheduleSubjects.length > 0 && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span className="font-medium">Duplicate detected:</span> {subjects.find((subject) => subject.id === duplicateScheduleSubjects[0])?.name || "One of the selected subjects"} already has this exam scheduled.
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{editingScheduleId ? "Update the selected schedule entry" : "Create one or more schedules in one step"}</p>
                <div className="flex gap-2">
                  {editingScheduleId && <button type="button" onClick={resetScheduleForm} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>}
                  <button disabled={submitting || !canSubmitSchedule} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {editingScheduleId ? "Save schedule" : "Create schedule"}
                  </button>
                </div>
              </div>
            </form>

            {view === "schedule" ? (
              <div className="mt-5">
                {filteredSchedule.length === 0 ? (
                  <EmptyState title="No schedules match your filters" description="Adjust the search or create a fresh exam slot for this class." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Subject</th>
                          <th className="px-4 py-3 font-medium">Exam type</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Venue</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredSchedule.map((item) => {
                          const status = getStatusBadge(item.examDate, item.startTime);
                          return (
                            <tr key={item.id} className="transition hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800">{item.subjectName}</td>
                              <td className="px-4 py-3 text-slate-600">{item.examTypeName}</td>
                              <td className="px-4 py-3 text-slate-600">{format(new Date(item.examDate), "MMM d, yyyy")}</td>
                              <td className="px-4 py-3 text-slate-600">{item.startTime || "—"}</td>
                              <td className="px-4 py-3 text-slate-600">{item.venue || "—"}</td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${status.tone}`}>{status.label}</span></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => startEditSchedule(item)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-brand-500 hover:text-brand-600" title="Edit"><Edit3 className="h-4 w-4" /></button>
                                  <button onClick={() => confirmDelete({ kind: "schedule", id: item.id, name: item.subjectName })} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-rose-300 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {schedule.map((item) => {
                    const status = getStatusBadge(item.examDate, item.startTime);
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800">{format(new Date(item.examDate), "dd MMM")}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${status.tone}`}>{status.label}</span>
                        </div>
                        <p className="mt-3 text-sm text-slate-700">{item.subjectName}</p>
                        <p className="text-sm text-slate-500">{item.examTypeName}</p>
                        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                          <Clock3 className="h-4 w-4" /> {item.startTime || "Time TBD"}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" /> {item.venue || "Venue TBD"}
                        </div>
                      </div>
                    );
                  })}
                  {schedule.length === 0 && <EmptyState title="No scheduled exams yet" description="Create one from the form above to populate this calendar view." />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-rose-100 p-2 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Confirm deletion</p>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600">Remove <span className="font-semibold text-slate-800">{pendingDelete.name}</span> from the current exam view?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setPendingDelete(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={handleDelete} className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
