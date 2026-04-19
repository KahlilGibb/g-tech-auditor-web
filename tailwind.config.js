/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        'primary-blue': '#2563EB',
        'primary-blue-dark': '#1E40AF',
        'primary-blue-light': '#3B82F6',
        'danger-red': '#DC2626',
        'danger-red-light': '#EF4444',
        'warning-amber': '#F59E0B',
        'success-green': '#10B981',
        'success-green-light': '#34D399',
        // Light mode semantic
        background: '#FFFFFF',
        foreground: '#111827',
        card: '#FFFFFF',
        surface: '#F9FAFB',
        'surface-elevated': '#FFFFFF',
        secondary: '#F3F4F6',
        'muted-foreground': '#6B7280',
        divider: '#E5E7EB',
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
}
