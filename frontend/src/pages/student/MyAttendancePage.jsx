import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { attendanceApi } from "../../api/attendanceApi";

const COLORS = { Present: "#10b981", Absent: "#ef4444", Late: "#f59e0b", Primary: "#2563eb" };

const statusMeta = {
  P: { label: "Present", className: "bg-emerald-100 text-emerald-700", tone: "Present" },
  A: { label: "Absent", className: "bg-red-100 text-red-700", tone: "Absent" },
  L: { label: "Late", className: "bg-amber-100 text-amber-700", tone: "Late" },
};

function normalizeRecord(record) {
  return {
    ...record,
    date: record.date || record.attendanceDate,
    status: record.status || record.attendanceStatus,
  };
}

function buildMonthlyTrend(records) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: format(date, "MMM"),
      present: 0,
      absent: 0,
      late: 0,
    };
  });

  records.forEach((record) => {
    const entry = normalizeRecord(record);
    const valueDate = parseISO(entry.date);
    const monthKey = `${valueDate.getFullYear()}-${String(valueDate.getMonth() + 1).padStart(2, "0")}`;
    const target = months.find((month) => month.key === monthKey);
    if (!target) return;

    if (entry.status === "P") target.present += 1;
    else if (entry.status === "A") target.absent += 1;
    else if (entry.status === "L") target.late += 1;
  });

  return months.map((month) => ({
    ...month,
    total: month.present + month.absent + month.late,
    rate: month.total === 0 ? 0 : Number(((month.present + month.late) / month.total * 100).toFixed(1)),
  }));
}

function buildCalendarGrid(records) {
  const days = [];
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const byDate = new Map();
  records.forEach((record) => {
    const entry = normalizeRecord(record);
    const iso = entry.date;
    if (!iso) return;
    byDate.set(iso, entry.status);
  });

  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = format(d, "yyyy-MM-dd");
    const status = byDate.get(iso);
    days.push({
      key: iso,
      day: d.getDate(),
      status,
      label: format(d, "EEE"),
      isWeekday: d.getDay() >= 1 && d.getDay() <= 5,
    });
  }

  return days;
}

