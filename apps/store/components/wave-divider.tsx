import { cn } from "@system2026/ui";

// فاصل موجي بين الأقسام الكاملة (أسود/أبيض متبادلة) — SVG بعرض كامل يُلصق
// بحافة القسم؛ flip يقلب اتجاه الموجة لعمل انتقال معكوس (أعلى القسم التالي).
export function WaveDivider({
  position,
  fill,
  flip = false,
}: {
  position: "top" | "bottom";
  fill: string;
  flip?: boolean;
}) {
  return (
    <svg
      className={cn(
        "absolute inset-x-0 block h-10 w-full",
        position === "top" ? "-top-px" : "-bottom-px",
        flip && "-scale-y-100",
      )}
      viewBox="0 0 400 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,20 Q50,40 100,20 T200,20 T300,20 T400,20 L400,40 L0,40 Z" fill={fill} />
    </svg>
  );
}
