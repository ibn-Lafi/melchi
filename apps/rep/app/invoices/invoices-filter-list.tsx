"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Input, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";

export type DocumentRow = {
  id: string;
  type: "invoice" | "return";
  number: string;
  date: string;
  amount: number;
  statusLabel: string;
  customerName: string;
  href: string;
};

const TYPE_OPTIONS = [
  { value: "all", label: "الكل" },
  { value: "new", label: "جديدة" },
  { value: "partial", label: "مسددة جزئي" },
  { value: "return", label: "مرتجع" },
] as const;

type TypeFilter = (typeof TYPE_OPTIONS)[number]["value"];

export function InvoicesFilterList({ rows }: { rows: DocumentRow[] }) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  const filtered = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (query && !row.customerName.toLowerCase().includes(query)) return false;
      if (type === "return") return row.type === "return";
      if (type === "partial") return row.type === "invoice" && row.statusLabel === "جزئي";
      if (type === "new") return row.type === "invoice" && row.statusLabel !== "جزئي";
      return true;
    });
  }, [rows, customerQuery, type]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="ابحث باسم العميل"
          value={customerQuery}
          onChange={(e) => setCustomerQuery(e.target.value)}
        />
        <Select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} className="sm:w-48">
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        {filtered.map((row) => (
          <Link key={`${row.type}-${row.id}`} href={row.href}>
            <Card className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{row.type === "invoice" ? `فاتورة ${row.number}` : `مرتجع ${row.number}`}</p>
                <p className="text-sm text-muted-foreground">
                  {row.customerName} · {new Date(row.date).toLocaleDateString("ar-SA")}
                </p>
              </div>
              <div className="text-left">
                <p className="font-bold">
                  {row.type === "return" ? "-" : ""}
                  {formatCurrency(row.amount)}
                </p>
                <span className="text-xs text-muted-foreground">{row.statusLabel}</span>
              </div>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 ? <p className="py-12 text-center text-muted-foreground">لا توجد نتائج</p> : null}
      </div>
    </div>
  );
}
