import { describe, expect, it } from "vitest";
import { nameSchema, nonNegativeCentsSchema } from "./common";

describe("validation messages", () => {
  it("never shows Zod's English wording to a visitor", () => {
    // An empty form row sends null, which fails at the type level. That branch
    // used to surface "Invalid input: expected string, received null" in the
    // questionnaire.
    for (const schema of [nameSchema, nonNegativeCentsSchema]) {
      const result = schema.safeParse(null);
      expect(result.success).toBe(false);
      if (result.success) continue;
      for (const issue of result.error.issues) {
        expect(issue.message).not.toMatch(/invalid input|expected|received/i);
        // Nor the translated jargon: "chaîne de caractères attendu, null reçu"
        // is French but still speaks to a developer, not to a visitor.
        expect(issue.message).not.toMatch(/attendu|reçu/i);
        expect(issue.message).toMatch(/requis/i);
      }
    }
  });

  it("keeps the specific French messages the schemas declare", () => {
    const tooLong = nameSchema.safeParse("x".repeat(200));
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) expect(tooLong.error.issues[0]!.message).toBe("Nom trop long.");
  });
});
