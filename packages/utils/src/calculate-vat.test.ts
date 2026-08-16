import { describe, expect, it } from "vitest";
import { calculateVat, calculateTotalWithVat, extractNetPriceFromVatInclusive, VAT_RATE } from "./calculate-vat";

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

describe("extractNetPriceFromVatInclusive", () => {
  it("يستخرج السعر الصافي من سعر شامل الضريبة (سعر الأدمن ثابت كمجموع)", () => {
    // سعر الأدمن 100 (شامل) → صافي 86.96 + ضريبة 13.04 ≈ 100
    const net = extractNetPriceFromVatInclusive(100);
    expect(net).toBe(86.96);
    expect(Math.round((net + calculateVat(net)) * 100) / 100).toBe(100);
  });

  it("يرجع صفر لسعر صفر", () => {
    expect(extractNetPriceFromVatInclusive(0)).toBe(0);
  });
});
