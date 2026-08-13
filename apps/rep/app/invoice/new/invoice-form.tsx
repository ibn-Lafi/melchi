"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
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
    <Button type="submit" disabled={pending}>
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
        <select
          name="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const product = productById.get(item.productId);
          return (
            <Card key={index} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-4">
                <label className="mb-1 block text-xs">المنتج</label>
                <select
                  value={item.productId}
                  onChange={(e) => handleProductChange(index, e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {catalog.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} (متاح: {p.quantityAvailable})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs">الوحدة</label>
                <select
                  value={item.unitId}
                  onChange={(e) => handleUnitChange(index, e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {product?.units.map((u) => (
                    <option key={u.unitId} value={u.unitId}>
                      {u.unitName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs">الكمية</label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantityInUnit}
                  onChange={(e) => updateItem(index, { quantityInUnit: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs">السعر</label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-1">
                <Button type="button" variant="destructive" onClick={() => removeItem(index)}>
                  حذف
                </Button>
              </div>
            </Card>
          );
        })}
        <Button type="button" variant="outline" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">طريقة الدفع</label>
        <select
          name="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <Card className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>المجموع قبل الضريبة</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>ضريبة القيمة المضافة (15%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>الإجمالي</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </Card>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.invoiceId ? <p className="text-sm text-primary">تم إصدار الفاتورة بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
