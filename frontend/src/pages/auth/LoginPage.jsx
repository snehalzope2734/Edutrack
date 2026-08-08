import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../../api/authApi";
import { setCredentials } from "../../store/slices/authSlice";
import ThemeToggle from "../../components/common/ThemeToggle";

/**
 * The only unauthenticated screen in the app. There is no public landing
 * page / school marketing site — this system has no PUBLIC role. Admin,
 * Teacher, and Student all sign in here with the same form.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      dispatch(setCredentials(data));
      const home = data.role === "ADMIN" ? "/admin" : data.role === "TEACHER" ? "/teacher" : "/student";
      navigate(home, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50/90 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 transition-colors duration-300">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle compact={true} />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all duration-300">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="rounded-2xl bg-brand-600 dark:bg-brand-500 p-3 text-white shadow-lg shadow-brand-500/20">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">EduTrack</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your school account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-brand-600 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="you@school.edu"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-brand-600 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-60 shadow-md shadow-brand-500/10"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <a href="/forgot-password" className="mt-5 block text-center text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
          Forgot your password?
        </a>
      </div>
    </div>
  );
}
