import { describe, expect, it } from "vitest";
import { createProductSchema } from "./product";

const base = {
  name: "عصير برتقال",
  price: 5,
  baseUnitId: "a1111111-0000-0000-0000-000000000001",
};

describe("createProductSchema", () => {
  it("يقبل منتج بدون تاريخ صلاحية", () => {
    const result = createProductSchema.safeParse({ ...base, hasExpiry: false });
    expect(result.success).toBe(true);
  });

  it("يرفض hasExpiry=true بدون expiryDate (راجع requirements.md §10.1)", () => {
    const result = createProductSchema.safeParse({ ...base, hasExpiry: true });
    expect(result.success).toBe(false);
  });

  it("يقبل hasExpiry=true مع expiryDate", () => {
    const result = createProductSchema.safeParse({
      ...base,
      hasExpiry: true,
      expiryDate: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("يرفض سعر سالب", () => {
    const result = createProductSchema.safeParse({ ...base, price: -1 });
    expect(result.success).toBe(false);
  });
});
