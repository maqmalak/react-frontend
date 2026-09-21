import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowDown, Check } from "lucide-react";
import "./industry-honeycomb.css";
import {
  FIG_W,
  GROUP_ORDER,
  HEX_GROUPS,
  HEXH,
  HEXPAD,
  HEXW,
  MODULE_HEX,
  layoutHoneycomb,
  moduleSequence,
  onInk,
  type HexCellModel,
} from "./industry-honeycomb";
import { INDUSTRIES, MODULES } from "./website-data";

const moduleById = (id: string) => MODULES.find((m) => m.id === id);

/** How long a switched-off cell takes to fade before it is removed. */
const LEAVE_MS = 260;

/** Cards per row of the picker at the current width (see the `.cp-profiles` rules), for arrow-key movement. */
function pickerColumns(): number {
  return window.matchMedia("(max-width: 520px)").matches ? 1 : 2;
}

/**
 * Industry explorer, ported from the "One platform, shaped to how you build"
 * section of website-micromax.html: a picker of industries beside a module
 * honeycomb. Hovering or focusing an industry switches it, clicking pins it,
 * arrow keys move between industries. The honeycomb's cells bloom in for the
 * modules an industry uses, glide when they stay, and fade out when they are
 * switched off. Industries, modules and features come from website-data.ts.
 */
