import { useEffect, useState } from "react";
import { Users, GraduationCap, BookOpen, Layers } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [teachers, students, classes] = await Promise.all([
          adminApi.listTeachers({ page: 0, size: 1 }),
          adminApi.listStudents({ page: 0, size: 1 }),
          adminApi.listClasses(),
        ]);
        setStats({
          teachers: teachers.data.totalElements ?? teachers.data.content?.length ?? 0,
          students: students.data.totalElements ?? students.data.content?.length ?? 0,
          classes: classes.data.length ?? 0,
          subjects: classes.data.reduce((acc) => acc, 0),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="School-wide overview" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={GraduationCap} label="Teachers" value={stats?.teachers ?? 0} />
        <StatCard icon={Users} label="Students" value={stats?.students ?? 0} />
        <StatCard icon={Layers} label="Classes" value={stats?.classes ?? 0} />
      </div>
    </div>
  );
}
