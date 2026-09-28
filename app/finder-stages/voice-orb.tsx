"use client";

// The voice finder's orb. The founder asked for Javi0108/VoiceChatGpt-Prototype ("make it exactly like
// this, plug in this repo"), and then, the flat circle having read as a spinning disc, for something
// "much more fluid, engaging, and reactive, like a visualizer". This is that repo's own visualizer
// (src/components/Sphere), drawn with plain WebGL2 from app/voice-orb/sphere.ts: a sphere whose
// surface flows with 4D simplex noise and swells with the call, the person's voice and the
// assistant's alike, as the prototype's swells with its microphone. It runs only while this screen
// is open and floats over its shadow while the call is live (app/styles/voice.css). Under reduced
// motion it is one still frame; without WebGL2, a still disc in the same colours.

import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/voice/conversation";
import { SPHERE_FRAGMENT, SPHERE_VERTEX, cameraMatrices, cubeSphere } from "../voice-orb/sphere";

/** The prototype's own parameters (Sphere.jsx). */
const RADIUS = 0.75;
const TIME_RATE = 0.5;
const TIME_FREQUENCY = 0.4;
const WARP_POSITION_FREQUENCY = 0.38;
const WARP_TIME_FREQUENCY = 0.12;
const WARP_STRENGTH = 0.7;
const LIGHT_INTENSITY = 5;
/** How far a voice swells it: the prototype's `1 + volume / 100` over its FFT average, here over the call's 0-to-1 loudness. */
const SWELL = 0.45;
/** How much of the way to a voice's loudness the orb goes in a sixtieth of a second: quick to rise, slow to settle. */
const ATTACK = 0.3;
const DECAY = 0.08;
/** A narrow camera, so the sphere at rest is a little over half the canvas across and at its loudest still fits. */
const FOV_DEGREES = 20;
const DISTANCE = 5;
/** Cells a side of each cube face: 25,350 points, smooth at the orb's size. */
const SEGMENTS = 64;

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
    const gl = node?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true, depth: true });
    const vertex = gl && compile(gl, gl.VERTEX_SHADER, SPHERE_VERTEX);
    const fragment = gl && compile(gl, gl.FRAGMENT_SHADER, SPHERE_FRAGMENT);
    const program = gl?.createProgram();
    if (!node || !gl || !vertex || !fragment || !program) return setStill(true);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return setStill(true);
    gl.useProgram(program);

    const { positions, indices } = cubeSphere(SEGMENTS);
    const vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    const elements = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const at = (name: string) => gl.getUniformLocation(program, name);
    const u = { time: at("uTime"), positionFrequency: at("uPositionFrequency"), strength: at("uStrength"), scale: at("uScale") };
    const { projection, view } = cameraMatrices(FOV_DEGREES, DISTANCE);
    gl.uniformMatrix4fv(at("uProjection"), false, projection);
    gl.uniformMatrix4fv(at("uView"), false, view);
    gl.uniform1f(at("uRadius"), RADIUS);
    gl.uniform1f(at("uTimeFrequency"), TIME_FREQUENCY);
    gl.uniform1f(at("uWarpPositionFrequency"), WARP_POSITION_FREQUENCY);
    gl.uniform1f(at("uWarpTimeFrequency"), WARP_TIME_FREQUENCY);
    gl.uniform1f(at("uWarpStrength"), WARP_STRENGTH);
    gl.uniform3fv(at("uColorA"), linearToken("--orb-a"));
    gl.uniform3fv(at("uColorB"), linearToken("--orb-b"));
    gl.uniform3f(at("uLightDirection"), 0, 0, 1);
    gl.uniform1f(at("uLightIntensity"), LIGHT_INTENSITY);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    let frame = 0;
    let lost = false;
    let last = performance.now();
    const clock = { time: 0, input: 0, output: 0 };

    const size = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const px = Math.max(1, Math.round(node.clientWidth * scale));
      if (node.width !== px || node.height !== px) {
        node.width = px;
        node.height = px;
      }
      gl.viewport(0, 0, px, px);
    };
    const draw = (now: number) => {
      if (lost) return;
      const delta = Math.min(Math.max(now - last, 0) / 1000, 0.1);
      last = now;
      const heard = read.current();
      // By the clock, not by the frame, so a 120 Hz screen and a slow one move alike.
      const ease = (from: number, to: number) => from + (to - from) * (1 - (1 - (to > from ? ATTACK : DECAY)) ** (delta * 60));
      clock.input = ease(clock.input, heard.input);
      clock.output = ease(clock.output, heard.output);
      clock.time += delta * TIME_RATE;
      // The prototype's reaction: a voice scales the sphere, quickens its ripples and deepens them.
      const swell = 1 + Math.min(1, Math.max(clock.input, clock.output)) * SWELL;
      size();
      gl.uniform1f(u.time, clock.time);
      gl.uniform1f(u.positionFrequency, swell);
      gl.uniform1f(u.strength, swell * 0.1);
      gl.uniform3f(u.scale, swell * 0.65, swell * 0.65, swell * 0.75);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

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
      gl.deleteBuffer(vertices);
      gl.deleteBuffer(elements);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [reducedMotion]);

  return (
    <div className="voice-orb" data-phase={phase} data-still={reducedMotion ? "" : undefined} aria-hidden="true">
      {still ? <span className="voice-orb-still" /> : <canvas ref={canvas} className="voice-orb-canvas" />}
    </div>
  );
}