export function IndustriesSection({ heading, className }: { heading: ReactNode; className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const industry = INDUSTRIES[activeIndex];
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // The comb is fitted to the shape of the stage, so the stage is measured.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStage({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { layout, scale } = useMemo(
    () => layoutHoneycomb(industry.modules, stage.w, stage.h),
    [industry.modules, stage.w, stage.h],
  );

  // Cells that were on and are now off stay in the DOM briefly so they can fade out.
  const [leaving, setLeaving] = useState<HexCellModel[]>([]);
  const previousCells = useRef<HexCellModel[]>([]);
  useEffect(() => {
    const now = new Set(layout.cells.map((c) => c.key));
    const gone = previousCells.current.filter((c) => !now.has(c.key));
    previousCells.current = layout.cells;
    setLeaving(gone);
    if (!gone.length) return;
    const timer = window.setTimeout(() => setLeaving([]), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [layout.cells]);

  const select = useCallback((index: number, focus: boolean) => {
    setActiveIndex(index);
    if (focus) cardRefs.current[index]?.focus();
  }, []);

  const onPickerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const columns = pickerColumns();
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = activeIndex + 1;
        break;
      case "ArrowLeft":
        next = activeIndex - 1;
        break;
      case "ArrowDown":
        next = activeIndex + columns;
        break;
      case "ArrowUp":
        next = activeIndex - columns;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = INDUSTRIES.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(Math.max(0, Math.min(INDUSTRIES.length - 1, next)), true);
  };

  // Disciplines this industry touches, in canonical order, with a count each.
  const legend = useMemo(() => {
    const sequence = moduleSequence(industry.modules);
    return GROUP_ORDER.map((gid) => ({ gid, count: sequence.filter((m) => m.gid === gid).length })).filter(
      (g) => g.count > 0,
    );
  }, [industry.modules]);

  const IndustryIcon = industry.icon;
  const boxW = HEXW - HEXPAD;
  const boxH = HEXH - HEXPAD;

  const renderCell = (cell: HexCellModel, isLeaving: boolean) => {
    const module = moduleById(cell.key);
    const meta = MODULE_HEX[cell.key];
    const group = HEX_GROUPS[cell.gid];
    if (!module || !meta || !group) return null;
    const GroupIcon = group.icon;
    const style = {
      left: `calc(50% + ${cell.cx - boxW / 2}px)`,
      top: `calc(50% + ${cell.cy - boxH / 2}px)`,
      width: boxW,
      height: boxH,
      animationDelay: `${Math.min(cell.band * 64 + cell.within * 6, 460)}ms`,
      "--cp-gc": group.color,
      "--cp-on": onInk(group.color),
    } as CSSProperties;
    return (
      <div
        key={cell.key}
        className={isLeaving ? "cp-hex is-leaving" : "cp-hex"}
        style={style}
        title={`${module.label} · ${group.label}`}
      >
        <span className="cp-hex-t">{meta.short}</span>
        <i className="cp-hex-i" aria-hidden="true">
          <GroupIcon />
        </i>
      </div>
    );
  };

  return (
    <section id="industries" className={`cp-scope ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        {heading}

        <div className="cp-wrap">
          <div className="cp-grid">
            <div
              className="cp-profiles"
              role="tablist"
              aria-label="Industries"
              onKeyDown={onPickerKeyDown}
            >
              {INDUSTRIES.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;
                const tags = item.modules
                  .map(moduleById)
                  .filter((m): m is NonNullable<typeof m> => Boolean(m))
                  .slice(0, 3);
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      cardRefs.current[index] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    className={active ? "cp-card cp-active" : "cp-card"}
                    onMouseEnter={() => select(index, false)}
                    onFocus={() => select(index, false)}
                    onClick={() => select(index, true)}
                  >
                    <span className="cp-card-ico">
                      <Icon />
                    </span>
                    <span className="cp-card-body">
                      <span className="cp-cname">{item.label}</span>
                      <span className="cp-cmeta">{item.modules.length} modules</span>
                      <span className="cp-ctags">
                        {tags.map((tag) => (
                          <span key={tag.id} className="cp-ctag">
                            {tag.label}
                          </span>
                        ))}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="cp-stage-col">
              <div className="cp-head">
                <div className="cp-caption" aria-live="polite">
                  <b>{industry.modules.length} modules</b> <span>· {industry.label}</span>
                </div>
                <ul className="cp-modlist" aria-label="Modules by discipline">
                  {legend.map(({ gid, count }) => (
                    <li key={gid} className="cp-ml" style={{ "--cp-gc": HEX_GROUPS[gid].color } as CSSProperties}>
                      <i />
                      <span className="cp-ml-name">{HEX_GROUPS[gid].label}</span>
                      <span className="cp-ml-n">{count}</span>
                    </li>
                  ))}
                </ul>
                <a className="cp-install" href="#contact" aria-label={`Discuss this setup - ${industry.label}`}>
                  <ArrowDown className="cp-install-ic" aria-hidden="true" />
                  <span>Discuss this setup</span>
                </a>
              </div>

              <div className="cp-stage" ref={stageRef} aria-hidden="true">
                <div className="cp-canvas" style={{ width: layout.width, height: layout.height, transform: `translate(-50%, -50%) scale(${scale})` }}>
                  {layout.cells.map((cell) => renderCell(cell, false))}
                  {leaving.map((cell) => renderCell(cell, true))}
                </div>
                <div className="cp-flower" style={{ width: FIG_W * scale }}>
                  <span key={industry.id} className="cp-flower-ico">
                    <IndustryIcon />
                  </span>
                </div>
                <div
                  key={industry.id}
                  className="cp-fig-name is-on"
                  style={{
                    maxWidth: FIG_W * scale * 0.86,
                    fontSize: Math.max(11, FIG_W * scale * 0.072),
                    padding: "6px 10px",
                  }}
                >
                  {industry.label}
                </div>
              </div>
            </div>
          </div>

          <div className="cp-gain">
            <div>
              <p className="cp-gain-h">Overview</p>
              <p className="cp-gain-summary">{industry.summary}</p>
            </div>
            <div>
              <p className="cp-gain-h">What you get</p>
              <ul className="cp-gain-list">
                {industry.features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="cp-foot">
            <b>Every implementation starts from the standard ERPNext core.</b> Industries never lock anything away —
            they simply lead with the modules that matter most, and modules can be switched on or off per company and
            per role at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
