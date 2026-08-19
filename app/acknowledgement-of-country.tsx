// An Acknowledgement of Country, rendered once and shared by every footer so the wording is
// identical everywhere — a statement that reads differently on two pages of the same site reads as
// boilerplate rather than as respect. This is an Acknowledgement (which anyone may make), not a
// Welcome to Country (which is given by Traditional Owners), and it is worded to say so.
//
// THE ARTWORK IS DELIBERATELY A LANDSCAPE, NOT INDIGENOUS ICONOGRAPHY. Dot-work, concentric
// meeting-place circles and the like belong to Aboriginal and Torres Strait Islander artists and
// are not ours to imitate as decoration — doing so would be the opposite of the respect this band
// is meant to carry. What closes the band is an abstract earth-toned horizon: land under a warm
// sky, evoking Country without borrowing a style. The sky is the band's own background, so the
// strip scales with the page and the words never collide with the hills.
export function AcknowledgementOfCountry() {
  return (
    <section className="aoc-band" aria-label="Acknowledgement of Country">
      <p className="aoc-text">
        ADHD.ME acknowledges the Traditional Owners of Country throughout Australia, and the many
        First Nations whose lands and waters we live and work among. We pay our respects to
        Aboriginal and Torres Strait Islander peoples and cultures, and to their Elders past,
        present and emerging.
      </p>
      <svg className="aoc-art" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="aoc-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f4b45a" />
            <stop offset="1" stopColor="#f0c98f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="1140" cy="74" r="60" fill="url(#aoc-sun)" />
        <path d="M0,64 C300,44 600,76 900,58 C1150,44 1320,66 1440,60 L1440,120 L0,120 Z" fill="#d59152" />
        <path d="M0,86 C320,64 580,96 880,74 C1120,56 1320,84 1440,76 L1440,120 L0,120 Z" fill="#b0632c" />
        <path d="M0,104 C280,92 560,110 860,98 C1140,88 1300,106 1440,100 L1440,120 L0,120 Z" fill="#6d3f1f" />
      </svg>
    </section>
  );
}
