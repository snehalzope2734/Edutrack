import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { teacherApi } from "../../api/teacherApi";
import { examApi } from "../../api/examApi";
import { reportCardApi } from "../../api/reportCardApi";
import { cloudinaryApi } from "../../api/cloudinaryApi";

export default function ReportCardsPage() {
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [examTypeId, setExamTypeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingFor, setUploadingFor] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await teacherApi.me();
      setProfile(data);
      if (data.subjects?.length) setClassId(data.subjects[0].classId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      const [studentsRes, typesRes] = await Promise.all([
        teacherApi.students(classId),
        examApi.listTypes(classId),
      ]);
      setStudents(studentsRes.data);
      setExamTypes(typesRes.data);
      if (typesRes.data.length) setExamTypeId(typesRes.data[0].id);
    })();
  }, [classId]);

  const upload = async (studentId, file) => {
    if (!examTypeId) { toast.error("Choose an exam type first"); return; }
    setUploadingFor(studentId);
    try {
      const uploaded = await cloudinaryApi.uploadFile(file, `edutrack/report-cards/${studentId}`, "edutrack_reports");
      await reportCardApi.create({
        studentId, examTypeId, academicYear: "2026-2027",
        pdfCloudinaryUrl: uploaded.secure_url, pdfCloudinaryPublicId: uploaded.public_id,
      });
      toast.success("Report card uploaded");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploadingFor(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="Report Cards" subtitle="Upload report card PDFs for your students" />

      <div className="mb-4 flex gap-3">
        {profile?.subjects?.length > 1 && (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {[...new Map(profile.subjects.map((s) => [s.classId, s.className])).entries()].map(([id, name]) => (
              <option key={id} value={id}>Class {name}</option>
            ))}
          </select>
        )}
        <select value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Roll No.</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Upload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2">{s.rollNumber}</td>
                <td className="px-4 py-2">{s.name}</td>
                <td className="px-4 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-brand-600 hover:underline">
                    <Upload className="h-4 w-4" />
                    {uploadingFor === s.id ? "Uploading…" : "Choose PDF"}
                    <input type="file" accept=".pdf" className="hidden" disabled={uploadingFor === s.id}
                      onChange={(e) => e.target.files?.[0] && upload(s.id, e.target.files[0])} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
