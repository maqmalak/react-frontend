/** Brand mark, shared by the login screen, sidebar and header. */
function LogoMark() {
  return (
    <>
      <rect x="165" y="133" width="93" height="377" rx="28" fill="#21999b" />
      <rect x="278" y="133" width="87" height="295" rx="28" fill="#21999b" />
      <rect x="383" y="133" width="87" height="377" rx="28" fill="#21999b" />
      <g fill="#ef5f21">
        <path d="M352 158 L418 158 L332 302 L402 302 L238 492 L298 330 L232 330 Z" />
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
        y="92"
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="4.6"
        className={subClass}
      >
        SOLUTION
      </text>
    </svg>
  );
}
