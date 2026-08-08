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
import { useTheme } from "../../context/ThemeContext";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200">
      <div className="flex items-center gap-3.5">
        <div className="rounded-xl bg-brand-50 dark:bg-brand-500/15 p-3 text-brand-600 dark:text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

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

  const gridColor = isDark ? "#1e293b" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";

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
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Attendance and division</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Class performance</h3>
            </div>
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/15 p-2.5 text-indigo-700 dark:text-indigo-400">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#0f172a" : "#ffffff",
                    borderColor: isDark ? "#1f2937" : "#e2e8f0",
                    color: isDark ? "#f8fafc" : "#0f172a",
                    borderRadius: "0.75rem",
                  }}
                  formatter={(value) => [`${value}%`, "Attendance"]}
                />
                <Bar dataKey="attendance" radius={[8, 8, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Marksheet</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Average class marks</h3>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/15 p-2.5 text-emerald-700 dark:text-emerald-400">
              <ChartColumnBig className="h-5 w-5" />
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "#0f172a" : "#ffffff",
                    borderColor: isDark ? "#1f2937" : "#e2e8f0",
                    color: isDark ? "#f8fafc" : "#0f172a",
                    borderRadius: "0.75rem",
                  }}
                  formatter={(value) => [`${value}%`, "Average marks"]}
                />
                <Bar dataKey="averageMarks" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}