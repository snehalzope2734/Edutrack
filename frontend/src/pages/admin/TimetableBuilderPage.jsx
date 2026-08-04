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
  Sparkles,
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
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [grid, setGrid] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightKey, setHighlightKey] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
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
        const { data } = await adminApi.listClasses();
        setClasses(data);
        if (data.length) setClassId(data[0].id);
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
        const [classList, subjectsRes, timetableRes] = await Promise.all([
          adminApi.listClasses(),
          adminApi.listSubjects(classId),
          adminApi.getTimetable(classId),
        ]);
        setClasses(classList);
        setSelectedClass(classList.find((klass) => klass.id === classId));
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

  const handleAutoGenerate = () => {
    if (!subjects.length) {
      return toast.error("Add subjects to generate a timetable.");
    }
    const next = { ...grid };
    const assignmentList = subjects.filter((subject) => subject.teacherName).length ? subjects : subjects.slice();
    let index = 0;
    for (const day of DAYS) {
      for (const period of PERIODS) {
        if (BREAK_PERIODS[period]) continue;
        const subject = assignmentList[index % assignmentList.length];
        next[getSlotKey(day, period)] = {
          subjectId: subject.id,
          startTime: PERIOD_TIMINGS[period].split(" - ")[0],
          endTime: PERIOD_TIMINGS[period].split(" - ")[1],
          subjectName: subject.name,
          teacherName: subject.teacherName,
        };
        index += 1;
      }
    }
    setUndoStack((prev) => [...prev, grid]);
    setGrid(next);
    setPendingChanges((count) => count + 1);
    toast.success("Timetable auto-generated. Review before saving.");
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
    link.download = `${selectedClass?.className || "timetable"}.csv`;
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

  const classLabel = selectedClass ? `${selectedClass.className}${selectedClass.section}` : "Select class";

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Timetable Builder" subtitle="Design and manage a modern school timetable with audit-ready controls." />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr]">
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Class</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-full">
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
                <div className="w-full sm:w-64">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Selected class</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {filteredClasses.map((klass) => (
                      <option key={klass.id} value={klass.id}>
                        {klass.className}{klass.section} • {klass.academicYear}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Assigned Slots", value: assignedSlots, icon: Layers },
                { label: "Free Slots", value: freeSlots, icon: Target },
                { label: "Subjects Used", value: subjectsUsed, icon: Archive },
                { label: "Teachers Involved", value: teachersInvolved, icon: Sparkles },
              ].map((card) => (
                <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-brand-600">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{card.label}</p>
                      <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Actions</p>
                <p className="text-sm text-slate-600">Use the action bar to save, auto-generate, copy, and export your timetable.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:auto-cols-max xl:grid-flow-col">
                <button
                  onClick={handleAutoGenerate}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4" /> Auto Generate
                </button>
                <button
                  onClick={saveTimetable}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Timetable
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                onClick={undoLastChange}
                disabled={!undoStack.length}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <div>
                    <p>Undo Last Change</p>
                    <p className="text-xs text-slate-500">{undoStack.length} step(s)</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => resetDay(DAYS[0])}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <div>
                    <p>Reset Day</p>
                    <p className="text-xs text-slate-500">Clear one day at a time</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  <div>
                    <p>Reset Entire Timetable</p>
                    <p className="text-xs text-slate-500">Empty every slot</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={exportCsv}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <div>
                    <p>Export Excel</p>
                    <p className="text-xs text-slate-500">Download CSV</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Copy / Paste</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={copyClass} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100">
                    <Copy className="inline h-4 w-4" /> Copy Class
                  </button>
                  <button onClick={pasteClass} disabled={!clipboard?.type || clipboard.type !== "class"} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50">
                    <Clipboard className="inline h-4 w-4" /> Paste Class
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-600">Print</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={printTimetable} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100">
                    <Printer className="inline h-4 w-4" /> Print Timetable
                  </button>
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

          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.85fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Subject Legend</p>
                  <p className="mt-2 text-sm text-slate-600">Color-coded subjects help teachers and coordinators scan the week quickly.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {subjects.slice(0, 6).map((subject) => {
                    const gradient = getSubjectColor(subject.name);
                    return (
                      <div key={subject.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                        <span className={`inline-flex items-center rounded-full bg-gradient-to-r ${gradient} px-2.5 py-1 text-white`}>
                          {subject.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Search</p>
                <div className="mt-4 flex gap-3">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search subject or teacher"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button onClick={() => setSearchQuery("")} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                    <Search className="h-4 w-4" /> Clear
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Teacher Workload</p>
                <div className="mt-4 space-y-4">
                  {teacherWorkload.length === 0 ? (
                    <p className="text-sm text-slate-500">No teacher assignments yet.</p>
                  ) : (
                    teacherWorkload.slice(0, 3).map((item) => (
                      <div key={item.teacherName} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="font-semibold text-slate-900">{item.teacherName}</p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Weekly Total: {item.total} periods</p>
                        <div className="mt-3 grid gap-2 text-sm text-slate-600">
                          {Object.entries(item.days).map(([day, count]) => (
                            <div key={day} className="flex items-center justify-between">
                              <span>{day}</span>
                              <span className="font-semibold text-slate-900">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Weekly Subject Statistics</p>
            <div className="mt-4 space-y-4">
              {subjectStats.length === 0 ? (
                <p className="text-sm text-slate-500">No subjects assigned yet.</p>
              ) : (
                subjectStats.map((stat) => {
                  const percent = Math.min(100, Math.round((stat.count / totalSlots) * 100));
                  return (
                    <div key={stat.subject?.id}>
                      <div className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
                        <span>{stat.subject?.name || "Unknown"}</span>
                        <span>{stat.count} periods/week</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Details</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <span>Class</span>
                <strong className="text-slate-900">{classLabel}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <span>Assigned</span>
                <strong className="text-slate-900">{assignedSlots}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <span>Free</span>
                <strong className="text-slate-900">{freeSlots}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <span>Subjects</span>
                <strong className="text-slate-900">{subjects.length}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Clipboard</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-medium text-slate-900">{clipboard ? clipboard.type === "class" ? "Class timetable copied" : `Day copied: ${clipboard.day}` : "Nothing copied"}</p>
              </div>
              {clipboard?.type === "day" && (
                <button onClick={() => pasteDay(DAYS[0])} className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                  Paste into first day
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Weekly Timetable</p>
              <p className="text-sm text-slate-500">Click any cell to assign a subject and teacher.</p>
            </div>
            <div className="hidden gap-2 md:flex">
              <button type="button" onClick={() => copyDay(DAYS[0])} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100">
                Copy Monday
              </button>
              <button type="button" onClick={() => pasteDay(DAYS[1])} disabled={!clipboard || clipboard.type !== "day"} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">
                Paste to Tuesday
              </button>
            </div>
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

          <div className="lg:hidden space-y-4 px-4 pb-6 pt-4">
            {DAYS.map((day) => (
              <div key={day} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{day}</p>
                    <p className="text-sm text-slate-500">Mobile friendly view</p>
                  </div>
                  <button onClick={() => copyDay(day)} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-100">
                    Copy day
                  </button>
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
    </div>
  );
}
