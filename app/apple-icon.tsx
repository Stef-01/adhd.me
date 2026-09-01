// O220/O222: the 180px iOS home-screen icon — its own route because iOS reads apple-touch-icon
// specifically; the art lives once in brand-mark.tsx.
import { brandMark } from "./brand-mark";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandMark(180);
}
