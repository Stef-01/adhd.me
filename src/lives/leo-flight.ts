import { positionAt, SCENE, type Entity, type Point } from "./layout";

/** Flight stays above the bed and leaves room for a 74px hit area at 320px viewport width. */
export function leoFlightAt(entity: Entity, seconds: number, still: boolean): Point {
  const point = still ? entity : positionAt(entity, seconds);
  return { x: 48 + point.x / SCENE.width * (SCENE.width - 96), y: 90 + point.y / SCENE.height * 200 };
}
