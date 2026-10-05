import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#12213a",
        brand: { 50: "#eff6ff", 100: "#dbeafe", 600: "#1e40af", 700: "#1d4ed8" },
        accent: "#ea580c",
      },
      fontFamily: { sans: ["Vazirmatn", "Tahoma", "sans-serif"] },
      boxShadow: {
        card: "0 12px 38px -24px rgba(15, 23, 42, .26)",
        floating: "0 22px 60px -35px rgba(30, 64, 175, .38)",
      },
      backgroundImage: {
        "hero-grid": "linear-gradient(rgba(30,64,175,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
