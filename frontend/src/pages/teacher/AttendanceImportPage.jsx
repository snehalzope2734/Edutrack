import { useEffect, useMemo, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, AlertTriangle, History, Download, FileSpreadsheet, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { attendanceApi } from "../../api/attendanceApi";
import { buildAttendanceTemplateFileName, downloadAttendanceTemplate, inspectAttendanceWorkbook, validateAttendanceUploadFile } from "../../utils/attendanceTemplate";

/**
 * Attendance can ONLY be entered here, via Excel upload. There is no manual
 * per-student marking screen anywhere in the app. Expected file format:
 * a header row, then one row per student with "Roll Number" and "Status"
 * (P/Present, A/Absent, or L/Late) columns.
 */
export default function AttendanceImportPage() {
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const classTeacherAssignments = profile?.classTeacherOf || [];
  const isClassTeacher = classTeacherAssignments.length > 0;
  const classTeacherClassId = classTeacherAssignments[0]?.classId;

  const availableSubjects = useMemo(() => {
    const subjects = profile?.subjects || [];
    if (!classTeacherClassId) {
      return subjects;
    }
    return subjects.filter((subject) => String(subject.classId) === String(classTeacherClassId));
  }, [classTeacherClassId, profile?.subjects]);

  useEffect(() => {
    if (!availableSubjects.length) {
      setSubjectId("");
      return;
    }

    if (!availableSubjects.some((subject) => subject.subjectId === subjectId)) {
      setSubjectId(availableSubjects[0].subjectId);
    }
  }, [availableSubjects, subjectId]);

  const selectedSubject = availableSubjects.find((subject) => subject.subjectId === subjectId) || null;
  const date = format(new Date(), "yyyy-MM-dd");

  const attendanceSummary = useMemo(() => {
    if (!preview) {
      return { present: 0, absent: 0, late: 0 };
    }

    return preview.rows.reduce(
      (summary, row) => {
        if (row.normalizedStatus === 'P') summary.present += 1;
        if (row.normalizedStatus === 'A') summary.absent += 1;
        if (row.normalizedStatus === 'L') summary.late += 1;
        return summary;
      },
      { present: 0, absent: 0, late: 0 }
    );
  }, [preview]);

  const canConfirm = !!preview && preview.errorRows === 0 && preview.validRows > 0;

  useEffect(() => {
    if (!selectedSubject?.classId) {
      setStudents([]);
      return;
    }

    (async () => {
      setLoadingStudents(true);
      try {
        const { data } = await teacherApi.students(selectedSubject.classId);
        setStudents(data || []);
      } catch {
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [selectedSubject]);

  const loadHistory = async () => {
    try {
      const { data } = await attendanceApi.importHistory({ page: 0, size: 10 });
      setHistory(data.content ?? []);
      setShowHistory(true);
    } catch {
      toast.error("Could not load import history");
    }
  };

  const handleTemplateDownload = async () => {
    if (!selectedSubject) {
      toast.error("Select a class subject before downloading the template.");
      return;
    }

    if (!students.length) {
      toast.error("Student list is not available yet. Try again in a moment.");
      return;
    }

    try {
      setTemplateDownloading(true);
      await downloadAttendanceTemplate(date, students);
      toast.success(`Downloaded ${buildAttendanceTemplateFileName(date)}`);
    } catch {
      toast.error("Could not download the attendance template.");
    } finally {
      setTemplateDownloading(false);
    }
  };

  const handleFileSelection = async (event) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    setPreview(null);
    setValidationMessage("");

    if (!selectedFile) {
      return;
    }

    const validation = validateAttendanceUploadFile(selectedFile, date);
    if (!validation.valid) {
      setValidationMessage(validation.error);
      toast.error(validation.error);
      return;
    }

    const inspection = await inspectAttendanceWorkbook(selectedFile);
    if (!inspection.valid) {
      setValidationMessage(inspection.error);
      toast.error(inspection.error);
      return;
    }

    setValidationMessage(`Ready to upload ${selectedFile.name}.`);
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!isClassTeacher) {
      toast.error("Only assigned class teachers may upload attendance.");
      return;
    }
    if (!selectedSubject) {
      toast.error("No class subject is available for your assigned class.");
      return;
    }
    if (!students.length) {
      toast.error("Student list is still loading. Try again in a moment.");
      return;
    }
    if (!file) {
      toast.error("Choose an Excel file first.");
      return;
    }

    const validation = validateAttendanceUploadFile(file, date);
    if (!validation.valid) {
      setValidationMessage(validation.error);
      toast.error(validation.error);
      return;
    }

    const inspection = await inspectAttendanceWorkbook(file);
    if (!inspection.valid) {
      setValidationMessage(inspection.error);
      toast.error(inspection.error);
      return;
    }

    setPreviewing(true);
    setPreview(null);
    try {
      const { data } = await attendanceApi.previewImport(file, selectedSubject.classId, selectedSubject.subjectId, date);
      setPreview(data);
      setValidationMessage(`Preview ready for ${selectedSubject.subjectName}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not parse the file.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data } = await attendanceApi.confirmImport(preview.id);
      toast.success(`Imported ${data.importedCount} record(s)`);
      setPreview(null);
      setFile(null);
      setValidationMessage("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not confirm import");
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscard = async () => {
    try {
      await attendanceApi.discardImport(preview.id);
      toast("Import discarded", { icon: "🗑️" });
      setPreview(null);
      setFile(null);
      setValidationMessage("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not discard import");
    }
  };

  if (loadingProfile) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Upload an Excel file to record attendance — there is no manual marking workflow"
        action={
          <button onClick={loadHistory} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <History className="h-4 w-4" /> Import history
          </button>
        }
      />

      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned" description="You need to be assigned to a subject before you can upload attendance." />
      ) : !isClassTeacher ? (
        <EmptyState title="Not authorized to upload attendance" description="Only a class teacher can upload attendance. Ask admin to assign you to a class teacher role." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-700 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-brand-100">
                  <Sparkles className="h-4 w-4" /> Class teacher workflow
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Upload attendance in a few guided steps</h2>
                <p className="mt-2 max-w-2xl text-sm text-brand-50">
                  Select your assigned class, download the Excel template, fill it with roll numbers and statuses, then preview and confirm the import.
                </p>
              </div>
              <button onClick={handleTemplateDownload} disabled={templateDownloading} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60">
                <Download className="h-4 w-4" />
                {templateDownloading ? "Preparing…" : "Download attendance template"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-brand-600" /> Import sheet
            </div>
            <form onSubmit={handlePreview} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned class</p>
                <p className="mt-2 text-sm font-medium text-slate-700">
                  {selectedSubject ? `${selectedSubject.subjectName} — Class ${selectedSubject.className}` : 'Loading class details...'}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Workbook (.xlsx)</label>
                <input type="file" accept=".xlsx" onChange={handleFileSelection} className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700" />
              </div>

              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button disabled={previewing} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
                    <UploadCloud className="h-4 w-4" />
                    {previewing ? "Parsing…" : "Preview upload"}
                  </button>
                  <span className="text-sm text-slate-500">Template name: {buildAttendanceTemplateFileName(date)}</span>
                </div>
                {validationMessage ? (
                  <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{validationMessage}</p>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Expected columns: <span className="font-medium text-slate-700">Roll Number</span>, <span className="font-medium text-slate-700">Student Name</span>, <span className="font-medium text-slate-700">Status</span>. The date is set automatically for today.
                  </p>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Total rows</div>
              <div className="mt-2 text-lg font-semibold">{preview.totalRows}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <div className="text-xs uppercase tracking-[0.2em]">Valid</div>
              <div className="mt-2 text-lg font-semibold">{preview.validRows}</div>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <div className="text-xs uppercase tracking-[0.2em]">Invalid</div>
              <div className="mt-2 text-lg font-semibold">{preview.errorRows}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.2em]">Present</div>
              <div className="mt-2 text-lg font-semibold">{attendanceSummary.present}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.2em]">Absent</div>
              <div className="mt-2 text-lg font-semibold">{attendanceSummary.absent}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="text-xs uppercase tracking-[0.2em]">Late</div>
              <div className="mt-2 text-lg font-semibold">{attendanceSummary.late}</div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Roll No.</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Student</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className={row.error ? "bg-red-50" : row.duplicate ? "bg-amber-50" : "bg-emerald-50"}>
                    <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.rollNumberRaw}</td>
                    <td className="px-3 py-2">{row.studentName || "—"}</td>
                    <td className="px-3 py-2">{row.normalizedStatus || row.statusRaw}</td>
                    <td className="px-3 py-2">
                      {row.error ? <span className="text-red-600">{row.error}</span>
                        : row.duplicate ? <span className="text-amber-600">Will overwrite existing record</span>
                        : <span className="text-emerald-600">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={handleConfirm} disabled={confirming || preview.validRows === 0} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
              {confirming ? "Importing…" : `Confirm import (${preview.validRows} rows)`}
            </button>
            <button onClick={handleDiscard} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Discard
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import history</h2>
              <button onClick={() => setShowHistory(false)} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No uploads yet.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.fileName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        item.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                        item.status === "DISCARDED" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                      }`}>{item.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.date} · {item.totalRows} rows · {item.validRows} valid · {item.errorRows} errors
                      {item.importedCount != null && ` · ${item.importedCount} imported`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
