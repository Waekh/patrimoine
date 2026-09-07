/**
 * Converts a FormData into a plain object suitable for Zod. Fields ending in
 * "Cents" or "Bps" are coerced to integers; empty strings become null; the
 * "_display" mirrors of money inputs are dropped.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (key.endsWith("_display") || key.startsWith("$ACTION")) continue;
    const value = typeof raw === "string" ? raw : "";
    if (key.endsWith("Cents") || key.endsWith("Bps")) {
      out[key] = value.trim() === "" ? null : Number(value);
    } else if (value === "") {
      out[key] = null;
    } else if (value === "on") {
      out[key] = true;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Nested "realEstate.propertyType" style keys -> { realEstate: { propertyType } }. */
export function nestKeys(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i]!;
      const next = cursor[part];
      if (!next || typeof next !== "object") cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]!] = value;
  }
  return out;
}
