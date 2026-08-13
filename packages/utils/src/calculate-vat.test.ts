import { describe, expect, it } from "vitest";
import { calculateVat, calculateTotalWithVat, VAT_RATE } from "./calculate-vat";

describe("calculateVat", () => {
  it("يحتسب 15% من المجموع قبل الضريبة", () => {
    expect(VAT_RATE).toBe(0.15);
    expect(calculateVat(100)).toBe(15);
    expect(calculateVat(0)).toBe(0);
  });

  it("يقرّب لأقرب هللتين (منزلتين عشريتين)", () => {
    expect(calculateVat(33.33)).toBe(5);
  });
});

describe("calculateTotalWithVat", () => {
  it("يساوي المجموع + الضريبة", () => {
    expect(calculateTotalWithVat(100)).toBe(115);
    expect(calculateTotalWithVat(0)).toBe(0);
  });
});
