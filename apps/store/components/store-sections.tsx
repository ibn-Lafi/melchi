import type { FeaturesContent, PromoBannerContent, StoreSection, TestimonialsContent } from "../lib/get-store-sections";

function PromoBanner({ content }: { content: PromoBannerContent }) {
  if (!content.title && !content.imageUrl) return null;

  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 py-10 sm:flex-row lg:max-w-6xl lg:px-8 xl:max-w-7xl">
        {content.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={content.imageUrl}
            alt={content.title ?? ""}
            className="h-40 w-full rounded-2xl object-cover sm:w-64"
          />
        ) : null}
        <div className="text-center sm:text-right">
          {content.title ? <h2 className="text-2xl font-bold">{content.title}</h2> : null}
          {content.subtitle ? <p className="mt-2 text-foreground/70">{content.subtitle}</p> : null}
          {content.buttonLabel && content.buttonUrl ? (
            <a
              href={content.buttonUrl}
              className="mt-4 inline-block rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              {content.buttonLabel}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Features({ content }: { content: FeaturesContent }) {
  const items = [
    { title: content.title1, desc: content.desc1 },
    { title: content.title2, desc: content.desc2 },
    { title: content.title3, desc: content.desc3 },
  ].filter((item) => item.title);
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-border p-5 text-center">
            <h3 className="font-semibold">{item.title}</h3>
            {item.desc ? <p className="mt-2 text-sm text-foreground/70">{item.desc}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ content }: { content: TestimonialsContent }) {
  const items = [
    { name: content.name1, text: content.text1 },
    { name: content.name2, text: content.text2 },
    { name: content.name3, text: content.text3 },
  ].filter((item) => item.text);
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-5xl px-5 py-10 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-2xl bg-background p-5 shadow-sm">
              <p className="text-sm text-foreground/80">&quot;{item.text}&quot;</p>
              {item.name ? <p className="mt-3 text-sm font-medium">{item.name}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoreSections({ sections }: { sections: StoreSection[] }) {
  return (
    <>
      {sections.map((section) => {
        if (section.section_type === "promo_banner") {
          return <PromoBanner key={section.section_type} content={section.content} />;
        }
        if (section.section_type === "features") {
          return <Features key={section.section_type} content={section.content} />;
        }
        return <Testimonials key={section.section_type} content={section.content} />;
      })}
    </>
  );
}
