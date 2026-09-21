import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import "./hero-honeycomb.css";
import type { CityHandle } from "./hero-city";
import {
  AURA,
  HEX_CELLS,
  HEX_MODULE_TOTAL,
  HEX_PLUGS,
  HUB_PEOPLE,
  RING_PEOPLE,
} from "./hero-honeycomb-data";
import { HERO_ROLES, HERO_ROLE_TOTAL } from "./website-data";

/** Role portraits, resolved at build time from assets/people/seg-<slug>.webp. */
const ROLE_IMAGES = import.meta.glob<string>("./assets/people/seg-*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

export function roleImage(slug: string): string | undefined {
  return ROLE_IMAGES[`./assets/people/seg-${slug}.webp`];
}

const roleLabel = (slug: string) => HERO_ROLES.find((r) => r.slug === slug)?.label ?? slug;

/** Design size of the stage; the whole thing is scaled down to fit narrower columns. */
const STAGE_W = 920;
const STAGE_H = 640;

const TINT: CSSProperties = { "--tint": "var(--accent)" } as CSSProperties;

function RoleFace({ slug, className }: { slug: string; className: string }) {
  const front = className.startsWith("hc-person") ? "hcp-face hcp-front" : "hp-face hp-front";
  const back = className.startsWith("hc-person") ? "hcp-face hcp-back" : "hp-face hp-back";
  return (
    <a className={className} href="#industries">
      <span className={front}>
        <img src={roleImage(slug)} alt="" width={128} height={128} decoding="async" />
      </span>
      <span className={back}>
        <span data-role-label>{roleLabel(slug)}</span>
      </span>
    </a>
  );
}

/** Centre-left: the brand mark every other cell is arranged around. */
function Hub() {
  return (
    <div className="hero-hub">
      <Link className="hero-hub-inner" to="/home" aria-label="Open the ERP">
        <svg className="hh-hex" viewBox="0 0 152 132" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="hhGrad" x1="0" y1="0" x2="1" y2="1">
              <stop className="hh-g1" offset="0" />
              <stop className="hh-g2" offset="0.46" />
              <stop className="hh-g3" offset="1" />
            </linearGradient>
          </defs>
          <polygon className="hh-hex-fill" points="38,0 114,0 152,66 114,132 38,132 0,66" />
          <polygon
            className="hh-hex-line"
            points="38,0.8 113.6,0.8 151.2,66 113.6,131.2 38,131.2 0.8,66"
          />
        </svg>
        <span className="hero-hub-word">
          <span className="hh-line">Micro</span>
          <span className="hh-line">Max</span>
          <span className="hh-line hero-hub-word-light">ERP</span>
        </span>
        <span className="hero-hub-sheen" aria-hidden="true" />
        <span className="hero-hub-burst" aria-hidden="true" />
        <span className="hero-hub-flash" aria-hidden="true" />
        <span className="hero-hub-scan" aria-hidden="true" />
      </Link>
    </div>
  );
}

const isDark = () => document.documentElement.classList.contains("dark");

/**
 * The hero visual from website-micromax.html: a hex ring of module cells
 * around a wireframe 3D city, the brand hub, and role faces that flip to
 * show the role. The CSS is that page's own (hero-honeycomb.css); this
 * component supplies the markup, scales the fixed-size stage to its
 * container, and runs the city.
 */
export function HeroHoneycomb() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fit, setFit] = useState({ scale: 1, x: 0 });
  const [ready, setReady] = useState(false);
  const [noWebgl, setNoWebgl] = useState(false);

  // Scale the stage to whatever width the layout gives us (never above 1:1).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const scale = Math.min(1, width / STAGE_W);
      setFit({ scale, x: Math.max(0, (width - STAGE_W * scale) / 2) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start the city lazily; follow light/dark changes; fall back if WebGL is missing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let handle: CityHandle | null = null;
    let dark = isDark();

    import("./hero-city")
      .then(({ startHeroCity }) => startHeroCity(canvas))
      .then((city) => {
        if (cancelled) {
          city.dispose();
          return;
        }
        handle = city;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setNoWebgl(true);
      });

    const themeWatcher = new MutationObserver(() => {
      if (isDark() !== dark) {
        dark = isDark();
        handle?.setDark(dark);
      }
    });
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelled = true;
      themeWatcher.disconnect();
      handle?.dispose();
    };
  }, []);

  const shownRoles = HUB_PEOPLE.length + RING_PEOPLE.length;

  return (
    <div
      ref={wrapRef}
      className="hh-scope"
      data-static={noWebgl ? "" : undefined}
      style={{ height: STAGE_H * fit.scale }}
    >
      <div
        className="hh-stage"
        style={{ transform: `translateX(${fit.x}px) scale(${fit.scale})` }}
      >
        {/* Left: hub, the empty aura hexes growing out of it, and the role faces. */}
        <div className="hh-left">
          <div className="hero-hub-aura" aria-hidden="true">
            {AURA.map((group) => (
              <div key={group.side} className={`aura-side aura-${group.side}`}>
                {group.hexes.map(([col, row, delay, opacity]) => (
                  <span
                    key={`${col}:${row}`}
                    className="hub-hex"
                    style={
                      { "--col": col, "--row": row, "--d": delay, "--o": opacity } as CSSProperties
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="hero-people">
            {HUB_PEOPLE.map((slug, index) => (
              <RoleFace
                key={slug}
                slug={slug}
                className={`hero-person hero-person-s hero-person-s${index + 1}`}
              />
            ))}
            <a className="hero-person hero-person-more" href="#industries">
              <span className="hp-face hp-front">
                <span className="hp-more-n">+{HERO_ROLE_TOTAL - shownRoles}</span>
                <span className="hp-more-l">more roles</span>
              </span>
              <span className="hp-face hp-back">
                <span>See industries</span>
              </span>
            </a>
          </div>

          <Hub />
        </div>

        {/* Right: the module ring around the city. */}
        <div className="hero-panel-wrap">
          <div className="hero-panel">
            <div className="module-honeycomb" aria-label="Platform modules">
              {HEX_CELLS.map((cell) => {
                const Icon = cell.icon;
                return (
                  <a
                    key={cell.pos}
                    className={`hc-cell hc-pos-${cell.pos}`}
                    style={TINT}
                    href="#modules"
                  >
                    <span className="hc-face hc-face-front">
                      <span className="hc-ico" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="hc-title">{cell.title}</span>
                      <span className="hc-sub">{cell.sub}</span>
                    </span>
                    <span className="hc-face hc-face-back">
                      <span className="hc-feature">
                        {cell.back[0]}
                        <br />
                        {cell.back[1]}
                      </span>
                    </span>
                  </a>
                );
              })}

              {RING_PEOPLE.map((person) => (
                <RoleFace key={person.slug} slug={person.slug} className={`hc-person hc-person-${person.pos}`} />
              ))}

              <a className="hc-more" href="#modules">
                <span className="hcm-face hcm-front">
                  <span className="hcm-n">+{HEX_MODULE_TOTAL - HEX_CELLS.length}</span>
                  <span className="hcm-l">more modules</span>
                </span>
                <span className="hcm-face hcm-back">
                  <span>See the module system</span>
                </span>
              </a>

              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`hc-plug-link hc-plug-link-${n}`} aria-hidden="true" />
              ))}
              {HEX_PLUGS.map((plug) => {
                const Icon = plug.icon;
                return (
                  <a
                    key={plug.n}
                    className={`hc-plug hc-plug-${plug.n}`}
                    href="#modules"
                    aria-label={plug.label}
                  >
                    <svg
                      className="hc-plug-ring"
                      viewBox="0 0 100 87"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <polygon points="25,1.5 75,1.5 99,43.5 75,85.5 25,85.5 1,43.5" />
                    </svg>
                    <span className="hc-plug-face">
                      <span className="hc-ico" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="hc-title">{plug.title}</span>
                      <span className="hc-sub">{plug.sub}</span>
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="scene-backdrop" aria-hidden="true" />
            <canvas
              ref={canvasRef}
              className={ready ? "three-canvas is-ready" : "three-canvas"}
              role="img"
              aria-label="Wireframe city with live cost, carbon and schedule overlays"
            />
            <div className="static-scene" aria-hidden="true">
              <svg viewBox="0 0 520 360" fill="none">
                <g stroke="var(--accent)" strokeWidth="1" opacity="0.8">
                  <rect x="80" y="200" width="50" height="70" />
                  <rect x="140" y="170" width="50" height="100" />
                  <rect x="200" y="140" width="60" height="130" />
                  <rect x="270" y="110" width="50" height="160" />
                  <rect x="330" y="170" width="60" height="100" />
                  <rect x="400" y="190" width="50" height="80" />
                </g>
                <g stroke="var(--accent-2)" strokeWidth="1" opacity="0.5">
                  <line x1="0" y1="280" x2="520" y2="280" />
                  <line x1="0" y1="300" x2="520" y2="300" />
                  <line x1="250" y1="80" x2="250" y2="340" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
