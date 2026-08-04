import { useEffect, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, AlertTriangle, History } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";
import { attendanceApi } from "../../api/attendanceApi";

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
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
        if (data.subjects?.length) setSubjectId(data.subjects[0].subjectId);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const loadHistory = async () => {
    try {
      const { data } = await attendanceApi.importHistory({ page: 0, size: 10 });
      setHistory(data.content ?? []);
      setShowHistory(true);
    } catch {
      toast.error("Could not load import history");
    }
  };

  const selectedSubject = profile?.subjects?.find((s) => s.subjectId === subjectId);

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an Excel file first");
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const { data } = await attendanceApi.previewImport(file, selectedSubject.classId, subjectId, date);
      setPreview(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not parse the file");
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
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not discard import");
    }
  };

  if (loadingProfile) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Upload an Excel file to record attendance — there is no manual marking"
        action={
          <button onClick={loadHistory} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <History className="h-4 w-4" /> Import history
          </button>
        }
      />

      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned" description="You need to be assigned to a subject before you can upload attendance." />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <form onSubmit={handlePreview} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Subject / Class</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {profile.subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectName} — Class {s.className}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Excel file (.xlsx)</label>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700" />
            </div>
            <div className="sm:col-span-3">
              <button disabled={previewing} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                <UploadCloud className="h-4 w-4" />
                {previewing ? "Parsing…" : "Preview import"}
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Expected columns: <span className="font-medium">Roll Number</span>, <span className="font-medium">Status</span> (P/Present, A/Absent, L/Late).
                Re-uploading for the same class/subject/date will overwrite those rows — that's how corrections are made.
              </p>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {preview.validRows} valid</span>
            <span className="flex items-center gap-1.5 text-red-600"><XCircle className="h-4 w-4" /> {preview.errorRows} errors</span>
            <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-4 w-4" /> {preview.duplicateRows} will overwrite existing records</span>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Row</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Roll No.</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Student</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-500">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className={r.error ? "bg-red-50" : r.duplicate ? "bg-amber-50" : ""}>
                    <td className="px-3 py-2 text-slate-400">{r.rowNumber}</td>
                    <td className="px-3 py-2">{r.rollNumberRaw}</td>
                    <td className="px-3 py-2">{r.studentName || "—"}</td>
                    <td className="px-3 py-2">{r.normalizedStatus || r.statusRaw}</td>
                    <td className="px-3 py-2">
                      {r.error ? <span className="text-red-600">{r.error}</span>
                        : r.duplicate ? <span className="text-amber-600">Will overwrite existing record</span>
                        : <span className="text-emerald-600">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={handleConfirm} disabled={confirming || preview.validRows === 0}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {confirming ? "Importing…" : `Confirm import (${preview.validRows} rows)`}
            </button>
            <button onClick={handleDiscard} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
                {history.map((h) => (
                  <li key={h.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{h.fileName}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        h.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                        h.status === "DISCARDED" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-700"
                      }`}>{h.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {h.date} · {h.totalRows} rows · {h.validRows} valid · {h.errorRows} errors
                      {h.importedCount != null && ` · ${h.importedCount} imported`}
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
