"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Select } from "@system2026/ui";
import { createReturnAction, type ReturnActionState } from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };
type Product = { id: string; name: string };
type LineItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  condition: "resalable" | "damaged" | "expired";
};

const initialState: ReturnActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل المرتجع"}
    </Button>
  );
}

export function ReturnForm({
  customers,
  products,
  defaultCustomerId,
}: {
  customers: Customer[];
  products: Product[];
  defaultCustomerId?: string;
}) {
  const [state, formAction] = useFormState(createReturnAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);

  function addItem() {
    const first = products[0];
    if (!first) return;
    setItems((prev) => [...prev, { productId: first.id, quantity: 1, unitPrice: 0, condition: "resalable" }]);
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
        <label className="mb-1 block text-sm font-medium">العميل</label>
        <Select name="customerId" defaultValue={defaultCustomerId ?? customers[0]?.id} required>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={index} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">المنتج</label>
                <Select value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">الكمية</label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">سعر البيع الأصلي</label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">الحالة</label>
              <Select
                value={item.condition}
                onChange={(e) => updateItem(index, { condition: e.target.value as LineItem["condition"] })}
              >
                <option value="resalable">سليم (يرجع لرصيدي)</option>
                <option value="damaged">تالف</option>
                <option value="expired">منتهي الصلاحية</option>
              </Select>
            </div>
          </Card>
        ))}
        <Button type="button" variant="outline" className="w-full" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.returnId ? <p className="text-sm text-primary">تم تسجيل المرتجع بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
