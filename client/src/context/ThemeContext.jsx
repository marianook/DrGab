import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'drgab_tema';

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem(KEY) || 'claro');

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
    localStorage.setItem(KEY, tema);
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === 'claro' ? 'oscuro' : 'claro'));

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
