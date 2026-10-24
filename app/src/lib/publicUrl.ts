/**
 * Prefixes a root-relative public asset path (e.g. a seeded `photo_url` like `/food/tacos.svg`)
 * with Vite's base so it still resolves when the app is built under a sub-path such as `/app/`
 * (see vite.config.ts). Vite only rewrites paths it can see statically — `<img>`, `<link>` and CSS
 * in source files — never a string built or stored at runtime, which is what every one of these is.
 */
export function publicUrl(path: string): string {
  if (/^([a-z]+:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return import.meta.env.BASE_URL.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`)
}
