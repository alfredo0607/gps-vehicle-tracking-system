// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#FF9900",
          600: "#D97706",
          700: "#B45309",
          800: "#232F3E",
          900: "#131921",
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
