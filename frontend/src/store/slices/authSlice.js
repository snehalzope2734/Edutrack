import { createSlice } from "@reduxjs/toolkit";

const storedUser = localStorage.getItem("edutrack_user");

const initialState = {
  token: localStorage.getItem("edutrack_token") || null,
  user: storedUser ? JSON.parse(storedUser) : null, // { userId, name, role }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, role, userId, name } = action.payload;
      state.token = token;
      state.user = { userId, name, role };
      localStorage.setItem("edutrack_token", token);
      localStorage.setItem("edutrack_user", JSON.stringify(state.user));
    },
    clearCredentials: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem("edutrack_token");
      localStorage.removeItem("edutrack_user");
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
