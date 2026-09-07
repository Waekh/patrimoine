import { fr, type Messages } from "./messages.fr";

type PathsOf<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: PathsOf<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

export type MessageKey = PathsOf<Messages>;

const dictionaries: Record<"fr-FR", Messages> = { "fr-FR": fr };

function lookup(key: string, dict: Messages): string {
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc)
      return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
  return typeof value === "string" ? value : key;
}

/**
 * Translates a message key, interpolating `{name}` placeholders.
 * Only fr-FR is shipped; the signature is ready for more locales.
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = lookup(key, dictionaries["fr-FR"]);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Access to a whole sub-dictionary for enum labels (e.g. asset categories). */
export const messages = fr;
