import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  ChartColumnBig,
  Download,
  GraduationCap,
  Medal,
  Printer,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  UserRound,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { studentApi } from "../../api/studentApi";
import { marksApi } from "../../api/marksApi";
import { reportCardApi } from "../../api/reportCardApi";

const gradeColors = {
  "A+": "bg-emerald-100 text-emerald-700",
  A: "bg-blue-100 text-blue-700",
  "B+": "bg-amber-100 text-amber-700",
  B: "bg-orange-100 text-orange-700",
  C: "bg-rose-100 text-rose-700",
  F: "bg-red-100 text-red-700",
};

const gradePalette = {
  "A+": "#10b981",
  A: "#2563eb",
  "B+": "#f59e0b",
  B: "#f97316",
  C: "#ef4444",
  F: "#dc2626",
};

const subjectIcons = {
  Mathematics: Calculator,
  Science: Sparkles,
  English: BookOpen,
  Computer: BriefcaseBusiness,
  default: GraduationCap,
};

const formatGrade = (value) => {
  if (!value && value !== 0) return "—";
  return `${value}`;
};

const classifyGrade = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 40) return "C";
  return "F";
};

const statusClass = (status) => {
  if (status === "Passed") return "bg-emerald-100 text-emerald-700";
  if (status === "Failed") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-600";
};

