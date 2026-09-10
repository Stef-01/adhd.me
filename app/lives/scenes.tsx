"use client";

// The Chaos Run's places and pieces (docs/design/games-to-leo-standard.md §3): one drawn scene
// per world, shared by the games that play there, and one drawn piece per thing a person taps.
// Original art in LeoBedroom's simple-shape idiom, every drawing `aria-hidden`: the button that
// wraps a piece carries its name, so a screen reader hears "wasp" where a sighted person sees
// one. Colours come from the world's palette (`--w1` to `--w7` on `.lives-world` in lives.css);
// a piece's own colours are the few it needs to be itself.

import type { ReactElement } from "react";
import { worldOf } from "@/lives";
import { LeoBedroom } from "./leo-mosquito";

const I = "#172033";
const paper = <path d="M16 8h26l8 8v40H16z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" />;
const lines = <path d="M24 30h18M24 38h18M24 46h12" stroke="#8a90a0" strokeWidth="3" strokeLinecap="round" />;
const envelope = <><rect x="8" y="16" width="48" height="32" rx="4" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M8 20l24 16 24-16" stroke={I} strokeWidth="3" fill="none" /></>;
const carton = <path d="M20 20l6-10h12l6 10v30a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" />;

/** Every piece on a 64 by 64 stage. `lives-wing` groups flap under motion. */
const PIECES: Record<string, ReactElement> = {
  wasp: <><g className="lives-wing"><ellipse cx="26" cy="22" rx="8" ry="13" transform="rotate(-30 26 22)" fill="#fff" fillOpacity=".85" stroke={I} strokeWidth="2.5" /></g><g className="lives-wing is-right"><ellipse cx="42" cy="22" rx="8" ry="13" transform="rotate(30 42 22)" fill="#fff" fillOpacity=".85" stroke={I} strokeWidth="2.5" /></g><ellipse cx="36" cy="40" rx="17" ry="11" fill="#f2c14e" stroke={I} strokeWidth="3" /><path d="M27 31v18M35 29v22M43 31v18" stroke={I} strokeWidth="4" /><circle cx="17" cy="38" r="8" fill={I} /><circle cx="15" cy="36" r="2" fill="#fff" /><path d="M53 42l7 3" stroke={I} strokeWidth="3" strokeLinecap="round" /></>,
  bubble: <><circle cx="32" cy="32" r="20" fill="#cfe3fb" fillOpacity=".7" stroke="#6679b9" strokeWidth="3" /><path d="M20 26q3-8 11-10" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" /></>,
  pancake: <><ellipse cx="32" cy="40" rx="24" ry="9" fill="#c8894a" /><ellipse cx="32" cy="34" rx="24" ry="9" fill="#e6b36a" stroke={I} strokeWidth="2.5" /><path d="M22 30q10 6 20 0" fill="#f7de7a" /><rect x="27" y="24" width="10" height="7" rx="2" fill="#f7de7a" /></>,
  draft: <><path d="M10 14h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H26l-10 9v-9h-6a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" fill="#5b8def" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M18 24h28M18 32h20" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" /></>,
  pigeon: <><g className="lives-wing"><path d="M30 34q10-18 26-12-8 8-20 16z" fill="#7d8494" stroke={I} strokeWidth="2.5" strokeLinejoin="round" /></g><ellipse cx="34" cy="40" rx="17" ry="11" fill="#9aa0ad" stroke={I} strokeWidth="3" /><circle cx="17" cy="32" r="8" fill="#7d8494" stroke={I} strokeWidth="3" /><path d="M9 33l-6 2 6 2z" fill="#f2a33a" /><circle cx="15" cy="30" r="1.8" fill="#fff" /><path d="M28 51v6M38 51v6" stroke="#f2a33a" strokeWidth="3" strokeLinecap="round" /></>,
  seagull: <><g className="lives-wing"><path d="M30 34q10-18 26-12-8 8-20 16z" fill="#d7dce6" stroke={I} strokeWidth="2.5" strokeLinejoin="round" /></g><ellipse cx="34" cy="40" rx="17" ry="11" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="17" cy="32" r="8" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M8 33l-6 2 6 2z" fill="#f2c94c" /><circle cx="15" cy="30" r="1.8" fill={I} /><path d="M28 51v6M38 51v6" stroke="#f2a33a" strokeWidth="3" strokeLinecap="round" /></>,
  kayak: <><path d="M6 34q26-14 52 0-26 14-52 0z" fill="#e0616f" stroke={I} strokeWidth="3" /><ellipse cx="32" cy="34" rx="9" ry="4" fill={I} /><path d="M14 20l36 28" stroke="#b98c5e" strokeWidth="4" strokeLinecap="round" /></>,
  lamp: <><path d="M20 12h24l8 22H12z" fill="#f2d38a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><rect x="30" y="34" width="4" height="16" fill={I} /><rect x="18" y="50" width="28" height="5" rx="2" fill={I} /></>,
  cactus: <><rect x="20" y="42" width="24" height="14" rx="3" fill="#c8794a" stroke={I} strokeWidth="3" /><path d="M32 42V14M32 30h-9v-9M32 26h9v-9" stroke="#6f9a63" strokeWidth="9" strokeLinecap="round" fill="none" /></>,
  drone: <><rect x="22" y="28" width="20" height="12" rx="4" fill={I} /><path d="M12 22h16M36 22h16M22 28l-8-6M42 28l8-6" stroke={I} strokeWidth="3" /><circle cx="14" cy="22" r="4" fill="#8a90a0" /><circle cx="50" cy="22" r="4" fill="#8a90a0" /></>,
  waffle: <><rect x="12" y="14" width="40" height="36" rx="6" fill="#e6b36a" stroke={I} strokeWidth="3" /><path d="M12 26h40M12 38h40M24 14v36M40 14v36" stroke="#c8894a" strokeWidth="3" /></>,
  milk: <>{carton}<rect x="20" y="30" width="24" height="9" fill="#5b8def" /></>,
  oat: <>{carton}<rect x="20" y="30" width="24" height="9" fill="#6f9a63" /></>,
  chips: <><path d="M18 30h28l-4 24H22z" fill="#e0616f" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M24 30V14M32 30V10M40 30V14" stroke="#f2d38a" strokeWidth="5" strokeLinecap="round" /></>,
  charger: <><rect x="14" y="26" width="26" height="18" rx="4" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M40 31h8M40 39h8" stroke={I} strokeWidth="3" /><path d="M14 35H8q-4 0-4 6v10" stroke={I} strokeWidth="3" fill="none" /></>,
  banana: <><path d="M14 24q10 26 34 16" stroke="#f2c94c" strokeWidth="10" strokeLinecap="round" fill="none" /><circle cx="47" cy="39" r="4" fill="#6f4a1a" /></>,
  sock: <><path d="M24 10h16v24l10 10a8 8 0 0 1-12 10L26 42V10z" fill="#6679b9" stroke={I} strokeWidth="3" strokeLinejoin="round" /><rect x="24" y="10" width="16" height="8" fill="#fbfbfd" /></>,
  book: <><rect x="16" y="12" width="32" height="40" rx="3" fill="#5065a6" stroke={I} strokeWidth="3" /><rect x="22" y="12" width="4" height="40" fill="#fbfbfd" fillOpacity=".6" /><path d="M30 24h12" stroke="#fbfbfd" strokeWidth="3" /></>,
  chicken: <><ellipse cx="34" cy="40" rx="18" ry="12" fill="#f2c94c" stroke={I} strokeWidth="3" /><circle cx="18" cy="26" r="9" fill="#f2c94c" stroke={I} strokeWidth="3" /><path d="M8 27l-6 2 6 2z" fill="#e0616f" /><path d="M14 17l3-6 3 6 3-6 3 6" fill="#e0616f" /><circle cx="16" cy="24" r="1.8" fill={I} /></>,
  horse: <><rect x="18" y="30" width="30" height="16" rx="6" fill="#a8654a" stroke={I} strokeWidth="3" /><path d="M44 30l6-12 6 4-4 10" fill="#a8654a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M22 46v10M42 46v10" stroke={I} strokeWidth="4" /><path d="M18 34l-6 8" stroke="#6f4a1a" strokeWidth="4" strokeLinecap="round" /></>,
  list: <>{paper}{lines}<path d="M19 28l3 3 5-6" stroke="#6f9a63" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  receipt: <><path d="M16 8h32v46l-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M22 20h20M22 28h20M22 36h12" stroke="#8a90a0" strokeWidth="3" strokeLinecap="round" /><rect x="22" y="42" width="20" height="4" fill={I} /></>,
  leaflet: <><path d="M8 14l16-4v40L8 54zM24 10l16 4v40l-16-4zM40 14l16-4v40l-16 4z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><rect x="28" y="20" width="8" height="10" fill="#e0616f" /></>,
  napkin: <><path d="M32 8l24 24-24 24L8 32z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M32 8v48" stroke="#d7dce6" strokeWidth="2" /></>,
  menu: <>{paper}<path d="M16 8h26v10H16z" fill="#e0616f" />{lines}</>,
  cow: <><ellipse cx="34" cy="38" rx="20" ry="13" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="32" cy="34" r="5" fill={I} /><circle cx="44" cy="42" r="4" fill={I} /><circle cx="14" cy="30" r="9" fill="#fbfbfd" stroke={I} strokeWidth="3" /><ellipse cx="12" cy="34" rx="5" ry="3" fill="#f2a6a6" /><path d="M22 50v6M44 50v6" stroke={I} strokeWidth="4" /></>,
  sheep: <><circle cx="22" cy="34" r="9" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="34" cy="28" r="10" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="44" cy="36" r="9" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="32" cy="42" r="10" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="14" cy="38" r="6" fill={I} /><path d="M24 50v6M40 50v6" stroke={I} strokeWidth="4" /></>,
  burger: <><path d="M12 28a20 12 0 0 1 40 0z" fill="#e6b36a" stroke={I} strokeWidth="3" /><rect x="12" y="28" width="40" height="6" fill="#6f9a63" /><rect x="12" y="34" width="40" height="8" fill="#6f4a1a" /><path d="M12 42h40v6a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#e6b36a" stroke={I} strokeWidth="3" /></>,
  dinosaur: <><path d="M10 44q8-22 30-20l14-8-2 12 4 16H10z" fill="#6f9a63" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M18 24l4-8 4 8 4-8 4 8" fill="#4c7a4a" /><path d="M20 44v10M40 44v10" stroke={I} strokeWidth="4" /><circle cx="48" cy="22" r="1.8" fill={I} /></>,
  spaceship: <><path d="M32 6q14 14 8 40H24Q18 20 32 6z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M24 34l-8 12h8M40 34l8 12h-8" fill="#e0616f" stroke={I} strokeWidth="3" /><circle cx="32" cy="24" r="4" fill="#5b8def" /><path d="M28 46l4 10 4-10" fill="#f2a33a" /></>,
  surfboard: <><path d="M32 4q16 28 0 56Q16 32 32 4z" fill="#4c9aa0" stroke={I} strokeWidth="3" /><path d="M32 12v40" stroke="#fbfbfd" strokeWidth="3" /></>,
  brief: <><path d="M8 18h18l4 5h26v30H8z" fill="#f2c46b" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M8 30h48" stroke={I} strokeWidth="3" /></>,
  report: <>{paper}<path d="M22 46V34M30 46V28M38 46V38M46 46V24" stroke="#5065a6" strokeWidth="4" strokeLinecap="round" /></>,
  slides: <><rect x="8" y="12" width="48" height="34" rx="4" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M8 16a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v4H8z" fill="#5065a6" /><path d="M16 30h24M16 38h16" stroke="#8a90a0" strokeWidth="3" /><path d="M24 52h16" stroke={I} strokeWidth="3" /></>,
  chart: <><path d="M12 50h40M12 50V10" stroke={I} strokeWidth="3" /><path d="M12 44l12-12 10 8 16-22" stroke="#5065a6" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>,
  roadmap: <><path d="M8 44q12-24 24-12t24-12" stroke="#5065a6" strokeWidth="4" fill="none" strokeLinecap="round" /><circle cx="8" cy="44" r="5" fill="#f2c46b" stroke={I} strokeWidth="2.5" /><circle cx="32" cy="32" r="5" fill="#f2c46b" stroke={I} strokeWidth="2.5" /><circle cx="56" cy="20" r="5" fill="#f2c46b" stroke={I} strokeWidth="2.5" /></>,
  agenda: <>{paper}<circle cx="22" cy="30" r="2.5" fill="#5065a6" /><circle cx="22" cy="38" r="2.5" fill="#5065a6" /><circle cx="22" cy="46" r="2.5" fill="#5065a6" /><path d="M28 30h14M28 38h14M28 46h8" stroke="#8a90a0" strokeWidth="3" strokeLinecap="round" /></>,
  article: <>{paper}<path d="M22 24h8M22 30h8M22 36h8M34 24h8M34 30h8M34 36h8" stroke="#8a90a0" strokeWidth="2.5" /></>,
  email: envelope,
  post: <>{envelope}<rect x="44" y="20" width="8" height="8" fill="#e0616f" /></>,
  news: <><rect x="8" y="12" width="48" height="40" rx="3" fill="#fbfbfd" stroke={I} strokeWidth="3" /><rect x="14" y="18" width="36" height="6" fill={I} /><rect x="14" y="28" width="16" height="16" fill="#8a90a0" /><path d="M34 30h16M34 36h16M34 42h16" stroke="#8a90a0" strokeWidth="2.5" /></>,
  shoes: <><path d="M6 40q10-14 22-4l12 4q8 2 8 8H6z" fill="#3b4a63" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M12 40h34" stroke="#fbfbfd" strokeWidth="2" /><path d="M48 44h10v4H48z" fill={I} /></>,
  keys: <><circle cx="20" cy="24" r="10" fill="none" stroke="#d9a441" strokeWidth="5" /><path d="M28 30l20 20M40 42l-4 4M46 48l-4 4" stroke="#d9a441" strokeWidth="5" strokeLinecap="round" /></>,
  phone: <><rect x="20" y="6" width="24" height="52" rx="5" fill={I} /><rect x="24" y="12" width="16" height="36" rx="2" fill="#eef1f6" /><circle cx="32" cy="53" r="2" fill="#8a90a0" /></>,
  door: <><rect x="16" y="6" width="32" height="52" rx="3" fill="#8a6238" stroke={I} strokeWidth="3" /><rect x="22" y="12" width="20" height="18" fill="#5a4029" /><rect x="22" y="34" width="20" height="18" fill="#5a4029" /><circle cx="42" cy="34" r="2.5" fill="#d9a441" /></>,
  laundry: <><path d="M10 26h44l-4 28H14z" fill="#8a90a0" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M14 26q6-10 12-4t10 0 10 4 8 4" fill="#e0616f" stroke={I} strokeWidth="2.5" /><path d="M18 26q8-8 14-2z" fill="#5b8def" /></>,
  plant: <><path d="M22 40h20l-3 16H25z" fill="#c8794a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M32 40V22M32 34q-14-2-14-16 14 0 14 16zM32 30q14-4 16-16-14-2-16 16z" fill="#6f9a63" stroke="#4c7a4a" strokeWidth="2.5" /></>,
  drawer: <><rect x="8" y="14" width="48" height="40" rx="3" fill="#8a6238" stroke={I} strokeWidth="3" /><rect x="14" y="30" width="36" height="16" fill="#5a4029" stroke={I} strokeWidth="3" /><rect x="18" y="26" width="28" height="8" fill="#c8794a" /><rect x="28" y="36" width="8" height="3" fill="#d9a441" /></>,
  vacuum: <><path d="M20 50l20-30" stroke={I} strokeWidth="4" strokeLinecap="round" /><ellipse cx="18" cy="52" rx="14" ry="6" fill="#5b8def" stroke={I} strokeWidth="3" /><rect x="24" y="30" width="20" height="16" rx="6" fill="#e0616f" stroke={I} strokeWidth="3" /></>,
  hi: <><path d="M8 12h48v28H30l-10 10V40H8z" fill="#5b8def" stroke={I} strokeWidth="3" strokeLinejoin="round" /><text x="32" y="33" fontSize="16" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="sans-serif">Hi</text></>,
  research: <><rect x="12" y="38" width="40" height="10" rx="2" fill="#5065a6" stroke={I} strokeWidth="3" /><rect x="16" y="28" width="36" height="10" rx="2" fill="#e0616f" stroke={I} strokeWidth="3" /><rect x="14" y="18" width="34" height="10" rx="2" fill="#4c9aa0" stroke={I} strokeWidth="3" /><circle cx="48" cy="12" r="6" fill="none" stroke={I} strokeWidth="3" /><path d="M52 16l6 6" stroke={I} strokeWidth="3" /></>,
  notes: <><rect x="10" y="14" width="24" height="24" fill="#f2d38a" stroke={I} strokeWidth="2.5" transform="rotate(-8 22 26)" /><rect x="28" y="20" width="24" height="24" fill="#a6d8c8" stroke={I} strokeWidth="2.5" transform="rotate(6 40 32)" /><rect x="18" y="32" width="24" height="24" fill="#f2a6a6" stroke={I} strokeWidth="2.5" /></>,
  bread: <><path d="M10 30a10 10 0 0 1 10-10h24a10 10 0 0 1 10 10v20H10z" fill="#e6b36a" stroke={I} strokeWidth="3" /><path d="M20 28h24" stroke="#c8894a" strokeWidth="3" /></>,
  breadmaker: <><rect x="12" y="18" width="40" height="36" rx="5" fill="#8a90a0" stroke={I} strokeWidth="3" /><rect x="20" y="10" width="24" height="10" rx="3" fill="#e6b36a" stroke={I} strokeWidth="3" /><circle cx="32" cy="40" r="6" fill="#3b4a63" /></>,
  eggs: <><path d="M8 32h48v18H8z" fill="#d7dce6" stroke={I} strokeWidth="3" /><ellipse cx="18" cy="32" rx="7" ry="9" fill="#fbfbfd" stroke={I} strokeWidth="2.5" /><ellipse cx="32" cy="32" rx="7" ry="9" fill="#fbfbfd" stroke={I} strokeWidth="2.5" /><ellipse cx="46" cy="32" rx="7" ry="9" fill="#fbfbfd" stroke={I} strokeWidth="2.5" /></>,
  pizza: <><path d="M8 48a24 24 0 0 1 48 0z" fill="#8a6238" stroke={I} strokeWidth="3" /><path d="M20 48a12 8 0 0 1 24 0z" fill={I} /><path d="M28 46q4-8 8 0z" fill="#f2a33a" /><rect x="6" y="48" width="52" height="8" fill="#5a4029" /></>,
  bagpipes: <><ellipse cx="30" cy="40" rx="16" ry="11" fill="#4c7a4a" stroke={I} strokeWidth="3" /><path d="M22 32l-4-22M30 30l2-24M38 32l6-20M44 44l12 6" stroke="#8a6238" strokeWidth="5" strokeLinecap="round" /></>,
  bus: <><rect x="6" y="16" width="52" height="32" rx="6" fill="#f0b44a" stroke={I} strokeWidth="3" /><path d="M12 22h12v12H12zM28 22h12v12H28zM44 22h8v12h-8z" fill="#cfe0f5" /><circle cx="18" cy="50" r="5" fill={I} /><circle cx="46" cy="50" r="5" fill={I} /></>,
  cyclist: <><circle cx="16" cy="46" r="10" fill="none" stroke={I} strokeWidth="3" /><circle cx="48" cy="46" r="10" fill="none" stroke={I} strokeWidth="3" /><path d="M16 46l14-16h12l6 16M30 30l-6 16" stroke={I} strokeWidth="3" fill="none" /><path d="M30 30l6-14" stroke="#5065a6" strokeWidth="6" strokeLinecap="round" /><circle cx="38" cy="12" r="5" fill="#e0616f" /></>,
  dog: <><rect x="14" y="28" width="30" height="16" rx="8" fill="#a8654a" stroke={I} strokeWidth="3" /><circle cx="46" cy="28" r="9" fill="#a8654a" stroke={I} strokeWidth="3" /><path d="M50 20l4-8-8 4z" fill="#6f4a1a" /><path d="M14 30l-8-8" stroke="#a8654a" strokeWidth="5" strokeLinecap="round" /><path d="M20 44v8M38 44v8" stroke={I} strokeWidth="4" /><circle cx="50" cy="27" r="1.8" fill={I} /></>,
  advert: <><rect x="6" y="10" width="52" height="34" rx="3" fill="#e0616f" stroke={I} strokeWidth="3" /><path d="M14 20l12 6-12 6z" fill="#fbfbfd" /><path d="M32 20h18M32 28h18M32 36h10" stroke="#fbfbfd" strokeWidth="3" /><path d="M26 44v12M38 44v12" stroke={I} strokeWidth="4" /></>,
  roadworks: <><path d="M32 10l18 40H14z" fill="#f0b44a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M22 38h20M26 28h12" stroke="#fbfbfd" strokeWidth="5" /><rect x="8" y="50" width="48" height="6" rx="2" fill={I} /></>,
  thought: <><ellipse cx="34" cy="26" rx="22" ry="15" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="16" cy="46" r="5" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="8" cy="56" r="3" fill="#fbfbfd" stroke={I} strokeWidth="2.5" /></>,
  printer: <><rect x="8" y="26" width="48" height="24" rx="4" fill="#8a90a0" stroke={I} strokeWidth="3" /><rect x="18" y="12" width="28" height="14" fill="#fbfbfd" stroke={I} strokeWidth="3" /><rect x="18" y="42" width="28" height="12" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="48" cy="34" r="2.5" fill="#6f9a63" /></>,
  colleague: <><path d="M32 8c16 0 24 12 24 28S48 62 32 62 8 52 8 36 16 8 32 8z" fill="#6c8cff" stroke={I} strokeWidth="3" /><circle cx="25" cy="30" r="3" fill={I} /><circle cx="39" cy="30" r="3" fill={I} /><path d="M25 42q7 6 14 0" stroke={I} strokeWidth="3" fill="none" /></>,
  pen: <><path d="M12 52l6-18 26-26 12 12-26 26z" fill="#f2c46b" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M18 34l12 12" stroke={I} strokeWidth="3" /><path d="M12 52l5-5" stroke={I} strokeWidth="5" /></>,
  glasses: <><circle cx="18" cy="34" r="11" fill="#cfe3fb" fillOpacity=".5" stroke={I} strokeWidth="3" /><circle cx="46" cy="34" r="11" fill="#cfe3fb" fillOpacity=".5" stroke={I} strokeWidth="3" /><path d="M29 34h6M7 30l-4-4M57 30l4-4" stroke={I} strokeWidth="3" /></>,
  font: <text x="32" y="44" fontSize="34" fontWeight="700" fill={I} textAnchor="middle" fontFamily="Georgia, serif">Aa</text>,
  question: <><ellipse cx="32" cy="28" rx="24" ry="18" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M20 42l-6 12 16-8" fill="#fbfbfd" stroke={I} strokeWidth="3" /><text x="32" y="36" fontSize="24" fontWeight="800" fill="#5065a6" textAnchor="middle" fontFamily="sans-serif">?</text></>,
  flights: <path d="M8 36l20-4 14-20 6 2-8 20 14 8-2 6-16-4-8 12-6-2 2-14-14-2z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" />,
  podcast: <><path d="M12 40v-8a20 20 0 0 1 40 0v8" stroke={I} strokeWidth="4" fill="none" /><rect x="8" y="36" width="12" height="18" rx="4" fill="#5065a6" stroke={I} strokeWidth="3" /><rect x="44" y="36" width="12" height="18" rx="4" fill="#5065a6" stroke={I} strokeWidth="3" /></>,
  clock: <><circle cx="32" cy="32" r="22" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M32 32V16M32 32l10 6" stroke={I} strokeWidth="3.5" strokeLinecap="round" /></>,
  parcel: <><rect x="10" y="18" width="44" height="36" rx="3" fill="#c8a06a" stroke={I} strokeWidth="3" /><path d="M32 18v36M10 36h44" stroke="#8a6238" strokeWidth="4" /></>,
  stamp: <><rect x="12" y="12" width="40" height="40" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeDasharray="4 3" /><rect x="20" y="20" width="24" height="24" fill="#e0616f" /></>,
  duck: <><g className="lives-wing"><path d="M30 34q10-6 18 2-8 6-18 4z" fill="#e6b36a" stroke={I} strokeWidth="2.5" /></g><ellipse cx="34" cy="40" rx="18" ry="11" fill="#f2c94c" stroke={I} strokeWidth="3" /><circle cx="18" cy="28" r="9" fill="#f2c94c" stroke={I} strokeWidth="3" /><path d="M9 29l-7 2 7 3z" fill="#f2a33a" /><circle cx="16" cy="26" r="1.8" fill={I} /></>,
  goose: <><path d="M22 42q-5-14 0-28" stroke={I} strokeWidth="13" strokeLinecap="round" fill="none" /><path d="M22 42q-5-14 0-28" stroke="#fbfbfd" strokeWidth="8" strokeLinecap="round" fill="none" /><ellipse cx="36" cy="42" rx="18" ry="11" fill="#fbfbfd" stroke={I} strokeWidth="3" /><circle cx="22" cy="12" r="7" fill="#fbfbfd" stroke={I} strokeWidth="3" /><path d="M14 13l-8 2 8 3z" fill="#f2a33a" /><circle cx="20" cy="10" r="1.8" fill={I} /><g className="lives-wing"><path d="M32 36q12-6 20 2-8 6-20 4z" fill="#d7dce6" stroke={I} strokeWidth="2.5" /></g></>,
  tray: <><path d="M6 30h52l-6 20H12z" fill="#8a90a0" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M6 30l-2-8h56l-2 8" fill="none" stroke={I} strokeWidth="3" /></>,
  plane: <><path d="M6 30l50-20-14 44-10-16z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M32 38l24-28" stroke={I} strokeWidth="3" /></>,
  spider: <><circle cx="32" cy="36" r="11" fill={I} /><circle cx="32" cy="22" r="7" fill={I} /><path d="M22 30L8 22M22 36H6M22 42l-14 8M42 30l14-8M42 36h16M42 42l14 8" stroke={I} strokeWidth="3" strokeLinecap="round" /><circle cx="29" cy="21" r="2" fill="#fff" /><circle cx="35" cy="21" r="2" fill="#fff" /></>,
  scroll: <><rect x="18" y="4" width="28" height="56" rx="6" fill={I} /><rect x="22" y="10" width="20" height="44" rx="2" fill="#eef1f6" /><rect x="25" y="14" width="14" height="10" rx="2" fill="#5b8def" /><rect x="25" y="28" width="14" height="10" rx="2" fill="#d7dce6" /><rect x="25" y="42" width="14" height="10" rx="2" fill="#d7dce6" /></>,
  lid: <><ellipse cx="32" cy="36" rx="24" ry="8" fill="#8a90a0" stroke={I} strokeWidth="3" /><rect x="26" y="20" width="12" height="12" rx="3" fill="#3b4a63" stroke={I} strokeWidth="3" /></>,
  cloud: <path d="M16 46a10 10 0 0 1 2-20 14 14 0 0 1 27-4 10 10 0 0 1 3 24z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" />,
  thread: <><rect x="16" y="14" width="32" height="36" rx="4" fill="#5065a6" stroke={I} strokeWidth="3" /><rect x="12" y="10" width="40" height="6" rx="2" fill="#8a6238" stroke={I} strokeWidth="2.5" /><rect x="12" y="48" width="40" height="6" rx="2" fill="#8a6238" stroke={I} strokeWidth="2.5" /><path d="M48 30q12 4 10 22" stroke="#5065a6" strokeWidth="3" fill="none" /></>,
  toast: <><path d="M14 26a10 10 0 0 1 10-10h16a10 10 0 0 1 10 10v28H14z" fill="#e6b36a" stroke={I} strokeWidth="3" /><path d="M20 30a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v20H20z" fill="#f2d38a" /></>,
  cord: <><path d="M32 4v34" stroke={I} strokeWidth="3" /><circle cx="32" cy="44" r="8" fill="#f2c46b" stroke={I} strokeWidth="3" /></>,
  towel: <><rect x="10" y="12" width="44" height="6" rx="3" fill="#8a90a0" /><path d="M16 18h32v32q-8 6-16 0t-16 0z" fill="#f2d38a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M16 30h32" stroke="#fbfbfd" strokeWidth="3" /></>,
  bell: <><path d="M20 40V28a12 12 0 0 1 24 0v12l4 6H16z" fill="#f2c46b" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M28 50a4 4 0 0 0 8 0" stroke={I} strokeWidth="3" fill="none" /><circle cx="46" cy="18" r="6" fill="#e0616f" /></>,
  wave: <><path d="M6 32q6-14 12 0t12 0 12 0 12 0" stroke={I} strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M6 44q6-10 12 0t12 0 12 0 12 0" stroke="#5065a6" strokeWidth="3" fill="none" strokeLinecap="round" /></>,
  speech: <><path d="M8 12h48a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H30l-10 10V42H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="#fbfbfd" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M16 24h32M16 32h20" stroke="#8a90a0" strokeWidth="3" strokeLinecap="round" /></>,
  note: <><path d="M12 10h40v34l-10 10H12z" fill="#f2d38a" stroke={I} strokeWidth="3" strokeLinejoin="round" /><path d="M42 54V44h10" fill="none" stroke={I} strokeWidth="3" /><path d="M20 22h24M20 30h18" stroke="#8a90a0" strokeWidth="3" strokeLinecap="round" /></>,
};

