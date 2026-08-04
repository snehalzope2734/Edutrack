import { useEffect, useState } from "react";
import { BookOpen, Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";

export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await teacherApi.me();
        setProfile(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader title={`Welcome, ${profile?.name || ""}`} subtitle="Your classes and subjects" />

      {profile?.classTeacherOf?.length > 0 && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-medium text-brand-900">
            You are the class teacher for {profile.classTeacherOf.map((c) => c.className).join(", ")}
          </p>
        </div>
      )}

      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned yet" description="Ask your admin to assign you to a class and subject." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {profile.subjects.map((s) => (
            <div key={s.subjectId} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center gap-2 text-brand-600">
                <BookOpen className="h-4 w-4" />
                <p className="font-medium text-slate-900">{s.subjectName}</p>
              </div>
              <p className="text-sm text-slate-500">Class {s.className}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5" /> {s.studentCount} students
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