export default function MyMarksPage() {
  const [summary, setSummary] = useState(null);
  const [all, setAll] = useState([]);
  const [selectedExamTypeId, setSelectedExamTypeId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: me } = await studentApi.me();
        const [summaryRes, allRes] = await Promise.all([
          marksApi.studentSummary(me.studentId),
          marksApi.studentMarks(me.studentId, {}),
        ]);

        const normalized = (allRes.data || []).map((record) => ({ ...record, marksObtained: Number(record.marksObtained ?? 0), maxMarks: Number(record.maxMarks ?? 0) }));
        setSummary(summaryRes.data || { overall: 0, subjectWise: [] });
        setAll(normalized);
        const firstExamId = normalized.find((record) => record.examTypeId)?.examTypeId || "";
        setSelectedExamTypeId(firstExamId);
      } catch (error) {
        console.error("Failed to fetch marks data", error);
        setSummary({ overall: 0, subjectWise: [] });
        setAll([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredRecords = useMemo(() => all, [all]);

  const examOptions = useMemo(() => {
    const map = new Map();
    all.forEach((record) => {
      if (record.examTypeId && !map.has(record.examTypeId)) {
        map.set(record.examTypeId, record.examTypeName || "Exam");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [all]);

  const selectedExamName = useMemo(() => {
    return examOptions.find((item) => item.id === selectedExamTypeId)?.name || examOptions[0]?.name || "Exam";
  }, [examOptions, selectedExamTypeId]);

  const subjectStats = useMemo(() => {
    const map = {};

    filteredRecords.forEach((record) => {
      const key = record.subjectName || "General";
      if (!map[key]) {
        map[key] = { subjectName: key, scores: [], percentage: 0, highest: 0, lowest: 1000, totalMarks: 0, totalMax: 0 };
      }
      const pct = record.maxMarks > 0 ? Number(((record.marksObtained / record.maxMarks) * 100).toFixed(1)) : 0;
      map[key].scores.push(pct);
      map[key].highest = Math.max(map[key].highest, pct);
      map[key].lowest = Math.min(map[key].lowest, pct);
      map[key].totalMarks += record.marksObtained;
      map[key].totalMax += record.maxMarks;
    });

    return Object.values(map)
      .map((entry) => {
        const percentage = entry.totalMax > 0 ? Number(((entry.totalMarks / entry.totalMax) * 100).toFixed(1)) : 0;
        const last = entry.scores[entry.scores.length - 1] ?? 0;
        const previous = entry.scores.length > 1 ? entry.scores[entry.scores.length - 2] : last;
        const trend = last - previous;
        return {
          ...entry,
          percentage,
          grade: classifyGrade(percentage),
          trend,
          rank: Math.max(1, 10),
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [filteredRecords]);

  const examTrend = useMemo(() => {
    const byExam = {};
    filteredRecords.forEach((record) => {
      const exam = record.examTypeName || "Exam";
      if (!byExam[exam]) byExam[exam] = { examType: exam, total: 0, max: 0 };
      byExam[exam].total += record.marksObtained;
      byExam[exam].max += record.maxMarks;
    });

    return Object.values(byExam)
      .map((item) => ({
        examType: item.examType,
        percentage: item.max > 0 ? Number(((item.total / item.max) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => a.examType.localeCompare(b.examType));
  }, [filteredRecords]);

  const subjectComparison = useMemo(() => {
    return subjectStats.map((subject) => ({
      subject: subject.subjectName,
      percentage: subject.percentage,
    }));
  }, [subjectStats]);

  const examComparison = useMemo(() => {
    const map = {};
    filteredRecords.forEach((record) => {
      const exam = record.examTypeName || "Exam";
      if (!map[exam]) map[exam] = { exam: exam, total: 0, max: 0, count: 0 };
      map[exam].total += record.marksObtained;
      map[exam].max += record.maxMarks;
      map[exam].count += 1;
    });

    return Object.values(map)
      .map((item) => ({
        exam: item.exam,
        average: item.count > 0 ? Number(((item.total / item.max) * 100).toFixed(1)) : 0,
        highest: 100,
        lowest: 0,
        grade: classifyGrade(item.count > 0 ? (item.total / item.max) * 100 : 0),
      }))
      .slice(0, 6);
  }, [filteredRecords]);

  const gradeDistribution = useMemo(() => {
    const counts = { "A+": 0, A: 0, "B+": 0, B: 0, C: 0, F: 0 };
    subjectStats.forEach((subject) => {
      counts[subject.grade] = (counts[subject.grade] || 0) + 1;
    });

    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([grade, value]) => ({
        name: grade,
        value,
        fill: gradePalette[grade] || "#2563eb",
      }));
  }, [subjectStats]);

  const recentResults = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => (b.examTypeName || "").localeCompare(a.examTypeName || ""))
      .slice(0, 5)
      .map((record) => ({
        ...record,
        percentage: record.maxMarks > 0 ? Number(((record.marksObtained / record.maxMarks) * 100).toFixed(1)) : 0,
        status: record.marksObtained >= record.maxMarks * 0.4 ? "Passed" : "Failed",
      }));
  }, [filteredRecords]);

  const overall = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    const totalObtained = filteredRecords.reduce((sum, record) => sum + Number(record.marksObtained || 0), 0);
    const totalMax = filteredRecords.reduce((sum, record) => sum + Number(record.maxMarks || 0), 0);
    return totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(1)) : 0;
  }, [filteredRecords]);

  const averageMarks = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    const total = filteredRecords.reduce((sum, record) => sum + Number(record.marksObtained || 0), 0);
    return Number((total / filteredRecords.length).toFixed(1));
  }, [filteredRecords]);

  const highestMarks = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    return Math.max(...filteredRecords.map((record) => Number(record.marksObtained || 0)));
  }, [filteredRecords]);

  const lowestMarks = useMemo(() => {
    if (filteredRecords.length === 0) return 0;
    return Math.min(...filteredRecords.map((record) => Number(record.marksObtained || 0)));
  }, [filteredRecords]);

  const passedSubjects = useMemo(() => {
    return subjectStats.filter((subject) => subject.percentage >= 40).length;
  }, [subjectStats]);

  const latestExam = useMemo(() => {
    if (!filteredRecords.length) return "—";
    const uniqueExamTypes = [...new Map(filteredRecords.map((r) => [r.examTypeName, r])).values()];
    return uniqueExamTypes[uniqueExamTypes.length - 1]?.examTypeName || "—";
  }, [filteredRecords]);

  const currentGrade = classifyGrade(overall);

  const insights = useMemo(() => {
    if (subjectStats.length === 0) return [];

    const best = [...subjectStats].sort((a, b) => b.percentage - a.percentage)[0];
    const weak = [...subjectStats].sort((a, b) => a.percentage - b.percentage)[0];
    const previous = examTrend.length > 1 ? examTrend[examTrend.length - 2]?.percentage ?? overall : overall;
    const delta = Number((overall - previous).toFixed(1));

    return [
      `${best?.subjectName || "Your strongest subject"} is your best area with ${best?.percentage ?? 0}% performance.`,
      `${weak?.subjectName || "A subject"} needs more focus; current performance is ${weak?.percentage ?? 0}%.`,
      `Overall performance ${delta >= 0 ? "improved" : "dropped"} by ${Math.abs(delta)}% compared to the previous assessment.`,
    ];
  }, [examTrend, overall, subjectStats]);

  const weakSubjects = useMemo(() => {
    return [...subjectStats].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
  }, [subjectStats]);

  const bestSubjects = useMemo(() => {
    return [...subjectStats].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  }, [subjectStats]);

  const goalTarget = 95;
  const goalProgress = Math.min(100, Math.max(0, (overall / goalTarget) * 100));
  const marksToTarget = Math.max(0, goalTarget - overall) * 0.8;

  const handleReportAction = async (type) => {
    if (!selectedExamTypeId) return;
    const examId = selectedExamTypeId;

    try {
      const { data } = await reportCardApi.downloadPdf((await studentApi.me()).data.studentId, examId);
      const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));

      if (type === "view") {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
      } else if (type === "download") {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = "report-card.pdf";
        link.click();
      } else if (type === "print") {
        const printWindow = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (printWindow) {
          printWindow.onload = () => printWindow.print();
        }
      }
    } catch (error) {
      console.error("Unable to access report card", error);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (all.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Marks" subtitle="Performance dashboard" />
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-sm">
          <EmptyState title="📚 Your marks will appear here after your teachers publish exam results." description="Keep learning and give your best!" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Marks" subtitle={`${overall}% overall performance`} />

      <div className="rounded-[1.75rem] border border-blue-100 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 p-6 text-white shadow-lg shadow-blue-100/60">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[8px] border-white/20 bg-white/10">
              <div className="absolute inset-2 rounded-full border border-white/10" />
              <div className="text-center">
                <div className="text-3xl font-bold">{overall.toFixed(1)}%</div>
              </div>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Overall Performance</p>
              <h2 className="mt-2 text-4xl font-bold">{currentGrade}</h2>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-sm font-medium text-blue-50">
                <TrendingUp className="h-4 w-4" />
                {examTrend.length > 1 ? `+${(overall - examTrend[examTrend.length - 2]?.percentage || 0).toFixed(1)}%` : "+0.0%"} compared to previous exam
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left md:min-w-[260px]">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Class Rank</p>
              <p className="mt-2 text-2xl font-bold">—</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Latest Exam</p>
              <p className="mt-2 text-lg font-bold">{latestExam}</p>
            </div>
            <div className="col-span-2 space-y-3 pt-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-white">Select exam report</span>
                <select
                  value={selectedExamTypeId}
                  onChange={(e) => setSelectedExamTypeId(e.target.value)}
                  className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white outline-none transition focus:border-white focus:bg-white/20"
                >
                  {examOptions.map((option) => (
                    <option key={option.id} value={option.id} className="bg-white text-slate-900">
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button disabled={!selectedExamTypeId} onClick={() => handleReportAction("view")} className="flex-1 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">View Report Card</button>
                <button disabled={!selectedExamTypeId} onClick={() => handleReportAction("download")} className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300 disabled:bg-slate-600/20">Download PDF</button>
                <button disabled={!selectedExamTypeId} onClick={() => handleReportAction("print")} className="rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-300 disabled:bg-slate-600/20">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Average Marks", value: averageMarks, icon: ChartColumnBig, accent: "bg-blue-100 text-blue-700" },
          { label: "Highest Marks", value: highestMarks, icon: Trophy, accent: "bg-emerald-100 text-emerald-700" },
          { label: "Lowest Marks", value: lowestMarks, icon: Target, accent: "bg-amber-100 text-amber-700" },
          { label: "Subjects Passed", value: `${passedSubjects} / ${Math.max(1, subjectStats.length)}`, icon: Medal, accent: "bg-violet-100 text-violet-700" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 text-3xl font-bold text-slate-900">{formatGrade(value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Performance Analytics</h3>
              <p className="text-sm text-slate-500">Progress across exam performance</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Trend</span>
          </div>

          {examTrend.length === 0 ? <EmptyState title="No result trend available yet" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={examTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="examType" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Performance"]} />
                <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Grade Distribution</h3>
            <p className="text-sm text-slate-500">Subject-wise grade mix</p>
          </div>

          {gradeDistribution.length === 0 ? <EmptyState title="No grade mix available yet" /> : (
            <div className="flex items-center gap-4">
              <div className="h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gradeDistribution} dataKey="value" innerRadius={32} outerRadius={58} paddingAngle={3}>
                      {gradeDistribution.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} subject`, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {gradeDistribution.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="font-medium text-slate-700">{entry.name}</span>
                    </div>
                    <span className="text-slate-600">{entry.value} subject{entry.value > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Subject Comparison</h3>
            <p className="text-sm text-slate-500">Performance by subject</p>
          </div>

          {subjectComparison.length === 0 ? <EmptyState title="No subject comparison data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12 }} interval={0} angle={-10} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Average"]} />
                <Bar dataKey="percentage" radius={[8, 8, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Goal Tracker</h3>
            <p className="text-sm text-slate-500">Target: 95%</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
              <span>Current</span>
              <span className="font-semibold text-slate-800">{overall.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.min(goalProgress, 100)}%` }} />
            </div>
            <div className="mt-4 text-sm text-slate-600">
              Need <span className="font-semibold text-slate-900">{marksToTarget.toFixed(1)} more marks</span> to hit target.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjectStats.length === 0 ? (
          <div className="col-span-full">
            <EmptyState title="No subject performance data available yet" />
          </div>
        ) : (
          subjectStats.map((subject) => {
            const Icon = subjectIcons[subject.subjectName] || subjectIcons.default;
            const trendTone = subject.trend >= 0 ? "text-emerald-600" : "text-rose-600";
            return (
              <div key={subject.subjectName} className="group rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">{subject.subjectName}</h4>
                      <p className="text-xs text-slate-500">Faculty update</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gradeColors[subject.grade] || "bg-slate-100 text-slate-700"}`}>
                    {subject.grade}
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{subject.percentage}%</div>
                    <div className="text-sm text-slate-500">Current score</div>
                  </div>
                  <div className={`inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold ${trendTone}`}>
                    {subject.trend >= 0 ? "▲" : "▼"} {Math.abs(subject.trend).toFixed(1)}%
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.min(100, subject.percentage)}%` }} />
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Rank {subject.rank}</span>
                  <button className="font-semibold text-blue-600 transition hover:text-blue-700">View Details</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Recent Exam Results</h3>
              <p className="text-sm text-slate-500">Latest published marks</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Exam</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Obtained</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Maximum</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">%</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Grade</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Remarks</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-6 text-center text-slate-500">No marks available for the selected filter.</td>
                  </tr>
                ) : (
                  [...filteredRecords]
                    .sort((a, b) => (b.examTypeName || "").localeCompare(a.examTypeName || ""))
                    .slice(0, 8)
                    .map((record) => {
                      const percentage = record.maxMarks > 0 ? ((record.marksObtained / record.maxMarks) * 100).toFixed(1) : 0;
                      const grade = classifyGrade(Number(percentage));
                      const status = Number(percentage) >= 40 ? "Passed" : "Failed";
                      return (
                        <tr key={`${record.id || record.subjectName}-${record.examTypeName}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{record.subjectName}</td>
                          <td className="px-4 py-3 text-slate-600">{record.examTypeName}</td>
                          <td className="px-4 py-3 text-slate-700">{record.marksObtained}</td>
                          <td className="px-4 py-3 text-slate-700">{record.maxMarks}</td>
                          <td className="px-4 py-3 text-slate-700">{percentage}%</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gradeColors[grade] || "bg-slate-100 text-slate-700"}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{record.remarks || "Strong effort"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Performance Insights</h3>
              <p className="text-sm text-slate-500">Smart suggestions based on your trend</p>
            </div>

            <div className="space-y-3">
              {insights.map((item, index) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                      {index === 0 ? "★" : index === 1 ? "!" : "↗"}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">Insight</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Needs Attention</h3>
              <p className="text-sm text-slate-500">Subjects requiring support</p>
            </div>

            <div className="space-y-3">
              {weakSubjects.length === 0 ? (
                <p className="text-sm text-slate-500">No weak subjects identified.</p>
              ) : (
                weakSubjects.map((subject) => (
                  <div key={subject.subjectName} className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{subject.subjectName}</span>
                      <span className="text-sm font-semibold text-amber-700">{subject.percentage}%</span>
                    </div>
                    <p className="mt-2 text-xs text-amber-700">Practice {subject.subjectName === "Mathematics" ? "Algebra" : "revision exercises"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Best Subjects</h3>
              <p className="text-sm text-slate-500">Top performers</p>
            </div>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {bestSubjects.length === 0 ? (
              <p className="text-sm text-slate-500">No subject rankings yet.</p>
            ) : (
              bestSubjects.map((subject, index) => (
                <div key={subject.subjectName} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">#{index + 1}</span>
                    <div>
                      <div className="font-semibold text-slate-800">{subject.subjectName}</div>
                      <div className="text-xs text-slate-500">Strong consistency</div>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{subject.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Achievements</h3>
            <p className="text-sm text-slate-500">Milestones unlocked</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              "🏆 Top Performer",
              "⭐ 90% Club",
              "📚 Subject Topper",
              "🔥 Improved Performance",
            ].map((badge) => (
              <span key={badge} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <UserRound className="h-4 w-4 text-blue-600" />
              Latest performance note
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {overall >= 85 ? "Excellent academic momentum is visible across your latest results." : "Your progress is steady and can improve with a little additional focus."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Recent Results Timeline</h3>
          <p className="text-sm text-slate-500">Your latest exam snapshots</p>
        </div>

        <div className="space-y-3">
          {recentResults.length === 0 ? (
            <p className="text-sm text-slate-500">No recent results available.</p>
          ) : (
            recentResults.map((result) => (
              <div key={`${result.subjectName}-${result.examTypeName}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{result.examTypeName}</p>
                  <p className="mt-1 font-semibold text-slate-900">{result.subjectName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-slate-800">{result.marksObtained}/{result.maxMarks}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${gradeColors[classifyGrade(result.percentage)] || "bg-slate-100 text-slate-700"}`}>
                    {classifyGrade(result.percentage)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
