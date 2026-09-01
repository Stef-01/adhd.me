// O220/O222: the 512px app icon — one size declaration; the art lives once in brand-mark.tsx.
import { brandMark } from "./brand-mark";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return brandMark(512);
}
