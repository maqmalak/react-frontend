/* ------------------------------------------------------------------ *
 * Hero city — the wireframe city at the centre of the hero honeycomb.
 *
 * A compact port of the scene in website-micromax.html: the same 5x5 plot
 * layout, camera and light/dark palettes, drawn as translucent floors with
 * edge lines, pulsing glow strips and crowns, two tower cranes and drifting
 * dust. Three.js is the project's own vendored build and is imported
 * lazily so it only loads when the hero is actually shown.
 * ------------------------------------------------------------------ */

export interface CityHandle {
  setDark(dark: boolean): void;
  dispose(): void;
}

interface Palette {
  bldg: number[];
  edge: number;
  glow: number[];
  particle: number;
  grid: number;
}

const LIGHT: Palette = {
  bldg: [0xedeef0, 0xe8eaec, 0xf2f3f5],
  edge: 0x0b1220,
  glow: [0x2d5e8e, 0x3c6fa0, 0x244c74],
  particle: 0x3c6fa0,
  grid: 0x2d5e8e,
};

const DARK: Palette = {
  bldg: [0x152238, 0x0f1d33, 0x1a2a45],
  edge: 0xeff6ff,
  glow: [0x38bdf8, 0x7dd3fc, 0x60a5fa],
  particle: 0x38bdf8,
  grid: 0x38bdf8,
};

const GRID = 5;
const PLOT = 4.6;
const BUILD_W = 2.3;
const FLOOR_H = 0.75;
// 0 = empty plot (a crane stands there), 2 = tall tower, 3 = wireframe frame, 4 = villa, 5 = wide block.
const LAYOUT = [
  [2, 1, 4, 1, 3],
  [1, 5, 1, 2, 1],
  [4, 1, 3, 1, 5],
  [1, 2, 1, 4, 0],
  [3, 1, 5, 0, 2],
];
const PARTICLES = 180;

function cellFloors(i: number, j: number, kind: number): number {
  const n = Math.abs(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453);
  const frac = n - Math.floor(n);
  if (kind === 2) return Math.max(10, Math.round(12 + frac * 6));
  if (kind === 3) return Math.max(3, Math.round(3 + frac * 5));
  if (kind === 4) return Math.max(2, Math.round(2 + frac * 2));
  if (kind === 5) return Math.max(3, Math.round(3 + frac * 4));
  return Math.max(2, Math.round(2 + frac * 8));
}

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Starts the scene on `canvas`. Rejects when WebGL is unavailable so the
 * caller can fall back to the static skyline.
 */
