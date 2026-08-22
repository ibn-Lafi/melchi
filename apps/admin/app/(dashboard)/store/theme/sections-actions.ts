"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import {
  SECTION_TYPES,
  moveSectionSchema,
  updateFeaturesContentSchema,
  updatePromoBannerContentSchema,
  updateTestimonialsContentSchema,
  type SectionType,
} from "@system2026/validation";
import { uploadImage } from "../../../../lib/upload-image";
import type { ActionState } from "../../../../components/action-form";

function parseSectionType(value: FormDataEntryValue | null): SectionType | null {
  return typeof value === "string" && (SECTION_TYPES as readonly string[]).includes(value)
    ? (value as SectionType)
    : null;
}

export async function toggleSectionEnabledAction(formData: FormData): Promise<void> {
  const sectionType = parseSectionType(formData.get("sectionType"));
  const nextEnabled = formData.get("nextEnabled") === "true";
  if (!sectionType) return;

  const supabase = createSupabaseServerClient();
  await supabase.from("store_sections").update({ enabled: nextEnabled }).eq("section_type", sectionType);

  revalidatePath("/store/theme");
}

export async function moveSectionAction(formData: FormData): Promise<void> {
  const parsed = moveSectionSchema.safeParse({
    sectionType: formData.get("sectionType"),
    direction: formData.get("direction"),
  });
  if (!parsed.success) return;

  const supabase = createSupabaseServerClient();
  const { data: sections } = await supabase
    .from("store_sections")
    .select("section_type, display_order")
    .order("display_order");
  if (!sections) return;

  const index = sections.findIndex((s) => s.section_type === parsed.data.sectionType);
  const swapIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= sections.length) return;

  const current = sections[index]!;
  const swap = sections[swapIndex]!;

  await Promise.all([
    supabase
      .from("store_sections")
      .update({ display_order: swap.display_order })
      .eq("section_type", current.section_type),
    supabase
      .from("store_sections")
      .update({ display_order: current.display_order })
      .eq("section_type", swap.section_type),
  ]);

  revalidatePath("/store/theme");
}

export async function updatePromoBannerContentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePromoBannerContentSchema.safeParse({
    title: formData.get("title") || undefined,
    subtitle: formData.get("subtitle") || undefined,
    buttonLabel: formData.get("buttonLabel") || undefined,
    buttonUrl: formData.get("buttonUrl") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();

  const { url: uploadedUrl, error: uploadError } = await uploadImage(supabase, formData, "image", "store-assets");
  if (uploadError) return { error: uploadError };

  const { data: existing } = await supabase
    .from("store_sections")
    .select("content")
    .eq("section_type", "promo_banner")
    .single();
  const existingContent = (existing?.content ?? {}) as { imageUrl?: string | null };

  const { error } = await supabase
    .from("store_sections")
    .update({
      content: {
        title: parsed.data.title ?? "",
        subtitle: parsed.data.subtitle ?? "",
        buttonLabel: parsed.data.buttonLabel ?? "",
        buttonUrl: parsed.data.buttonUrl ?? "",
        imageUrl: uploadedUrl ?? existingContent.imageUrl ?? null,
      },
    })
    .eq("section_type", "promo_banner");

  if (error) return { error: error.message };
  revalidatePath("/store/theme");
  return { success: true };
}

export async function updateFeaturesContentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateFeaturesContentSchema.safeParse({
    title1: formData.get("title1") || undefined,
    desc1: formData.get("desc1") || undefined,
    title2: formData.get("title2") || undefined,
    desc2: formData.get("desc2") || undefined,
    title3: formData.get("title3") || undefined,
    desc3: formData.get("desc3") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("store_sections")
    .update({ content: parsed.data })
    .eq("section_type", "features");

  if (error) return { error: error.message };
  revalidatePath("/store/theme");
  return { success: true };
}

export async function updateTestimonialsContentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateTestimonialsContentSchema.safeParse({
    name1: formData.get("name1") || undefined,
    text1: formData.get("text1") || undefined,
    name2: formData.get("name2") || undefined,
    text2: formData.get("text2") || undefined,
    name3: formData.get("name3") || undefined,
    text3: formData.get("text3") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("store_sections")
    .update({ content: parsed.data })
    .eq("section_type", "testimonials");

  if (error) return { error: error.message };
  revalidatePath("/store/theme");
  return { success: true };
}
