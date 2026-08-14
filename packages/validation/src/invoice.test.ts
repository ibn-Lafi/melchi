import { describe, expect, it } from "vitest";
import { createInvoiceSchema } from "./invoice";

const validItem = {
  productId: "b1111111-0000-0000-0000-000000000001",
  unitId: "a1111111-0000-0000-0000-000000000001",
  quantityInUnit: 2,
  unitPrice: 5,
};

describe("createInvoiceSchema", () => {
  it("يقبل فاتورة صحيحة ببند واحد على الأقل", () => {
    const result = createInvoiceSchema.safeParse({
      repId: "22222222-2222-2222-2222-222222222222",
      customerId: "e1111111-0000-0000-0000-000000000001",
      items: [validItem],
      paymentMethod: "cash",
    });
    expect(result.success).toBe(true);
  });

  it("يرفض فاتورة بدون بنود", () => {
    const result = createInvoiceSchema.safeParse({
      repId: "22222222-2222-2222-2222-222222222222",
      customerId: "e1111111-0000-0000-0000-000000000001",
      items: [],
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض كمية صفر أو سالبة", () => {
    const result = createInvoiceSchema.safeParse({
      repId: "22222222-2222-2222-2222-222222222222",
      customerId: "e1111111-0000-0000-0000-000000000001",
      items: [{ ...validItem, quantityInUnit: 0 }],
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("يرفض طريقة دفع غير مدعومة", () => {
    const result = createInvoiceSchema.safeParse({
      repId: "22222222-2222-2222-2222-222222222222",
      customerId: "e1111111-0000-0000-0000-000000000001",
      items: [validItem],
      paymentMethod: "bitcoin",
    });
    expect(result.success).toBe(false);
  });
});
