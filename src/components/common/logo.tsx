/** Brand mark, shared by the login screen, sidebar and header. */
function LogoMark() {
  return (
    <>
      <path d="M165 173 Q165 133 205 133 H258 V510 H205 Q165 510 165 470 Z" fill="#21999b" />
      <path d="M278 300 Q278 270 308 270 H365 V510 H278 Z" fill="#21999b" />
      <path d="M383 352 H425 Q470 352 470 397 V465 Q470 510 425 510 H383 Z" fill="#21999b" />
      <g fill="#ef5f21">
        <rect x="404" y="278" width="66" height="15" rx="3" transform="rotate(45 437 285)" />
        <rect x="404" y="278" width="66" height="15" rx="3" transform="rotate(-45 437 285)" />
      </g>
    </>
  );
}

export function Logo({
  variant = "full",
  onDark = false,
  className,
}: {
  /** "mark" is just the icon glyph; "full" adds the MicroMax Solution wordmark. */
  variant?: "full" | "mark";
  /** Force the light-on-dark wordmark colors, for use on permanently dark surfaces (e.g. the sidebar) rather than following the app's light/dark theme toggle. */
  onDark?: boolean;
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <svg viewBox="150 118 335 407" className={className} role="img" aria-label="MicroMax">
        <LogoMark />
      </svg>
    );
  }

  const textClass = onDark ? "fill-white" : "fill-[#1c3238] dark:fill-white";
  const subClass = onDark ? "fill-[#93a4b7]" : "fill-[#6b8189] dark:fill-[#93a4b7]";

  return (
    <svg viewBox="0 0 440 120" className={className} role="img" aria-label="MicroMax Solution">
      <g transform="translate(-35.7 -25.2) scale(0.265)">
        <LogoMark />
      </g>
      <text
        x="112"
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
        x="113"
        y="96"
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="19"
        fontWeight="700"
        letterSpacing="4"
        className={subClass}
      >
        SOLUTION
      </text>
    </svg>
  );
}
