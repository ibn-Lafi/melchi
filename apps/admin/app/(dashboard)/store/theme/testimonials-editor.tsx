"use client";

import { Input, ModalTrigger } from "@system2026/ui";
import { ActionForm } from "../../../../components/action-form";
import { updateTestimonialsContentAction } from "./sections-actions";

type TestimonialsContent = {
  name1?: string;
  text1?: string;
  name2?: string;
  text2?: string;
  name3?: string;
  text3?: string;
};

export function TestimonialsEditor({ content }: { content: TestimonialsContent }) {
  return (
    <ModalTrigger label="تعديل المحتوى" title="آراء العملاء" variant="outline" buttonSize="sm">
      <ActionForm action={updateTestimonialsContentAction} className="space-y-3">
        {([1, 2, 3] as const).map((n) => (
          <div key={n} className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">الرأي {n}</p>
            <Input name={`name${n}`} placeholder="اسم العميل" defaultValue={content[`name${n}`] ?? ""} />
            <Input name={`text${n}`} placeholder="نص الرأي" defaultValue={content[`text${n}`] ?? ""} />
          </div>
        ))}
      </ActionForm>
    </ModalTrigger>
  );
}