export default function MyAttendancePage() {
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const [summaryRes, recordsRes] = await Promise.all([
          attendanceApi.studentSummary(me.studentId),
          attendanceApi.studentRecords(me.studentId, {}),
        ]);

        const sorted = [...(recordsRes.data || [])]
          .map(normalizeRecord)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setSummary(summaryRes.data || { overall: 0, subjectWise: [] });
        setRecords(sorted);
      } catch (error) {
        console.error("Failed to fetch attendance data", error);
        setSummary({ overall: 0, subjectWise: [] });
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        const status = record.status;
        if (status === "P") acc.Present += 1;
        else if (status === "A") acc.Absent += 1;
        else if (status === "L") acc.Late += 1;
        return acc;
      },
      { Present: 0, Absent: 0, Late: 0 }
    );
  }, [records]);

  const subjectData = useMemo(() => {
    const source = summary?.subjectWise ?? [];
    if (source.length) {
      return [...source]
        .map((subject) => ({
          ...subject,
          subject: subject.subjectName,
          percentage: Number(subject.percentage || 0),
        }))
        .sort((a, b) => b.percentage - a.percentage);
    }

    const grouped = records.reduce((acc, record) => {
      const key = record.subjectName || "General";
      acc[key] = acc[key] || { subjectName: key, present: 0, absent: 0, late: 0 };
      if (record.status === "P") acc[key].present += 1;
      else if (record.status === "A") acc[key].absent += 1;
      else if (record.status === "L") acc[key].late += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((subject) => {
        const total = subject.present + subject.absent + subject.late;
        const percentage = total === 0 ? 0 : Number((((subject.present + subject.late) / total) * 100).toFixed(1));
        return {
          subjectName: subject.subjectName,
          present: subject.present,
          absent: subject.absent,
          late: subject.late,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [records, summary]);

  const monthlyTrend = useMemo(() => buildMonthlyTrend(records), [records]);
  const calendarGrid = useMemo(() => buildCalendarGrid(records), [records]);

  const pieData = Object.entries(totals)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const totalStatusCount = totals.Present + totals.Absent + totals.Late;
  const avgAttendance = Number(summary?.overall ?? (totalStatusCount ? ((totals.Present + totals.Late) / totalStatusCount) * 100 : 0)).toFixed(1);
  const weakestSubject = [...subjectData].sort((a, b) => a.percentage - b.percentage)[0];
  const strongestSubject = [...subjectData].sort((a, b) => b.percentage - a.percentage)[0];
  const recent = records.slice(0, 5);

  const insights = [
    { title: "Current pace", text: `${avgAttendance}% overall attendance this year` },
    { title: "Strongest subject", text: strongestSubject ? `${strongestSubject.subjectName} at ${strongestSubject.percentage}%` : "No subject data yet" },
    { title: "To monitor", text: weakestSubject ? `${weakestSubject.subjectName} needs attention` : "No at-risk subjects" },
  ];

  const warningText = Number(avgAttendance) < 75
    ? "Your attendance is below the 75% target. Try to improve consistency in the coming sessions."
    : "You are on track to meet the minimum attendance requirement and are maintaining a healthy rhythm.";

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="My Attendance" subtitle={`${avgAttendance}% overall`} />

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-100">Attendance overview</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-bold">{avgAttendance}%</span>
              <span className="mb-2 text-sm text-blue-100">Target: 75%+</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/15">
              Export Summary
            </button>
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">
              View Calendar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Present", value: totals.Present, color: "bg-emerald-100 text-emerald-700", accent: "#10b981" },
          { label: "Absent", value: totals.Absent, color: "bg-red-100 text-red-700", accent: "#ef4444" },
          { label: "Late", value: totals.Late, color: "bg-amber-100 text-amber-700", accent: "#f59e0b" },
          { label: "Overall", value: `${avgAttendance}%`, color: "bg-blue-100 text-blue-700", accent: "#2563eb" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{item.label}</span>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${item.color}`} style={{ backgroundColor: `${item.accent}1f`, color: item.accent }}>
                {item.label.charAt(0)}
              </span>
            </div>
            <div className="mt-4 text-3xl font-bold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Monthly trend</h3>
              <p className="text-sm text-slate-500">Attendance consistency over the last 6 months</p>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">6M view</span>
          </div>

          {monthlyTrend.length === 0 ? (
            <EmptyState title="No monthly attendance data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="attendanceRate" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip formatter={(value) => [`${value}%`, "Attendance"]} />
                <Area type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={3} fill="url(#attendanceRate)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Attendance goal</h3>
              <p className="text-sm text-slate-500">Minimum required: 75%</p>
            </div>
            <span className="text-sm font-semibold text-slate-700">{avgAttendance}%</span>
          </div>

          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border-[10px] border-blue-100 bg-slate-50">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{avgAttendance}%</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Goal</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-slate-600">
              <span>Progress</span>
              <span>{Math.min(100, Number(avgAttendance))}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${Math.min(100, Number(avgAttendance))}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Subject-wise attendance</h3>
              <p className="text-sm text-slate-500">Performance by subject this year</p>
            </div>
          </div>

          {subjectData.length === 0 ? (
            <EmptyState title="No subject data yet" />
          ) : (
            <div className="space-y-4">
              {subjectData.map((subject) => (
                <div key={subject.subjectName}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{subject.subjectName}</span>
                    <span className="text-slate-500">{subject.percentage}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${Math.max(0, Math.min(100, subject.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Status split</h3>
            <p className="text-sm text-slate-500">Present, absent, and late session counts</p>
          </div>

          {pieData.length === 0 ? (
            <EmptyState title="No attendance records yet" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={74} paddingAngle={4}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name] || COLORS.Primary} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Sessions"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[entry.name] || COLORS.Primary }} />
                  <span className="text-slate-600">{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Last 30 days</h3>
              <p className="text-sm text-slate-500">Daily attendance rhythm</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">30D</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((day) => {
              const tone =
                day.status === "P" ? "bg-emerald-100 text-emerald-700" :
                day.status === "A" ? "bg-red-100 text-red-700" :
                day.status === "L" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-400";

              return (
                <div key={day.key} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{day.label.slice(0, 1)}</span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold ${tone}`}>
                    {day.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Insights</h3>
            <p className="text-sm text-slate-500">Smart indicators from your attendance behavior</p>
          </div>

          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{insight.title}</p>
                <p className="mt-2 text-sm text-slate-700">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Recent activity</h3>
              <p className="text-sm text-slate-500">Latest class attendance updates</p>
            </div>
          </div>

          {recent.length === 0 ? (
            <EmptyState title="No recent attendance activity" />
          ) : (
            <div className="space-y-3">
              {recent.map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="font-medium text-slate-700">{record.subjectName || "General Subject"}</p>
                    <p className="text-sm text-slate-500">{format(parseISO(record.date), "MMM d, yyyy")}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta[record.status]?.className || "bg-slate-200 text-slate-600"}`}>
                    {statusMeta[record.status]?.label || record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Attendance note</h3>
            <p className="text-sm text-slate-500">Personalized guidance</p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm leading-6 text-blue-900">{warningText}</p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm text-slate-600">Best subject</span>
              <span className="font-semibold text-slate-800">{strongestSubject ? strongestSubject.subjectName : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm text-slate-600">Needs monitor</span>
              <span className="font-semibold text-slate-800">{weakestSubject ? weakestSubject.subjectName : "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
