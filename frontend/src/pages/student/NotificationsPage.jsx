import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Info,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { notificationApi } from "../../api/notificationApi";
import { useAuth } from "../../hooks/useAuth";

const FILTERS = ["all", "unread", "today", "week", "alerts", "reminders", "academic", "system", "events"];

function getCategory(notification) {
  const title = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  if (notification.type === "alert" || /emergency|school closed|system failure|security|exam cancelled|cancelled/.test(title)) {
    return { key: "alert", label: "ALERT", badge: "bg-rose-50 text-rose-700 ring-rose-200", icon: TriangleAlert, border: "border-rose-500", accent: "from-rose-500 to-rose-600" };
  }
  if (/attendance pending|marks submission pending|approval needed|fee reminder|urgent|important/.test(title)) {
    return { key: "important", label: "IMPORTANT", badge: "bg-orange-50 text-orange-700 ring-orange-200", icon: Clock3, border: "border-orange-500", accent: "from-orange-500 to-orange-600" };
  }
  if (/tomorrow|meeting|timetable|reminder/.test(title)) {
    return { key: "reminder", label: "REMINDER", badge: "bg-amber-50 text-amber-700 ring-amber-200", icon: CalendarDays, border: "border-amber-500", accent: "from-amber-500 to-amber-600" };
  }
  if (/circular|new notice|new material|new assignment|info|announcement/.test(title)) {
    return { key: "info", label: "INFO", badge: "bg-sky-50 text-sky-700 ring-sky-200", icon: Info, border: "border-sky-500", accent: "from-sky-500 to-sky-600" };
  }
  if (/submitted|saved|successful|complete|uploaded/.test(title)) {
    return { key: "success", label: "SUCCESS", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2, border: "border-emerald-500", accent: "from-emerald-500 to-emerald-600" };
  }
  if (/sport|raksha|independence|annual|event|festival/.test(title)) {
    return { key: "event", label: "EVENT", badge: "bg-violet-50 text-violet-700 ring-violet-200", icon: CalendarDays, border: "border-violet-500", accent: "from-violet-500 to-violet-600" };
  }
  return { key: "info", label: "INFO", badge: "bg-sky-50 text-sky-700 ring-sky-200", icon: Info, border: "border-sky-500", accent: "from-sky-500 to-sky-600" };
}

