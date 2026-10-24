import '@testing-library/jest-dom/vitest'

// Node 25 ships a global localStorage that throws without --localstorage-file and shadows jsdom's.
// Give tests a plain in-memory Storage instead.
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  try {
    globalThis[name].getItem('probe')
  } catch {
    Object.defineProperty(globalThis, name, { value: memoryStorage(), configurable: true })
  }
}
