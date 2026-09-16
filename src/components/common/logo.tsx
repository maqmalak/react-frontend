import { cn } from "@/utils/cn";
import logoMarkUrl from "./logo-mark.png";

export function Logo({
  variant = "full",
  onDark = false,
  className,
}: {
  /** "mark" is just the icon glyph; "full" adds the MicroMax wordmark. */
  variant?: "full" | "mark";
  /** Force the light-on-dark wordmark colors, for use on permanently dark surfaces (e.g. the sidebar) rather than following the app's light/dark theme toggle. */
  onDark?: boolean;
  className?: string;
}) {
  if (variant === "mark") {
    return <img src={logoMarkUrl} alt="MicroMax" className={cn("inline-block object-contain", className)} />;
  }

  const textClass = onDark ? "fill-white" : "fill-[#1c3238] dark:fill-white";
  const subClass = onDark ? "fill-[#93a4b7]" : "fill-[#6b8189] dark:fill-[#93a4b7]";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={logoMarkUrl} alt="" className="h-full w-auto shrink-0 object-contain" />
      <svg viewBox="0 40 328 56" className="h-full w-auto" role="img" aria-label="MicroMax">
        <text
          x="0"
          y="66"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="34"
          fontWeight="700"
          letterSpacing="-0.6"
          className={textClass}
        >
          Micro<tspan fill="#21999b">Max</tspan>
        </text>
        <text
          x="1"
          y="92"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="4.6"
          className={subClass}
        >
          ERP PVT. LTD.
        </text>
      </svg>
    </span>
  );
}
