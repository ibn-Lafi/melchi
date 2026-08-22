"use client";

import { useState } from "react";
import { Textarea } from "@system2026/ui";
import { ActionForm } from "../../../../components/action-form";
import { updateStoreThemeAction } from "./actions";

export function ThemeForm({ customCss, customHtml }: { customCss: string | null; customHtml: string | null }) {
  const [useDefault, setUseDefault] = useState(!customCss && !customHtml);

  return (
    <ActionForm action={updateStoreThemeAction} className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="useDefaultTheme"
          checked={useDefault}
          onChange={(e) => setUseDefault(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        الثيم الافتراضي
      </label>

      {!useDefault ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">CSS مخصص</label>
            <Textarea
              name="customCss"
              dir="ltr"
              rows={8}
              className="font-mono"
              placeholder=":root { --primary: 220 90% 45%; }"
              defaultValue={customCss ?? ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">HTML مخصص (قسم إضافي بالصفحة الرئيسية)</label>
            <Textarea
              name="customHtml"
              dir="ltr"
              rows={8}
              className="font-mono"
              placeholder="<div>محتوى حر...</div>"
              defaultValue={customHtml ?? ""}
            />
          </div>
        </>
      ) : null}
    </ActionForm>
  );
}
