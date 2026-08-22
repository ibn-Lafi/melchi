import { WaveDivider } from "./wave-divider";
import type { StoreSettings } from "../lib/get-store-settings";

export function Footer({ settings }: { settings: StoreSettings }) {
  const whatsappLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : null;

  return (
    <footer className="relative mt-14 bg-foreground px-5 pb-10 pt-14 text-background lg:mt-20 lg:px-8 lg:pb-12">
      <WaveDivider position="top" fill="white" flip />
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center lg:max-w-6xl xl:max-w-7xl">
        {settings.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logo_url} alt={settings.store_name} className="h-10 w-10 rounded-[11px] object-cover" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-background text-[15px] font-black text-foreground">
            {settings.store_name.charAt(0)}
          </span>
        )}

        {whatsappLink || settings.instagram_url || settings.tiktok_url ? (
          <>
            <p className="text-[13px] font-bold text-background/70">تابعنا على</p>
            <div className="flex items-center gap-3.5">
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="واتساب"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-background/35 transition-opacity hover:opacity-70"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20l1.4-4.2A8 8 0 1 1 8.8 19L4 20Z" />
                    <path d="M9 10.2c0 2.6 2.2 4.8 4.8 4.8" />
                  </svg>
                </a>
              ) : null}
              {settings.instagram_url ? (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="انستغرام"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-background/35 transition-opacity hover:opacity-70"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5.5" />
                    <circle cx="12" cy="12" r="3.6" />
                    <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              ) : null}
              {settings.tiktok_url ? (
                <a
                  href={settings.tiktok_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="تيك توك"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-background/35 transition-opacity hover:opacity-70"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 3v10.6a3.4 3.4 0 1 1 -3.4-3.4c.3 0 .6 0 .9.1" />
                    <path d="M14 3c.35 2.4 2.1 4.25 4.6 4.5" />
                  </svg>
                </a>
              ) : null}
            </div>
          </>
        ) : null}

        <p className="text-[11.5px] text-background/45">© {new Date().getFullYear()} {settings.store_name}</p>
      </div>
    </footer>
  );
}
