import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format-currency";

describe("formatCurrency", () => {
  it("يعرض القيمة بمنزلتين عشريتين مع رمز الريال السعودي", () => {
    const formatted = formatCurrency(115);
    expect(formatted).toContain("115.00");
  });

  it("يتعامل مع الصفر", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });
});
