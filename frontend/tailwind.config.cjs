/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "rgb(var(--color-brand-50) / <alpha-value>)",
          500: "rgb(var(--color-brand-500) / <alpha-value>)",
          600: "rgb(var(--color-brand-600) / <alpha-value>)"
        },
        neutral: {
          0: "rgb(var(--color-neutral-0) / <alpha-value>)",
          50: "rgb(var(--color-neutral-50) / <alpha-value>)",
          100: "rgb(var(--color-neutral-100) / <alpha-value>)",
          150: "rgb(var(--color-neutral-150) / <alpha-value>)",
          200: "rgb(var(--color-neutral-200) / <alpha-value>)",
          300: "rgb(var(--color-neutral-300) / <alpha-value>)",
          400: "rgb(var(--color-neutral-400) / <alpha-value>)",
          500: "rgb(var(--color-neutral-500) / <alpha-value>)",
          600: "rgb(var(--color-neutral-600) / <alpha-value>)",
          700: "rgb(var(--color-neutral-700) / <alpha-value>)",
          800: "rgb(var(--color-neutral-800) / <alpha-value>)",
          900: "rgb(var(--color-neutral-900) / <alpha-value>)"
        },
        gov: {
          blue: "rgb(var(--color-gov-blue) / <alpha-value>)",
          "blue-dark": "rgb(var(--color-gov-blue-dark) / <alpha-value>)",
          "blue-light": "rgb(var(--color-gov-blue-light) / <alpha-value>)",
          gold: "rgb(var(--color-gov-gold) / <alpha-value>)",
          "gold-light": "rgb(var(--color-gov-gold-light) / <alpha-value>)",
          saffron: "rgb(var(--color-gov-saffron) / <alpha-value>)"
        },
        semantic: {
          success: "rgb(var(--color-success) / <alpha-value>)",
          "success-bg": "rgb(var(--color-success-bg) / <alpha-value>)",
          warning: "rgb(var(--color-warning) / <alpha-value>)",
          danger: "rgb(var(--color-danger) / <alpha-value>)",
          "danger-bg": "rgb(var(--color-danger-bg) / <alpha-value>)",
          info: "rgb(var(--color-info) / <alpha-value>)"
        }
      },
      borderRadius: {
        lg: "14px"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      }
    }
  },
  plugins: []
};