/** Which piece a label draws: first keyword wins, so "oat milk" is oats and "shoes and keys" is shoes. */
const KEYS: ReadonlyArray<readonly [string, string]> = [
  ["oat", "oat"], ["milk", "milk"], ["bread maker", "breadmaker"], ["bread", "bread"], ["eggs", "eggs"], ["wasp", "wasp"], ["bubble", "bubble"], ["pancake", "pancake"], ["draft", "draft"],
  ["pigeon", "pigeon"], ["seagull", "seagull"], ["kayak", "kayak"], ["lamp", "lamp"], ["cactus", "cactus"], ["drone", "drone"], ["waffle", "waffle"], ["chips", "chips"], ["charger", "charger"],
  ["banana", "banana"], ["sock", "sock"], ["book", "book"], ["chicken", "chicken"], ["horse", "horse"], ["receipt", "receipt"], ["leaflet", "leaflet"], ["napkin", "napkin"], ["menu", "menu"],
  ["list", "list"], ["cow", "cow"], ["sheep", "sheep"], ["burger", "burger"], ["dinosaur", "dinosaur"], ["spaceship", "spaceship"], ["surfboard", "surfboard"], ["brief", "brief"],
  ["report", "report"], ["slides", "slides"], ["chart", "chart"], ["roadmap", "roadmap"], ["agenda", "agenda"], ["article", "article"], ["news", "news"], ["email", "email"], ["the post", "post"],
  ["shoes", "shoes"], ["keys", "keys"], ["phone", "phone"], ["door", "door"], ["laundry", "laundry"], ["plant", "plant"], ["drawer", "drawer"], ["vacuum", "vacuum"], ["type ‘hi’", "hi"],
  ["research", "research"], ["notes", "notes"], ["pizza", "pizza"], ["bagpipes", "bagpipes"], ["bus", "bus"], ["cyclist", "cyclist"], ["dog", "dog"], ["advert", "advert"], ["roadworks", "roadworks"],
  ["thought", "thought"], ["printer", "printer"], ["colleague", "colleague"], ["rewrite", "pen"], ["reread", "glasses"], ["font", "font"], ["question", "question"], ["flights", "flights"],
  ["podcast", "podcast"], ["arrive", "clock"], ["parcel", "parcel"], ["stamps", "stamp"], ["duck", "duck"], ["goose", "goose"], ["send", "plane"], ["spider", "spider"], ["one more", "scroll"],
  ["notifications", "bell"], ["noise", "wave"], ["toast", "toast"],
];

