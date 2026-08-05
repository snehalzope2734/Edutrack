import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  BarChart3,
  ChartColumnBig,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
    const loadDashboard = async () => {
      try {
        const { data } = await adminApi.getDashboard();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const classDistribution = stats?.classPerformance || [];

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title="Admin Dashboard" subtitle="School-wide overview" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Teachers"
          value={stats?.teachers ?? 0}
        />
        <StatCard
          icon={Users}
          label="Students"
          value={stats?.students ?? 0}
        />
        <StatCard
          icon={Layers}
          label="Classes"
          value={stats?.classes ?? 0}
        />
        <StatCard
          icon={BookOpen}
          label="Subjects"
          value={stats?.subjects ?? 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance and division</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Class performance</h3>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                <Bar dataKey="attendance" radius={[8, 8, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Marksheet</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Average class marks</h3>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <ChartColumnBig className="h-5 w-5" />
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, "Average marks"]} />
                <Bar dataKey="averageMarks" radius={[8, 8, 0, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}