"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import type { CatalogProduct } from "../../../lib/get-product-catalog";
import { createPurchaseInvoiceAction, type PurchaseActionState } from "./actions";

type Supplier = { id: string; name: string };
type LineItem = { productId: string; unitId: string; quantityInUnit: number; unitCost: number };

const initialState: PurchaseActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "اعتماد فاتورة الشراء"}
    </Button>
  );
}

export function PurchaseForm({ suppliers, catalog }: { suppliers: Supplier[]; catalog: CatalogProduct[] }) {
  const [state, formAction] = useFormState(createPurchaseInvoiceAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);
  const productById = useMemo(() => new Map(catalog.map((p) => [p.productId, p])), [catalog]);

  function addItem() {
    const first = catalog[0];
    if (!first) return;
    setItems((prev) => [
      ...prev,
      { productId: first.productId, unitId: first.units[0]?.unitId ?? "", quantityInUnit: 1, unitCost: 0 },
    ]);
  }

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div>
        <label className="mb-1 block text-sm font-medium">المورد</label>
        <select name="supplierId" required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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
                  onChange={(e) => {
                    const p = productById.get(e.target.value);
                    updateItem(index, { productId: e.target.value, unitId: p?.units[0]?.unitId ?? "" });
                  }}
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                >
                  {catalog.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs">الوحدة</label>
                <select
                  value={item.unitId}
                  onChange={(e) => updateItem(index, { unitId: e.target.value })}
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
                <label className="mb-1 block text-xs">تكلفة الوحدة</label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
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
        <label className="mb-1 block text-sm font-medium">حالة الدفع</label>
        <select name="paymentStatus" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
          <option value="unpaid">غير مدفوعة</option>
          <option value="partial">مدفوعة جزئيًا</option>
          <option value="paid">مدفوعة بالكامل</option>
        </select>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.purchaseInvoiceId ? <p className="text-sm text-primary">تم اعتماد فاتورة الشراء بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
