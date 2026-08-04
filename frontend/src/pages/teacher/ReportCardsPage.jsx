import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { examApi } from "../../api/examApi";
import { marksApi } from "../../api/marksApi";
import { reportCardApi } from "../../api/reportCardApi";
import { cloudinaryApi } from "../../api/cloudinaryApi";

function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getStatusLabel(card, hasMarksForExam) {
  if (card) return "Uploaded";
  if (hasMarksForExam) return "Pending";
  return "Missing";
}

function getStatusTone(status) {
  if (status === "Uploaded") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "Pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export default function ReportCardsPage() {
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [examTypeId, setExamTypeId] = useState("");
  const [reportCardsByStudent, setReportCardsByStudent] = useState({});
  const [marksByStudent, setMarksByStudent] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [uploadingFor, setUploadingFor] = useState(null);
  const [generatingFor, setGeneratingFor] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [previewPdf, setPreviewPdf] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadStudent, setActiveUploadStudent] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [historyStudent, setHistoryStudent] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
        if (data.subjects?.length) {
          setClassId(data.subjects[0].classId);
        }
      } catch (error) {
        toast.error("Could not load your teaching profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      try {
        const [studentsRes, typesRes] = await Promise.all([
          teacherApi.students(classId),
          examApi.listTypes(classId),
        ]);
        const nextStudents = studentsRes.data || [];
        const nextExamTypes = typesRes.data || [];
        setStudents(nextStudents);
        setExamTypes(nextExamTypes);
        setExamTypeId((nextExamTypes.find((exam) => exam.id === examTypeId) || nextExamTypes[0] || null)?.id || "");
      } catch (error) {
        toast.error("Could not load students or exams for this class");
      }
    })();
  }, [classId]);

  useEffect(() => {
    if (!classId || !examTypeId) {
      setReportCardsByStudent({});
      setMarksByStudent({});
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const [reportsResponses, marksRes] = await Promise.all([
          Promise.all(students.map((student) => reportCardApi.listForStudent(student.id).catch(() => ({ data: [] })))) ,
          marksApi.classMarks(classId, { examTypeId }).catch(() => ({ data: [] })),
        ]);

        if (ignore) return;

        const nextReportCardsByStudent = {};
        students.forEach((student, index) => {
          const cards = reportsResponses[index]?.data ?? [];
          nextReportCardsByStudent[student.id] = cards.filter((card) => card.examTypeId === examTypeId);
        });

        const nextMarksByStudent = {};
        (marksRes.data || []).forEach((mark) => {
          nextMarksByStudent[mark.studentId] = true;
        });

        setReportCardsByStudent(nextReportCardsByStudent);
        setMarksByStudent(nextMarksByStudent);
      } catch (error) {
        toast.error("Could not load report card data");
      }
    })();

    return () => {
      ignore = true;
    };
  }, [classId, examTypeId, students]);

  const classes = useMemo(() => {
    const entries = profile?.subjects?.map((subject) => ({ id: subject.classId, name: subject.className })) || [];
    return [...new Map(entries.map((entry) => [entry.id, entry])).values()];
  }, [profile]);

  const selectedExam = examTypes.find((exam) => exam.id === examTypeId) || null;

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const nextRows = students.map((student) => {
      const cards = reportCardsByStudent[student.id] || [];
      const activeCard = cards[0] || null;
      const status = getStatusLabel(activeCard, Boolean(marksByStudent[student.id]));
      return {
        student,
        card: activeCard,
        status,
      };
    });

    const filtered = nextRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;
      return `${row.student.name || ""} ${row.student.rollNumber || ""}`.toLowerCase().includes(query);
    });

    return filtered.sort((left, right) => {
      if (sortBy === "name") return (left.student.name || "").localeCompare(right.student.name || "");
      if (sortBy === "roll") return (left.student.rollNumber || "").localeCompare(right.student.rollNumber || "");
      if (sortBy === "pending") return left.status === right.status ? 0 : left.status === "Pending" ? -1 : 1;
      return new Date(right.card?.uploadedAt || 0) - new Date(left.card?.uploadedAt || 0);
    });
  }, [students, reportCardsByStudent, marksByStudent, search, statusFilter, sortBy]);

  const summary = useMemo(() => {
    const uploaded = rows.filter((row) => row.status === "Uploaded").length;
    const pending = rows.filter((row) => row.status === "Pending").length;
    const missing = rows.filter((row) => row.status === "Missing").length;
    const completion = rows.length ? Math.round((uploaded / rows.length) * 100) : 0;
    return { students: rows.length, uploaded, pending, missing, completion };
  }, [rows]);

  const refreshData = async () => {
    if (!classId || !examTypeId) return;
    try {
      const [studentsRes, typesRes] = await Promise.all([
        teacherApi.students(classId),
        examApi.listTypes(classId),
      ]);
      const nextStudents = studentsRes.data || [];
      const nextExamTypes = typesRes.data || [];
      setStudents(nextStudents);
      setExamTypes(nextExamTypes);
      const [reportsResponses, marksRes] = await Promise.all([
        Promise.all(nextStudents.map((student) => reportCardApi.listForStudent(student.id).catch(() => ({ data: [] })))),
        marksApi.classMarks(classId, { examTypeId }).catch(() => ({ data: [] })),
      ]);
      const nextReportCardsByStudent = {};
      nextStudents.forEach((student, index) => {
        const cards = reportsResponses[index]?.data ?? [];
        nextReportCardsByStudent[student.id] = cards.filter((card) => card.examTypeId === examTypeId);
      });
      const nextMarksByStudent = {};
      (marksRes.data || []).forEach((mark) => {
        nextMarksByStudent[mark.studentId] = true;
      });
      setReportCardsByStudent(nextReportCardsByStudent);
      setMarksByStudent(nextMarksByStudent);
    } catch (error) {
      toast.error("Could not refresh report cards");
    }
  };

  const uploadReportCard = async (studentId, file) => {
    if (!examTypeId) {
      toast.error("Pick an exam type first");
      return;
    }
    if (!file || file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF size must be 10 MB or less");
      return;
    }

    const existingCard = reportCardsByStudent[studentId]?.[0];
    if (existingCard && !window.confirm("Replace existing report card?")) {
      return;
    }

    setUploadingFor(studentId);
    try {
      const uploaded = await cloudinaryApi.uploadFile(file, `edutrack/report-cards/${studentId}/${examTypeId}`, "edutrack_reports");
      await reportCardApi.create({
        studentId,
        examTypeId,
        academicYear: selectedExam?.academicYear || "2026-2027",
        pdfCloudinaryUrl: uploaded.secure_url,
        pdfCloudinaryPublicId: uploaded.public_id,
      });
      toast.success(existingCard ? "Report card replaced" : "Report card uploaded");
      await refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploadingFor(null);
      setActiveUploadStudent(null);
      setUploadFile(null);
      setDragActive(false);
    }
  };

  const generateAndStoreReportCard = async (studentId) => {
    if (!examTypeId) {
      toast.error("Pick an exam type first");
      return;
    }
    setGeneratingFor(studentId);
    try {
      await reportCardApi.generateAndStore({
        studentId,
        examTypeId,
        academicYear: selectedExam?.academicYear || "2026-2027",
      });
      toast.success("Report card generated and saved");
      await refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not generate report card");
    } finally {
      setGeneratingFor(null);
    }
  };

  const deleteReportCard = async (cardId) => {
    if (!window.confirm("Delete report card? This cannot be undone.")) return;
    try {
      await reportCardApi.remove(cardId);
      toast.success("Report card deleted");
      await refreshData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Delete failed");
    }
  };

  const openPreview = async (row) => {
    const card = row.card;
    if (card?.pdfUrl) {
      setPreviewPdf({ url: card.pdfUrl, title: `${row.student.name} • ${selectedExam?.name || "Report Card"}` });
      return;
    }

    try {
      const { data } = await reportCardApi.downloadPdf(row.student.id, examTypeId);
      const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      setPreviewPdf({ url: blobUrl, title: `${row.student.name} • ${selectedExam?.name || "Report Card"}` });
    } catch (error) {
      toast.error("Could not preview the report card");
    }
  };

  const openDownload = async (row) => {
    const card = row.card;
    if (card?.pdfUrl) {
      window.open(card.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const { data } = await reportCardApi.downloadPdf(row.student.id, examTypeId);
      const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${row.student.rollNumber || row.student.id}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch (error) {
      toast.error("Could not download the report card");
    }
  };

  const handleBulkUpload = async (files) => {
    if (!files?.length) return;
    setBulkUploading(true);
    const results = { uploaded: 0, matched: 0, failed: 0, skipped: 0 };
    try {
      for (const file of files) {
        if (file.type !== "application/pdf") {
          results.failed += 1;
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          results.failed += 1;
          continue;
        }
        const rollNumber = file.name.replace(/\.pdf$/i, "");
        const match = students.find((student) => student.rollNumber?.toLowerCase() === rollNumber.toLowerCase());
        if (!match) {
          results.skipped += 1;
          continue;
        }
        results.matched += 1;
        const uploaded = await cloudinaryApi.uploadFile(file, `edutrack/report-cards/${match.id}/${examTypeId}`, "edutrack_reports");
        await reportCardApi.create({
          studentId: match.id,
          examTypeId,
          academicYear: selectedExam?.academicYear || "2026-2027",
          pdfCloudinaryUrl: uploaded.secure_url,
          pdfCloudinaryPublicId: uploaded.public_id,
        });
        results.uploaded += 1;
      }
      setBulkSummary(results);
      toast.success(`Bulk upload complete: ${results.uploaded} uploaded, ${results.matched} matched, ${results.failed} failed, ${results.skipped} skipped`);
      await refreshData();
    } catch (error) {
      toast.error("Bulk upload did not complete");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleBulkDownload = () => {
    rows.filter((row) => row.card?.pdfUrl).forEach((row) => window.open(row.card.pdfUrl, "_blank", "noopener,noreferrer"));
    toast.success(`Opened ${rows.filter((row) => row.card?.pdfUrl).length} report card(s)`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Report Cards" subtitle="Enterprise-style report card management for your classes and exams." />

      {!profile?.subjects?.length ? (
        <EmptyState title="No teaching assignments" description="Ask the administrator to assign classes before managing report cards." />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overview</p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-900">Classroom report card operations</h2>
                  <p className="mt-3 max-w-2xl text-sm text-slate-500">Review uploads, manage pending students, and keep the report-card workflow organized in one place.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700">{selectedExam?.name || "Exam"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{classes.find((entry) => entry.id === classId)?.name || "Class"}</span>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-100 p-2 text-sky-700"><Users className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Students</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.students}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Uploaded</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.uploaded}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-amber-100 p-2 text-amber-700"><Clock3 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Pending</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.pending}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-200 p-2 text-slate-700"><Layers3 className="h-4 w-4" /></div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completion</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.completion}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Actions</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900">Bulk management</h3>
                </div>
                <Sparkles className="h-6 w-6 text-brand-600" />
              </div>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-white">
                  <UploadCloud className="h-4 w-4" />
                  Bulk Upload
                  <input type="file" className="hidden" accept="application/pdf" multiple onChange={(event) => handleBulkUpload(Array.from(event.target.files || []))} />
                </label>
                <button onClick={handleBulkDownload} type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Archive className="h-4 w-4" />
                  Bulk Download
                </button>
                {bulkSummary && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Upload Summary</p>
                    <p className="mt-2">Uploaded {bulkSummary.uploaded} · Matched {bulkSummary.matched} · Failed {bulkSummary.failed} · Skipped {bulkSummary.skipped}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 md:flex-row">
                <select value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {classes.map((entry) => <option key={entry.id} value={entry.id}>Class {entry.name}</option>)}
                </select>
                <select value={examTypeId} onChange={(event) => setExamTypeId(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  {examTypes.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Search className="h-4 w-4" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student" className="w-full bg-transparent outline-none" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Filter className="h-4 w-4" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="bg-transparent outline-none">
                    <option value="all">All Status</option>
                    <option value="Uploaded">Uploaded</option>
                    <option value="Pending">Pending</option>
                    <option value="Missing">Missing</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <Sparkles className="h-4 w-4" />
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent outline-none">
                    <option value="recent">Recently Uploaded</option>
                    <option value="name">Name</option>
                    <option value="roll">Roll Number</option>
                    <option value="pending">Pending First</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" />
                <span>{summary.uploaded} / {summary.students} uploaded</span>
              </div>
              <div className="flex-1 px-4">
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-brand-500" style={{ width: `${summary.completion}%` }} />
                </div>
              </div>
              <span>{summary.completion}%</span>
            </div>

            {loading ? (
              <div className="mt-6 space-y-3">
                {[...Array(4)].map((_, index) => <div key={index} className="h-24 animate-pulse rounded-[1.5rem] border border-slate-200 bg-slate-100" />)}
              </div>
            ) : rows.length === 0 ? (
              <div className="mt-8 flex justify-center">
                <EmptyState title="No report cards uploaded" description="Generate or upload report cards for this exam to populate the workspace." />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {rows.map((row) => (
                  <article key={row.student.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600/10 text-sm font-semibold text-brand-700">
                          {initials(row.student.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{row.student.name}</p>
                          <p className="mt-1 text-sm text-slate-500">Roll No. {row.student.rollNumber || "—"}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusTone(row.status)}`}>
                        {row.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Exam</p>
                        <p className="mt-2 font-semibold text-slate-900">{selectedExam?.name || "—"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Upload date</p>
                        <p className="mt-2 font-semibold text-slate-900">{row.card?.uploadedAt ? new Date(row.card.uploadedAt).toLocaleDateString() : "Pending Upload"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:col-span-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Teacher</p>
                        <p className="mt-2 font-semibold text-slate-900">{row.card?.uploadedByName || "Pending upload"}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => openPreview(row)} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                        <Eye className="h-4 w-4" />View PDF
                      </button>
                      <button type="button" onClick={() => openDownload(row)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <Download className="h-4 w-4" />Download
                      </button>
                      <button type="button" onClick={() => { setActiveUploadStudent(row.student); setUploadFile(null); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        <UploadCloud className="h-4 w-4" />{row.card ? "Replace PDF" : "Upload"}
                      </button>
                      <button type="button" onClick={() => generateAndStoreReportCard(row.student.id)} disabled={generatingFor === row.student.id} className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60">
                        {generatingFor === row.student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Generate PDF
                      </button>
                      {row.card && (
                        <>
                          <button type="button" onClick={() => setHistoryStudent(row.student)} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <History className="h-4 w-4" />History
                          </button>
                          <button type="button" onClick={() => deleteReportCard(row.card.id)} className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                            <Trash2 className="h-4 w-4" />Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {(activeUploadStudent || uploadFile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Upload report card</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{activeUploadStudent?.name || "Student"}</h3>
              </div>
              <button type="button" onClick={() => { setActiveUploadStudent(null); setUploadFile(null); setDragActive(false); }} className="rounded-full bg-slate-100 p-2 text-slate-600">✕</button>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div className={`rounded-[1.5rem] border border-dashed p-6 transition ${dragActive ? "border-brand-400 bg-brand-50" : "border-slate-300 bg-white"}`} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); const file = event.dataTransfer.files?.[0]; if (file) { setUploadFile(file); } }}>
                <UploadCloud className="mx-auto h-10 w-10 text-brand-600" />
                <p className="mt-4 text-lg font-semibold text-slate-900">Drag PDF Here</p>
                <p className="mt-2 text-sm text-slate-500">or choose a PDF to upload for this student and exam.</p>
                <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
                  Choose PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                </label>
              </div>
            </div>

            {uploadFile && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Selected file</p>
                <p className="mt-1">{uploadFile.name} · {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => uploadReportCard(activeUploadStudent.id, uploadFile)} disabled={!uploadFile || uploadingFor === activeUploadStudent?.id} className="flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
                {uploadingFor === activeUploadStudent?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Upload
              </button>
              <button type="button" onClick={() => { setActiveUploadStudent(null); setUploadFile(null); setDragActive(false); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {previewPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="flex h-full w-full max-w-6xl flex-col rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Preview</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{previewPdf.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewPdf.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Download</a>
                <button type="button" onClick={() => setPreviewPdf(null)} className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">Close</button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-3">
              <iframe src={previewPdf.url} title="Report card preview" className="h-full w-full rounded-[1.5rem] border-0" />
            </div>
          </div>
        </div>
      )}

      {historyStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Upload history</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{historyStudent.name}</h3>
              </div>
              <button type="button" onClick={() => setHistoryStudent(null)} className="rounded-full bg-slate-100 p-2 text-slate-600">✕</button>
            </div>
            <div className="mt-6 space-y-3">
              {(reportCardsByStudent[historyStudent.id] || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No history yet for this student.</div>
              ) : (
                (reportCardsByStudent[historyStudent.id] || []).map((card) => (
                  <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{selectedExam?.name || "Report Card"}</p>
                        <p className="mt-1">Uploaded {card.uploadedAt ? new Date(card.uploadedAt).toLocaleString() : "recently"}</p>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Uploaded</div>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">Uploaded by {card.uploadedByName || "Teacher"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
