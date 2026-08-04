import { NavLink, Outlet } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

/**
 * Shared shell for the three role-based apps (admin/teacher/student). Each
 * role passes its own nav items; there's no public marketing chrome anywhere
 * since this system has no PUBLIC role.
 */
export default function AppLayout({ navItems, roleLabel }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <GraduationCap className="h-6 w-6 text-brand-600" />
          <div>
            <p className="text-sm font-semibold leading-tight">EduTrack</p>
            <p className="text-xs text-slate-400 leading-tight">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 truncate px-2 text-xs text-slate-400">{user?.name}</div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
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