export async function startHeroCity(canvas: HTMLCanvasElement): Promise<CityHandle> {
  // The vendored build ships without type declarations (see three-vendor.d.ts).
  const THREE = (await import("./assets/vendor/three.module.js")) as any;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
  camera.position.set(33, 38, 33);
  camera.lookAt(0, 4, 0);

  const root = new THREE.Group();
  scene.add(root);
  const world = new THREE.Group(); // rebuilt on theme change
  root.add(world);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startedAt = performance.now();

  let rises: { group: any; delay: number }[] = [];
  let pulses: { mat: any; base: number; phase: number; speed: number }[] = [];
  let cranes: { jib: any; speed: number; phase: number }[] = [];
  let particles: any = null;
  let particleSpeeds: Float32Array = new Float32Array(0);
  let dustTexture: any = null;

  function disposeWorld() {
    world.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m: any) => m.dispose());
      }
    });
    world.clear();
    rises = [];
    pulses = [];
    cranes = [];
    particles = null;
  }

  function makeDustTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  function addPulse(mesh: any, base: number, phase: number, speed: number) {
    mesh.material.opacity = base;
    pulses.push({ mat: mesh.material, base, phase, speed });
  }

  function build(dark: boolean) {
    disposeWorld();
    const pal = dark ? DARK : LIGHT;

    const fills = pal.bldg.map(
      (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: dark ? 0.55 : 0.4, depthWrite: false }),
    );
    const edgeMat = new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.85 });
    const wireMat = new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.7 });
    const glowMats = pal.glow.map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 }));

    // Ground grid under the plots.
    const grid = new THREE.GridHelper(GRID * PLOT + 6, GRID * 4 + 4, pal.grid, pal.grid);
    grid.material.transparent = true;
    grid.material.opacity = dark ? 0.22 : 0.18;
    world.add(grid);

    const start = -(GRID - 1) / 2;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const kind = LAYOUT[i][j];
        const x = (start + i) * PLOT;
        const z = (start + j) * PLOT;

        if (kind === 0) {
          addCrane(x, z, pal, i + j);
          continue;
        }

        const floors = cellFloors(i, j, kind);
        const height = floors * FLOOR_H;
        const noise = Math.abs(Math.sin(i * 11.1 + j * 7.7));
        let w = BUILD_W * (0.85 + noise * 0.3);
        let d = BUILD_W * (0.85 + (1 - noise) * 0.3);
        if (kind === 5) {
          w = BUILD_W * 1.55;
          d = BUILD_W * 1.1;
        }
        if (kind === 4) {
          w = d = BUILD_W * 0.85;
        }

        const building = new THREE.Group();
        building.position.set(x, 0, z);

        if (kind === 3) {
          // Frame under construction: floor outlines, corner posts, cross braces.
          const pts: any[] = [];
          for (let f = 0; f <= floors; f++) {
            const y = f * FLOOR_H;
            const c = [
              [-w / 2, -d / 2],
              [w / 2, -d / 2],
              [w / 2, d / 2],
              [-w / 2, d / 2],
            ];
            for (let k = 0; k < 4; k++) {
              const [ax, az] = c[k];
              const [bx, bz] = c[(k + 1) % 4];
              pts.push(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz));
            }
            if (f < floors && f % 2 === 0) {
              pts.push(new THREE.Vector3(-w / 2, y, -d / 2), new THREE.Vector3(w / 2, y + FLOOR_H, -d / 2));
              pts.push(new THREE.Vector3(w / 2, y, d / 2), new THREE.Vector3(-w / 2, y + FLOOR_H, d / 2));
            }
          }
          for (const [cx, cz] of [
            [-w / 2, -d / 2],
            [w / 2, -d / 2],
            [w / 2, d / 2],
            [-w / 2, d / 2],
          ]) {
            pts.push(new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, height, cz));
          }
          building.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
        } else {
          const body = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), fills[(i + j) % 3]);
          body.position.y = height / 2;
          building.add(body);

          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, height, d)), edgeMat);
          edges.position.y = height / 2;
          building.add(edges);

          // Glowing floor strips on a deterministic subset of floors.
          for (let f = 0; f < floors; f++) {
            const r = (((i * 31 + j * 17 + f) * 2654435761) >>> 0) % 100;
            const tint = r < 30 ? 0 : r < 50 ? 1 : r < 60 ? 2 : -1;
            if (tint < 0) continue;
            const strip = new THREE.Mesh(
              new THREE.BoxGeometry(w * 1.015, 0.045, d * 1.015),
              glowMats[tint].clone(),
            );
            strip.position.y = f * FLOOR_H + FLOOR_H * 0.85;
            addPulse(strip, 0.6, (i + j + f) * 0.4, 0.9 + (f % 3) * 0.25);
            building.add(strip);
          }

          if (kind === 2) {
            // Crown of the tall towers: the bright top faces in the hero.
            const crown = new THREE.Mesh(
              new THREE.BoxGeometry(w * 1.12, 0.2, d * 1.12),
              glowMats[0].clone(),
            );
            crown.position.y = height + 0.13;
            addPulse(crown, 0.8, i * 1.7 + j, 1.1);
            building.add(crown);
          }
        }

        building.scale.y = reduceMotion ? 1 : 0.001;
        world.add(building);
        rises.push({ group: building, delay: 0.15 + ((i * 5 + j) % 9) * 0.09 });
      }
    }

    // Dust drifting up through the city.
    const positions = new Float32Array(PARTICLES * 3);
    particleSpeeds = new Float32Array(PARTICLES);
    for (let k = 0; k < PARTICLES; k++) {
      positions[k * 3] = (Math.random() - 0.5) * 30;
      positions[k * 3 + 1] = Math.random() * 20;
      positions[k * 3 + 2] = (Math.random() - 0.5) * 30;
      particleSpeeds[k] = 0.004 + Math.random() * 0.006;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    dustTexture ??= makeDustTexture();
    particles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: pal.particle,
        size: 0.22,
        map: dustTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    world.add(particles);
  }

  function addCrane(x: number, z: number, pal: Palette, seed: number) {
    const mast = 11;
    const pts: any[] = [];
    const s = 0.35;
    for (let y = 0; y < mast; y += 1) {
      pts.push(new THREE.Vector3(-s, y, -s), new THREE.Vector3(s, y + 1, -s));
      pts.push(new THREE.Vector3(s, y, s), new THREE.Vector3(-s, y + 1, s));
    }
    for (const [cx, cz] of [
      [-s, -s],
      [s, -s],
      [s, s],
      [-s, s],
    ]) {
      pts.push(new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, mast, cz));
    }
    const craneMat = new THREE.LineBasicMaterial({ color: pal.glow[1], transparent: true, opacity: 0.85 });
    const crane = new THREE.Group();
    crane.position.set(x, 0, z);
    crane.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), craneMat));

    const jib = new THREE.Group();
    jib.position.y = mast;
    const jibPts = [
      new THREE.Vector3(-2.2, 0, 0),
      new THREE.Vector3(4.6, 0, 0),
      new THREE.Vector3(-2.2, 0.5, 0),
      new THREE.Vector3(4.6, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(4.6, 0, 0),
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(-2.2, 0, 0),
      new THREE.Vector3(3.4, 0, 0),
      new THREE.Vector3(3.4, -1.6, 0),
    ];
    jib.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(jibPts), craneMat));
    crane.add(jib);
    world.add(crane);
    cranes.push({ jib, speed: 0.18 + (seed % 3) * 0.05, phase: seed * 1.3 });
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(now: number) {
    const t = (now - startedAt) / 1000;
    for (const r of rises) r.group.scale.y = Math.max(0.001, easeOut((t - r.delay) / 1.1));
    for (const p of pulses) p.mat.opacity = p.base * (0.55 + 0.45 * Math.sin(t * p.speed * 2 + p.phase));
    for (const c of cranes) c.jib.rotation.y = c.phase + Math.sin(t * c.speed) * 1.1;
    if (particles) {
      const pos = particles.geometry.attributes.position;
      for (let k = 0; k < PARTICLES; k++) {
        let y = pos.getY(k) + particleSpeeds[k];
        if (y > 20) y = 0;
        pos.setY(k, y);
      }
      pos.needsUpdate = true;
    }
    root.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.12) * 0.32 - 0.1;
    renderer.render(scene, camera);
  }

  // Draw only while on screen and the tab is visible.
  let raf = 0;
  let onScreen = true;
  function loop(now: number) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (!raf && !reduceMotion) raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) kick();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => {
    resize();
    if (reduceMotion) frame(performance.now() + 5000);
  });
  ro.observe(canvas);
  const onVisibility = () => kick();
  document.addEventListener("visibilitychange", onVisibility);

  build(document.documentElement.classList.contains("dark"));
  resize();
  if (reduceMotion) frame(performance.now() + 5000);
  else kick();

  return {
    setDark(dark) {
      build(dark);
      if (reduceMotion) frame(performance.now() + 5000);
    },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      disposeWorld();
      dustTexture?.dispose();
      renderer.dispose();
    },
  };
}
