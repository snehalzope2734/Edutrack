import { NavLink, Outlet } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "./ThemeToggle";

/**
 * Shared shell for the three role-based apps (admin/teacher/student). Each
 * role passes its own nav items; there's no public marketing chrome anywhere
 * since this system has no PUBLIC role.
 */
export default function AppLayout({ navItems, roleLabel }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">EduTrack</p>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-400 leading-tight">{roleLabel}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 space-y-2 dark:border-slate-800">
          <div className="px-2">
            <ThemeToggle compact={false} />
          </div>

          <div className="flex items-center justify-between px-2 pt-1">
            <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{user?.name}</span>
            <button
              onClick={logout}
              title="Log out"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