/** The idle motion a piece has under motion: wings flap, bubbles bob, a pancake turns, a hazard sways, the rest float. */
const IDLE: Record<string, "flap" | "bob" | "spin" | "sway"> = {
  wasp: "flap", pigeon: "flap", seagull: "flap", duck: "flap", goose: "flap", pancake: "spin",
  bubble: "bob", thought: "bob", cloud: "bob", draft: "bob", speech: "bob", question: "bob", hi: "bob",
  bus: "sway", cyclist: "sway", dog: "sway", advert: "sway", roadworks: "sway", printer: "sway", colleague: "sway", kayak: "sway", drone: "sway", lamp: "sway", cactus: "sway", waffle: "sway",
};

export function kindFor(label: string): string | null {
  const key = label.toLowerCase();
  for (const [word, kind] of KEYS) if (key.includes(word)) return kind;
  return null;
}

export const PIECE_KINDS = Object.keys(PIECES);

/** A drawn thing. `kind` names a piece directly; otherwise the label picks one, or the fallback. */
export function Sprite({ label, kind, fallback = "note", className }: { label?: string; kind?: string; fallback?: string; className?: string }) {
  const k = kind ?? (label ? kindFor(label) : null) ?? fallback;
  return <svg viewBox="0 0 64 64" className={`lives-sprite${className ? ` ${className}` : ""}`} data-kind={k} data-idle={IDLE[k] ?? "float"} aria-hidden="true">{PIECES[k] ?? PIECES.note}</svg>;
}

