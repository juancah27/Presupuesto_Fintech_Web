import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        income: "#22c55e",
        expense: "#ef4444",
        investment: "#3b82f6",
        warning: "#f59e0b",
      },
      boxShadow: {
        glass: "0 10px 35px rgba(0,0,0,0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-6px)" },
          "40%, 80%": { transform: "translateX(6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out",
        shake: "shake 360ms ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
