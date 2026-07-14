export type Locale = 'en' | 'es';

const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es'] as const;
export const DEFAULT_LOCALE: Locale = 'es';

export function isValidLocale(locale: string): locale is Locale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
