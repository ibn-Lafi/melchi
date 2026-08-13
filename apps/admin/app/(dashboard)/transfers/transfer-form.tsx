"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input } from "@system2026/ui";
import { createStockTransferAction, type TransferActionState } from "./actions";

type Rep = { id: string; name: string };
type Product = { id: string; name: string };
type LineItem = { productId: string; quantity: number };

const initialState: TransferActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ النقل..." : "تنفيذ عملية النقل"}
    </Button>
  );
}

export function TransferForm({ reps, products }: { reps: Rep[]; products: Product[] }) {
  const [state, formAction] = useFormState(createStockTransferAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);

  function addItem() {
    const first = products[0];
    if (!first) return;
    setItems((prev) => [...prev, { productId: first.id, quantity: 1 }]);
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
        <label className="mb-1 block text-sm font-medium">المندوب</label>
        <select name="repId" required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <Card key={index} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-8">
              <label className="mb-1 block text-xs">المنتج</label>
              <select
                value={item.productId}
                onChange={(e) => updateItem(index, { productId: e.target.value })}
                className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="mb-1 block text-xs">الكمية (بالوحدة الأساسية)</label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-1">
              <Button type="button" variant="destructive" onClick={() => removeItem(index)}>
                حذف
              </Button>
            </div>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.transferId ? <p className="text-sm text-primary">تم تنفيذ عملية النقل بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
