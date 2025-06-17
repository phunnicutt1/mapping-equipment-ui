/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Equipment type border colors - ensure all possible combinations are included
    'border-l-blue-500', 'border-l-purple-500', 'border-l-green-500', 'border-l-orange-500',
    'border-l-red-500', 'border-l-indigo-500', 'border-l-cyan-500', 'border-l-pink-500',
    'border-l-yellow-500', 'border-l-teal-500', 'border-l-violet-500', 'border-l-emerald-500',
    'border-l-amber-500', 'border-l-lime-500', 'border-l-rose-500', 'border-l-slate-500',
    'border-l-zinc-500', 'border-l-red-600', 'border-l-blue-600', 'border-l-purple-600',
    'border-l-green-600', 'border-l-indigo-600', 'border-l-cyan-600', 'border-l-pink-600',
    'border-l-teal-600', 'border-l-emerald-600', 'border-l-amber-600', 'border-l-orange-600',
    'border-l-gray-500',
    // Background colors for badges
    'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500',
    'bg-indigo-500', 'bg-cyan-500', 'bg-pink-500', 'bg-yellow-500', 'bg-teal-500',
    'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-lime-500', 'bg-rose-500',
    'bg-slate-500', 'bg-zinc-500', 'bg-red-600', 'bg-blue-600', 'bg-purple-600',
    'bg-green-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-pink-600', 'bg-teal-600',
    'bg-emerald-600', 'bg-amber-600', 'bg-orange-600', 'bg-gray-500'
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