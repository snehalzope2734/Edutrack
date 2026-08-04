import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { teacherApi } from "../../api/teacherApi";

export default function MyClassesPage() {
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
      <PageHeader title="My Classes" subtitle="Classes and subjects you teach" />
      {(!profile?.subjects || profile.subjects.length === 0) ? (
        <EmptyState title="No subjects assigned" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profile.subjects.map((s) => (
            <Link
              key={s.subjectId}
              to={`/teacher/students?classId=${s.classId}`}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2 text-brand-600">
                <BookOpen className="h-4 w-4" />
                <p className="font-medium text-slate-900">{s.subjectName}</p>
              </div>
              <p className="text-sm text-slate-500">Class {s.className}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3.5 w-3.5" /> {s.studentCount} students
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