function groupKeyForDate(dateValue) {
  const now = new Date();
  const current = dateValue ? new Date(dateValue) : new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 14);

  if (current >= today) return "Today";
  if (current >= yesterday) return "Yesterday";
  if (current >= weekAgo) return "Earlier This Week";
  if (current >= lastWeek) return "Last Week";
  return "Older";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actioningId, setActioningId] = useState(null);

  const basePath = location.pathname.startsWith("/teacher") ? "/teacher" : "/student";

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await notificationApi.list({ page: 0, size: 50 });
      setNotifications(data.content ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    setActioningId(id);
    try {
      await notificationApi.markRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, isReadBy: [...(item.isReadBy || []), user?.userId] } : item));
    } finally {
      setActioningId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !(item.isReadBy || []).includes(user?.userId));
    if (!unread.length) return;
    setActioningId("all");
    try {
      await Promise.all(unread.map((item) => notificationApi.markRead(item.id)));
      setNotifications((current) => current.map((item) => !(item.isReadBy || []).includes(user?.userId) ? { ...item, isReadBy: [...(item.isReadBy || []), user?.userId] } : item));
    } finally {
      setActioningId(null);
    }
  };

  const remove = async (id) => {
    setActioningId(id);
    try {
      await notificationApi.remove(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
    } finally {
      setActioningId(null);
    }
  };

  const getRoute = (notification) => {
    const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
    if (text.includes("report card")) return `${basePath}/report-cards`;
    if (text.includes("material") || text.includes("study")) return `${basePath}/materials`;
    if (text.includes("mark") || text.includes("marks")) return `${basePath}/marks`;
    if (text.includes("attendance")) return `${basePath}/attendance`;
    if (text.includes("exam")) return `${basePath}/exam-schedule`;
    return `${basePath}/notifications`;
  };

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const isRead = (notification.isReadBy || []).includes(user?.userId);
      const category = getCategory(notification).key;
      const matchesSearch = !query || `${notification.title || ""} ${notification.message || ""}`.toLowerCase().includes(query);
      const matchesFilter = filter === "all"
        ? true
        : filter === "unread"
          ? !isRead
          : filter === "today"
            ? groupKeyForDate(notification.createdAt) === "Today"
            : filter === "week"
              ? ["Today", "Yesterday", "Earlier This Week"].includes(groupKeyForDate(notification.createdAt))
              : filter === "alerts"
                ? category === "alert"
                : filter === "reminders"
                  ? category === "reminder"
                  : filter === "academic"
                    ? ["important", "info", "success"].includes(category)
                    : filter === "system"
                      ? category === "alert" || category === "info"
                      : filter === "events"
                        ? category === "event"
                        : true;
      return matchesSearch && matchesFilter;
    });
  }, [notifications, search, filter, user?.userId]);

  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], "Earlier This Week": [], "Last Week": [], Older: [] };
    filteredNotifications.forEach((notification) => {
      const bucket = groupKeyForDate(notification.createdAt);
      groups[bucket]?.push(notification);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredNotifications]);

  const unreadCount = notifications.filter((item) => !(item.isReadBy || []).includes(user?.userId)).length;
  const summary = useMemo(() => {
    const total = filteredNotifications.length;
    const unread = filteredNotifications.filter((item) => !(item.isReadBy || []).includes(user?.userId)).length;
    const urgent = filteredNotifications.filter((item) => getCategory(item).key === "alert" || getCategory(item).key === "important").length;
    const today = filteredNotifications.filter((item) => groupKeyForDate(item.createdAt) === "Today").length;
    return { total, unread, urgent, today };
  }, [filteredNotifications, user?.userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-100" />
        </div>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-[1.75rem] border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Notifications</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Stay updated with everything happening in your school.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500">Catch the most important updates, action items, and class happenings in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={markAllRead} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              {actioningId === "all" ? "Working..." : "Mark All as Read"}
            </button>
            <button onClick={load} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh</span>
            </button>
            <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <span className="inline-flex items-center gap-2"><Filter className="h-4 w-4" />Filter</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "All", value: summary.total, icon: Bell, tone: "bg-sky-50 text-sky-700" },
            { label: "Unread", value: summary.unread, icon: BellRing, tone: "bg-amber-50 text-amber-700" },
            { label: "Urgent", value: summary.urgent, icon: TriangleAlert, tone: "bg-rose-50 text-rose-700" },
            { label: "Today", value: summary.today, icon: CalendarDays, tone: "bg-emerald-50 text-emerald-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className={`inline-flex rounded-2xl p-2 ${item.tone}`}><item.icon className="h-4 w-4" /></div>
              <p className="mt-4 text-sm uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications..." className="w-full bg-transparent outline-none sm:w-64" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "today", label: "Today" },
              { key: "week", label: "This Week" },
              { key: "alerts", label: "Alerts" },
              { key: "reminders", label: "Reminders" },
              { key: "academic", label: "Academic" },
              { key: "system", label: "System" },
              { key: "events", label: "Events" },
            ].map((option) => (
              <button key={option.key} type="button" onClick={() => setFilter(option.key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${filter === option.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
          <EmptyState title="You're all caught up!" description="No unread notifications." />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map(([groupName, items]) => (
            <section key={groupName} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{groupName}</h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-3">
                {items.map((notification) => {
                  const isRead = (notification.isReadBy || []).includes(user?.userId);
                  const category = getCategory(notification);
                  const Icon = category.icon;
                  return (
                    <article key={notification.id} className={`group rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${!isRead ? "border-sky-200 bg-sky-50/70" : "bg-white"}`}>
                      <div className={`h-full rounded-[1.25rem] border-l-4 ${category.border} pl-3`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex flex-1 gap-3">
                            <div className={`mt-1 rounded-2xl bg-gradient-to-br ${category.accent} p-2 text-white`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className={`text-lg font-semibold ${!isRead ? "text-slate-900" : "text-slate-800"}`}>{notification.title || "Notification"}</h3>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${category.badge}`}>{category.label}</span>
                                {!isRead && <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message || "No additional details provided."}</p>
                              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{notification.createdAt ? formatDistanceToNowStrict(new Date(notification.createdAt), { addSuffix: true }) : "just now"}</span>
                                <span>{notification.createdAt ? format(new Date(notification.createdAt), "MMM d, yyyy · h:mm a") : ""}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            <button type="button" onClick={() => setSelectedNotification(notification)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View</button>
                            {!isRead ? (
                              <button type="button" onClick={() => markRead(notification.id)} className="rounded-2xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
                                {actioningId === notification.id ? "Working..." : "Mark Read"}
                              </button>
                            ) : null}
                            <button type="button" onClick={() => remove(notification.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                              {notification.type === "reminder" ? "Dismiss" : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Notification details</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedNotification.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedNotification(null)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6 text-sm text-slate-600">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">{selectedNotification.message}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Category</p>
                  <p className="mt-2 font-semibold text-slate-900">{getCategory(selectedNotification).label}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Sender</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedNotification.senderRole || "School"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Date</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedNotification.createdAt ? format(new Date(selectedNotification.createdAt), "MMM d, yyyy · h:mm a") : "—"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Related module</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedNotification.type || "System"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { navigate(getRoute(selectedNotification)); setSelectedNotification(null); }} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">Go to related page</button>
                <button type="button" onClick={() => markRead(selectedNotification.id)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Mark read</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
