/** Join class names, skipping falsy values. */
export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ')
