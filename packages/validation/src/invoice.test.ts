import { describe, expect, it } from "vitest";
import { createInvoiceSchema } from "./invoice";

const validItem = {
  productId: "b1111111-0000-0000-0000-000000000001",
  unitId: "a1111111-0000-0000-0000-000000000001",
  quantityInUnit: 2,
};

const baseInvoice = {
  repId: "22222222-2222-2222-2222-222222222222",
  customerId: "e1111111-0000-0000-0000-000000000001",
  items: [validItem],
  paymentMethod: "cash" as const,
  discountPercentage: 0,
};

describe("createInvoiceSchema", () => {
  it("يقبل فاتورة صحيحة ببند واحد على الأقل", () => {
    const result = createInvoiceSchema.safeParse(baseInvoice);
    expect(result.success).toBe(true);
  });

  it("يرفض فاتورة بدون بنود", () => {
    const result = createInvoiceSchema.safeParse({ ...baseInvoice, items: [] });
    expect(result.success).toBe(false);
  });

  it("يرفض كمية صفر أو سالبة", () => {
    const result = createInvoiceSchema.safeParse({
      ...baseInvoice,
      items: [{ ...validItem, quantityInUnit: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("يرفض طريقة دفع غير مدعومة", () => {
    const result = createInvoiceSchema.safeParse({ ...baseInvoice, paymentMethod: "bitcoin" });
    expect(result.success).toBe(false);
  });

  it("يقبل نسبة خصم حتى الحد الأقصى 25%", () => {
    const result = createInvoiceSchema.safeParse({ ...baseInvoice, discountPercentage: 25 });
    expect(result.success).toBe(true);
  });

  it("يرفض نسبة خصم أكبر من 25%", () => {
    const result = createInvoiceSchema.safeParse({ ...baseInvoice, discountPercentage: 25.01 });
    expect(result.success).toBe(false);
  });

  it("يرفض نسبة خصم سالبة", () => {
    const result = createInvoiceSchema.safeParse({ ...baseInvoice, discountPercentage: -1 });
    expect(result.success).toBe(false);
  });
});
