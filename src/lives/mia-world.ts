/** A routing puzzle, not an assessment of memory or clinical ability. */
export type Direction = 0 | 1 | 2 | 3;
export type Cue = 'note' | 'say';
export type Phase = 'play' | 'setup' | 'revisit' | 'complete';
export interface Tile { kind: 'bend' | 'line'; turn: number }
export const PATHS = [
  [4, 0, 1, 5, 9, 10, 6, 7],
  [4, 8, 12, 13, 9, 5, 6, 10, 11, 7],
  [4, 5, 1, 2, 6, 10, 9, 13, 14, 15, 11, 7],
];
export const INTENTIONS = ['Tell Sam: Thursday, 3pm.', 'Ask for a quieter table.', 'Send the finished draft.'];
export const THOUGHTS = ['Weekend plans', 'That song again', 'Another project'];
export interface MiaWorld {
  phase: Phase; round: number; seed: number; tiles: Tile[]; turns: number;
  paused: boolean; solved: boolean; trace: number[]; pulses: number;
  parked: number[]; distracted: number | null; shifts: number; shifted: number | null;
  cue: Cue | null; anchor: number | null; savedTurn: number | null; message: string;
}
export type Action =
  | { type: 'rotate'; index: number }
  | { type: 'anchor'; index: number }
  | { type: 'cue'; cue: Cue }
  | { type: 'pause'; value: boolean }
  | { type: 'pulse' | 'park' | 'next' | 'revisit' | 'restart' };
export function ports(tile: Tile): Direction[] {
  return (tile.kind === 'bend' ? [0, 1] : [0, 2]).map(d => ((d + tile.turn) % 4) as Direction);
}
function direction(from: number, to: number): Direction {
  return to === from - 4 ? 0 : to === from + 1 ? 1 : to === from + 4 ? 2 : 3;
}
export function solution(round: number): Tile[] {
  const path = PATHS[round % 3]!;
  return Array.from({ length: 16 }, (_, index) => {
    const slot = path.indexOf(index);
    if (slot < 0) return { kind: index % 3 ? 'bend' : 'line', turn: index % 4 };
    const enter = slot === 0 ? 3 : direction(index, path[slot - 1]!);
    const leave = slot === path.length - 1 ? 1 : direction(index, path[slot + 1]!);
    const kind = Math.abs(enter - leave) === 2 ? 'line' : 'bend';
    for (let turn = 0; turn < 4; turn++) {
      const tile: Tile = { kind, turn };
      if (ports(tile).includes(enter) && ports(tile).includes(leave)) return tile;
    }
    throw new Error('Invalid path');
  });
}
function shuffled(round: number, seed: number): Tile[] {
  return solution(round).map((tile, index) => ({ ...tile, turn: (tile.turn + 1 + (index + seed) % 3) % 4 }));
}
export function createMia(seed = 0): MiaWorld {
  return { phase: 'play', round: 0, seed, tiles: shuffled(0, seed), turns: 0,
    paused: false, solved: false, trace: [], pulses: 0, parked: [], distracted: null,
    shifts: 0, shifted: null, cue: null, anchor: null, savedTurn: null,
    message: 'Turn the pieces. Connect Mia to the message.' };
}
export function follow(tiles: Tile[]): { trace: number[]; connected: boolean } {
  let index = 4;
  let entering: Direction = 3;
  const trace: number[] = [];
  while (!trace.includes(index)) {
    const ends = ports(tiles[index]!);
    if (!ends.includes(entering)) return { trace, connected: false };
    trace.push(index);
    const leave = ends.find(d => d !== entering)!;
    if (index === 7 && leave === 1) return { trace, connected: true };
    if ((leave === 0 && index < 4) || (leave === 2 && index >= 12) ||
      (leave === 3 && index % 4 === 0) || (leave === 1 && index % 4 === 3)) return { trace, connected: false };
    index += [-4, 1, 4, -1][leave]!;
    entering = ((leave + 2) % 4) as Direction;
  }
  return { trace, connected: false };
}
export function miaReducer(s: MiaWorld, a: Action): MiaWorld {
  if (a.type === 'pause') return { ...s, paused: a.value };
  if (s.paused) return s;
  if (a.type === 'restart') return s.phase === 'complete' ? createMia(s.seed + 1) : s;
  if (s.phase === 'setup') {
    if (a.type === 'cue') return { ...s, cue: a.cue, message: a.cue === 'note' ? 'A note carries the next action.' : 'Say the next action before switching.' };
    if (a.type === 'anchor' && s.trace.includes(a.index)) return { ...s, anchor: a.index,
      savedTurn: s.tiles[a.index]!.turn, message: 'This connection stays when the thought shifts.' };
    if (a.type === 'revisit' && s.cue && s.anchor !== null && s.savedTurn !== null) {
      const tiles = shuffled(s.round, s.seed + 1);
      tiles[s.anchor] = { ...tiles[s.anchor]!, turn: s.savedTurn };
      return { ...s, phase: 'revisit', tiles, turns: 0, shifts: 0, shifted: null,
        solved: false, trace: [], distracted: null, message: 'A new interruption. Your cue stays.' };
    }
    return s;
  }
  if (s.phase === 'complete') return s;
  if (a.type === 'next' && s.solved) {
    if (s.round === 2) return { ...s, phase: 'setup', message: 'Give this thought somewhere to return to.' };
    return { ...s, round: s.round + 1, tiles: shuffled(s.round + 1, s.seed), turns: 0,
      shifts: 0, shifted: null, distracted: null, solved: false, trace: [], message: 'A longer thread. One thought at a time.' };
  }
  if (s.solved) return s;
  if (a.type === 'park' && s.distracted !== null) return { ...s,
    parked: [...new Set([...s.parked, s.distracted])], distracted: null,
    message: 'Saved for later. Back to this thought.' };
  if (a.type === 'rotate') {
    if (!Number.isInteger(a.index) || a.index < 0 || a.index > 15 || (s.phase === 'revisit' && a.index === s.anchor)) return s;
    const tiles = s.tiles.map((tile, index) => index === a.index ? { ...tile, turn: tile.turn + 1 } : tile);
    const turns = s.turns + 1;
    const thought = s.phase === 'revisit' ? 3 : s.round;
    if (turns % 5 === 0 && s.shifts < 2 && !s.parked.includes(thought)) {
      const path = PATHS[s.round]!;
      const shifted = path.filter(index => index !== s.anchor && index !== a.index)[s.shifts + 1]!;
      tiles[shifted] = { ...tiles[shifted]!, turn: tiles[shifted]!.turn + 1 };
      return { ...s, tiles, turns, trace: [], shifts: s.shifts + 1, shifted,
        distracted: thought, message: 'Another thought nudged a connection.' };
    }
    return { ...s, tiles, turns, trace: [], shifted: null, message: 'Follow the thread from left to right.' };
  }
  if (a.type === 'pulse') {
    const result = follow(s.tiles);
    return { ...s, trace: result.trace, pulses: s.pulses + 1, solved: result.connected,
      phase: result.connected && s.phase === 'revisit' ? 'complete' : s.phase,
      message: result.connected ? (s.phase === 'revisit' ? 'The cue gave the thought a way back.' : 'The thought made it through.') : 'A loose end. Turn a piece and try again.' };
  }
  return s;
}
