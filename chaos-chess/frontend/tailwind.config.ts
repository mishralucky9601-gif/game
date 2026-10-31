import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chaos: {
          bg: "#0a0a12",
          panel: "#12121e",
          accent: "#8b5cf6",
          accent2: "#f472b6",
          gold: "#fbbf24",
          danger: "#ef4444",
          success: "#22c55e",
        },
      },
      backgroundImage: {
        "chaos-gradient":
          "radial-gradient(circle at 20% 20%, rgba(139,92,246,0.25), transparent 40%), radial-gradient(circle at 80% 80%, rgba(244,114,182,0.2), transparent 40%), #0a0a12",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0,0,0,0.37)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
