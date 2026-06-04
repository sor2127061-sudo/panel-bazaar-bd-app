/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#111111',
        surface2: '#181818',
        accent: '#00FF94',
        accent2: '#FF3CAC',
        danger: '#FF4444',
        warning: '#FFB800',
        muted: '#666666',
        text: '#F0F0F0',
        border: 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        input: '8px',
      },
      boxShadow: {
        glow: '0 0 30px rgba(0,255,148,0.12)',
        'glow-lg': '0 0 40px rgba(0,255,148,0.06)',
        'glow-hover': '0 0 40px rgba(0,255,148,0.18)',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'count-up': 'countUp 0.6s ease forwards',
        shimmer: 'shimmer 1.5s infinite',
        'slide-in': 'slideIn 0.3s ease forwards',
        'scale-in': 'scaleIn 0.4s ease forwards',
        blink: 'blink 1s infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.8)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
      },
    },
  },
  plugins: [],
}
