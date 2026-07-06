import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202A",
        panel: "#F7F9FB",
        line: "#D8DEE6",
        accent: "#2563EB",
        success: "#15803D",
        warning: "#B45309",
        danger: "#B91C1C"
      }
    }
  },
  plugins: []
};

export default config;
