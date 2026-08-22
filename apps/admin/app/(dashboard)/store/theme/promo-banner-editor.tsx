"use client";

import { Input, ModalTrigger } from "@system2026/ui";
import { ActionForm } from "../../../../components/action-form";
import { updatePromoBannerContentAction } from "./sections-actions";

type PromoBannerContent = {
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export function PromoBannerEditor({ content }: { content: PromoBannerContent }) {
  return (
    <ModalTrigger label="تعديل المحتوى" title="بانر دعائي" variant="outline" buttonSize="sm">
      <ActionForm action={updatePromoBannerContentAction} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">صورة البانر</label>
          <Input name="image" type="file" accept="image/*" />
          {content.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.imageUrl} alt="البانر الحالي" className="mt-2 h-20 w-full rounded-lg object-cover" />
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm">العنوان</label>
          <Input name="title" defaultValue={content.title ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm">النص الفرعي</label>
          <Input name="subtitle" defaultValue={content.subtitle ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm">نص الزر</label>
          <Input name="buttonLabel" defaultValue={content.buttonLabel ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm">رابط الزر</label>
          <Input name="buttonUrl" dir="ltr" placeholder="https://..." defaultValue={content.buttonUrl ?? ""} />
        </div>
      </ActionForm>
    </ModalTrigger>
  );
}
