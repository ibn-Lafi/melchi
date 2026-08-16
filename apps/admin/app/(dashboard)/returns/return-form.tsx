"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Select, useModalClose } from "@system2026/ui";
import { createReturnAction, type ReturnActionState } from "./actions";

type Customer = { id: string; name: string; shop_name: string | null };
type Rep = { id: string; name: string };
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
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ التسجيل..." : "تسجيل المرتجع"}
    </Button>
  );
}

export function ReturnForm({
  customers,
  reps,
  products,
}: {
  customers: Customer[];
  reps: Rep[];
  products: Product[];
}) {
  const [state, formAction] = useFormState(createReturnAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.returnId || !closeModal) return;
    const timer = setTimeout(closeModal, 700);
    return () => clearTimeout(timer);
  }, [state.returnId, closeModal]);

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
        <Select name="customerId" required>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">المندوب (إن كانت البضاعة السليمة سترجع لرصيده)</label>
        <Select name="repId">
          <option value="">بدون تحديد</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <Card key={index} className="grid grid-cols-12 items-end gap-2">
            <div className="col-span-3">
              <label className="mb-1 block text-xs">المنتج</label>
              <Select value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs">الكمية</label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs">سعر البيع الأصلي</label>
              <Input
                type="number"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-4">
              <label className="mb-1 block text-xs">الحالة</label>
              <Select
                value={item.condition}
                onChange={(e) => updateItem(index, { condition: e.target.value as LineItem["condition"] })}
              >
                <option value="resalable">سليم (يرجع للمخزون)</option>
                <option value="damaged">تالف</option>
                <option value="expired">منتهي الصلاحية</option>
              </Select>
            </div>
            <div className="col-span-1">
              <button
                type="button"
                aria-label="حذف"
                onClick={() => removeItem(index)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground/60 transition-colors hover:border-primary hover:text-primary"
              >
                ✕
              </button>
            </div>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={addItem}>
          + إضافة منتج
        </Button>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.returnId ? <p className="text-sm text-primary">تم تسجيل المرتجع بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
