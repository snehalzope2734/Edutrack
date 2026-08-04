/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          200: "#bccdff",
          300: "#8fa8ff",
          400: "#5b79ff",
          500: "#3652f5",
          600: "#2536d6",
          700: "#1f2bac",
          800: "#1f2a8a",
          900: "#1e296e",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
