import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { authApi } from "../../api/authApi";
import ThemeToggle from "../../components/common/ThemeToggle";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      toast.success("If that email exists, a reset code was sent");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      toast.success("Password updated — you can now sign in");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50/80 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 transition-colors duration-300">
      <div className="absolute top-5 right-5 z-10">
        <ThemeToggle compact={true} />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-sm p-8 shadow-xl transition-all duration-300">
        <h1 className="mb-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">Reset your password</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {step === 1 && "Enter your account email to receive a reset code."}
          {step === 2 && "Enter the code we emailed you along with a new password."}
          {step === 3 && "All set!"}
        </p>

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-4">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
            <button disabled={loading} className="w-full rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-60 transition shadow-md shadow-brand-500/10">
              Send reset code
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword} className="space-y-4">
            <input
              type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
            <input
              type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password" minLength={8}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 dark:focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors"
            />
            <button disabled={loading} className="w-full rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 dark:hover:bg-brand-600 disabled:opacity-60 transition shadow-md shadow-brand-500/10">
              Reset password
            </button>
          </form>
        )}

        {step === 3 && (
          <Link to="/login" className="block rounded-xl bg-brand-600 dark:bg-brand-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700 dark:hover:bg-brand-600 transition shadow-md shadow-brand-500/10">
            Back to sign in
          </Link>
        )}

        <Link to="/login" className="mt-5 block text-center text-sm text-slate-500 dark:text-slate-400 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
