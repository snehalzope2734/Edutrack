import { useEffect, useState } from "react";
import { CalendarCheck, Award, Loader2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { studentApi } from "../../api/studentApi";
import { attendanceApi } from "../../api/attendanceApi";
import { marksApi } from "../../api/marksApi";
import { reportCardApi } from "../../api/reportCardApi";

export default function StudentDashboard() {
  const [me, setMe] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [marks, setMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);

  const loadDashboard = async () => {
    try {
      const { data: meData } = await studentApi.me();
      
      setMe(meData);
     
      const [attRes, marksRes] = await Promise.all([
        attendanceApi.studentSummary(meData.studentId),
        marksApi.studentSummary(meData.studentId),
      ]);
      
      setAttendance(attRes.data);
      setMarks(marksRes.data);

      const examRes = await reportCardApi.examTypes(meData.classId);
      setExamTypes(examRes.data);
      if (examRes.data.length > 0) {
          setSelectedExam(examRes.data[0].id);
      } else {
          setSelectedExam("");
      }
    } catch (error) {
      console.error(error);
      // TODO: Replace alert with toast.error() for better UX
      alert("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openReportCard = async () => {
    if (!selectedExam) {
      // TODO: Replace alert with toast.warning() for better UX
      alert("Please select an exam.");
      return;
    }

    setLoadingPdf(true);
    
    try {
      const response = await reportCardApi.downloadPdf(
        me.studentId,
        selectedExam
      );

      const file = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(file);
      
      window.open(url, "_blank");

      // Revoke the URL after a short delay regardless of popup status to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (e) {
      // TODO: Replace alert with toast.error() for better UX
      alert("Unable to load report card.");
      console.error(e);
    } finally {
      setLoadingPdf(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title="My Dashboard" subtitle={`Roll No. ${me?.rollNumber} · Class ${me?.className}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-center gap-2 text-brand-600">
            <CalendarCheck className="h-4 w-4" />
            <p className="font-medium text-slate-900">Attendance</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{attendance?.overall ?? 0}%</p>
          <p className="text-sm text-slate-500">Overall across all subjects</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-center gap-2 text-brand-600">
            <Award className="h-4 w-4" />
            <p className="font-medium text-slate-900">Marks</p>
          </div>
          <p className="text-3xl font-semibold text-slate-900">{marks?.overall ?? 0}%</p>
          <p className="text-sm text-slate-500">Overall across all exams</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Academic Report Card
        </h2>

        <div className="flex gap-4">
          <select
            disabled={examTypes.length === 0}
            className="rounded border px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
          >
            {examTypes.length === 0 ? (
                <option value="">No Exams Available</option>
            ) : (
                examTypes.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                        {exam.name}
                    </option>
                ))
            )}
          </select>

          <button
            disabled={!selectedExam || loadingPdf}
            onClick={openReportCard}
            className="flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingPdf && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loadingPdf ? "Opening..." : "View Report Card"}
          </button>
        </div>
      </div>
    </div>
  );
}