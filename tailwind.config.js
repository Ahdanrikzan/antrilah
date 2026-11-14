/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        cream: '#FFF6E5',
        paper: '#FFFDF7',
        yellow: '#FFD93D',
        pink: '#FF5C8A',
        blue: '#3D5AFE',
        lime: '#C8F169',
        violet: '#B58CFF',
        orange: '#FF8A3D',
        muted: '#6B6257',
      },
      fontFamily: {
        display: ['"Arial Black"', '"Archivo Black"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderWidth: {
        3: '3px',
      },
      boxShadow: {
        hard: '6px 6px 0 0 #111111',
        'hard-sm': '3px 3px 0 0 #111111',
        'hard-lg': '10px 10px 0 0 #111111',
        'hard-pink': '6px 6px 0 0 #FF5C8A',
        'hard-blue': '6px 6px 0 0 #3D5AFE',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      backgroundImage: {
        dots: 'radial-gradient(#11111126 1.2px, transparent 1.2px)',
        grid: 'linear-gradient(#11111114 1px, transparent 1px), linear-gradient(90deg, #11111114 1px, transparent 1px)',
        stripes: 'repeating-linear-gradient(45deg, #111 0 12px, transparent 12px 24px)',
      },
      backgroundSize: {
        dots: '18px 18px',
        grid: '28px 28px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        rise: {
          '0%': { transform: 'scaleY(0.2)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        float: 'float 6s ease-in-out infinite',
        blink: 'blink 1.6s ease-in-out infinite',
        pop: 'pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
        wiggle: 'wiggle 5s ease-in-out infinite',
        'spin-slow': 'spinSlow 22s linear infinite',
      },
    },
  },
  plugins: [],
};
