"use client";

import { Input, ModalTrigger } from "@system2026/ui";
import { ActionForm } from "../../../../components/action-form";
import { updateFeaturesContentAction } from "./sections-actions";

type FeaturesContent = {
  title1?: string;
  desc1?: string;
  title2?: string;
  desc2?: string;
  title3?: string;
  desc3?: string;
};

export function FeaturesEditor({ content }: { content: FeaturesContent }) {
  return (
    <ModalTrigger label="تعديل المحتوى" title="مميزاتنا" variant="outline" buttonSize="sm">
      <ActionForm action={updateFeaturesContentAction} className="space-y-3">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">الميزة {n}</p>
            <Input name={`title${n}`} placeholder="العنوان" defaultValue={content[`title${n}`] ?? ""} />
            <Input name={`desc${n}`} placeholder="الوصف" defaultValue={content[`desc${n}`] ?? ""} />
          </div>
        ))}
      </ActionForm>
    </ModalTrigger>
  );
}
