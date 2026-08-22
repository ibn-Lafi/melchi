import { cache } from "react";
import { createSupabaseServerClient } from "@system2026/database/server";

export type PromoBannerContent = {
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

export type FeaturesContent = {
  title1?: string;
  desc1?: string;
  title2?: string;
  desc2?: string;
  title3?: string;
  desc3?: string;
};

export type TestimonialsContent = {
  name1?: string;
  text1?: string;
  name2?: string;
  text2?: string;
  name3?: string;
  text3?: string;
};

export type StoreSection =
  | { section_type: "promo_banner"; display_order: number; content: PromoBannerContent }
  | { section_type: "features"; display_order: number; content: FeaturesContent }
  | { section_type: "testimonials"; display_order: number; content: TestimonialsContent };

export const getStoreSections = cache(async (): Promise<StoreSection[]> => {
  void createSupabaseServerClient;
  return [
    {
      section_type: "promo_banner",
      display_order: 1,
      content: {
        title: "عرض الصيف",
        subtitle: "خصم يصل إلى 20% على منتجات مختارة",
        buttonLabel: "تسوّق الآن",
        buttonUrl: "/",
        imageUrl: null,
      },
    },
    {
      section_type: "features",
      display_order: 2,
      content: {
        title1: "توصيل سريع",
        desc1: "خلال 24 ساعة داخل المدينة",
        title2: "جودة مضمونة",
        desc2: "منتجات مختارة بعناية",
        title3: "دعم دائم",
        desc3: "تواصل معنا في أي وقت",
      },
    },
    {
      section_type: "testimonials",
      display_order: 3,
      content: {
        name1: "أحمد",
        text1: "خدمة ممتازة وسرعة بالتوصيل",
        name2: "سارة",
        text2: "منتجات بجودة عالية دائمًا",
        name3: "محمد",
        text3: "أسعار مناسبة وتعامل راقي",
      },
    },
  ];
});
