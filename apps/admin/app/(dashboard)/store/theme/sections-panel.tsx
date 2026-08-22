import { Button, Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { SECTION_LABELS, type SectionType } from "@system2026/validation";
import { moveSectionAction, toggleSectionEnabledAction } from "./sections-actions";
import { FeaturesEditor } from "./features-editor";
import { PromoBannerEditor } from "./promo-banner-editor";
import { TestimonialsEditor } from "./testimonials-editor";

type SectionRow = {
  section_type: SectionType;
  enabled: boolean;
  display_order: number;
  content: Record<string, string | null | undefined>;
};

export async function SectionsPanel() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("store_sections")
    .select("section_type, enabled, display_order, content")
    .order("display_order");
  const rows = (data ?? []) as SectionRow[];

  return (
    <Card>
      <h2 className="font-semibold">الأقسام الجاهزة</h2>
      <p className="mt-1 text-sm text-foreground/60">أقسام محدَّدة سلفًا يمكنك تفعيلها وترتيبها وتعبئة محتواها بالصفحة الرئيسية للمتجر</p>
      <div className="mt-4 space-y-3">
        {rows.map((section, index) => (
          <div
            key={section.section_type}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <form action={moveSectionAction}>
                  <input type="hidden" name="sectionType" value={section.section_type} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    disabled={index === 0}
                    aria-label="تحريك لأعلى"
                    className="text-xs leading-none text-foreground/50 hover:text-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                </form>
                <form action={moveSectionAction}>
                  <input type="hidden" name="sectionType" value={section.section_type} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    disabled={index === rows.length - 1}
                    aria-label="تحريك لأسفل"
                    className="text-xs leading-none text-foreground/50 hover:text-foreground disabled:opacity-30"
                  >
                    ▼
                  </button>
                </form>
              </div>
              <div>
                <p className="font-medium">{SECTION_LABELS[section.section_type]}</p>
                <p className="text-xs text-foreground/50">{section.enabled ? "مفعّل" : "معطّل"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {section.section_type === "promo_banner" ? <PromoBannerEditor content={section.content} /> : null}
              {section.section_type === "features" ? <FeaturesEditor content={section.content} /> : null}
              {section.section_type === "testimonials" ? <TestimonialsEditor content={section.content} /> : null}
              <form action={toggleSectionEnabledAction}>
                <input type="hidden" name="sectionType" value={section.section_type} />
                <input type="hidden" name="nextEnabled" value={(!section.enabled).toString()} />
                <Button type="submit" size="sm" variant={section.enabled ? "outline" : "default"}>
                  {section.enabled ? "تعطيل" : "تفعيل"}
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
