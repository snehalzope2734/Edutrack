import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { authApi } from "../../api/authApi";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mb-6 text-sm text-slate-500">
          {step === 1 && "Enter your account email to receive a reset code."}
          {step === 2 && "Enter the code we emailed you along with a new password."}
          {step === 3 && "All set!"}
        </p>

        {step === 1 && (
          <form onSubmit={requestOtp} className="space-y-4">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button disabled={loading} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              Send reset code
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword} className="space-y-4">
            <input
              type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <input
              type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password" minLength={8}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button disabled={loading} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              Reset password
            </button>
          </form>
        )}

        {step === 3 && (
          <Link to="/login" className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700">
            Back to sign in
          </Link>
        )}

        <Link to="/login" className="mt-4 block text-center text-sm text-slate-500 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
