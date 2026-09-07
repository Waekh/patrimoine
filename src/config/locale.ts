export const SUPPORTED_LOCALES = ["fr-FR", "en-US", "en-GB", "de-DE"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** MVP locale. The formatting and i18n layers accept any supported locale. */
export const DEFAULT_LOCALE: Locale = "fr-FR";