interface SceneState { game: string; stake: number; held: boolean }
const TOAST = ["#f7e3b0", "#e6b36a", "#a8654a", "#3b3b3b"];

/** The places, on the 390 by 560 design box. `stake` is 0 to 1 of whatever the round is about. */
const ART: Record<string, (s: SceneState) => ReactElement> = {
  park: ({ game, stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <path d="M0 250q120-60 240-20t150-10v340H0z" fill="var(--w3)" />
    <rect y="330" width="390" height="230" fill="var(--w2)" />
    <path d="M-20 560q120-120 430-60" stroke="var(--w5)" strokeWidth="26" fill="none" opacity=".55" />
    <rect x="318" y="150" width="18" height="200" fill="var(--w7)" />
    <circle cx="327" cy="140" r="58" fill="var(--w3)" /><circle cx="300" cy="170" r="40" fill="var(--w3)" /><circle cx="355" cy="175" r="38" fill="var(--w3)" />
    <rect x="24" y="380" width="44" height="60" rx="6" fill="var(--w4)" /><rect x="20" y="374" width="52" height="12" rx="4" fill="var(--w7)" />
    <rect x="95" y="418" width="200" height="14" rx="4" fill="var(--w4)" /><rect x="95" y="440" width="200" height="14" rx="4" fill="var(--w4)" /><rect x="95" y="462" width="200" height="14" rx="4" fill="var(--w4)" />
    <rect x="108" y="476" width="12" height="60" fill="var(--w7)" /><rect x="270" y="476" width="12" height="60" fill="var(--w7)" />
    {game === "wasps" && <g transform={`translate(195 440) scale(${1 - stake * 0.6}) translate(-195 -440)`}><rect x="150" y="420" width="90" height="40" rx="6" fill="var(--w6)" /><rect x="160" y="428" width="70" height="8" fill="var(--w7)" opacity=".5" /><circle cx="255" cy="430" r="16" fill="#d9705f" /></g>}
    {game === "bubbles" && <><rect x="52" y="300" width="8" height="90" rx="4" fill="var(--w7)" /><circle cx="56" cy="292" r="16" fill="none" stroke="var(--w5)" strokeWidth="6" /></>}
  </>,
  kitchen: ({ game, stake, held }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="190" width="390" height="190" fill="var(--w2)" />
    <path d="M0 238h390M0 286h390M0 334h390M78 190v190M156 190v190M234 190v190M312 190v190" stroke="var(--w5)" strokeWidth="3" />
    <rect x="30" y="40" width="120" height="120" rx="10" fill="var(--w5)" /><rect x="40" y="50" width="100" height="100" rx="6" fill="#cfe0f5" /><path d="M90 50v100M40 100h100" stroke="var(--w5)" strokeWidth="6" />
    {game === "toast" && <g transform={`translate(0 ${-56 * stake})`}><path d="M150 330a14 14 0 0 1 14-14h62a14 14 0 0 1 14 14v40h-90z" fill={TOAST[Math.min(3, Math.floor(stake * 4))]} stroke="var(--w7)" strokeWidth="3" /></g>}
    <rect y="380" width="390" height="24" fill="var(--w5)" /><rect y="404" width="390" height="156" fill="var(--w3)" />
    <path d="M130 404v156M260 404v156" stroke="var(--w4)" strokeWidth="4" /><rect x="52" y="470" width="26" height="6" rx="3" fill="var(--w6)" /><rect x="182" y="470" width="26" height="6" rx="3" fill="var(--w6)" /><rect x="312" y="470" width="26" height="6" rx="3" fill="var(--w6)" />
    {game === "pancake" && <><rect x="120" y="366" width="150" height="20" rx="6" fill="var(--w7)" /><ellipse cx="195" cy="372" rx="58" ry="14" fill="var(--w7)" /><ellipse cx="195" cy="368" rx="46" ry="9" fill="#4b5160" /><path d="M253 370h50" stroke="var(--w7)" strokeWidth="10" strokeLinecap="round" /><g className="lives-steam" opacity={stake * 0.7}><path d="M170 340q-10-20 0-40M195 335q-10-24 0-48M220 340q-10-20 0-40" stroke="var(--w4)" strokeWidth="6" strokeLinecap="round" fill="none" /></g></>}
    {game === "toast" && <><rect x="130" y="300" width="130" height="86" rx="14" fill="var(--w6)" /><rect x="146" y="306" width="98" height="10" rx="4" fill="var(--w7)" /><rect x="262" y={330 + 20 * stake} width="10" height="26" rx="3" fill="var(--w7)" /></>}
    {game === "rogue_blender" && <><rect x="150" y="330" width="90" height="56" rx="10" fill="var(--w7)" /><g className={`lives-jar${held ? " is-rattling" : ""}`}><path d="M158 200h74l-6 130h-62z" fill="var(--w5)" stroke="var(--w4)" strokeWidth="4" /><path d="M164 300h62" stroke="#e0616f" strokeWidth="14" opacity=".5" /><rect x="152" y="186" width="86" height="18" rx="6" fill="var(--w6)" /></g></>}
    {game === "sneeze" && <><path d="M270 320h60v66h-60z" fill="var(--w5)" stroke="var(--w4)" strokeWidth="3" /><rect x="278" y="340" width="44" height="12" fill="var(--w6)" /><g transform={`translate(195 300) scale(${0.4 + stake})`} opacity=".85"><path d="M-40 20a16 16 0 0 1 4-32 22 22 0 0 1 42-6 16 16 0 0 1 4 38z" fill="var(--w5)" stroke="var(--w4)" strokeWidth="3" /></g></>}
  </>,
  crossing: ({ stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <path d="M0 110V60h50v-20h40v40h40V50h60v30h40V40h50v50h50v-30h60v50z" fill="var(--w4)" opacity=".7" />
    <rect y="86" width="390" height="30" fill="var(--w4)" />
    <rect y="116" width="390" height="384" fill="var(--w2)" />
    {[150, 210, 270, 330, 390, 450].map((y) => <rect key={y} x="30" y={y} width="330" height="26" rx="4" fill="var(--w3)" />)}
    <rect y="500" width="390" height="60" fill="var(--w4)" /><rect y="496" width="390" height="6" fill="var(--w5)" />
    <rect x="20" y="20" width="8" height="70" fill="var(--w7)" /><rect x="12" y="10" width="24" height="44" rx="6" fill="var(--w7)" /><circle cx="24" cy="22" r="6" fill={stake > 0.7 ? "#e0616f" : "var(--w4)"} /><circle cx="24" cy="40" r="6" fill={stake > 0.7 ? "var(--w4)" : "#6f9a63"} />
    <rect x="350" y="30" width="6" height="60" fill="var(--w7)" /><rect x="336" y="24" width="34" height="34" rx="4" fill="var(--w6)" />
  </>,
  meeting: ({ game, stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect x="270" y="40" width="100" height="130" rx="8" fill="var(--w4)" /><rect x="278" y="48" width="84" height="114" rx="4" fill="var(--w6)" />
    <ellipse cx="322" cy="140" rx="26" ry="16" fill="var(--w5)" /><circle cx="300" cy="128" r="12" fill="var(--w5)" /><circle cx="330" cy="136" r="6" fill="var(--w4)" /><ellipse cx="296" cy="133" rx="6" ry="4" fill="#f2a6a6" />
    <path d="M320 48v114M278 105h84" stroke="var(--w4)" strokeWidth="5" />
    <rect x="60" y="40" width="180" height="120" rx="8" fill="var(--w4)" /><rect x="68" y="48" width="164" height="104" rx="4" fill="var(--w5)" /><rect x="80" y="60" width="80" height="10" rx="3" fill="var(--w7)" />
    {[0, 1, 2].map((i) => <rect key={i} x="80" y={82 + i * 18} width={110 - i * 20} height="7" rx="3" fill="var(--w3)" opacity={stake * 3 > i ? 1 : 0.15} />)}
    <rect x="40" y="330" width="60" height="70" rx="12" fill="var(--w3)" /><rect x="290" y="330" width="60" height="70" rx="12" fill="var(--w3)" />
    <path d="M0 400q195-40 390 0v160H0z" fill="var(--w2)" /><path d="M0 400q195-40 390 0" stroke="var(--w7)" strokeWidth="6" fill="none" />
    <rect x="300" y="430" width="30" height="34" rx="6" fill="var(--w5)" /><path d="M330 440a10 10 0 0 1 0 20" stroke="var(--w5)" strokeWidth="6" fill="none" />
    <path d="M60 470h110v-60H60z" fill="var(--w4)" /><rect x="66" y="416" width="98" height="48" fill="var(--w7)" /><rect x="40" y="470" width="150" height="8" rx="3" fill="var(--w4)" />
    {game === "zoe_keyword" && <g transform={`translate(${-140 + stake * 340} 0)`}><path d="M60 220h120a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8H90l-12 12v-12H60a8 8 0 0 1-8-8v-40a8 8 0 0 1 8-8z" fill="var(--w5)" stroke="var(--w4)" strokeWidth="3" /><path d="M72 244h90M72 260h60" stroke="var(--w3)" strokeWidth="6" strokeLinecap="round" /></g>}
  </>,
  phone: ({ game, stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect x="18" y="0" width="354" height="560" rx="28" fill="var(--w2)" />
    <rect x="40" y="16" width="40" height="8" rx="4" fill="var(--w7)" /><rect x="300" y="16" width="50" height="8" rx="4" fill="var(--w7)" />
    <rect x="18" y="36" width="354" height="60" fill="var(--w5)" /><circle cx="60" cy="66" r="18" fill="var(--w3)" /><rect x="90" y="56" width="110" height="10" rx="4" fill="var(--w7)" /><rect x="90" y="72" width="60" height="8" rx="4" fill="var(--w4)" />
    {game === "zoe_dont_send" && <g transform={`translate(0 ${-stake * 60})`}>
      <rect x="40" y="120" width="180" height="40" rx="14" fill="var(--w4)" /><rect x="170" y="176" width="180" height="40" rx="14" fill="var(--w3)" /><rect x="40" y="232" width="140" height="40" rx="14" fill="var(--w4)" /><rect x="130" y="288" width="220" height="40" rx="14" fill="var(--w3)" />
      <rect x="34" y="344" width="322" height="76" rx="14" fill="var(--w5)" stroke="var(--w4)" strokeWidth="3" /><path d="M50 366h200M50 386h150M50 404h120" stroke="var(--w4)" strokeWidth="6" strokeLinecap="round" />
    </g>}
    {game !== "zoe_dont_send" && <><rect x="40" y="120" width="120" height="12" rx="4" fill="var(--w7)" /><path d="M40 150h310M40 240h310M40 330h310" stroke="var(--w4)" strokeWidth="2" /></>}
    <rect x="18" y="430" width="354" height="130" fill="var(--w4)" />
    {[440, 478, 516].map((y, row) => Array.from({ length: 10 - row }, (_, i) => <rect key={`${y}-${i}`} x={30 + row * 17 + i * 34} y={y} width="28" height="30" rx="5" fill="var(--w5)" />))}
  </>,
  hall: ({ stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="400" width="390" height="160" fill="var(--w2)" /><path d="M0 440h390M0 480h390M0 520h390" stroke="var(--w4)" strokeWidth="2" opacity=".5" />
    <rect x="236" y="70" width="134" height="332" rx="4" fill="var(--w3)" /><rect x="252" y="90" width="102" height="120" rx="3" fill="var(--w4)" /><rect x="252" y="230" width="102" height="150" rx="3" fill="var(--w4)" /><circle cx="262" cy="240" r="7" fill="var(--w6)" />
    <rect x="226" y="404" width="154" height="20" rx="4" fill="var(--w4)" />
    <rect x="30" y="120" width="150" height="10" rx="4" fill="var(--w3)" />{[50, 90, 130].map((x) => <circle key={x} cx={x} cy="140" r="5" fill="var(--w6)" />)}<path d="M90 140l-20 110h40z" fill="var(--w7)" />
    <rect x="24" y="290" width="170" height="10" rx="3" fill="var(--w3)" /><path d="M60 290a20 10 0 0 1 40 0z" fill="var(--w5)" />
    <circle cx="190" cy="60" r="34" fill="var(--w5)" stroke="var(--w4)" strokeWidth="5" /><path d="M190 60V38" stroke="var(--w7)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${stake * 300} 190 60)`} /><path d="M190 60l14 8" stroke="var(--w7)" strokeWidth="4" strokeLinecap="round" />
  </>,
  bathroom: ({ stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <path d="M0 60h390M0 120h390M0 180h390M0 240h390M0 300h390M0 360h390M60 0v400M120 0v400M180 0v400M240 0v400M300 0v400M360 0v400" stroke="var(--w2)" strokeWidth="4" />
    <path d="M300 30v30h-40" stroke="var(--w4)" strokeWidth="10" fill="none" strokeLinecap="round" /><path d="M230 60h60l8 20h-76z" fill="var(--w4)" />
    {[240, 256, 272, 288].map((x) => <path key={x} d={`M${x} 88v300`} stroke="var(--w3)" strokeWidth="4" strokeDasharray="14 10" opacity=".8" />)}
    <g opacity={0.15 + stake * 0.8}><ellipse cx="120" cy="200" rx="70" ry="40" fill="var(--w5)" /><ellipse cx="200" cy="140" rx="60" ry="34" fill="var(--w5)" /><ellipse cx="90" cy="300" rx="80" ry="44" fill="var(--w5)" /></g>
    <circle cx="90" cy="80" r="34" fill="var(--w5)" stroke="var(--w4)" strokeWidth="5" /><path d="M90 80V58" stroke="var(--w7)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${stake * 330} 90 80)`} />
    <rect y="400" width="390" height="160" fill="var(--w2)" /><path d="M20 400h350a20 20 0 0 1 20 20v60H0v-60a20 20 0 0 1 20-20z" fill="var(--w5)" /><rect y="480" width="390" height="80" fill="var(--w3)" />
    <rect x="20" y="330" width="90" height="6" rx="3" fill="var(--w4)" /><path d="M30 336h50v50q-12 8-25 0t-25 0z" fill="var(--w6)" />
  </>,
  shop: ({ game, stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    {[80, 170, 260].map((y, row) => <g key={y}><rect x="120" y={y + 40} width="270" height="10" fill="var(--w3)" />{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={130 + i * 44} y={y} width="32" height="40" rx="4" fill={["var(--w4)", "var(--w5)", "var(--w6)", "var(--w7)"][(i + row) % 4]} />)}<rect x={140 + row * 60} y={y + 30} width="24" height="10" rx="2" fill="var(--w6)" /></g>)}
    <rect x="20" y="60" width="90" height="300" rx="8" fill="var(--w4)" /><rect x="28" y="68" width="74" height="284" rx="4" fill="#dbe9f6" /><rect x="96" y="180" width="6" height="40" rx="3" fill="var(--w5)" />{[90, 160, 230].map((y) => <rect key={y} x="40" y={y} width="20" height="40" rx="3" fill="var(--w5)" />)}
    <rect y="380" width="390" height="180" fill="var(--w2)" />
    {game === "jax_checkout" ? <><rect y="400" width="390" height="46" rx="6" fill="var(--w7)" /><rect y="446" width="390" height="30" fill="var(--w4)" /><rect x="290" y="330" width="80" height="70" rx="6" fill="var(--w4)" /><rect x="300" y="300" width="60" height="34" rx="4" fill="var(--w5)" /><rect x="320" y={300 - stake * 120} width="30" height={stake * 120 + 10} fill="var(--w5)" stroke="var(--w4)" strokeWidth="2" /></>
      : <><path d="M110 420h170l-16 70H126z" fill="none" stroke="var(--w7)" strokeWidth="8" strokeLinejoin="round" /><path d="M110 420l-16-40H70" stroke="var(--w7)" strokeWidth="8" fill="none" strokeLinecap="round" /><path d="M120 440h150M116 462h158" stroke="var(--w7)" strokeWidth="4" /><circle cx="140" cy="510" r="10" fill="var(--w7)" /><circle cx="250" cy="510" r="10" fill="var(--w7)" /></>}
  </>,
  desk: ({ game, stake }) => game === "nina_first_line" ? <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="520" width="390" height="40" fill="var(--w2)" />
    <rect x="24" y="20" width="342" height="510" rx="6" fill="var(--w5)" stroke="var(--w4)" strokeWidth="3" />
    {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M44 ${90 + i * 40}h302`} stroke="var(--w4)" strokeWidth="2" opacity=".5" />)}
    <path d="M64 30v490" stroke="#e0616f" strokeWidth="2" opacity=".6" />
    <rect x="70" y="40" width="160" height="12" rx="4" fill="var(--w4)" opacity=".5" />
    <path d={`M70 500h${Math.max(1, stake * 250)}`} stroke="var(--w7)" strokeWidth="6" strokeLinecap="round" />
  </> : <>
    <rect width="390" height="560" fill="var(--w1)" />
    <ellipse cx="330" cy="330" rx="90" ry="70" fill="var(--w6)" opacity=".28" />
    <rect y="380" width="390" height="30" rx="6" fill="var(--w2)" /><rect x="30" y="410" width="16" height="150" fill="var(--w4)" /><rect x="344" y="410" width="16" height="150" fill="var(--w4)" />
    <rect x="100" y="120" width="190" height="140" rx="8" fill="var(--w3)" /><rect x="110" y="130" width="170" height="120" rx="4" fill="var(--w5)" /><rect x="180" y="260" width="30" height="40" fill="var(--w4)" /><rect x="140" y="300" width="110" height="10" rx="4" fill="var(--w4)" />
    <path d={`M126 150h${Math.max(1, stake * 130)}`} stroke="var(--w7)" strokeWidth="6" strokeLinecap="round" /><rect x={128 + stake * 130} y="143" width="3" height="14" fill="var(--w7)" className="lives-cursor" />
    <rect x="110" y="340" width="170" height="30" rx="6" fill="var(--w4)" />
    <rect x="40" y="340" width="34" height="40" rx="6" fill="var(--w5)" /><path d="M74 350a12 12 0 0 1 0 24" stroke="var(--w5)" strokeWidth="6" fill="none" /><path className="lives-steam" d="M50 330q-6-10 0-20M62 330q-6-10 0-20" stroke="var(--w4)" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M330 380v-110" stroke="var(--w4)" strokeWidth="8" /><path d="M290 270h80l-14-40h-52z" fill="var(--w6)" stroke="var(--w7)" strokeWidth="3" />
  </>,
  living: ({ stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="400" width="390" height="160" fill="var(--w5)" /><rect x="30" y="430" width="330" height="110" rx="10" fill="var(--w2)" /><rect x="50" y="450" width="290" height="70" rx="6" fill="none" stroke="var(--w5)" strokeWidth="4" />
    <rect x="40" y="50" width="90" height="70" rx="4" fill="var(--w3)" /><rect x="48" y="58" width="74" height="54" fill="var(--w6)" />
    <rect x="34" y="230" width="152" height="50" rx="10" fill="var(--w3)" /><rect x="20" y="250" width="180" height="90" rx="14" fill="var(--w3)" /><rect x="34" y="280" width="152" height="60" rx="10" fill="var(--w2)" />
    <rect x="228" y="330" width="44" height="60" rx="6" fill="var(--w2)" /><path d="M250 330V260M250 300q-30-6-30-40 30 2 30 40zM250 290q30-10 30-44-30 4-30 44z" fill="var(--w4)" />
    <rect x="290" y="60" width="86" height="330" rx="8" fill="var(--w5)" stroke="var(--w3)" strokeWidth="4" /><rect x="290" y="180" width="86" height="6" fill="var(--w3)" /><rect x="298" y="120" width="6" height="40" rx="3" fill="var(--w7)" />
    <rect x="308" y="80" width="52" height="70" fill="#fbfbfd" stroke="var(--w7)" strokeWidth="2" />{[0, 1, 2, 3].map((i) => <path key={i} d={`M318 ${94 + i * 14}h32`} stroke="var(--w4)" strokeWidth="3" opacity={stake * 4 > i ? 1 : 0.3} />)}
    <rect x="90" y="360" width="200" height="14" rx="4" fill="var(--w3)" /><rect x="104" y="374" width="12" height="60" fill="var(--w3)" /><rect x="264" y="374" width="12" height="60" fill="var(--w3)" />
  </>,
  shed: ({ stake }) => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="430" width="390" height="130" fill="var(--w2)" />
    <path d="M0 60h390M0 140h390M0 220h390M0 300h390M0 380h390" stroke="var(--w7)" strokeWidth="3" opacity=".6" />
    <rect x="20" y="200" width="150" height="10" fill="var(--w3)" /><rect x="20" y="300" width="150" height="10" fill="var(--w3)" />
    <rect x="30" y="160" width="36" height="40" rx="4" fill="var(--w6)" /><rect x="80" y="170" width="30" height="30" rx="4" fill="var(--w4)" /><rect x="120" y="150" width="40" height="50" rx="4" fill="var(--w3)" />
    <rect x="40" y="270" width="60" height="26" rx="8" fill="var(--w4)" /><path d="M100 274l20-8v34l-20-8z" fill="var(--w7)" />
    <path d="M120 283L390 120v330z" fill="var(--w6)" opacity={0.05 + stake * 0.3} />
    <g stroke="var(--w4)" strokeWidth="2" fill="none" opacity=".8"><path d="M390 0L260 130M390 0L300 180M390 0L340 200M390 0L370 210" /><path d="M330 60q30 10 60 0M300 100q40 20 90 0M275 130q50 30 115 0" /></g>
  </>,
  corridor: () => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <path d="M120 90h150l120 470H0z" fill="var(--w2)" />
    {[[40, 120, 60, 110], [290, 120, 60, 110], [10, 250, 80, 150], [300, 250, 80, 150]].map(([x, y, w, h]) => <g key={`${x}-${y}`}><rect x={x} y={y} width={w} height={h} rx="4" fill="var(--w3)" /><circle cx={x! + w! - 12} cy={y! + h! / 2} r="4" fill="var(--w6)" /></g>)}
    <rect x="150" y="30" width="90" height="60" rx="4" fill="var(--w3)" /><rect x="160" y="10" width="70" height="16" rx="3" fill="var(--w6)" />
    <ellipse cx="195" cy="520" rx="46" ry="14" fill="var(--w4)" /><circle cx="160" cy="530" r="6" fill="var(--w7)" /><circle cx="230" cy="530" r="6" fill="var(--w7)" /><circle cx="195" cy="536" r="6" fill="var(--w7)" />
  </>,
  pond: () => <>
    <rect width="390" height="560" fill="var(--w1)" />
    <rect y="220" width="390" height="40" fill="var(--w4)" />
    <rect y="256" width="390" height="304" fill="var(--w2)" />
    <g className="lives-ripples" stroke="var(--w3)" strokeWidth="4" fill="none" strokeLinecap="round"><path d="M40 320q20-8 40 0t40 0" /><path d="M250 360q20-8 40 0t40 0" /><path d="M90 440q20-8 40 0t40 0" /></g>
    <g stroke="var(--w4)" strokeWidth="6" strokeLinecap="round"><path d="M30 300V180M50 310V200M350 300V190M370 310V210" /></g><ellipse cx="30" cy="180" rx="6" ry="16" fill="var(--w6)" /><ellipse cx="370" cy="210" rx="6" ry="16" fill="var(--w6)" />
    <rect x="120" y="400" width="150" height="160" fill="var(--w6)" /><path d="M120 430h150M120 460h150M120 490h150M120 520h150" stroke="var(--w7)" strokeWidth="3" opacity=".5" /><rect x="126" y="380" width="12" height="40" fill="var(--w7)" /><rect x="252" y="380" width="12" height="40" fill="var(--w7)" />
  </>,
};

/** The place a game happens in, behind its pieces. Leo's room is drawn once, in leo-mosquito.tsx. */
export function SceneArt({ game, stake = 0, held = false, moving = false, outcome }: { game: string; stake?: number; held?: boolean; moving?: boolean; outcome?: "success" | "failure" | "timeout" }) {
  const world = worldOf(game);
  if (world === "bedroom") {
    return <div className="lives-scene-art is-bedroom" aria-hidden="true">
      <LeoBedroom asleep={outcome === "success"} moving={moving} regulation={100 - stake * 70} />
      {game === "leo_lights_out" && <span className="lives-night" style={{ opacity: stake * 0.55 }} />}
      {game === "leo_one_more" && <svg className="lives-scene-overlay" viewBox="0 0 390 560" preserveAspectRatio="xMidYMax meet"><ellipse className="lives-glow" cx="270" cy="430" rx="60" ry="36" fill="#dfe9ff" opacity={0.35 + stake * 0.4} /><rect x="252" y="412" width="36" height="52" rx="6" fill="#363c73" /><rect x="256" y="418" width="28" height="40" rx="2" fill="#eef1fb" /></svg>}
    </div>;
  }
  return <svg className="lives-scene-art" viewBox="0 0 390 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">{ART[world]!({ game, stake, held })}</svg>;
}
