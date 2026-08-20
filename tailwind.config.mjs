/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        brand: {
          rose: "#e879a9",
          purple: "#7c3aed",
          light: "#fdf2f8",
          /** Bordô / vinho dos cartazes da marca */
          burgundy: "#6b2d3c",
          /** Fundo blush dos flyers */
          blush: "#f4e8ea",
          ink: "#2d1f24",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(107, 45, 60, 0.12)",
        card: "0 8px 30px -12px rgba(45, 31, 36, 0.18)",
      },
    },
  },
  plugins: [],
};
