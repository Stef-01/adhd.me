import Link from "next/link";
import { DemoNavigator } from "../demo-navigator";
import { LANDING_COPY as C } from "@/compliance/landing-copy";

export default function PracticesPage() {
  return (
    <div className="min-h-screen bg-white text-stone-900">
      <header className="border-b border-stone-100">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <DemoNavigator />
          <div className="flex items-center gap-6 text-sm text-stone-600">
            <a href="#practice-story" className="hidden hover:text-stone-900 sm:inline">{C.nav.story}</a>
            <a href="#how" className="hidden hover:text-stone-900 sm:inline">{C.nav.product}</a>
            <a href="#measurement" className="hidden hover:text-stone-900 sm:inline">{C.nav.measurement}</a>
            <Link href="/console/signin" className="font-medium text-stone-900 hover:underline">
              {C.nav.cta}
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 sm:py-28">
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">{C.hero.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{C.hero.heading}</h1>
          <p className="mt-5 max-w-2xl text-lg text-stone-600">{C.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-700">
              {C.hero.primaryCta}
            </Link>
            <Link href="/console/signin" className="rounded-lg border border-stone-300 px-6 py-3 font-medium text-stone-800 hover:border-stone-500">
              {C.hero.secondaryCta}
            </Link>
          </div>
        </section>

        <section className="border-t border-stone-100 py-16">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">{C.problem.heading}</h2>
          <p className="mt-4 max-w-2xl text-stone-600">{C.problem.body}</p>
        </section>

        <section id="practice-story" className="border-t border-stone-100 py-20 sm:py-24">
          <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#656e51]">
                {C.practiceStory.eyebrow}
              </p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.02] tracking-[-0.035em] sm:text-6xl">
                {C.practiceStory.heading}
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{C.practiceStory.body}</p>
            </div>

            <div className="rounded-[2rem] bg-stone-950 p-7 text-white sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c9d1b3]">
                {C.practiceStory.goalLabel}
              </p>
              <div className="mt-7 flex items-end gap-3">
                <strong className="font-serif text-7xl font-medium leading-none tracking-[-0.06em] sm:text-8xl">
                  {C.practiceStory.goalValue}
                </strong>
                <span className="pb-2 text-sm text-stone-400">of clinical work</span>
              </div>
              <h3 className="mt-7 text-xl font-medium leading-snug">{C.practiceStory.goalTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-400">{C.practiceStory.goalBody}</p>
            </div>
          </div>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {C.practiceStory.stages.map((stage, index) => (
              <li key={stage.title} className="rounded-2xl border border-stone-200 p-6">
                <span className="text-xs font-semibold text-[#656e51]">0{index + 1}</span>
                <h3 className="mt-8 text-lg font-medium">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{stage.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-10 rounded-[2rem] bg-[#eff1e8] p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#656e51]">
                {C.practiceStory.communityEyebrow}
              </p>
              <h3 className="mt-4 max-w-2xl font-serif text-3xl font-medium leading-tight tracking-[-0.025em] sm:text-4xl">
                {C.practiceStory.communityHeading}
              </h3>
              <p className="mt-5 max-w-2xl leading-7 text-stone-600">{C.practiceStory.communityBody}</p>
            </div>
            <ul className="flex flex-col justify-end gap-3">
              {C.practiceStory.communityPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 border-b border-[#d8dccd] pb-3 text-sm text-stone-700 last:border-0">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#656e51]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-20">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
              {C.practiceStory.evidenceEyebrow}
            </p>
            <div className="mt-4 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <h3 className="font-serif text-3xl font-medium leading-tight tracking-[-0.025em] sm:text-4xl">
                {C.practiceStory.evidenceHeading}
              </h3>
              <p className="leading-7 text-stone-600">{C.practiceStory.evidenceBody}</p>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
              {C.practiceStory.evidence.map((item) => (
                <div key={item.value} className="min-h-52 bg-white p-6 sm:p-7">
                  <strong className="font-serif text-5xl font-medium tracking-[-0.05em]">{item.value}</strong>
                  <p className="mt-8 text-sm leading-6 text-stone-600">{item.label}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-5 text-stone-500">
              {C.practiceStory.evidenceNote}{" "}
              <a className="underline underline-offset-2 hover:text-stone-900" href="https://doi.org/10.1093/fampra/cmu028">
                Gibson-Helm et al.
              </a>{" "}
              and{" "}
              <a className="underline underline-offset-2 hover:text-stone-900" href="https://doi.org/10.1093/humrep/deab101">
                Fernandez et al.
              </a>
            </p>
          </div>

          <div className="mt-12 grid gap-8 rounded-2xl border border-stone-200 p-7 sm:p-9 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {C.practiceStory.pathwayEyebrow}
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">{C.practiceStory.pathwayHeading}</h3>
            </div>
            <div>
              <p className="leading-7 text-stone-600">{C.practiceStory.pathwayBody}</p>
              <p className="mt-4 text-sm font-medium text-stone-800">{C.practiceStory.pathwayNote}</p>
              <p className="mt-4 text-xs leading-5 text-stone-500">
                Current pathways:{" "}
                <a className="underline underline-offset-2 hover:text-stone-900" href="https://www.racgp.org.au/FSDEDEV/media/documents/Faculties/SI/2026-RACGP-Specific-Interests-groups.pdf">
                  RACGP Specific Interests 2026
                </a>{" "}
                and{" "}
                <a className="underline underline-offset-2 hover:text-stone-900" href="https://mycollege.acrrm.org.au/search?clive=acrrm~ds-events-public&collection=acrrm~sp-search-public&query=polycystic%20ovarian%20syndrome">
                  ACRRM learning search
                </a>.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-stone-100 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {C.steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-stone-200 p-6">
                <div className="text-sm font-semibold text-stone-500">{index + 1}</div>
                <h3 className="mt-2 font-medium text-stone-900">{step.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="measurement" className="border-t border-stone-100 py-16">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">{C.measurement.heading}</h2>
          <p className="mt-4 max-w-2xl text-stone-600">{C.measurement.body}</p>
          <ul className="mt-6 flex flex-col gap-2">
            {C.measurement.points.map((point) => (
              <li key={point} className="flex items-start gap-2 text-sm text-stone-700">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-900" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-stone-100 py-16">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight">{C.compliance.heading}</h2>
          <p className="mt-4 max-w-2xl text-stone-600">{C.compliance.body}</p>
        </section>

        <section className="border-t border-stone-100 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">{C.cta.heading}</h2>
          <p className="mt-3 max-w-xl text-stone-600">{C.cta.body}</p>
          <Link href="/demo" className="mt-6 inline-block rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-700">
            {C.cta.button}
          </Link>
        </section>
      </main>

      <footer className="border-t border-stone-100">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-8 text-sm text-stone-500">
          <span>{C.footer.tagline}</span>
          <span>{C.footer.note}</span>
        </div>
      </footer>
    </div>
  );
}
