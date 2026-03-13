/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pxd: {
          primary: '#1976D2',
          'primary-dark': '#1565C0',
          'primary-light': '#BBDEFB',
          secondary: '#424242',
          accent: '#FF5722',
          success: '#4CAF50',
          warning: '#FF9800',
          danger: '#F44336',
          info: '#2196F3',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'pxd-sm': '4px',
        'pxd-md': '8px',
        'pxd-lg': '12px',
        'pxd-xl': '16px',
      },
      boxShadow: {
        'pxd-sm': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'pxd-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'pxd-lg': '0 10px 20px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Desabilitar preflight para não conflitar com Framework7
    preflight: false,
  },
}
