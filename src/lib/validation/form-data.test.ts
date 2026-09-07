import { describe, expect, it } from "vitest";
import { formDataToObject, nestKeys } from "./form-data";

describe("formDataToObject", () => {
  it("coerces cents/bps, drops display mirrors and empties", () => {
    const fd = new FormData();
    fd.set("name", "Maison");
    fd.set("manualValueCents", "40000000");
    fd.set("manualValueCents_display", "400 000");
    fd.set("purchaseValueCents", "");
    fd.set("interestRateBps", "125");
    fd.set("ticker", "");
    fd.set("flag", "on");
    expect(formDataToObject(fd)).toEqual({
      name: "Maison",
      manualValueCents: 40_000_000,
      purchaseValueCents: null,
      interestRateBps: 125,
      ticker: null,
      flag: true,
    });
  });
  it("nests dotted keys", () => {
    expect(nestKeys({ "realEstate.propertyType": "RENTAL", name: "x" })).toEqual({
      realEstate: { propertyType: "RENTAL" },
      name: "x",
    });
  });
});
