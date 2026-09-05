import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { KanjiMark, VerticalCaption } from "@/components/ui/KanjiMark";
import { KatakanaRain } from "@/components/ui/KatakanaRain";
import { Reveal } from "@/components/ui/Reveal";

const PILLARS = [
  {
    glyph: "検",
    title: "Verified presence",
    body: "Rotating, signed QR tokens plus GPS-accuracy-aware geofencing — not a static code and a naive radius check.",
  },
  {
    glyph: "生",
    title: "Live, not eventually",
    body: "Socket-based dashboards update the moment someone checks in — attendee count, rate, and timeline redraw instantly.",
  },
  {
    glyph: "知",
    title: "Grounded intelligence",
    body: "Exact statistics computed deterministically; AI is used only to interpret and explain them — never to guess numbers.",
  },
  {
    glyph: "組",
    title: "Built for organizations",
    body: "Multi-tenant from day one — organizations, roles, and events, with backend-enforced authorization throughout.",
  },
];

const STEPS = [
  "Organizer publishes an event with a geofenced venue and rotating QR.",
  "Attendee scans, shares location, and gets an honest distance readout.",
  "Backend verifies token + geofence + timing, records attendance once.",
  "Dashboard updates live — count, rate, and arrival timeline redraw instantly.",
  "AI layer explains anomalies and answers questions grounded in exact data.",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <NavBar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid opacity-40" />
        <KatakanaRain columns={18} className="opacity-90" />
        <div className="scan-beam" />
        <div
          aria-hidden
          className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-shu-500/[0.09] blur-[140px]"
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start px-6 py-28 md:py-36">
          <KanjiMark glyph="気配" className="absolute -right-6 top-4 text-[13rem] md:text-[19rem]" />
          <VerticalCaption text="出席・検証・洞察" className="absolute right-8 top-16 hidden lg:block" />

          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-shu-500/30 bg-shu-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-shu-400">
            <span className="h-1.5 w-1.5 rounded-full bg-shu-400 animate-pulseGlow" />
            Attendance & event intelligence platform
          </span>

          <h1 className="max-w-3xl font-display text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl">
            Presence you can <span className="text-glow text-shu-400">verify</span>.
            <br />
            Insight you can <span className="text-glow-cyan text-kehai-400">trust</span>.
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/65 md:text-xl">
            Kehai Engine turns QR check-ins into geospatially verified attendance records, real-time
            organizer dashboards, and AI-grounded event analytics — for university clubs, hackathons,
            conferences, and companies that outgrew spreadsheets.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Start an organization</Button>
            </Link>
            <Link href="/events">
              <Button size="lg" variant="secondary">
                Browse live events
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid w-full grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat value="±5m" label="geofence precision floor" />
            <Stat value="20s" label="default QR rotation" />
            <Stat value="4" label="layers of intelligence" />
            <Stat value="0" label="fabricated metrics" />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 py-28 md:py-36">
        <Reveal className="mb-16 max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-shu-400">Not an attendance form</span>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            Every layer is built to be genuinely correct.
          </h2>
          <p className="mt-4 text-lg text-white/60">Not merely demo-shaped — check-in, dashboard, analytics, AI.</p>
        </Reveal>

        <div className="divide-y divide-white/[0.06]">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 80}>
              <div className="group grid gap-4 py-10 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
                <span className="font-display text-6xl font-black leading-none text-white/[0.08] transition-colors group-hover:text-shu-500/20 sm:text-7xl">
                  {p.glyph}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-white sm:text-2xl">{p.title}</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-white/60">{p.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative bg-void-900/40 py-28 md:py-36">
        <KanjiMark glyph="信" accent="kehai" className="absolute -left-10 bottom-0 text-[16rem]" />
        <div className="relative mx-auto max-w-5xl px-6">
          <Reveal className="mb-16 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-kehai-400">The flow</span>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white md:text-5xl">
              Raw check-ins become decisions.
            </h2>
            <p className="mt-4 text-lg text-white/60">
              Attendance → information → insight → recommendation → action.
            </p>
          </Reveal>

          <ol className="relative">
            <div aria-hidden className="absolute bottom-8 left-[27px] top-8 w-px bg-white/10 sm:left-[35px]" />
            {STEPS.map((step, i) => (
              <Reveal key={step} delayMs={i * 90}>
                <li className="relative flex items-start gap-6 py-6 sm:gap-9">
                  <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-void-950 font-display text-2xl font-black text-white/25 sm:h-[70px] sm:w-[70px] sm:text-3xl">
                    {i + 1}
                  </span>
                  <span className="mt-3 text-lg leading-relaxed text-white/75 sm:mt-5 sm:text-xl">{step}</span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-white md:text-4xl">{value}</div>
      <div className="mt-1.5 text-xs uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
