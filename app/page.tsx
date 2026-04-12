import Link from 'next/link';
import Image from 'next/image';
import { NativeRedirect } from '@/components/native-redirect';
import {
  Apple,
  Shield,
  Clock,
  Camera,
  Bell,
  ShieldCheck,
  Smartphone,
  CalendarDays,
  Sparkles,
  Palette,
  FileDown,
  ChevronDown,
  Check,
  X,
  User,
  LayoutGrid,
} from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/us/app/duezo/id6759273131';

export default function LandingPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Duezo',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'iOS',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to download on iPhone. Track up to 5 bills free.',
      },
      {
        '@type': 'Offer',
        price: '3.99',
        priceCurrency: 'USD',
        description: 'Duezo Pro monthly — unlimited bills and all features.',
      },
    ],
    description:
      'Track bills with countdown timers, photo scan, and smart reminders on iPhone. No bank linking required.',
    url: 'https://duezo.app',
  };

  const faqItems = [
    {
      q: 'Do I need to link my bank account?',
      a: 'No. Duezo never asks for your bank login or financial credentials. You add bills yourself with Quick Add or Photo Scan. Your banking info stays with your bank.',
    },
    {
      q: 'Is Duezo free?',
      a: 'Duezo is free to download. The free plan lets you track up to 5 bills with the purple theme and basic reminders. Duezo Pro unlocks unlimited bills, custom reminders, all widgets, themes, calendar view, and more.',
    },
    {
      q: 'What does Duezo Pro cost?',
      a: 'Duezo Pro is $3.99/month or $19.99/year. The yearly plan includes a 7-day free trial so you can try everything before paying.',
    },
    {
      q: 'Can I add bills manually?',
      a: 'Yes. Quick Add has autocomplete for 30+ common vendors. You can also snap a photo of any bill or statement and let AI extract the details automatically.',
    },
    {
      q: 'How do reminders work?',
      a: 'Duezo sends push notifications before bills are due. Free users get basic reminders. Pro users can customize timing — 7 days, 3 days, 1 day, or whatever works for you.',
    },
    {
      q: 'Does Duezo work on Android?',
      a: 'Duezo is currently iPhone only. It is built as a native iOS app with widgets and home screen integration.',
    },
    {
      q: 'Is my data private?',
      a: 'Yes. Duezo uses encryption and row-level security. Your data is never sold, shared, or used for ads. No bank credentials are ever collected.',
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white overflow-x-hidden overflow-y-auto">
      <NativeRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ════════════════════════════════════════════
          NAV — sticky, anchored, CTA-forward
         ════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3.5">
              <Image
                src="/duezo-d-logo-transparent.png"
                alt="Duezo app icon"
                width={40}
                height={40}
                className="rounded-[10px]"
              />
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Features', href: '#features' },
                { label: 'Why Duezo', href: '#why-duezo' },
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

            <div className="flex items-center gap-6">
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
        </div>
      </nav>

      {/* ════════════════════════════════════════════
          HERO
         ════════════════════════════════════════════ */}
      <section className="relative min-h-[100svh] flex items-center pt-[72px] overflow-clip">
        {/* Decorative glow */}
        <div className="absolute top-[20%] right-[8%] w-[480px] h-[480px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[35%] right-[18%] w-[280px] h-[280px] bg-purple-500/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 w-full py-16 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Copy */}
            <div className="max-w-[540px]">
              <h1 className="text-[clamp(2.75rem,6.5vw,5rem)] font-black tracking-[-0.05em] leading-[0.95] mb-7">
                Never miss{' '}
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#c084fc] to-[#e9d5ff] bg-clip-text text-transparent">
                  a bill again.
                </span>
              </h1>

              <p className="text-[18px] sm:text-[20px] text-zinc-400 leading-[1.65] max-w-[480px] mb-10">
                Duezo tracks every bill with clear countdowns, smart reminders,
                and fast AI-assisted entry — without linking your bank account.
              </p>

              {/* Primary CTA */}
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-10 py-4 text-[16px] font-bold bg-white text-[#08080c] rounded-full hover:bg-zinc-50 transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_40px_rgba(139,92,246,0.25)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_56px_rgba(139,92,246,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Apple className="w-5 h-5" />
                Download Free for iPhone
              </a>

              {/* Trust chips */}
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                {[
                  { icon: ShieldCheck, label: 'No bank linking required' },
                  { icon: Smartphone, label: 'Built for iPhone' },
                  { icon: Sparkles, label: 'Free to download' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[13px] text-zinc-500">
                    <item.icon className="w-3.5 h-3.5 text-violet-400/70" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Product — phone mockup */}
            <div className="relative flex justify-center lg:justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[500px] bg-gradient-to-b from-violet-500/20 via-violet-600/10 to-transparent blur-[80px] rounded-full pointer-events-none" />

              <div
                className="relative w-[260px] sm:w-[290px] lg:w-[320px] rounded-[48px] border border-white/[0.08] bg-gradient-to-b from-[rgba(30,20,56,0.8)] to-[rgba(10,10,14,0.95)] p-[10px] shadow-[0_60px_120px_-20px_rgba(124,58,237,0.5),0_20px_40px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)]"
                style={{
                  maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                }}
              >
                <div className="overflow-hidden rounded-[38px] bg-black">
                  <Image
                    src="/new_dashboard.jpg"
                    alt="Duezo dashboard showing bills with countdown days remaining on each card"
                    width={1179}
                    height={2556}
                    priority
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#08080c] z-10 pointer-events-none" />
      </section>

      {/* ════════════════════════════════════════════
          PROBLEM — why the alternatives fail
         ════════════════════════════════════════════ */}
      <section className="relative py-28 md:py-36">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            The problem
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-5 leading-[1.05]">
            You know what you owe.{' '}
            <span className="text-zinc-500">You just can&apos;t track when it&apos;s all due.</span>
          </h2>
          <p className="text-zinc-500 text-center mb-16 max-w-lg mx-auto text-[17px] leading-relaxed">
            Late fees cost Americans over $1,200 a year — not from overspending, but from losing track of due dates.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Budgeting apps are overkill',
                body: 'You wanted bill reminders, not a full financial operating system. YNAB and Mint solve a different problem.',
              },
              {
                title: 'Bank linking is a trust hurdle',
                body: 'Handing over account credentials just to track due dates? Most people won\u2019t — and shouldn\u2019t have to.',
              },
              {
                title: 'Calendar apps are too dumb',
                body: 'They remind you of dates, but they don\u2019t know amounts, track payment status, or show urgency.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"
              >
                <h3 className="text-[18px] font-bold tracking-[-0.02em] mb-3 text-zinc-200">{item.title}</h3>
                <p className="text-[15px] text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          HOW IT WORKS — 3 steps
         ════════════════════════════════════════════ */}
      <section id="features" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            How it works
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">
            Set up in 60 seconds
          </h2>
          <p className="text-zinc-500 text-center mb-16 max-w-md mx-auto text-[17px]">
            Three steps. No bank login. No spreadsheet.
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: '01',
                icon: Apple,
                title: 'Download Duezo',
                body: 'Free on the App Store. Create an account in seconds — no bank credentials, ever.',
              },
              {
                step: '02',
                icon: Camera,
                title: 'Add your bills',
                body: 'Quick Add with autocomplete for 30+ vendors, or snap a photo. AI extracts the name, amount, and due date.',
              },
              {
                step: '03',
                icon: Clock,
                title: 'Watch countdowns',
                body: 'Every bill gets a countdown card. Colors shift as due dates approach. You always know what\u2019s next.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-[13px] font-bold text-violet-400/50 tracking-wider">{item.step}</span>
                  <div className="w-11 h-11 rounded-2xl bg-violet-500/[0.1] border border-violet-500/[0.15] flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
                <h3 className="text-[19px] font-bold tracking-[-0.02em] mb-2">{item.title}</h3>
                <p className="text-[15px] text-zinc-400 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          WHY DUEZO — feature showcase
         ════════════════════════════════════════════ */}
      <section id="why-duezo" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            Why Duezo
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">
            Not a budget app.
            <br />
            <span className="text-zinc-500 font-normal italic">Not even close.</span>
          </h2>
          <p className="text-zinc-500 text-center mb-16 max-w-lg mx-auto text-[17px] leading-relaxed">
            Duezo does one thing: tracks your bills and counts down to every due date. No bank linking. No budgets. No bloat.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 max-w-[860px] mx-auto">
            {[
              {
                icon: Clock,
                title: 'Countdown on every bill',
                body: 'Every bill shows days remaining — not just a date in a list. Cards shift color from green to amber to red as the due date approaches.',
              },
              {
                icon: Shield,
                title: 'No bank linking. Ever.',
                body: 'Your bank login stays with your bank. Duezo works without credentials, connections, or Plaid.',
              },
              {
                icon: Bell,
                title: 'Push reminders that land early',
                body: '7 days, 3 days, 1 day — customizable reminders that hit before the late fee does.',
              },
              {
                icon: Camera,
                title: 'AI photo scan',
                body: 'Snap a photo of any bill or statement. AI pulls the vendor, amount, and due date in seconds.',
              },
              {
                icon: CalendarDays,
                title: 'Calendar view',
                body: 'See your entire month of bills at a glance. Plan ahead instead of reacting late.',
              },
              {
                icon: LayoutGrid,
                title: 'Home screen widgets',
                body: 'See upcoming bills without opening the app. Native iOS widgets built for your home screen and lock screen.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"
              >
                <div className="mb-5 w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="text-[19px] font-bold tracking-[-0.02em] mb-2">{item.title}</h3>
                <p className="text-[15px] text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          TRUST — founder story + privacy
         ════════════════════════════════════════════ */}
      <section className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            Built by someone who had this problem
          </p>

          <div className="relative rounded-[28px] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-10 sm:p-12 mb-12">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[120px] bg-violet-500/[0.08] blur-[90px] rounded-full pointer-events-none" />

            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/[0.1] border border-violet-500/[0.15] flex items-center justify-center mb-6">
                <User className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-[20px] sm:text-[22px] text-zinc-300 leading-[1.5] mb-6">
                &ldquo;I paid a late fee on a bill I had the money for. I just forgot the date. I tried other finance apps, but they all wanted my bank login and a bunch of extra stuff I didn&apos;t care about. I didn&apos;t need a budget app. I just needed something that showed me what was due and when. That&apos;s why I made Duezo.&rdquo;
              </p>
              <p className="text-[15px] text-zinc-500">
                — The founder of Duezo, who still uses it every day.
              </p>
            </div>
          </div>

          {/* Trust pillars */}
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: 'No bank linking',
                body: 'No credentials collected. No Plaid. No third-party access to your accounts.',
              },
              {
                icon: Sparkles,
                title: 'Bills only, no bloat',
                body: 'Not a budget app. Not a spending tracker. Just bill due dates, counted down.',
              },
              {
                icon: Smartphone,
                title: 'Indie-built for iPhone',
                body: 'Native iOS app with widgets, push notifications, and direct founder support.',
              },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="mb-4 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto">
                  <item.icon className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="text-[16px] font-bold tracking-[-0.02em] mb-1.5">{item.title}</h3>
                <p className="text-[14px] text-zinc-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          PRICING — clear, honest, real
         ════════════════════════════════════════════ */}
      <section id="pricing" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            Pricing
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-zinc-500 text-center mb-16 max-w-md mx-auto text-[17px]">
            No credit card required. Try yearly free for 7 days.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 max-w-[720px] mx-auto">
            {/* Free */}
            <div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]">
              <h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1">Free</h3>
              <p className="text-zinc-500 text-[15px] mb-6">Get started with the basics</p>
              <p className="text-[40px] font-black tracking-[-0.04em] mb-6">
                $0
                <span className="text-[16px] font-normal text-zinc-600"> forever</span>
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Up to 5 bills',
                  'Countdown dashboard',
                  'Quick Add & Photo Scan',
                  'Basic reminders',
                  'Purple theme',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[15px] text-zinc-400">
                    <Check className="w-4 h-4 text-violet-400/70 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 px-6 text-[15px] font-semibold rounded-full border border-white/[0.1] text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                Download Free
              </a>
            </div>

            {/* Pro */}
            <div className="relative p-8 rounded-[24px] border border-violet-500/[0.25] bg-gradient-to-b from-violet-500/[0.06] to-white/[0.015]">
              <div className="absolute -top-3 left-8">
                <span className="px-3 py-1 text-[12px] font-bold tracking-wider uppercase bg-violet-500 text-white rounded-full">
                  Pro
                </span>
              </div>
              <h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1">Duezo Pro</h3>
              <p className="text-zinc-500 text-[15px] mb-6">Everything, unlimited</p>
              <p className="text-[40px] font-black tracking-[-0.04em] mb-1">
                $19.99
                <span className="text-[16px] font-normal text-zinc-600"> /year</span>
              </p>
              <p className="text-[14px] text-zinc-600 mb-6">
                or $3.99/month &middot; 7-day free trial on yearly
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited bills',
                  'Custom reminders & push notifications',
                  'All widgets & themes',
                  'Calendar view',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[15px] text-zinc-300">
                    <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 px-6 text-[15px] font-semibold rounded-full bg-white text-[#08080c] hover:bg-zinc-100 transition-colors shadow-[0_0_24px_rgba(139,92,246,0.2)]"
              >
                Start Free Trial
              </a>
            </div>
          </div>

          <p className="text-center text-[13px] text-zinc-600 mt-8">
            Prices shown in USD. Billed through the App Store. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FAQ — handle objections
         ════════════════════════════════════════════ */}
      <section id="faq" className="relative py-28 md:py-36 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-6 sm:px-10">
          <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">
            FAQ
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-16 leading-[1.02]">
            Questions? Answered.
          </h2>

          <div className="space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-[16px] border border-white/[0.06] bg-white/[0.015] overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-7 py-5 cursor-pointer text-[16px] font-semibold text-zinc-200 hover:text-white transition-colors [&::-webkit-details-marker]:hidden list-none">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-7 pb-6 text-[15px] text-zinc-500 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════════════ */}
      <section className="relative py-32 md:py-40 border-t border-white/[0.04] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/[0.15] blur-[140px] rounded-full pointer-events-none" />

        <div className="relative max-w-2xl mx-auto px-6 sm:px-10 text-center">
          <h2 className="text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.045em] leading-[0.96] mb-6">
            Ready to stop
            <br />
            <span className="bg-gradient-to-r from-[#b794ff] via-[#f0abfc] to-[#ddd6fe] bg-clip-text text-transparent italic">
              missing bills?
            </span>
          </h2>
          <p className="text-zinc-500 text-lg mb-12 max-w-md mx-auto">
            Download Duezo and set up your first bill in minutes. Free on iPhone. No bank linking required.
          </p>

          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 px-12 py-5 text-[17px] font-bold bg-white text-[#08080c] rounded-full hover:bg-zinc-100 transition-all shadow-[0_0_70px_rgba(139,92,246,0.35)] hover:shadow-[0_0_90px_rgba(139,92,246,0.45)]"
          >
            <Apple className="w-5 h-5" />
            Download Free for iPhone
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/duezo-d-logo-transparent.png"
                alt="Duezo"
                width={22}
                height={22}
                className="rounded-[6px]"
              />
            </div>

            <div className="flex items-center gap-6 text-[13px] text-zinc-600">
              <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-zinc-400 transition-colors">
                Terms
              </Link>
              <Link href="/about" className="hover:text-zinc-400 transition-colors">
                About
              </Link>
              <Link href="/blog" className="hover:text-zinc-400 transition-colors">
                Blog
              </Link>
              <a href="mailto:support@duezo.app" className="hover:text-zinc-400 transition-colors">
                Contact
              </a>
              <a
                href="https://x.com/duezoapp"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-400 transition-colors"
                aria-label="Duezo on X"
              >
                𝕏
              </a>
            </div>

            <p className="text-[13px] text-zinc-600">
              © {new Date().getFullYear()} Duezo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
