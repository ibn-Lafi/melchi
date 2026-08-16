"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button, Card, Input, Select, useModalClose } from "@system2026/ui";
import type { CatalogProduct } from "../../../lib/get-product-catalog";
import { createPurchaseInvoiceAction, type PurchaseActionState } from "./actions";

type Supplier = { id: string; name: string };
type Category = { id: string; name: string };
type Unit = { id: string; name: string };

type ExistingLineItem = {
  kind: "existing";
  productId: string;
  unitId: string;
  quantityInUnit: number;
  unitCost: number;
};

// بند لمنتج غير موجود بالكتالوج بعد — يُنشأ المنتج تلقائيًا عند اعتماد
// الفاتورة (راجع createPurchaseInvoiceAction)، فلا داعي لمغادرة نافذة
// الشراء لإضافة المنتج بصفحة المنتجات أولًا.
type NewLineItem = {
  kind: "new";
  name: string;
  price: number;
  baseUnitId: string;
  categoryId: string;
  quantityInUnit: number;
  unitCost: number;
};

type LineItem = ExistingLineItem | NewLineItem;

const initialState: PurchaseActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "جارٍ الحفظ..." : "اعتماد فاتورة الشراء"}
    </Button>
  );
}

export function PurchaseForm({
  suppliers,
  catalog,
  categories,
  units,
}: {
  suppliers: Supplier[];
  catalog: CatalogProduct[];
  categories: Category[];
  units: Unit[];
}) {
  const [state, formAction] = useFormState(createPurchaseInvoiceAction, initialState);
  const [items, setItems] = useState<LineItem[]>([]);
  const productById = useMemo(() => new Map(catalog.map((p) => [p.productId, p])), [catalog]);
  const closeModal = useModalClose();

  useEffect(() => {
    if (!state.purchaseInvoiceId || !closeModal) return;
    const timer = setTimeout(closeModal, 700);
    return () => clearTimeout(timer);
  }, [state.purchaseInvoiceId, closeModal]);

  function newExistingItem(): ExistingLineItem {
    const first = catalog[0];
    return { kind: "existing", productId: first?.productId ?? "", unitId: first?.units[0]?.unitId ?? "", quantityInUnit: 1, unitCost: 0 };
  }

  function newNewItem(): NewLineItem {
    return { kind: "new", name: "", price: 0, baseUnitId: units[0]?.id ?? "", categoryId: "", quantityInUnit: 1, unitCost: 0 };
  }

  function addItem() {
    setItems((prev) => [...prev, catalog.length > 0 ? newExistingItem() : newNewItem()]);
  }

  function switchItemKind(index: number, kind: LineItem["kind"]) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (kind === "existing") return { ...newExistingItem(), quantityInUnit: it.quantityInUnit, unitCost: it.unitCost };
        return { ...newNewItem(), quantityInUnit: it.quantityInUnit, unitCost: it.unitCost };
      }),
    );
  }

  function updateItem(index: number, patch: Record<string, unknown>) {
    setItems((prev) => prev.map((it, i) => (i === index ? ({ ...it, ...patch } as LineItem) : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const serializedItems = items.map((item) =>
    item.kind === "new" ? { ...item, categoryId: item.categoryId || undefined } : item,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="items" value={JSON.stringify(serializedItems)} />

      <div>
        <label className="mb-1 block text-sm font-medium">المورد</label>
        <Select name="supplierId" required>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <Card key={index} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground/50">بند #{index + 1}</span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`kind-${index}`}
                    checked={item.kind === "existing"}
                    onChange={() => switchItemKind(index, "existing")}
                    disabled={catalog.length === 0}
                  />
                  منتج موجود
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name={`kind-${index}`}
                    checked={item.kind === "new"}
                    onChange={() => switchItemKind(index, "new")}
                  />
                  منتج جديد
                </label>
              </div>
            </div>

            {item.kind === "existing" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs">المنتج</label>
                  <Select
                    value={item.productId}
                    onChange={(e) => {
                      const p = productById.get(e.target.value);
                      updateItem(index, { productId: e.target.value, unitId: p?.units[0]?.unitId ?? "" });
                    }}
                  >
                    {catalog.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs">الوحدة</label>
                  <Select value={item.unitId} onChange={(e) => updateItem(index, { unitId: e.target.value })}>
                    {productById.get(item.productId)?.units.map((u) => (
                      <option key={u.unitId} value={u.unitId}>
                        {u.unitName}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs">اسم المنتج الجديد</label>
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="اسم المنتج"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs">الفئة (اختياري)</label>
                  <Select value={item.categoryId} onChange={(e) => updateItem(index, { categoryId: e.target.value })}>
                    <option value="">بدون فئة</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs">الوحدة الأساسية</label>
                  <Select value={item.baseUnitId} onChange={(e) => updateItem(index, { baseUnitId: e.target.value })}>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs">سعر البيع</label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 items-end gap-2">
              <div>
                <label className="mb-1 block text-xs">الكمية</label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantityInUnit}
                  onChange={(e) => updateItem(index, { quantityInUnit: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs">تكلفة الوحدة</label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                />
              </div>
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

      <div>
        <label className="mb-1 block text-sm font-medium">حالة الدفع</label>
        <Select name="paymentStatus">
          <option value="unpaid">غير مدفوعة</option>
          <option value="partial">مدفوعة جزئيًا</option>
          <option value="paid">مدفوعة بالكامل</option>
        </Select>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.purchaseInvoiceId ? <p className="text-sm text-primary">تم اعتماد فاتورة الشراء بنجاح ✓</p> : null}

      <SubmitButton />
    </form>
  );
}
