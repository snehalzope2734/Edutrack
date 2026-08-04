import { createSlice } from "@reduxjs/toolkit";

const schoolSlice = createSlice({
  name: "school",
  initialState: { info: null },
  reducers: {
    setSchoolInfo: (state, action) => {
      state.info = action.payload;
    },
  },
});

export const { setSchoolInfo } = schoolSlice.actions;
export default schoolSlice.reducer;
