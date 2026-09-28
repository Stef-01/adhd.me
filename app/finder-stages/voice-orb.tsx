"use client";

// The voice finder's orb (founder, 2026-09-28: "make it exactly like this, plug in this repo",
// Javi0108/VoiceChatGpt-Prototype). The prototype's shader (app/voice-orb/, MIT) drawn with plain
// WebGL2 on one canvas instead of three.js. It moves with the call: the person's voice swells its
// rings, the assistant's voice quickens its flow, and it runs only while this screen is open.
// Under reduced motion it is one still frame; without WebGL2, a still disc in the same colours.

import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/voice/conversation";
import { ORB_FRAGMENT, ORB_VERTEX } from "../voice-orb/shaders";

const NOISE = "/voice/perlin-noise.png";
/** The prototype's frame loop: time at half speed, the flow quickening with the voice. */
const TIME_RATE = 0.5;

/** A palette token's hex as linear RGB: the values three.js's colour management handed the prototype's shader. */
function linearToken(name: string): [number, number, number] {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex.padEnd(6, "0");
  return [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function VoiceOrb({
  phase,
  level,
  reducedMotion,
}: {
  phase: Phase;
  /** The person's and the assistant's loudness now, 0 to 1, read once a frame. */
  level: () => { input: number; output: number };
  reducedMotion: boolean | null;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const read = useRef(level);
  const [still, setStill] = useState(false);
  useEffect(() => {
    read.current = level;
  }, [level]);

  useEffect(() => {
    const node = canvas.current;
    const gl = node?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, ORB_VERTEX);
    const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, ORB_FRAGMENT);
    const program = gl?.createProgram();
    if (!node || !gl || !vertex || !fragment || !program) return setStill(true);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return setStill(true);
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      time: at("uTime"),
      animation: at("uAnimation"),
      input: at("uInputVolume"),
      output: at("uOutputVolume"),
      edge: at("uEdge"),
    };
    gl.uniform1fv(at("uOffsets"), new Float32Array(7).map(() => Math.random() * Math.PI * 2));
    gl.uniform3fv(at("uColor1"), linearToken("--orb-deep"));
    gl.uniform3fv(at("uColor2"), linearToken("--orb-light"));
    gl.uniform1i(at("uPerlinTexture"), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let frame = 0;
    let lost = false;
    let ready = false;
    let last = performance.now();
    const clock = { time: 0, animation: 0, input: 0, output: 0 };

    const size = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.max(1, Math.round(node.clientWidth * scale));
      if (node.width !== px || node.height !== px) {
        node.width = px;
        node.height = px;
      }
      gl.viewport(0, 0, px, px);
      // Two device pixels of softening on the circle's edge.
      gl.uniform1f(u.edge, 4 / px);
    };
    const draw = (now: number) => {
      if (lost) return;
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const heard = read.current();
      clock.input += (heard.input - clock.input) * (heard.input > clock.input ? 0.3 : 0.08);
      clock.output += (heard.output - clock.output) * (heard.output > clock.output ? 0.3 : 0.08);
      clock.time += delta * TIME_RATE;
      clock.animation += delta * (0.01 + Math.max(clock.input, clock.output) * 0.5);
      size();
      gl.uniform1f(u.time, clock.time);
      gl.uniform1f(u.animation, clock.animation);
      gl.uniform1f(u.input, clock.input);
      gl.uniform1f(u.output, clock.output);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const texture = gl.createTexture();
    const image = new Image();
    image.onload = () => {
      if (lost) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      ready = true;
      last = performance.now();
      frame = requestAnimationFrame(draw);
    };
    image.onerror = () => setStill(true);
    image.src = NOISE;

    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      setStill(true);
    };
    node.addEventListener("webglcontextlost", onLost);
    return () => {
      lost = true;
      cancelAnimationFrame(frame);
      node.removeEventListener("webglcontextlost", onLost);
      if (ready) gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [reducedMotion]);

  return (
    <div className="voice-orb" data-phase={phase} aria-hidden="true">
      {still ? <span className="voice-orb-still" /> : <canvas ref={canvas} className="voice-orb-canvas" />}
    </div>
  );
}
