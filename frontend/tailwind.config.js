/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SP Utilities App colour palette
        "sp-teal":           "#2DB7A3",
        "sp-teal-dark":      "#239E8C",
        "sp-mint":           "#9DE1D3",
        "sp-chart":          "#BFECE4",
        "sp-bg":             "#F5F7F7",
        "sp-alert":          "#F59E0B",
        "sp-alert-light":    "#FEF3C7",
        "sp-text":           "#2F3A3A",
        "sp-text-secondary": "#6B7C7C",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
