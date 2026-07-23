/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tally (Hallmark) design system — indigo accent on cool-pastel paper
        'primary-blue': 'oklch(54% 0.22 268)',
        'primary-blue-dark': 'oklch(46% 0.22 268)',
        'primary-blue-light': 'oklch(72% 0.14 268)',
        'accent-tint': 'oklch(94% 0.04 268)',
        companion: 'oklch(82% 0.18 130)',
        'danger-red': 'oklch(58% 0.2 27)',
        'danger-red-light': 'oklch(64% 0.21 27)',
        'warning-amber': 'oklch(74% 0.18 50)',
        'success-green': 'oklch(64% 0.15 152)',
        'success-green-light': 'oklch(72% 0.16 152)',

        background: 'oklch(98.4% 0.005 258)',
        foreground: 'oklch(20% 0.03 258)',
        card: 'oklch(100% 0 0)',
        surface: 'oklch(96.2% 0.01 258)',
        'surface-elevated': 'oklch(100% 0 0)',
        secondary: 'oklch(94% 0.012 258)',
        'muted-foreground': 'oklch(52% 0.018 258)',
        divider: 'oklch(90% 0.012 258)',

        'ink-deep': 'oklch(18% 0.03 258)',
        'ink-button': 'oklch(18% 0.03 258)',
        charcoal: 'oklch(35% 0.025 258)',
        slate: 'oklch(44% 0.022 258)',
        stone: 'oklch(60% 0.016 258)',
        hairline: 'oklch(86% 0.015 258)',
        'hairline-soft': 'oklch(92% 0.01 258)',
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
        serif: ["Instrument Serif", "Times New Roman", "serif"],
      },
      boxShadow: {
        'meta-sticky': '0 1px 2px rgba(20, 30, 80, 0.06), 0 8px 24px -14px rgba(20, 30, 80, 0.18)',
        'meta-toast': '0 8px 24px -8px rgba(20, 30, 80, 0.22)',
        'meta-popup': '0 24px 60px -28px rgba(20, 30, 80, 0.28), 0 4px 12px -4px rgba(20, 30, 80, 0.08)',
        'soft-sm': '0 1px 0 rgba(255, 255, 255, 0.16) inset, 0 6px 18px -10px rgba(20, 30, 80, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.24s cubic-bezier(0.22,0.61,0.36,1) forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.22,0.61,0.36,1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.22,0.61,0.36,1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
