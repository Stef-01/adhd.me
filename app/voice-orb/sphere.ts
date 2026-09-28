// Vendored from Javi0108/VoiceChatGpt-Prototype (MIT, Copyright (c) 2025 Javier García Domínguez):
// src/components/Sphere, the prototype's voice visualizer, a sphere whose surface flows with 4D
// simplex noise under a domain warp and swells with the voice. Its simplex noise is Ian McEwan's,
// Ashima Arts (MIT). See ./LICENSE.
//
// Ported from three.js (CustomShaderMaterial over MeshPhysicalMaterial, one directional light) to
// plain WebGL2, so the app draws it without three.js:
//   - the wobble, its warp and the normal rebuilt from two displaced neighbours are the prototype's
//     vertex shader line for line; the neighbours' tangent frame is built in the shader rather than
//     from a tangent attribute, which any frame on the surface gives the same normal from;
//   - the colour is the prototype's fragment shader (deep blue to cyan by how far a point is pushed
//     out, rougher where it is pulled in), lit the way three.js lights it: one white light at
//     intensity 5 from the viewer, Lambert diffuse and GGX specular at an index of 1.5, ACES
//     filmic tone mapping and sRGB out;
//   - the mesh is a cube-sphere rather than a subdivided icosahedron: the same surface to the
//     noise, and indexable in 16 bits.

/** Ian McEwan's 4D simplex noise (Ashima Arts, MIT), as the prototype includes it. */
const SIMPLEX_4D = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;
  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;
  return p;
}

float simplexNoise4d(vec4 v){
  const vec2  C = vec2( 0.138196601125010504, 0.309016994374947451);
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;
  i = mod(i, 289.0);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}`;

export const SPHERE_VERTEX = /* glsl */ `#version 300 es
precision highp float;

in vec3 aPosition; // a point on the unit sphere, which is also its normal

uniform mat4 uProjection;
uniform mat4 uView;
uniform vec3 uScale;
uniform float uRadius;
uniform float uTime;
uniform float uPositionFrequency;
uniform float uTimeFrequency;
uniform float uStrength;
uniform float uWarpPositionFrequency;
uniform float uWarpTimeFrequency;
uniform float uWarpStrength;

out float vWobble;
out vec3 vNormal;
out vec3 vViewPosition;
${SIMPLEX_4D}

float getWobble(vec3 position) {
  vec3 warpedPosition = position;
  warpedPosition += simplexNoise4d(vec4(
    position * uWarpPositionFrequency,
    uTime * uWarpTimeFrequency
  )) * uWarpStrength;

  return simplexNoise4d(vec4(
    warpedPosition * uPositionFrequency,
    uTime * uTimeFrequency
  )) * uStrength;
}

