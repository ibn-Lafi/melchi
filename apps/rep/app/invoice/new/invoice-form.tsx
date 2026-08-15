"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Button, Card, Input, Select } from "@system2026/ui";
import { calculateVat, calculateTotalWithVat, formatCurrency } from "@system2026/utils";
import type { RepCatalogProduct } from "../../../lib/get-rep-catalog";
import { createInvoiceAction, type CreateInvoiceActionState } from "./actions";

type Branch = { id: string; name: string };
type Customer = { id: string; name: string; shop_name: string | null; branches: Branch[] };

type LineItem = {
  productId: string;
  unitId: string;
  quantityInUnit: number;
  listUnitPrice: number;
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
  onCreated,
}: {
  customers: Customer[];
  catalog: RepCatalogProduct[];
  defaultCustomerId?: string;
  onCreated?: (invoiceId: string) => void;
}) {
  const [state, formAction] = useFormState(createInvoiceAction, initialState);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? customers[0]?.id ?? "");

  useEffect(() => {
    if (state.invoiceId) onCreated?.(state.invoiceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.invoiceId]);
  const [branchId, setBranchId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);

  const productById = useMemo(() => new Map(catalog.map((p) => [p.productId, p])), [catalog]);
  const customerById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const selectedCustomerBranches = customerById.get(customerId)?.branches ?? [];

  function handleCustomerChange(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setBranchId("");
  }

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
        listUnitPrice: firstUnit?.price ?? 0,
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
    updateItem(index, { productId, unitId: unit?.unitId ?? "", listUnitPrice: unit?.price ?? 0 });
  }

  function handleUnitChange(index: number, unitId: string) {
    const item = items[index];
    if (!item) return;
    const product = productById.get(item.productId);
    const unit = product?.units.find((u) => u.unitId === unitId);
    updateItem(index, { unitId, listUnitPrice: unit?.price ?? item.listUnitPrice });
  }

  const discountedUnitPrice = (listPrice: number) =>
    Math.round(listPrice * (1 - discountPercentage / 100) * 100) / 100;

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantityInUnit * discountedUnitPrice(item.listUnitPrice),
    0,
  );
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
        <Select name="customerId" value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shop_name ?? c.name}
            </option>
          ))}
        </Select>
      </div>

      {selectedCustomerBranches.length > 0 ? (
        <div>
          <label className="mb-1 block text-sm font-medium">الفرع</label>
          <Select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">— اختر الفرع —</option>
            {selectedCustomerBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

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
                  <label className="mb-1 block text-xs text-muted-foreground">السعر بعد الخصم</label>
                  <div className="flex h-11 flex-col justify-center overflow-hidden rounded-xl border border-border bg-muted px-3 text-sm">
                    <span>{formatCurrency(discountedUnitPrice(item.listUnitPrice))}</span>
                    {discountPercentage > 0 ? (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(item.listUnitPrice)}
                      </span>
                    ) : null}
                  </div>
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

      <div>
        <label className="mb-1 block text-sm font-medium">نسبة الخصم المتفق عليها مع العميل (0% - 25%)</label>
        <Input
          type="number"
          name="discountPercentage"
          min={0}
          max={25}
          step="0.01"
          value={discountPercentage}
          onChange={(e) =>
            setDiscountPercentage(Math.min(25, Math.max(0, Number(e.target.value) || 0)))
          }
        />
      </div>

      <Card className="space-y-1.5 text-sm">
        {discountPercentage > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <span>نسبة الخصم</span>
            <span>{discountPercentage}%</span>
          </div>
        ) : null}
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
