/** @type {import('tailwindcss').Config} */
// Preset مشترك (ألوان/مسافات موحّدة) — كل تطبيق يضيفه بـ presets ضمن tailwind.config الخاص به
module.exports = {
  darkMode: "class",
  theme: {
    extend: {
      // خط Cairo رسمي موحّد (يُحمَّل عبر next/font/google بكل layout.tsx) —
      // مهم خصوصًا لمستندات الفواتير القابلة للطباعة/PDF.
      fontFamily: {
        sans: ["var(--font-cairo)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      borderRadius: {
        xl: "var(--radius)",
        lg: "calc(var(--radius) - 0.25rem)",
        md: "calc(var(--radius) - 0.5rem)",
        sm: "calc(var(--radius) - 0.65rem)",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px 0 rgb(0 0 0 / 0.06)",
        pop: "0 8px 24px 0 rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};
