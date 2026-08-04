import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { adminApi } from "../../api/adminApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetableBuilderPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [grid, setGrid] = useState({}); // `${day}-${period}` -> { subjectId, startTime, endTime }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await adminApi.listClasses();
      setClasses(data);
      if (data.length) setClassId(data[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    (async () => {
      const [subjectsRes, timetableRes] = await Promise.all([
        adminApi.listSubjects(classId),
        adminApi.getTimetable(classId),
      ]);
      setSubjects(subjectsRes.data);
      const g = {};
      timetableRes.data.forEach((slot) => {
        g[`${slot.dayOfWeek}-${slot.periodNumber}`] = {
          subjectId: slot.subjectId, startTime: slot.startTime, endTime: slot.endTime,
        };
      });
      setGrid(g);
    })();
  }, [classId]);

  const setCell = (day, period, field, value) => {
    const key = `${day}-${period}`;
    setGrid((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const items = Object.entries(grid)
        .filter(([, v]) => v.subjectId && v.startTime && v.endTime)
        .map(([key, v]) => {
          const [day, period] = key.split("-");
          return { classId, subjectId: v.subjectId, dayOfWeek: day, periodNumber: Number(period), startTime: v.startTime, endTime: v.endTime };
        });
      await adminApi.saveTimetable(classId, items);
      toast.success("Timetable saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save timetable");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Build the weekly schedule for a class"
        action={
          <div className="flex gap-2">
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {classes.map((c) => <option key={c.id} value={c.id}>Class {c.className}{c.section}</option>)}
            </select>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-500">Period</th>
              {DAYS.map((d) => <th key={d} className="px-3 py-2 text-left font-medium text-slate-500">{d}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="px-3 py-2 font-medium text-slate-500">{period}</td>
                {DAYS.map((day) => {
                  const key = `${day}-${period}`;
                  const cell = grid[key] || {};
                  return (
                    <td key={key} className="px-2 py-2">
                      <select value={cell.subjectId || ""} onChange={(e) => setCell(day, period, "subjectId", e.target.value)}
                        className="mb-1 w-full rounded border border-slate-300 px-1.5 py-1 text-xs">
                        <option value="">—</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {cell.subjectId && (
                        <div className="flex gap-1">
                          <input type="time" value={cell.startTime || ""} onChange={(e) => setCell(day, period, "startTime", e.target.value)}
                            className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs" />
                          <input type="time" value={cell.endTime || ""} onChange={(e) => setCell(day, period, "endTime", e.target.value)}
                            className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
