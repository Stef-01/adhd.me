"use client";

// Liquid glass, the studio's way (founder, 2026-09-08: "the liquid UI is not being responsive and
// animated — install everything from its repo"). This is iyinchao/liquid-glass-studio's WebGL2
// pipeline — background → vertical blur → horizontal blur → glass — running full-viewport under
// the page: the ground is the app's paper with slow tinted drift, the glass shapes are the app's
// own controls and cards read from the DOM every frame, and the studio's pointer blob follows the
// cursor on a spring and stretches with its speed, melting into whatever it passes. The CSS glass
// (app/styles/glass.css) stays: it is what blurs DOM content under the chrome, and it is the
// whole effect where WebGL2 is missing or transparency is reduced.
//
// Nothing here reads content. It reads rectangles. Text stays DOM, ink stays ink.

import { useEffect, useRef } from "react";
import { MultiPassRenderer } from "./studio/gl-utils";
import { computeGaussianKernelByRadius } from "./studio/kernel";
import { FRAGMENT_BG, FRAGMENT_HBLUR, FRAGMENT_MAIN, FRAGMENT_VBLUR, VERTEX } from "./studio/shaders";
import { GLASS_SELECTOR, MAX_SHAPES, STUDIO } from "./studio/params";

const DPR_CAP = 1.5;
const REFRESH_MS = 250;
const IDLE_MS = 1600;
/** react-spring's default config, which the studio's Controller uses: tension 170, friction 26, mass 1. */
const SPRING = { tension: 170, friction: 26 };

/** The tokens as the shell resolves them: the desktop platform shell carries its own paper. */
function cssColor(name: string, fallback: [number, number, number]): [number, number, number] {
  try {
    const scope = document.querySelector(".platform-shell") ?? document.body;
    const raw = getComputedStyle(scope).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d");
    if (!ctx) return fallback;
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
  } catch {
    return fallback;
  }
}

function radiusOf(el: Element, w: number, h: number): { radius: number; roundness: number } {
  const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  const cap = Math.min(w, h) / 2;
  const radius = Math.min(r, cap);
  // A pill (radius at the cap) is a true circle end; a card corner takes the studio's squircle.
  return { radius, roundness: radius >= cap - 0.5 ? 2 : 4 };
}

/** WebGL2 with float render targets, on a hardware renderer. Exported so a test can ask the same question. */
export function canRunLiquidGlass(gl: WebGL2RenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  return !/swiftshader|llvmpipe|software|mesa offscreen/i.test(renderer);
}

