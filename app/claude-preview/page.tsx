import Image from 'next/image';
import {
  Apple,
  Clock,
  Camera,
  Bell,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Palette,
  CalendarDays,
  LayoutGrid,
  ChevronDown,
  Check,
  Zap,
} from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/duezo/id6759273131';

function PhoneFrame({
  children,
  className = '',
  fade = true,
}: {
  children: React.ReactNode;
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[48px] border border-white/[0.08] bg-gradient-to-b from-[rgba(30,20,56,0.8)] to-[rgba(10,10,14,0.95)] p-[10px] shadow-[0_60px_120px_-20px_rgba(124,58,237,0.45),0_20px_40px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)] ${className}`}
      style={
        fade
          ? {
              maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            }
          : undefined
      }
    >
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-[18px] z-10" />
      <div className="overflow-hidden rounded-[38px] bg-black">{children}</div>
    </div>
  );
}

export default function ClaudePreviewPage() {
  const faqItems = [
    {
      q: 'Do I need to link my bank account?',
      a: 'No. Duezo never asks for your bank login or financial credentials. You add bills yourself — manually or with Photo Scan. Your banking info stays with your bank.',
    },
    {
      q: 'Is Duezo free?',
      a: 'Free to download. The free plan tracks up to 5 bills with reminders. Duezo Pro unlocks unlimited bills, custom reminder timing, all themes, widgets, calendar view, and more.',
    },
    {
      q: 'What does Pro cost?',
      a: '$3.99/month or $19.99/year. The yearly plan includes a 7-day free trial.',
    },
    {
      q: 'How do I add bills?',
      a: 'Quick Add has autocomplete for 30+ common vendors. Or snap a photo of any bill — AI extracts the name, amount, and due date automatically.',
    },
    {
      q: 'How do reminders work?',
      a: 'Push notifications before bills are due. Pro users can customize timing — 7 days, 3 days, 1 day, or whatever works.',
    },
    {
      q: 'Is my data private?',
      a: 'Yes. Encryption and row-level security. Your data is never sold, shared, or used for ads.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080c] text-white overflow-x-hidden overflow-y-auto antialiased">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3.5">
              <Image
                src="/duezo-d-logo-transparent.png"
                alt="Duezo"
                width={40}
                height={40}
                className="rounded-[10px]"
              />
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Why Duezo', href: '#why' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[14px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold bg-white text-[#08080c] rounded-full hover:bg-zinc-100 transition-all shadow-[0_0_24px_rgba(139,92,246,0.2)]"
            >
              <Apple className="w-4 h-4" />
              <span className="hidden sm:inline">Get the App</span>
              <span className="sm:hidden">Download</span>
            </a>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[100svh] flex items-center pt-[72px] overflow-clip">
        {/* Atmospheric glows */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-600/[0.12] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-[40%] right-[5%] w-[300px] h-[400px] bg-purple-500/[0.08] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 w-full py-20 lg:py-0">
          <div className="flex flex-col items-center text-center">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-8">
              <Smartphone className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[13px] text-zinc-400 font-medium">iPhone app — free on the App Store</span>
            </div>

            <h1 className="text-[clamp(3rem,7.5vw,5.5rem)] font-black tracking-[-0.05em] leading-[0.92] mb-6 max-w-[800px]">
              Every bill.
              <br />
              <span className="bg-gradient-to-r from-[#a78bfa] via-[#c084fc] to-[#e9d5ff] bg-clip-text text-transparent">
                Counted down.
              </span>
            </h1>

            <p className="text-[18px] sm:text-[20px] text-zinc-400 leading-[1.65] max-w-[520px] mb-10">
              Your brain can&apos;t track 10 due dates. Your phone can.
              <br className="hidden sm:block" />
              No bank linking. No budgets. Just countdowns.
            </p>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-10 py-4 text-[16px] font-bold bg-white text-[#08080c] rounded-full hover:bg-zinc-50 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_40px_rgba(139,92,246,0.25)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_56px_rgba(139,92,246,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Apple className="w-5 h-5" />
              Download Free for iPhone
            </a>

            <div className="mt-6 flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
              {[
                { icon: ShieldCheck, label: 'No bank linking' },
                { icon: Sparkles, label: 'Free to start' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[13px] text-zinc-500">
                  <item.icon className="w-3.5 h-3.5 text-violet-400/60" />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Hero phone — centered, prominent */}
            <div className="relative mt-16 sm:mt-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[550px] bg-gradient-to-b from-violet-500/25 via-violet-600/10 to-transparent blur-[100px] rounded-full pointer-events-none" />

              <PhoneFrame className="w-[280px] sm:w-[320px]">
                <Image
                  src="/new_dashboard.jpg"
                  alt="Duezo dashboard showing bills with countdown timers"
                  width={1179}
                  height={2556}
                  priority
                  className="w-full h-auto"
                />
              </PhoneFrame>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-[#08080c] z-10 pointer-events-none" />
      </section>

      {/* ═══ PROBLEM FRAMING ═══ */}
      <section className="relative py-28 md:py-36">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold mb-5">
            The problem
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] leading-[1.08] mb-6">
            You know what you owe.
            <br />
            <span className="text-zinc-500">You just lose track of when.</span>
          </h2>
          <p className="text-zinc-500 max-w-lg mx-auto text-[17px] leading-relaxed mb-16">
            Late fees aren&apos;t a spending problem — they&apos;re a timing problem.
            Duezo solves the timing.
          </p>

          <div className="grid md:grid-cols-3 gap-5 text-left">
            {[
              {
                title: 'Budgeting apps are overkill',
                body: 'You wanted bill reminders, not a financial operating system.',
              },
              {
                title: 'Bank linking is a trust hurdle',
                body: 'Handing over credentials just to track due dates? You shouldn\u2019t have to.',
              },
              {
                title: 'Calendar apps are too dumb',
                body: 'They know dates but not amounts, payment status, or urgency.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-7 rounded-[20px] border border-white/[0.06] bg-white/[0.015]"
              >
                <h3 className="text-[17px] font-bold tracking-[-0.02em] mb-2.5 text-zinc-200">
                  {item.title}
                </h3>
                <p className="text-[15px] text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRODUCT PROOF — Feature Showcase ═══ */}
      <section id="features" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            How it works
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">
            Built around one idea
          </h2>
          <p className="text-zinc-500 text-center mb-20 max-w-md mx-auto text-[17px]">
            Every bill gets a countdown. You always know what&apos;s next.
          </p>

          {/* Feature 1 — Countdown Dashboard */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-32">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/[0.06] mb-5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[12px] text-violet-300 font-semibold uppercase tracking-wider">Countdown cards</span>
              </div>
              <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-black tracking-[-0.03em] leading-[1.1] mb-4">
                See every bill at a glance
              </h3>
              <p className="text-zinc-400 text-[17px] leading-relaxed mb-6 max-w-[440px]">
                Each bill shows a clear countdown — days left, amount due, and urgency color.
                Bills due soon surface to the top. No digging through lists.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  'Color-coded urgency — green, yellow, orange, red',
                  'This week and next week grouping',
                  'Total due this month at a glance',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-[15px] text-zinc-400">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[320px] bg-violet-500/12 rounded-full blur-[90px] pointer-events-none" />

              <div className="relative w-full max-w-[520px] rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-3 shadow-[0_30px_80px_-24px_rgba(124,58,237,0.38)] backdrop-blur-sm">
                <div className="flex items-center justify-between rounded-[22px] border border-white/[0.06] bg-white/[0.03] px-4 py-3 mb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">
                      Dashboard detail
                    </p>
                    <p className="text-[14px] text-zinc-300 font-medium">This week and next week, already sorted</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600 font-semibold">View</p>
                    <p className="text-[18px] font-black tracking-[-0.03em] text-white">Grouped by urgency</p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#050508] aspect-[1.12/1]">
                  <Image
                    src="/new_dashboard.jpg"
                    alt="Duezo countdown dashboard detail with grouped bills and urgency colors"
                    fill
                    sizes="(min-width: 1024px) 520px, 100vw"
                    className="object-cover object-top scale-[1.14]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,12,0.02)_0%,rgba(8,8,12,0)_48%,rgba(8,8,12,0.52)_100%)]" />
                </div>

                <div className="pointer-events-none absolute -left-4 bottom-10 hidden sm:block rounded-[20px] border border-white/[0.08] bg-[#0f0f15]/90 px-4 py-3 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-semibold">At a glance</p>
                  <p className="mt-1 text-[18px] font-black tracking-[-0.04em] text-white">Urgent bills stay visible</p>
                  <p className="text-[12px] text-zinc-400">The countdown-first layout keeps what matters in view.</p>
                </div>

                <div className="pointer-events-none absolute -right-3 top-24 hidden sm:block rounded-[18px] border border-violet-400/20 bg-violet-500/[0.08] px-4 py-3 shadow-[0_24px_50px_-24px_rgba(124,58,237,0.7)] backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-violet-300/80 font-semibold">Countdown logic</p>
                  <p className="mt-1 text-[14px] font-semibold text-white">Sooner bills rise first</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 — AI Photo Scan */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-32">
            <div className="order-2 lg:order-1 relative flex justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

              <PhoneFrame className="w-[260px] sm:w-[280px]">
                <Image
                  src="/claude-preview-assets/real-bill-scan.jpg"
                  alt="Duezo AI Photo Scan extracting bill details — Capital One Savor, $472.48, high confidence"
                  width={591}
                  height={1280}
                  className="w-full h-auto"
                />
              </PhoneFrame>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/[0.06] mb-5">
                <Camera className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[12px] text-violet-300 font-semibold uppercase tracking-wider">AI Photo Scan</span>
              </div>
              <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-black tracking-[-0.03em] leading-[1.1] mb-4">
                Snap a photo. Done.
              </h3>
              <p className="text-zinc-400 text-[17px] leading-relaxed mb-6 max-w-[440px]">
                Point your camera at any bill, statement, or invoice. AI reads the vendor name,
                amount, and due date — then creates your countdown card instantly.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  'Works with paper bills and on-screen statements',
                  'Extracts vendor, amount, and due date',
                  'Review before adding — always in your control',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-[15px] text-zinc-400">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 3 — Reminders & Widgets */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/[0.06] mb-5">
                <Bell className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[12px] text-violet-300 font-semibold uppercase tracking-wider">Reminders & Widgets</span>
              </div>
              <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-black tracking-[-0.03em] leading-[1.1] mb-4">
                It comes to you
              </h3>
              <p className="text-zinc-400 text-[17px] leading-relaxed mb-6 max-w-[440px]">
                Push notifications before bills are due. Home screen widgets so you
                never even have to open the app. Pro users customize exactly when reminders fire.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  'Push notifications at the right time',
                  'Home screen widgets — bills at a glance',
                  'Pro: custom reminder timing (7, 3, 1 day, etc.)',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <span className="text-[15px] text-zinc-400">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[400px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative w-[280px] sm:w-[320px] space-y-4">
                {/* Notification — kept light for context */}
                <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4">
                  <div className="flex items-start gap-3">
                    <Image
                      src="/duezo-d-logo-transparent.png"
                      alt=""
                      width={36}
                      height={36}
                      className="rounded-[8px] mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-zinc-200">Duezo</span>
                        <span className="text-[11px] text-zinc-600">now</span>
                      </div>
                      <p className="text-[13px] text-zinc-400 leading-snug">
                        House payment — $1,736.74 due today
                      </p>
                    </div>
                  </div>
                </div>

                {/* Real widget asset */}
                <div className="rounded-[20px] border border-white/[0.08] overflow-hidden shadow-[0_20px_60px_-15px_rgba(124,58,237,0.3)]">
                  <Image
                    src="/claude-preview-assets/real-widget-correct.jpg"
                    alt="Duezo home screen widget showing upcoming bills with countdown days"
                    width={600}
                    height={480}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY DUEZO ═══ */}
      <section id="why" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            Why Duezo
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-5 leading-[1.05]">
            Not another finance app
          </h2>
          <p className="text-zinc-500 text-center mb-16 max-w-lg mx-auto text-[17px] leading-relaxed">
            Duezo does one thing and does it well. Track when bills are due. That&apos;s it.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: 'No bank linking',
                body: 'Never asks for bank credentials. Your financial data stays where it belongs.',
              },
              {
                icon: Smartphone,
                title: 'Native iPhone app',
                body: 'Built for iOS with widgets, push notifications, and home screen integration.',
              },
              {
                icon: Zap,
                title: 'Fast setup',
                body: 'Quick Add autocomplete or Photo Scan help you get new bills in quickly without a long setup flow.',
              },
              {
                icon: Palette,
                title: 'Themes & customization',
                body: 'Five color themes. Your dashboard, your way. Pro unlocks all themes.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-[20px] border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/[0.08] border border-violet-500/15 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-[16px] font-bold tracking-[-0.02em] mb-2 text-zinc-200">
                  {item.title}
                </h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURE GRID — compact ═══ */}
      <section className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 text-center">
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] mb-5 leading-[1.05]">
            Everything you need.
            <br />
            <span className="text-zinc-500">Nothing you don&apos;t.</span>
          </h2>
          <p className="text-zinc-500 mb-14 max-w-md mx-auto text-[17px]">
            Built for people who know what they owe but can&apos;t keep track of when it&apos;s all due.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Clock, label: 'Countdown timers' },
              { icon: Camera, label: 'AI Photo Scan' },
              { icon: Bell, label: 'Push reminders' },
              { icon: LayoutGrid, label: 'Home screen widgets' },
              { icon: CalendarDays, label: 'Calendar view' },
              { icon: Palette, label: '5 color themes' },
              { icon: Sparkles, label: 'Quick Add autocomplete' },
              { icon: ShieldCheck, label: 'Payment history' },
              { icon: Smartphone, label: 'Native iOS app' },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 px-5 py-4 rounded-[14px] border border-white/[0.05] bg-white/[0.015] text-left"
              >
                <feature.icon className="w-4.5 h-4.5 text-violet-400/70 shrink-0" />
                <span className="text-[15px] text-zinc-300 font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            Pricing
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-5 leading-[1.05]">
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-zinc-500 text-center mb-14 max-w-md mx-auto text-[17px]">
            No tricks. No trial-walls for basic features.
          </p>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]">
              <p className="text-[13px] uppercase tracking-[0.15em] text-zinc-500 font-semibold mb-2">Free</p>
              <p className="text-[36px] font-black tracking-[-0.04em] mb-1">$0</p>
              <p className="text-[14px] text-zinc-500 mb-8">Forever free</p>

              <div className="space-y-3">
                {[
                  'Up to 5 bills',
                  'Countdown timers',
                  'Basic reminders',
                  'Quick Add',
                  'Default Purple theme',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-zinc-500" />
                    <span className="text-[15px] text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>

              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center gap-2 w-full py-3 text-[15px] font-semibold rounded-full border border-white/[0.1] text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                Download Free
              </a>
            </div>

            {/* Pro */}
            <div className="relative p-8 rounded-[24px] border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.06] to-transparent">
              <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20">
                <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">Popular</span>
              </div>

              <p className="text-[13px] uppercase tracking-[0.15em] text-violet-400 font-semibold mb-2">Pro</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[36px] font-black tracking-[-0.04em]">$19.99</span>
                <span className="text-[15px] text-zinc-500">/year</span>
              </div>
              <p className="text-[14px] text-zinc-500 mb-1">7-day free trial included</p>
              <p className="text-[13px] text-zinc-600 mb-8">or $3.99/month</p>

              <div className="space-y-3">
                {[
                  'Unlimited bills',
                  'Custom reminder timing',
                  'AI Photo Scan',
                  'All themes',
                  'All widgets',
                  'Calendar view and payment history',
                  'Everything in Free',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400" />
                    <span className="text-[15px] text-zinc-300">{f}</span>
                  </div>
                ))}
              </div>

              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 flex items-center justify-center gap-2 w-full py-3 text-[15px] font-bold rounded-full bg-white text-[#08080c] hover:bg-zinc-100 transition-colors shadow-[0_0_24px_rgba(139,92,246,0.15)]"
              >
                Try Pro Free for 7 Days
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-6 sm:px-10">
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-14 leading-[1.05]">
            Questions
          </h2>

          <div className="space-y-0">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group border-b border-white/[0.06] [&[open]]:pb-5"
              >
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none text-[16px] font-semibold text-zinc-200 hover:text-white transition-colors">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform shrink-0 ml-4" />
                </summary>
                <p className="text-[15px] text-zinc-500 leading-relaxed pr-8">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative py-28 md:py-36 border-t border-white/[0.04] overflow-clip">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-violet-600/[0.08] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 sm:px-10 text-center">
          <div className="rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-6 py-10 sm:px-10 sm:py-12 shadow-[0_40px_100px_-40px_rgba(124,58,237,0.45)] backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] mb-7">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[13px] text-zinc-400 font-medium">Built to make due dates feel obvious</span>
            </div>

            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-[-0.04em] leading-[1.02] mb-5">
              Stop tracking due dates
              <br />
              <span className="bg-gradient-to-r from-[#a78bfa] via-[#c084fc] to-[#e9d5ff] bg-clip-text text-transparent">
                in your head.
              </span>
            </h2>
            <p className="text-zinc-400 text-[18px] leading-relaxed mb-10 max-w-md mx-auto">
              Download Duezo and add your first bill in under a minute.
            </p>

            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-10 py-4 text-[16px] font-bold bg-white text-[#08080c] rounded-full hover:bg-zinc-50 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_40px_rgba(139,92,246,0.25)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_56px_rgba(139,92,246,0.35)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Apple className="w-5 h-5" />
              Download Free for iPhone
            </a>

            <div className="mt-7 grid sm:grid-cols-3 gap-3 text-left">
              {[
                { icon: ShieldCheck, label: 'No bank linking', sublabel: 'Keep your credentials with your bank.' },
                { icon: Sparkles, label: 'Free to start', sublabel: 'Track up to 5 bills before upgrading.' },
                { icon: Smartphone, label: 'Built for iPhone', sublabel: 'Widgets and reminders included.' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-white/[0.06] bg-white/[0.025] px-4 py-4"
                >
                  <div className="flex items-center gap-2 mb-2 text-[13px] text-zinc-300 font-medium">
                    <item.icon className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
                    {item.label}
                  </div>
                  <p className="text-[13px] leading-relaxed text-zinc-500">{item.sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/duezo-d-logo-transparent.png"
                alt="Duezo"
                width={28}
                height={28}
                className="rounded-[7px]"
              />
              <span className="text-[14px] text-zinc-500">Duezo — the bill countdown app</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy" className="text-[13px] text-zinc-600 hover:text-zinc-400 transition-colors">
                Privacy
              </a>
              <a href="/terms" className="text-[13px] text-zinc-600 hover:text-zinc-400 transition-colors">
                Terms
              </a>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                App Store
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
