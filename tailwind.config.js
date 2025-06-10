/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          600: '#dc2626',
        },
        // Custom colors for precise typography matching
        detail: {
          label: '#7f8c8d',  // Exact color for field labels
          value: '#2c3e50',  // Exact color for field values
        },
      },
      fontFamily: {
        // Custom font family matching exact specifications
        'detail': ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
    },
  },
  plugins: [],
}