export function LiquidGlass() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedTransparency = matchMedia("(prefers-reduced-transparency: reduce)").matches;
    if (reducedTransparency) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl || !gl.getExtension("EXT_color_buffer_float")) return;
    // Four full-viewport passes a frame need a GPU. On a software renderer (SwiftShader, llvmpipe,
    // a headless browser) the layer would starve the page, so it stands aside and the CSS glass
    // carries the look whole. `canRunLiquidGlass` is the one place this is decided.
    if (!canRunLiquidGlass(gl)) return;

    let renderer: MultiPassRenderer;
    try {
      renderer = new MultiPassRenderer(canvas, [
        { name: "bgPass", shader: { vertex: VERTEX, fragment: FRAGMENT_BG } },
        { name: "vBlurPass", shader: { vertex: VERTEX, fragment: FRAGMENT_VBLUR }, inputs: { u_prevPassTexture: "bgPass" } },
        { name: "hBlurPass", shader: { vertex: VERTEX, fragment: FRAGMENT_HBLUR }, inputs: { u_prevPassTexture: "vBlurPass" } },
        { name: "mainPass", shader: { vertex: VERTEX, fragment: FRAGMENT_MAIN }, inputs: { u_blurredBg: "hBlurPass", u_bg: "bgPass" }, outputToScreen: true },
      ]);
    } catch (error) {
      // A shader that will not compile here is a fact to see, not to hide: the CSS glass carries on.
      console.warn("liquid-glass: renderer unavailable", error);
      return;
    }
    // Games only (app/styles/glass.css): the layer switches itself on while a [data-liquid] scope is
    // on the page and off, canvas hidden, everywhere else. The finder never gets it.
    let scoped = false;
    let lastScope = -Infinity;
    canvas.style.visibility = "hidden";

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hoverDevice = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let paper = cssColor("--paper", [1, 0.973, 0.965]);
    let tintA = cssColor("--accent-soft", [0.93, 0.95, 1]);
    let tintB = cssColor("--route-soft", [0.94, 0.94, 0.99]);
    let tintC = cssColor("--stone", [0.97, 0.93, 0.91]);
    const blurWeights = computeGaussianKernelByRadius(STUDIO.blurRadius);

    let width = 0, height = 0, dpr = 1;
    /** Render scale: 1, then 0.5 if frames run long, then off. The glass is decoration; the page is not. */
    let scale = 1;
    let slowFrames = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP) * scale;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      renderer.resize(canvas.width, canvas.height);
      // The shell can change paper across the breakpoint; read the tokens again with the size.
      paper = cssColor("--paper", paper);
      tintA = cssColor("--accent-soft", tintA);
      tintB = cssColor("--route-soft", tintB);
      tintC = cssColor("--stone", tintC);
    };
    resize();

    // The shapes: the glass elements, re-queried on a slow clock, measured every frame.
    let elements: Element[] = [];
    let lastQuery = 0;
    const shapes = new Float32Array(MAX_SHAPES * 4);
    const corners = new Float32Array(MAX_SHAPES * 2);
    const measure = (now: number): number => {
      if (now - lastQuery > REFRESH_MS) {
        elements = Array.from(document.querySelectorAll(GLASS_SELECTOR));
        lastQuery = now;
      }
      let n = 0;
      // Smallest first: a chip is the glass you notice; a card that fills the screen is last in.
      const rects = elements
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.top < height && r.left < width)
        .sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height);
      for (const { el, r } of rects) {
        if (n >= MAX_SHAPES) break;
        const { radius, roundness } = radiusOf(el, r.width, r.height);
        shapes[n * 4] = (r.left + r.width / 2) * dpr;
        shapes[n * 4 + 1] = (height - (r.top + r.height / 2)) * dpr;
        shapes[n * 4 + 2] = r.width;
        shapes[n * 4 + 3] = r.height;
        corners[n * 2] = radius;
        corners[n * 2 + 1] = roundness;
        n += 1;
      }
      return n;
    };

    // The droplet: the studio's one moving shape on its spring, with its velocity-driven stretch.
    // It follows a mouse or a finger (founder, 2026-09-08: "I don't have the droplet moving
    // effect" — on a phone there was no pointer to follow), and when nothing has touched the
    // screen for a moment it drifts on its own, slowly, so the glass is never still.
    const pointer = { x: canvas.width / 2, y: canvas.height / 2, at: -1 };
    const spring = { x: pointer.x, y: pointer.y, vx: 0, vy: 0 };
    let blobAlpha = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX * dpr;
      pointer.y = (height - e.clientY) * dpr;
      pointer.at = performance.now();
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      pointer.x = t.clientX * dpr;
      pointer.y = (height - t.clientY) * dpr;
      pointer.at = performance.now();
    };
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("touchstart", onTouch, { passive: true });
      window.addEventListener("touchmove", onTouch, { passive: true });
    }
    /** Where the droplet wanders when idle: a slow Lissajous over the middle of the screen. */
    const wander = (t: number): [number, number] => [
      canvas.width * (0.5 + 0.34 * Math.sin(t * 0.11)),
      canvas.height * (0.55 + 0.22 * Math.sin(t * 0.17 + 1.3)),
    ];

    let raf = 0;
    let last = performance.now();
    const t0 = last;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      if (now - lastScope > REFRESH_MS) {
        lastScope = now;
        const next = document.querySelector("[data-liquid]") !== null;
        if (next !== scoped) {
          scoped = next;
          document.documentElement.classList.toggle("has-liquid", scoped);
          canvas.style.visibility = scoped ? "visible" : "hidden";
        }
      }
      if (!scoped) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      // Governor: a run of frames over 40 ms means this machine cannot afford the layer at this size.
      if (now - last > 40) slowFrames += 1; else slowFrames = Math.max(0, slowFrames - 1);
      last = now;
      if (slowFrames > 30) {
        slowFrames = 0;
        if (scale > 0.5) { scale = 0.5; resize(); }
        else { cancelAnimationFrame(raf); document.documentElement.classList.remove("has-liquid"); renderer.dispose(); return; }
      }
      if (canvas.width !== Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, DPR_CAP) * scale) || height !== window.innerHeight) resize();

      // Spring (react-spring's default physics, integrated per frame as the studio's Controller does).
      const ax = (SPRING.tension * (pointer.x - spring.x) - SPRING.friction * spring.vx);
      const ay = (SPRING.tension * (pointer.y - spring.y) - SPRING.friction * spring.vy);
      spring.vx += ax * dt; spring.vy += ay * dt;
      spring.x += spring.vx * dt; spring.y += spring.vy * dt;
      const speedX = Math.abs(spring.vx) / 1000, speedY = Math.abs(spring.vy) / 1000; // device px per ms, the studio's unit
      // Followed while a pointer or finger is moving; wandering once it has been idle.
      const following = pointer.at > 0 && now - pointer.at < IDLE_MS;
      if (!following && !reducedMotion) { const [wx, wy] = wander((now - t0) / 1000); pointer.x = wx; pointer.y = wy; }
      const wantBlob = !reducedMotion;
      blobAlpha += ((wantBlob ? 1 : 0) - blobAlpha) * Math.min(1, dt * 8);
      const blob = STUDIO.blobSize * blobAlpha;
      const stretchX = blob + (speedX * blob * STUDIO.springSizeFactor) / 100;
      const stretchY = blob + (speedY * blob * STUDIO.springSizeFactor) / 100;

      const count = measure(now);
      const glareAngle = ((STUDIO.glareAngle + (hoverDevice ? ((spring.x / canvas.width) - 0.5) * 30 : 0)) * Math.PI) / 180;

      renderer.setUniforms({
        u_resolution: [canvas.width, canvas.height],
        u_dpr: dpr,
        u_time: (now - t0) / 1000,
        u_drift: reducedMotion ? 0 : 1,
        u_blurWeights: blurWeights,
        u_blurRadius: STUDIO.blurRadius,
        u_mouse: [pointer.x, pointer.y],
        u_mouseSpring: [spring.x, spring.y],
        u_shapeWidth: stretchX,
        u_shapeHeight: stretchY,
        u_blobSize: blob > 0.5 ? blob : 0,
        u_mergeRate: STUDIO.mergeRate,
        u_shapes: Array.from(shapes),
        u_shapeCorner: Array.from(corners),
        u_shapeCount: count,
        u_glareAngle: glareAngle,
      });
      renderer.render({
        bgPass: {
          u_paper: paper, u_tintA: tintA, u_tintB: tintB, u_tintC: tintC,
          u_shadowExpand: STUDIO.shadowExpand,
          u_shadowFactor: STUDIO.shadowFactor / 100,
          u_shadowPosition: [-STUDIO.shadowPosition.x, -STUDIO.shadowPosition.y],
        },
        mainPass: {
          u_tint: [STUDIO.tint.r / 255, STUDIO.tint.g / 255, STUDIO.tint.b / 255, STUDIO.tint.a],
          u_refThickness: STUDIO.refThickness,
          u_refDistance: STUDIO.refDistance,
          u_refFactor: STUDIO.refFactor,
          u_refDispersion: STUDIO.refDispersion,
          u_refFresnelRange: STUDIO.refFresnelRange,
          u_refFresnelHardness: STUDIO.refFresnelHardness / 100,
          u_refFresnelFactor: STUDIO.refFresnelFactor / 100,
          u_glareRange: STUDIO.glareRange,
          u_glareHardness: STUDIO.glareHardness / 100,
          u_glareConvergence: STUDIO.glareConvergence / 100,
          u_glareOppositeFactor: STUDIO.glareOppositeFactor / 100,
          u_glareFactor: STUDIO.glareFactor / 100,
          u_blurEdge: STUDIO.blurEdge ? 1 : 0,
          STEP: 9,
        },
      });
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      document.documentElement.classList.remove("has-liquid");
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="liquid-glass" aria-hidden="true" data-testid="liquid-glass" />;
}
