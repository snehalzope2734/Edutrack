import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearCredentials } from "../store/slices/authSlice";
import { authApi } from "../api/authApi";

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout — we clear local state regardless.
    }
    dispatch(clearCredentials());
    navigate("/login");
  };

  return {
    token,
    user, // { userId, name, role }
    role: user?.role,
    isAuthenticated: !!token,
    logout,
  };
}