void main() {
  vec3 normal = normalize(aPosition);
  vec3 position = normal * uRadius;
  vec3 helper = abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(helper, normal));
  vec3 biTangent = cross(normal, tangent);

  // Neighbours positions
  float shift = 0.01;
  vec3 positionA = position + tangent * shift;
  vec3 positionB = position + biTangent * shift;

  // Wobble
  float wobble = getWobble(position);
  position += wobble * normal;
  positionA += getWobble(positionA) * normal;
  positionB += getWobble(positionB) * normal;

  // Compute normal, outward
  vec3 toA = normalize(positionA - position);
  vec3 toB = normalize(positionB - position);
  vec3 objectNormal = cross(toA, toB);
  if (dot(objectNormal, normal) < 0.0) objectNormal = -objectNormal;

  // Varyings
  vWobble = wobble / uStrength;
  vec4 viewPosition = uView * vec4(position * uScale, 1.0);
  vViewPosition = viewPosition.xyz;
  vNormal = normalize(mat3(uView) * normalize(objectNormal / uScale));
  gl_Position = uProjection * viewPosition;
}`;

export const SPHERE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uLightDirection;
uniform float uLightIntensity;

in float vWobble;
in vec3 vNormal;
in vec3 vViewPosition;
out vec4 fragColor;

const float RECIPROCAL_PI = 0.3183098861837907;

vec3 F_Schlick(vec3 f0, float f90, float dotVH) {
  float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
  return f0 * (1.0 - fresnel) + f90 * fresnel;
}
float V_GGX_SmithCorrelated(float alpha, float dotNL, float dotNV) {
  float a2 = alpha * alpha;
  float ggxV = dotNL * sqrt(a2 + (1.0 - a2) * dotNV * dotNV);
  float ggxL = dotNV * sqrt(a2 + (1.0 - a2) * dotNL * dotNL);
  return 0.5 / max(ggxV + ggxL, 1e-6);
}
float D_GGX(float alpha, float dotNH) {
  float a2 = alpha * alpha;
  float denom = dotNH * dotNH * (a2 - 1.0) + 1.0;
  return RECIPROCAL_PI * a2 / (denom * denom);
}
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 ACESFilmic(vec3 color) {
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color /= 0.6;
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, step(vec3(0.0031308), c));
}

void main() {
  // The prototype's colour: deep where the surface is pulled in, bright and glossy where it is pushed out.
  float colorMix1 = smoothstep(-0.75, 1.0, vWobble);
  vec3 color = mix(uColorA, uColorB, colorMix1);
  float roughness = 1.0 - colorMix1;

  // MeshPhysicalMaterial's direct light: metalness 0, ior 1.5, roughness widened as three.js does.
  // One change: roughness never falls below 0.3, where the prototype's 0.05 lit the smoothest crest
  // as a pinpoint of white that read, at the orb's size, as a dead pixel rather than a sheen.
  vec3 n = normalize(vNormal);
  vec3 dxy = max(abs(dFdx(n)), abs(dFdy(n)));
  roughness = min(max(roughness, 0.3) + max(max(dxy.x, dxy.y), dxy.z), 1.0);
  float alpha = roughness * roughness;
  vec3 v = normalize(-vViewPosition);
  vec3 l = normalize(uLightDirection);
  vec3 h = normalize(l + v);
  float dotNL = clamp(dot(n, l), 0.0, 1.0);
  float dotNV = clamp(dot(n, v), 0.0, 1.0);
  float dotNH = clamp(dot(n, h), 0.0, 1.0);
  float dotVH = clamp(dot(v, h), 0.0, 1.0);
  vec3 irradiance = vec3(dotNL * uLightIntensity);
  vec3 diffuse = irradiance * RECIPROCAL_PI * color;
  vec3 specular = irradiance * F_Schlick(vec3(0.04), 1.0, dotVH) * V_GGX_SmithCorrelated(alpha, dotNL, dotNV) * D_GGX(alpha, dotNH);

  fragColor = vec4(toSRGB(ACESFilmic(diffuse + specular)), 1.0);
}`;

/**
 * A unit sphere as six gridded cube faces pushed out to the sphere, `segments` cells a side,
 * wound counter-clockwise from outside. 6 × (segments + 1)² points; fits 16-bit indices to 103.
 */
export function cubeSphere(segments: number): { positions: Float32Array; indices: Uint16Array } {
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 0, 0], [0, 0, -1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
  ];
  const side = segments + 1;
  const positions = new Float32Array(faces.length * side * side * 3);
  const indices = new Uint16Array(faces.length * segments * segments * 6);
  let p = 0;
  let k = 0;
  faces.forEach(([n, u, v], f) => {
    const base = f * side * side;
    for (let j = 0; j < side; j += 1) {
      for (let i = 0; i < side; i += 1) {
        const a = (2 * i) / segments - 1;
        const b = (2 * j) / segments - 1;
        const x = n[0]! + u[0]! * a + v[0]! * b;
        const y = n[1]! + u[1]! * a + v[1]! * b;
        const z = n[2]! + u[2]! * a + v[2]! * b;
        const length = Math.hypot(x, y, z);
        positions[p++] = x / length;
        positions[p++] = y / length;
        positions[p++] = z / length;
      }
    }
    // u × v points along n for every face above, so (a, b, c) = (i, i + 1, i + side) turns counter-clockwise outside.
    for (let j = 0; j < segments; j += 1) {
      for (let i = 0; i < segments; i += 1) {
        const at = base + j * side + i;
        indices[k++] = at;
        indices[k++] = at + 1;
        indices[k++] = at + side;
        indices[k++] = at + 1;
        indices[k++] = at + side + 1;
        indices[k++] = at + side;
      }
    }
  });
  return { positions, indices };
}

/** A perspective projection and a camera `distance` back along z, column-major for WebGL. */
export function cameraMatrices(fovDegrees: number, distance: number): { projection: Float32Array; view: Float32Array } {
  const near = 0.1;
  const far = 100;
  const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
  const projection = new Float32Array([f, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
  const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -distance, 1]);
  return { projection, view };
}
