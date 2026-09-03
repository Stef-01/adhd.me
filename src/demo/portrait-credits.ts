// O242 (founder-directed): the example profiles' portraits — stock photographs, credited.
//
// THE LINE THIS HOLDS. `synthetic-roster.ts` used to forbid an image on every example persona:
// "a generated face IS a fabricated person presented as genuine". That law was about GENERATED
// faces — a synthesised person nobody can trace, presented as a doctor. A stock photograph is
// the opposite: a real person who licensed their likeness for exactly this use, from a source
// anybody can check, credited by name. The founder asked for portraits on the example profiles
// (2026-09-02: "add in dr profile photos with unsplash and pexels"), and this register is what
// keeps the request inside the roster's honesty: every example image must be listed here with
// its source, its photographer and its licence, the file must exist under `public/portraits/`,
// and a REAL clinician may never carry one of these — their `image` is still only a portrait they
// supplied (the real-person law in `real-person-fields.ts`). `synthetic-roster.test.ts` enforces
// all three directions.
//
// SELF-HOSTED, DELIBERATELY. The files are downloaded once and served from this origin, so no
// visit fetches anything from Unsplash or Pexels: the CSP stays closed to image hosts other than
// the map tiles, and nobody's browsing reaches a stock library. Both licences permit this.
//
// TWO PERSONAS KEEP THE MONOGRAM. Ash Coleman and Jordan Reyes are non-binary; a stock library
// cannot tell us how a person in a photograph identifies, and guessing would put words in a
// stranger's mouth. Their tiles stay the drawn monogram, which was never a claim about anybody.

export type PortraitSource = "unsplash" | "pexels";

export interface PortraitCredit {
  /** The persona this portrait is used for. */
  readonly clinicianId: string;
  /** The self-hosted path the roster carries. */
  readonly image: string;
  readonly source: PortraitSource;
  /** The photographer, as the source names them. */
  readonly photographer: string;
  /** The photo's page at the source, so the licence can be checked. */
  readonly page: string;
  /** The licence the source publishes the photo under. */
  readonly licence: "Unsplash License" | "Pexels License";
}

export const PORTRAIT_CREDITS: readonly PortraitCredit[] = [
  { clinicianId: "example-mei-chao", image: "/portraits/example-mei-chao.jpg", source: "pexels", photographer: "Daniil Kondrashin", page: "https://www.pexels.com/photo/32254667/", licence: "Pexels License" },
  { clinicianId: "example-tomas-rivera", image: "/portraits/example-tomas-rivera.jpg", source: "pexels", photographer: "Daniil Kondrashin", page: "https://www.pexels.com/photo/32160037/", licence: "Pexels License" },
  { clinicianId: "example-priya-nair", image: "/portraits/example-priya-nair.jpg", source: "unsplash", photographer: "Siednji Leon", page: "https://unsplash.com/photos/5o3-brQ0cy8", licence: "Unsplash License" },
  { clinicianId: "example-owen-hartley", image: "/portraits/example-owen-hartley.jpg", source: "unsplash", photographer: "LinkedIn Sales Solutions", page: "https://unsplash.com/photos/pAtA8xe_iVM", licence: "Unsplash License" },
  { clinicianId: "example-sarah-whitfield", image: "/portraits/example-sarah-whitfield.jpg", source: "pexels", photographer: "Antoni Shkraba", page: "https://www.pexels.com/photo/5215009/", licence: "Pexels License" },
  { clinicianId: "example-daniel-okafor", image: "/portraits/example-daniel-okafor.jpg", source: "unsplash", photographer: "Bruno Rodrigues", page: "https://unsplash.com/photos/279xIHymPYY", licence: "Unsplash License" },
  { clinicianId: "example-hana-yoshida", image: "/portraits/example-hana-yoshida.jpg", source: "pexels", photographer: "Sóc Năng Động", page: "https://www.pexels.com/photo/36619715/", licence: "Pexels License" },
  { clinicianId: "example-leila-haddad", image: "/portraits/example-leila-haddad.jpg", source: "unsplash", photographer: "Ocho Artex Media", page: "https://unsplash.com/photos/rm7rZYdl3rY", licence: "Unsplash License" },
  { clinicianId: "example-gurpreet-singh", image: "/portraits/example-gurpreet-singh.jpg", source: "pexels", photographer: "sagar tiwari", page: "https://www.pexels.com/photo/27298085/", licence: "Pexels License" },
  { clinicianId: "example-annika-larsen", image: "/portraits/example-annika-larsen.jpg", source: "unsplash", photographer: "Humberto Chávez", page: "https://unsplash.com/photos/FVh_yqLR9eA", licence: "Unsplash License" },
  { clinicianId: "example-rohan-pillai", image: "/portraits/example-rohan-pillai.jpg", source: "unsplash", photographer: "Usman Yousaf", page: "https://unsplash.com/photos/SakqLf78KVo", licence: "Unsplash License" },
  { clinicianId: "example-chloe-bennett", image: "/portraits/example-chloe-bennett.jpg", source: "unsplash", photographer: "Bermix Studio", page: "https://unsplash.com/photos/ODM_VsTM2QQ", licence: "Unsplash License" },
  { clinicianId: "example-minh-tran", image: "/portraits/example-minh-tran.jpg", source: "unsplash", photographer: "Dalton Ngangi", page: "https://unsplash.com/photos/ZCztndOWdjs", licence: "Unsplash License" },
  { clinicianId: "example-isla-mcgregor", image: "/portraits/example-isla-mcgregor.jpg", source: "pexels", photographer: "Tima Miroshnichenko", page: "https://www.pexels.com/photo/5407222/", licence: "Pexels License" },
  { clinicianId: "example-amara-obi", image: "/portraits/example-amara-obi.jpg", source: "pexels", photographer: "Tessy Agbonome", page: "https://www.pexels.com/photo/19963124/", licence: "Pexels License" },
  { clinicianId: "example-felix-braun", image: "/portraits/example-felix-braun.jpg", source: "unsplash", photographer: "vaibhav vivian", page: "https://unsplash.com/photos/3HIroMoyre8", licence: "Unsplash License" },
  { clinicianId: "example-sana-qureshi", image: "/portraits/example-sana-qureshi.jpg", source: "unsplash", photographer: "Siednji Leon", page: "https://unsplash.com/photos/xxP2IgMPMUQ", licence: "Unsplash License" },
  { clinicianId: "example-ewan-blake", image: "/portraits/example-ewan-blake.jpg", source: "unsplash", photographer: "Muhammad Hicham", page: "https://unsplash.com/photos/AZDVF4fEcY4", licence: "Unsplash License" },
];

/** Personas that deliberately keep the monogram, each with the reason. */
export const MONOGRAM_PERSONAS: ReadonlyArray<{ readonly clinicianId: string; readonly why: string }> = [
  { clinicianId: "example-ash-coleman", why: "Non-binary persona: a stock library cannot say how the person photographed identifies, and guessing would speak for a stranger." },
  { clinicianId: "example-jordan-reyes", why: "Non-binary persona: as above." },
];

export function portraitFor(clinicianId: string): string | null {
  return PORTRAIT_CREDITS.find((c) => c.clinicianId === clinicianId)?.image ?? null;
}
