"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, Card, Input, Select } from "@system2026/ui";
import { calculateVat, calculateTotalWithVat, formatCurrency } from "@system2026/utils";
import type { RepCatalogProduct } from "../../../lib/get-rep-catalog";
import { createInvoiceAction, type CreateInvoiceActionState } from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };

type LineItem = {
  productId: string;
  unitId: string;
  quantityInUnit: number;
  unitPrice: number;
};

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "credit", label: "آجل (دين)" },
  { value: "check", label: "شيك" },
  { value: "transfer", label: "تحويل بنكي" },
];

const initialState: CreateInvoiceActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ الإصدار..." : "إصدار الفاتورة"}
    </Button>
  );
}

export function InvoiceForm({
  customers,
  catalog,
  defaultCustomerId,
}: {
  customers: Customer[];
  catalog: RepCatalogProduct[];
  defaultCustomerId?: string;
}) {
  const [state, formAction] = useFormState(createInvoiceAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [items, setItems] = useState<LineItem[]>([]);

  const productById = useMemo(() => new Map(catalog.map((p) => [p.productId, p])), [catalog]);

  function addItem() {
    const firstProduct = catalog[0];
    if (!firstProduct) return;
    const firstUnit = firstProduct.units[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProduct.productId,
        unitId: firstUnit?.unitId ?? "",
        quantityInUnit: 1,
        unitPrice: firstUnit?.price ?? 0,
      },
    ]);
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleProductChange(index: number, productId: string) {
    const product = productById.get(productId);
    const unit = product?.units[0];
    updateItem(index, { productId, unitId: unit?.unitId ?? "", unitPrice: unit?.price ?? 0 });
  }

  function handleUnitChange(index: number, unitId: string) {
    const item = items[index];
    if (!item) return;
    const product = productById.get(item.productId);
    const unit = product?.units.find((u) => u.unitId === unitId);
    updateItem(index, { unitId, unitPrice: unit?.price ?? item.unitPrice });
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantityInUnit * item.unitPrice, 0);
  const vatAmount = calculateVat(subtotal);
  const total = calculateTotalWithVat(subtotal);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={() => {
        /* items تُمرَّر أدناه كحقل مخفي JSON */
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div>
        <label className="mb-1 block text-sm font-medium">العميل</label>
        <Select name="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const product = productById.get(item.productId);
          return (
            <Card key={index} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">المنتج</label>
                  <Select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                  >
                    {catalog.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} (متاح: {p.quantityAvailable})
                      </option>
                    ))}
                  </Select>
                </div>
                <button
                  type="button"
                  aria-label="حذف"
                  onClick={() => removeItem(index)}
                  className="mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-foreground/60 transition-colors hover:border-primary hover:text-primary"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">الوحدة</label>
                  <Select value={item.unitId} onChange={(e) => handleUnitChange(index, e.target.value)}>
                    {product?.units.map((u) => (
                      <option key={u.unitId} value={u.unitId}>
                        {u.unitName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">الكمية</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantityInUnit}
                    onChange={(e) => updateItem(index, { quantityInUnit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">السعر</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="outline" className="w-full" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">طريقة الدفع</label>
        <Select name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>

      <Card className="space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>المجموع قبل الضريبة</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>ضريبة القيمة المضافة (15%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
          <span>الإجمالي</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </Card>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.invoiceId ? (
        <p className="text-sm text-primary">
          تم إصدار الفاتورة بنجاح ✓{" "}
          <Link href={`/invoice/${state.invoiceId}`} className="underline">
            عرض الفاتورة وطباعتها
          </Link>
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
