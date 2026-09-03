/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F8F9FA",
        "surface-card": "#FFFFFF",
        "surface-subtle": "#F1F3F5",
        "surface-muted": "#E9ECEF",
        "text-main": "#0F172A",
        "text-muted": "#475569",
        "text-dim": "#64748B",
        "border-subtle": "#CBD5E1",
        "border-dark": "#94A3B8",
        "gov-navy": "#0B1D3A",
        "gov-header": "#0F294A",
        "gov-gold": "#B45309",
        risk: {
          high: "#B91C1C",
          "high-bg": "#FEF2F2",
          "high-border": "#FECACA",
          medium: "#B45309",
          "medium-bg": "#FFFBEB",
          "medium-border": "#FDE68A",
          low: "#15803D",
          "low-bg": "#F0FDF4",
          "low-border": "#BBF7D0",
        },
      },
      fontFamily: {
        sans: [
          "IBM Plex Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Roboto Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
      },
      boxShadow: {
        none: "none",
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
