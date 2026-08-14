import { describe, expect, it } from "vitest";
import { convertToBaseUnit, convertCostToBaseUnit } from "./convert-unit";

describe("convertToBaseUnit", () => {
  it("يحوّل كرتون (معامل 24) لقطع", () => {
    expect(convertToBaseUnit(2, 24)).toBe(48);
  });

  it("معامل تحويل 1 يبقي الكمية كما هي (الوحدة الأساسية)", () => {
    expect(convertToBaseUnit(10, 1)).toBe(10);
  });
});

describe("convertCostToBaseUnit", () => {
  it("يحوّل تكلفة الكرتون لتكلفة القطعة", () => {
    expect(convertCostToBaseUnit(120, 24)).toBe(5);
  });
});
