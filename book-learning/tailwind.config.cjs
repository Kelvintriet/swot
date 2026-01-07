/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#ffffff',
        // Keep original kebab-case tokens
        'main-bg': '#f9fafb',
        'text-primary': '#111827',
        'text-secondary': '#6b7280',
        // Add camelCase tokens to match the provided Stitch HTML
        mainBg: '#f9fafb',
        textPrimary: '#111827',
        textSecondary: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
