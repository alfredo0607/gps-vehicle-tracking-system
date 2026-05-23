// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          200: "#c7d7fe",
          300: "#a5bafc",
          400: "#8196f8",
          500: "#667eea",
          600: "#5568d3",
          700: "#4553b8",
          800: "#3a4494",
          900: "#343b75",
        },
      },
      fontFamily: {
        sans: ["Inter var", "system-ui", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-gentle": "pulse 3s ease-in-out infinite",
      },
    },
  },
};
