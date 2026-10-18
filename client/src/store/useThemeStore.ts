import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('linear_theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyTheme = (dark: boolean) => {
  if (typeof document === 'undefined') return;
  if (dark) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
};

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: getInitialTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem('linear_theme', next ? 'dark' : 'light');
      applyTheme(next);
      return { isDark: next };
    }),
  setTheme: (dark: boolean) => {
    localStorage.setItem('linear_theme', dark ? 'dark' : 'light');
    applyTheme(dark);
    set({ isDark: dark });
  },
}));

// Apply initial class immediately
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}

