import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Archive,
  ArrowUpDown,
  Check,
  Clipboard,
  Copy,
  Download,
  FileText,
  Layers,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { adminApi } from "../../api/adminApi";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const PERIOD_TIMINGS = {
  1: "08:00 - 08:45",
  2: "08:45 - 09:30",
  3: "09:45 - 10:30",
  4: "10:30 - 11:15",
  5: "11:15 - 12:00",
  6: "12:30 - 13:15",
  7: "13:15 - 14:00",
  8: "14:00 - 14:45",
};
const BREAK_PERIODS = {
  4: { label: "LUNCH BREAK", description: "Lunch and transition time" },
};
const SUBJECT_COLORS = {
  Science: "from-sky-500 to-sky-600",
  Math: "from-emerald-500 to-emerald-600",
  English: "from-violet-500 to-violet-600",
  Computer: "from-orange-500 to-orange-600",
  History: "from-amber-500 to-amber-600",
  default: "from-slate-400 to-slate-500",
};

function getSubjectColor(subjectName) {
  const key = Object.keys(SUBJECT_COLORS).find((name) => subjectName?.toLowerCase().includes(name.toLowerCase()));
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.default;
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export default function TimetableBuilderPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightKey, setHighlightKey] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const initialGrid = useRef({});

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLowerCase();
    return classes.filter((klass) => {
      const label = `${klass.className}${klass.section}`.toLowerCase();
      return !query || label.includes(query);
    });
  }, [classSearch, classes]);

  useEffect(() => {
    (async () => {
      try {
        const response = await adminApi.listClasses();
        const classData = Array.isArray(response.data) ? response.data : [];
        setClasses(classData);
        if (classData.length) setClassId(classData[0].id);
      } catch (err) {
        toast.error("Unable to load classes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!classId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [classListRes, subjectsRes, timetableRes] = await Promise.all([
          adminApi.listClasses(),
          adminApi.listSubjects({ classId }),
          adminApi.getTimetable(classId),
        ]);
        const classListData = Array.isArray(classListRes.data) ? classListRes.data : [];
        setClasses(classListData);
        setSubjects(subjectsRes.data);
        const g = {};
        timetableRes.data.forEach((slot) => {
          g[`${slot.dayOfWeek}-${slot.periodNumber}`] = { subjectId: slot.subjectId, startTime: slot.startTime, endTime: slot.endTime, slotId: slot.id };
        });
        setGrid(g);
        initialGrid.current = g;
        setPendingChanges(0);
        setUndoStack([]);
      } catch (err) {
        toast.error("Could not load timetable data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [classId]);

  useEffect(() => {
    const handleUnload = (event) => {
      if (pendingChanges > 0) {
        event.preventDefault();
        event.returnValue = "You have unsaved timetable changes. Save before leaving?";
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [pendingChanges]);

  const getSlotKey = (day, period) => `${day}-${period}`;

  const buildGrid = (slots) => {
    const result = {};
    slots.forEach((slot) => {
      result[getSlotKey(slot.dayOfWeek, slot.periodNumber)] = {
        subjectId: slot.subjectId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotId: slot.id,
      };
    });
    return result;
  };

  const saveGridState = (next) => {
    setUndoStack((prev) => [...prev, grid]);
    setGrid(next);
    setPendingChanges((count) => count + 1);
  };

  const setCell = (day, period, subjectId) => {
    if (BREAK_PERIODS[period]) return;
    const key = getSlotKey(day, period);
    const subject = subjects.find((s) => s.id === subjectId);
    const next = {
      ...grid,
      [key]: subjectId ? {
        subjectId,
        startTime: PERIOD_TIMINGS[period].split(" - ")[0],
        endTime: PERIOD_TIMINGS[period].split(" - ")[1],
        subjectName: subject?.name,
        teacherName: subject?.teacherName,
      } : undefined,
    };
    saveGridState(next);
    setEditingCell(null);
  };

  const handleCellClick = (day, period) => {
    if (BREAK_PERIODS[period]) return;
    setEditingCell(getSlotKey(day, period));
  };


  const warnDuplicateSubject = () => {
    const warnings = [];
    DAYS.forEach((day) => {
      let previousSubject = null;
      PERIODS.forEach((period) => {
        if (BREAK_PERIODS[period]) {
          previousSubject = null;
          return;
        }
        const cell = grid[getSlotKey(day, period)];
        if (!cell?.subjectId) {
          previousSubject = null;
          return;
        }
        if (previousSubject === cell.subjectId) {
          const subject = subjects.find((s) => s.id === cell.subjectId);
          warnings.push(`${subject?.name || "Subject"} has consecutive periods on ${day}.`);
        }
        previousSubject = cell.subjectId;
      });
    });
    return warnings;
  };

  const warnDailyLimit = () => {
    const errorLimit = 2;
    const warnings = [];
    DAYS.forEach((day) => {
      const subjectCount = {};
      PERIODS.forEach((period) => {
        if (BREAK_PERIODS[period]) return;
        const cell = grid[getSlotKey(day, period)];
        if (cell?.subjectId) {
          subjectCount[cell.subjectId] = (subjectCount[cell.subjectId] || 0) + 1;
        }
      });
      Object.entries(subjectCount).forEach(([subjectId, count]) => {
        if (count > errorLimit) {
          const subject = subjects.find((s) => s.id === subjectId);
          warnings.push(
            `${subject?.name || "Subject"} exceeds ${errorLimit} periods on ${day}.`,
          );
        }
      });
    });
    return warnings;
  };

  const saveTimetable = async () => {
    if (!classId) return;
    const duplicateWarnings = warnDuplicateSubject();
    const dailyWarnings = warnDailyLimit();
    if (duplicateWarnings.length || dailyWarnings.length) {
      const shouldContinue = window.confirm(
        "There are timetable warnings. Continue saving anyway?",
      );
      if (!shouldContinue) return;
    }
    setSaving(true);
    try {
      const items = Object.entries(grid)
        .filter(([key, value]) => value?.subjectId && !BREAK_PERIODS[Number(key.split("-")[1])])
        .map(([key, value]) => {
          const [day, period] = key.split("-");
          return {
            classId,
            subjectId: value.subjectId,
            dayOfWeek: day,
            periodNumber: Number(period),
            startTime: value.startTime,
            endTime: value.endTime,
          };
        });
      await adminApi.saveTimetable(classId, items);
      toast.success("Timetable saved successfully.");
      setPendingChanges(0);
      setUndoStack([]);
      initialGrid.current = grid;
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save timetable");
    } finally {
      setSaving(false);
    }
  };

  const resetDay = (day) => {
    if (!window.confirm(`Reset ${day} timetable?`)) return;
    const next = { ...grid };
    PERIODS.forEach((period) => {
      delete next[getSlotKey(day, period)];
    });
    saveGridState(next);
  };

  const resetAll = () => {
    if (!window.confirm("Reset the entire timetable? This cannot be undone.")) return;
    saveGridState({});
  };

  const undoLastChange = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setGrid(previous);
    setPendingChanges((count) => Math.max(0, count - 1));
  };

  const copyDay = (day) => {
    const data = {};
    PERIODS.forEach((period) => {
      const key = getSlotKey(day, period);
      if (grid[key]) data[key] = grid[key];
    });
    setClipboard({ type: "day", day, data });
    toast.success(`${day} copied to clipboard.`);
  };

  const pasteDay = (day) => {
    if (!clipboard || clipboard.type !== "day") return;
    if (!window.confirm(`Paste ${clipboard.day} into ${day}?`)) return;
    const next = { ...grid };
    PERIODS.forEach((period) => {
      const sourceKey = getSlotKey(clipboard.day, period);
      const targetKey = getSlotKey(day, period);
      if (clipboard.data[sourceKey]) {
        next[targetKey] = clipboard.data[sourceKey];
      }
    });
    saveGridState(next);
  };

  const copyClass = () => {
    setClipboard({ type: "class", classId, data: grid });
    toast.success(`Class timetable copied.`);
  };

  const pasteClass = () => {
    if (!clipboard || clipboard.type !== "class" || clipboard.classId === classId) {
      return;
    }
    if (!window.confirm(`Paste ${clipboard.classId === classId ? "same" : "copied"} class timetable into this class?`)) return;
    saveGridState({ ...clipboard.data });
  };

  const exportCsv = () => {
    const rows = ["Day,Period,Time,Subject,Teacher"].concat(
      DAYS.flatMap((day) =>
        PERIODS.filter((period) => !BREAK_PERIODS[period]).map((period) => {
          const cell = grid[getSlotKey(day, period)];
          return `${day},${period},${PERIOD_TIMINGS[period]},${cell?.subjectName || ""},${cell?.teacherName || ""}`;
        }),
      ),
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const currentClass = classes.find((klass) => klass.id === classId);
    link.download = `${currentClass?.className || "timetable"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printTimetable = () => {
    window.print();
  };

  const totalSlots = DAYS.length * PERIODS.filter((period) => !BREAK_PERIODS[period]).length;
  const assignedSlots = Object.values(grid).filter((cell, idx) => cell?.subjectId).length;
  const freeSlots = totalSlots - assignedSlots;
  const subjectsUsed = new Set(Object.values(grid).filter((cell) => cell?.subjectId).map((cell) => cell.subjectId)).size;
  const teachersInvolved = new Set(Object.values(grid).filter((cell) => cell?.teacherName).map((cell) => cell.teacherName)).size;
  const searchLower = searchQuery.trim().toLowerCase();

  const highlightedCells = useMemo(() => {
    if (!searchLower) return new Set();
    return new Set(Object.entries(grid)
      .filter(([, cell]) => {
        const subject = subjects.find((s) => s.id === cell?.subjectId);
        return (
          subject?.name?.toLowerCase().includes(searchLower) ||
          cell?.teacherName?.toLowerCase().includes(searchLower)
        );
      })
      .map(([key]) => key));
  }, [grid, searchLower, subjects]);

  const subjectStats = useMemo(() => {
    const counts = {};
    Object.values(grid).forEach((cell) => {
      if (cell?.subjectId) {
        counts[cell.subjectId] = (counts[cell.subjectId] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([subjectId, count]) => ({ subject: subjects.find((s) => s.id === subjectId), count }))
      .sort((a, b) => b.count - a.count);
  }, [grid, subjects]);

  const teacherWorkload = useMemo(() => {
    const workload = {};
    Object.entries(grid).forEach(([key, cell]) => {
      if (!cell?.teacherName) return;
      const [day] = key.split("-");
      if (!workload[cell.teacherName]) workload[cell.teacherName] = { total: 0, days: {} };
      workload[cell.teacherName].total += 1;
      workload[cell.teacherName].days[day] = (workload[cell.teacherName].days[day] || 0) + 1;
    });
    return Object.entries(workload).map(([teacherName, data]) => ({ teacherName, ...data }));
  }, [grid]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Builder"
        subtitle="Create and manage the weekly timetable."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveTimetable}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Timetable
            </button>
          </div>
        }
      />

      <div>
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-1">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Class</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Choose class</label>
                  <div className="relative">
                    <input
                      type="search"
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      placeholder="Search class"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Choose class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">Choose class</option>
                    {filteredClasses.map((klass) => (
                      <option key={klass.id} value={klass.id}>
                        {klass.className}{klass.section} • {klass.academicYear}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

          </div>

          {pendingChanges > 0 && (
            <div className="sticky top-5 z-20 rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-sm font-semibold text-amber-800">{pendingChanges} change(s) pending</p>
              <p className="text-sm text-amber-700">Save now to keep your timetable edits or discard before navigating away.</p>
            </div>
          )}

      </section>
    </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Weekly Timetable</p>
              <p className="text-sm text-slate-500">Click a timetable cell to choose a subject and its assigned teacher.</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="bg-white text-left text-slate-500">
                <tr>
                  <th className="sticky left-0 z-20 border-r border-slate-200 bg-white px-4 py-3 text-sm font-semibold">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border-b border-slate-200 px-4 py-3 font-semibold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period} className={BREAK_PERIODS[period] ? "bg-slate-100" : ""}>
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-200 bg-white px-4 py-4 font-medium text-slate-600">
                      <div>{period}</div>
                      <div className="mt-1 text-xs text-slate-400">{PERIOD_TIMINGS[period]}</div>
                    </td>
                    {DAYS.map((day) => {
                      const key = getSlotKey(day, period);
                      const cell = grid[key];
                      const subject = subjects.find((subject) => subject.id === cell?.subjectId);
                      const isHighlighted = highlightedCells.has(key);
                      const isSelected = editingCell === key;
                      const subjectColor = subject ? getSubjectColor(subject.name) : SUBJECT_COLORS.default;
                      if (BREAK_PERIODS[period]) {
                        return (
                          <td key={key} className="border-b border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
                            <div className="rounded-3xl bg-slate-200 px-3 py-4 font-semibold uppercase tracking-[0.2em] text-slate-600">
                              {BREAK_PERIODS[period].label}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">{BREAK_PERIODS[period].description}</div>
                          </td>
                        );
                      }
                      return (
                        <td key={key} className="border-b border-slate-200 px-4 py-4">
                          <button
                            type="button"
                            onClick={() => handleCellClick(day, period)}
                            className={`group relative block w-full rounded-3xl border p-4 text-left transition ${isHighlighted ? "border-brand-500/30 bg-brand-50" : "border-slate-200 bg-slate-50"} ${isSelected ? "ring-2 ring-brand-400" : "hover:border-slate-300 hover:bg-slate-100"}`}
                          >
                            {cell?.subjectId ? (
                              <div>
                                <div className={`inline-flex rounded-full bg-gradient-to-r ${subjectColor} px-3 py-1 text-xs font-semibold text-white shadow-sm`}>{subject?.name}</div>
                                <p className="mt-3 text-sm font-semibold text-slate-900">{subject?.name}</p>
                                <p className="mt-1 text-sm text-slate-500">{cell.teacherName || "Unassigned teacher"}</p>
                                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{PERIOD_TIMINGS[period]}</div>
                              </div>
                            ) : (
                              <div className="flex min-h-[130px] flex-col items-start justify-between rounded-3xl border-dashed border border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                                <div className="font-semibold">No timetable slot</div>
                                <div className="mt-4 flex items-center gap-2 text-brand-600">
                                  <Plus className="h-4 w-4" /> Assign subject
                                </div>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute inset-x-4 bottom-4 top-4 rounded-3xl bg-white/95 p-3 shadow-lg backdrop-blur sm:top-auto">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</label>
                                <select
                                  value={cell?.subjectId || ""}
                                  onChange={(e) => setCell(day, period, e.target.value)}
                                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                >
                                  <option value="">Select subject</option>
                                  {subjects.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} — {s.teacherName || "No teacher"}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:hidden space-y-4 px-4 pb-6 pt-4">
            {DAYS.map((day) => (
              <div key={day} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{day}</p>
                    <p className="text-sm text-slate-500">Mobile friendly view</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {PERIODS.map((period) => {
                    const key = getSlotKey(day, period);
                    const cell = grid[key];
                    if (BREAK_PERIODS[period]) {
                      return (
                        <div key={key} className="rounded-3xl bg-slate-200 p-4 text-sm text-slate-600">
                          <p className="font-semibold">{BREAK_PERIODS[period].label}</p>
                          <p className="mt-1 text-xs">{BREAK_PERIODS[period].description}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">Period {period}</p>
                            <p className="text-xs text-slate-500">{PERIOD_TIMINGS[period]}</p>
                          </div>
                          <button onClick={() => handleCellClick(day, period)} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                            Edit
                          </button>
                        </div>
                        {cell?.subjectId ? (
                          <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-900">{cell.subjectName}</p>
                            <p className="mt-1 text-slate-500">{cell.teacherName || "No teacher assigned"}</p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-500">No subject assigned</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}