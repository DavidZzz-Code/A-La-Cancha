// Persistencia limitada a la pestaña para la vista web de desarrollo.
export const sessionStorage = {
  getItem: (key: string) => typeof window === 'undefined' ? null : window.sessionStorage.getItem(key),
  setItem: (key: string, value: string) => { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); },
  removeItem: (key: string) => { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); },
};
