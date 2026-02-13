/**
 * Design System FleetMaster Pro
 * Standards 2024 - Inspiré Notion, Linear, Samsara
 */

export const designSystem = {
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
    semantic: {
      success: '#10b981',
      successLight: '#d1fae5',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      danger: '#ef4444',
      dangerLight: '#fee2e2',
      info: '#3b82f6',
      infoLight: '#dbeafe',
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    }
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    glass: '0 8px 32px 0 rgb(0 0 0 / 0.08)',
  },
  
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const cx = {
  card: 'bg-white rounded-xl border border-slate-200 shadow-sm transition-all duration-250 hover:shadow-lg hover:-translate-y-0.5',
  btnPrimary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200',
  btnSecondary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-all duration-200',
  input: 'w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200',
  badge: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full',
  heading1: 'text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight',
  heading2: 'text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight',
  body: 'text-base text-slate-600 leading-relaxed',
};
