import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { KanjiMark, VerticalCaption } from "@/components/ui/KanjiMark";
import { KatakanaRain } from "@/components/ui/KatakanaRain";
import { CircuitDivider } from "@/components/ui/CircuitDivider";
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

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <NavBar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid bg-grid opacity-40" />
        <KatakanaRain columns={18} className="opacity-90" />
        <div className="scan-beam" />

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

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55 md:text-lg">
            Kehai Engine turns QR check-ins into geospatially verified attendance records, real-time
            organizer dashboards, and AI-grounded event analytics — for university clubs, hackathons,
            conferences, and companies that outgrew spreadsheets.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Start an organization</Button>
            </Link>
            <Link href="/events">
              <Button size="lg" variant="secondary">
                Browse live events
              </Button>
            </Link>
          </div>

          <div className="relative mt-16 w-full pt-8">
            <CircuitDivider className="absolute inset-x-0 top-0" />
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Stat value="±5m" label="geofence precision floor" />
              <Stat value="20s" label="default QR rotation" />
              <Stat value="4" label="layers of intelligence" />
              <Stat value="0" label="fabricated metrics" />
            </div>
          </div>
        </div>
      </section>

      <CircuitDivider />

      <section className="relative mx-auto max-w-7xl px-6 py-24">
        <KanjiMark glyph="信" accent="kehai" className="absolute -left-10 bottom-0 text-[16rem]" />
        <Reveal className="relative mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-white">Not just an attendance form</h2>
          <p className="mt-3 text-white/50">
            Every layer — check-in, dashboard, analytics, AI — is built to be genuinely correct, not merely
            demo-shaped.
          </p>
        </Reveal>

        <div className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delayMs={i * 90}>
              <Card className="group relative h-full overflow-hidden transition-colors hover:border-shu-500/30">
                <CardBody>
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 font-display text-lg font-bold text-white/70 group-hover:text-shu-400">
                    {p.glyph}
                  </span>
                  <h3 className="font-display text-sm font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/45">{p.body}</p>
                </CardBody>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <CircuitDivider />

      <section className="relative bg-void-900/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-widest text-kehai-400">The flow</span>
              <h2 className="mt-2 font-display text-3xl font-bold text-white">
                Raw check-ins become decisions
              </h2>
              <p className="mt-3 text-white/50">
                Attendance → information → insight → recommendation → action. Analytics are computed
                exactly; AI explains what changed and what to do next.
              </p>
            </Reveal>
            <ol className="space-y-3">
              {[
                "Organizer publishes an event with a geofenced venue and rotating QR.",
                "Attendee scans, shares location, and gets an honest distance readout.",
                "Backend verifies token + geofence + timing, records attendance once.",
                "Dashboard updates live — count, rate, and arrival timeline redraw instantly.",
                "AI layer explains anomalies and answers questions grounded in exact data.",
              ].map((step, i) => (
                <Reveal key={step} delayMs={i * 80}>
                  <li className="flex items-start gap-4 rounded-lg border border-white/8 bg-void-800/50 px-4 py-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-shu-500/15 font-mono text-xs font-bold text-shu-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/70">{step}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold text-white md:text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-white/35">{label}</div>
    </div>
  );
}
