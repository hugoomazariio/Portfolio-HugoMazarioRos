import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        const s = source[key], t = target[key];
        result[key] =
            s && t && typeof s === "object" && typeof t === "object" && !Array.isArray(s) && !Array.isArray(t)
                ? deepMerge(t, s)
                : s;
    }
    return result;
}

export function sanitizePhone(phone: string): string {
    return phone.replace(/\s+/g, "");
}
