/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e4e4e7",
        paper: "#09090b",
        sand: "#18181b",
        primary: {
          DEFAULT: "#3B82F6",
          50: "#172554",
          100: "#1e3a8a",
          600: "#3B82F6",
          700: "#2563EB",
          800: "#1D4ED8",
          900: "#1E40AF",
          950: "#172554",
        },
        // Legacy class names → Mission Control blue
        teal: {
          950: "#93C5FD",
          900: "#3B82F6",
          800: "#60A5FA",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
