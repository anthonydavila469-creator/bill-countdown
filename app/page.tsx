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
                className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold bg-white rounded-full hover:bg-zinc-100 transition-all"
                style={{ color: '#09090b', boxShadow: '0 0 24px rgba(139,92,246,0.2)' }}
              >
                <Apple className="w-4 h-4" style={{ color: '#09090b' }} />
                <span className="hidden sm:inline" style={{ color: '#09090b' }}>Get the App</span>
                <span className="sm:hidden" style={{ color: '#09090b' }}>Download</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center pt-[72px] overflow-clip">
        <div className="absolute rounded-full pointer-events-none" style={{ top: '18%', right: '6%', width: 520, height: 520, background: 'rgba(124,58,237,0.18)', filter: 'blur(140px)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ top: '32%', right: '16%', width: 300, height: 300, background: 'rgba(168,85,247,0.12)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ top: '10%', left: '5%', width: 200, height: 200, background: 'rgba(139,92,246,0.06)', filter: 'blur(80px)' }} />
        <div className="absolute rounded-full pointer-events-none" style={{ top: '25%', right: '25%', width: 400, height: 400, background: 'rgba(217,70,239,0.06)', filter: 'blur(120px)' }} />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 w-full py-16 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-[540px]">
              <p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/80 font-semibold mb-5">
                The bill countdown app
              </p>

              <h1 className="text-[clamp(2.75rem,6.5vw,5rem)] font-black tracking-[-0.05em] leading-[0.95] mb-7">
                Never miss
                <br />
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#c084fc] to-[#e9d5ff] bg-clip-text text-transparent">
                  a bill again.
                </span>
              </h1>

              <p className="text-[18px] sm:text-[20px] text-zinc-400 leading-[1.65] max-w-[480px] mb-10">
                You know what you owe — you just lose track of when it&apos;s due.
                Duezo counts down every bill to the day, with reminders that
                land before the late fee does. No bank linking. No budgets.
              </p>

              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 px-10 py-4 text-[16px] font-bold bg-white rounded-full hover:bg-zinc-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ color: '#09090b', boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 0 40px rgba(139,92,246,0.25)' }}
              >
                <Apple className="w-5 h-5" style={{ color: '#09090b' }} />
                <span style={{ color: '#09090b' }}>Download Free for iPhone</span>
              </a>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                {[
                  { icon: ShieldCheck, label: 'No bank linking — ever' },
                  { icon: Clock, label: 'Live countdowns on every bill' },
                  { icon: Bell, label: 'Reminders before the late fee' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-[13px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] rounded-full px-3.5 py-1.5"
                  >
                    <item.icon className="w-3.5 h-3.5 text-violet-400/80" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{ width: 500, height: 600, background: 'linear-gradient(to bottom, rgba(139,92,246,0.2), rgba(124,58,237,0.1), transparent)', filter: 'blur(100px)' }} />
              <div className="absolute top-[12%] left-1/2 -translate-x-1/2 rounded-full pointer-events-none" style={{ width: 280, height: 80, background: 'rgba(167,139,250,0.15)', filter: 'blur(50px)' }} />

              <div className="relative w-full mx-auto" style={{ maxWidth: 460, height: 'clamp(480px, 62vw, 600px)' }}>
                <div
                  className="absolute z-10 border p-[7px]"
                  style={{
                    left: 0,
                    top: '10%',
                    width: '44%',
                    borderRadius: 36,
                    borderColor: 'rgba(255,255,255,0.08)',
                    background: 'linear-gradient(to bottom, rgba(40,25,72,0.7), rgba(20,14,38,0.8), rgba(10,10,14,0.9))',
                    boxShadow: '0 50px 100px -20px rgba(124,58,237,0.35), 0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
                    transform: 'rotate(-4deg)',
                    maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                  }}
                >
                  <div className="overflow-hidden bg-black" style={{ borderRadius: 29 }}>
                    <img
                      src="/theme-hero-assets/theme-fuchsia.jpg"
                      alt="Duezo fuchsia theme showing bills with countdown timers"
                      className="block w-full h-auto"
                    />
                  </div>
                </div>

                <div
                  className="absolute z-20 border p-[9px]"
                  style={{
                    left: '50%',
                    top: 0,
                    width: '53%',
                    transform: 'translateX(-50%)',
                    borderRadius: 42,
                    borderColor: 'rgba(255,255,255,0.1)',
                    background: 'linear-gradient(to bottom, rgba(40,25,72,0.85), rgba(20,14,38,0.9), rgba(10,10,14,0.95))',
                    boxShadow: '0 80px 160px -30px rgba(124,58,237,0.55), 0 30px 60px -15px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
                    maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
                  }}
                >
                  <div className="overflow-hidden bg-black" style={{ borderRadius: 33 }}>
                    <img
                      src="/theme-hero-assets/theme-dark.jpg"
                      alt="Duezo dark theme showing the main dashboard with bill countdowns"
                      className="block w-full h-auto"
                    />
                  </div>
                </div>

                <div
                  className="absolute z-10 border p-[7px]"
                  style={{
                    right: 0,
                    top: '14%',
                    width: '44%',
                    borderRadius: 36,
                    borderColor: 'rgba(255,255,255,0.08)',
                    background: 'linear-gradient(to bottom, rgba(40,25,72,0.7), rgba(20,14,38,0.8), rgba(10,10,14,0.9))',
                    boxShadow: '0 50px 100px -20px rgba(124,58,237,0.35), 0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)',
                    transform: 'rotate(4deg)',
                    maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
                  }}
                >
                  <div className="overflow-hidden bg-black" style={{ borderRadius: 29 }}>
                    <img
                      src="/theme-hero-assets/theme-purple-classic.jpg"
                      alt="Duezo purple classic theme showing full dashboard with bill countdowns"
                      className="block w-full h-auto"
                    />
                  </div>
                </div>

                <div className="absolute left-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md" style={{ bottom: '8%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <Palette className="w-3.5 h-3.5 text-violet-400/80" />
                  <span className="text-[12px] text-zinc-400 font-medium tracking-wide">
                    Multiple themes included
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[#08080c] z-10 pointer-events-none" />
      </section>

      <section className="relative py-28 md:py-36"><div className="max-w-5xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">The problem</p><h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-5 leading-[1.05]">You know what you owe.<br /><span className="text-zinc-500">You just can&apos;t track when it&apos;s all due.</span></h2><p className="text-zinc-500 text-center mb-16 max-w-lg mx-auto text-[17px] leading-relaxed">Late fees cost Americans over $1,200 a year — not from overspending, but from losing track of due dates.</p><div className="grid md:grid-cols-3 gap-5"><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><h3 className="text-[18px] font-bold tracking-[-0.02em] mb-3 text-zinc-200">Budgeting apps are overkill</h3><p className="text-[15px] text-zinc-500 leading-relaxed">You wanted bill reminders, not a full financial operating system. YNAB and Mint solve a different problem.</p></div><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><h3 className="text-[18px] font-bold tracking-[-0.02em] mb-3 text-zinc-200">Bank linking is a trust hurdle</h3><p className="text-[15px] text-zinc-500 leading-relaxed">Handing over account credentials just to track due dates? Most people won’t — and shouldn’t have to.</p></div><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><h3 className="text-[18px] font-bold tracking-[-0.02em] mb-3 text-zinc-200">Calendar apps are too dumb</h3><p className="text-[15px] text-zinc-500 leading-relaxed">They remind you of dates, but they don’t know amounts, track payment status, or show urgency.</p></div></div></div></section>

      <section id="features" className="relative py-28 md:py-36 border-t border-white/[0.04]"><div className="max-w-5xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">How it works</p><h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">Set up in 60 seconds</h2><p className="text-zinc-500 text-center mb-16 max-w-md mx-auto text-[17px]">Three steps. No bank login. No spreadsheet.</p><div className="grid md:grid-cols-3 gap-5"><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><div className="mb-5 w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"><Camera className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[19px] font-bold tracking-[-0.02em] mb-2">Add your bills</h3><p className="text-[15px] text-zinc-500 leading-relaxed">Use Quick Add for fast manual entry or snap a photo of a bill and let Duezo pull the details with AI.</p></div><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><div className="mb-5 w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"><Clock className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[19px] font-bold tracking-[-0.02em] mb-2">Watch countdowns</h3><p className="text-[15px] text-zinc-500 leading-relaxed">Every bill gets a countdown card. Colors shift as due dates approach. You always know what&apos;s next.</p></div><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><div className="mb-5 w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center"><Bell className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[19px] font-bold tracking-[-0.02em] mb-2">Get reminded early</h3><p className="text-[15px] text-zinc-500 leading-relaxed">7 days, 3 days, 1 day — customizable reminders that hit before the late fee does.</p></div></div></div></section>

      <section id="why-duezo" className="relative py-28 md:py-36 border-t border-white/[0.04]"><div className="max-w-5xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">Why Duezo</p><h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-5 leading-[1.02]">Built for one job.<br /><span className="text-zinc-500">Helping you never miss a bill.</span></h2><p className="text-zinc-500 text-center mb-16 max-w-lg mx-auto text-[17px] leading-relaxed">Duezo is deliberately focused. It’s not a budgeting app, debt tracker, or financial dashboard.</p><div className="grid md:grid-cols-3 gap-5"><div className="text-center"><div className="mb-4 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto"><Shield className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[16px] font-bold tracking-[-0.02em] mb-1.5">No bank linking</h3><p className="text-[14px] text-zinc-500 leading-relaxed">No credentials collected. No Plaid. No third-party access to your accounts.</p></div><div className="text-center"><div className="mb-4 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto"><Sparkles className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[16px] font-bold tracking-[-0.02em] mb-1.5">Bills only, no bloat</h3><p className="text-[14px] text-zinc-500 leading-relaxed">Not a budget app. Not a spending tracker. Just bill due dates, counted down.</p></div><div className="text-center"><div className="mb-4 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto"><Smartphone className="w-5 h-5 text-zinc-400" /></div><h3 className="text-[16px] font-bold tracking-[-0.02em] mb-1.5">Indie-built for iPhone</h3><p className="text-[14px] text-zinc-500 leading-relaxed">Native iOS app with widgets, push notifications, and direct founder support.</p></div></div></div></section>

      <section className="relative py-28 md:py-36 border-t border-white/[0.04]"><div className="max-w-3xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">Trust</p><h2 className="text-[clamp(1.75rem,4vw,3rem)] font-black tracking-[-0.04em] text-center mb-10 leading-[1.03]">Built after one too many late fees.</h2><div className="relative p-8 md:p-10 rounded-[28px] border border-white/[0.06] bg-white/[0.02]"><div className="absolute -top-3 left-8"><span className="px-3 py-1 text-[12px] font-bold tracking-wider uppercase bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/20">Founder note</span></div><p className="text-[18px] md:text-[20px] leading-[1.75] text-zinc-300 mb-8">“I paid a late fee on a bill I had the money for. I just forgot the date. I tried other finance apps, but they all wanted my bank login and a bunch of extra stuff I didn’t care about. I didn’t need a budget app. I just needed something that showed me what was due and when. That’s why I made Duezo.”</p><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-black font-bold"><User className="w-5 h-5" /></div><div><p className="font-semibold">Anthony Dyess</p><p className="text-[14px] text-zinc-500">Founder, Duezo</p></div></div></div></div></section>

      <section id="pricing" className="relative py-28 md:py-36 border-t border-white/[0.04]"><div className="max-w-4xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">Pricing</p><h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-4 leading-[1.02]">Start free. Upgrade when you’re ready.</h2><p className="text-zinc-500 text-center mb-16 max-w-md mx-auto text-[17px]">No credit card required. Try yearly free for 7 days.</p><div className="grid md:grid-cols-2 gap-5"><div className="relative p-8 rounded-[24px] border border-white/[0.06] bg-white/[0.015]"><h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1">Free</h3><p className="text-zinc-500 text-[15px] mb-6">Get started with the basics</p><p className="text-[40px] font-black tracking-[-0.04em] mb-1">$0<span className="text-[16px] font-normal text-zinc-600"> forever</span></p><ul className="space-y-3 mb-8">{['Up to 5 bills', 'Countdown dashboard', 'Quick Add & Photo Scan', 'Basic reminders', 'Purple theme'].map((feature) => (<li key={feature} className="flex items-start gap-3 text-[15px] text-zinc-300"><Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />{feature}</li>))}</ul><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-6 text-[15px] font-semibold rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-200 hover:bg-white/[0.06] transition-colors">Download Free</a></div><div className="relative p-8 rounded-[24px] border border-violet-500/[0.25] bg-gradient-to-b from-violet-500/[0.06] to-white/[0.015]"><div className="absolute -top-3 left-8"><span className="px-3 py-1 text-[12px] font-bold tracking-wider uppercase bg-violet-500 text-white rounded-full">Pro</span></div><h3 className="text-[20px] font-bold tracking-[-0.02em] mb-1">Duezo Pro</h3><p className="text-zinc-500 text-[15px] mb-6">Everything, unlimited</p><p className="text-[40px] font-black tracking-[-0.04em] mb-1">$19.99<span className="text-[16px] font-normal text-zinc-600"> /year</span></p><p className="text-[14px] text-zinc-600 mb-6">or $3.99/month · 7-day free trial on yearly</p><ul className="space-y-3 mb-8">{['Unlimited bills', 'Custom reminders & push notifications', 'All widgets & themes', 'Calendar view'].map((feature) => (<li key={feature} className="flex items-start gap-3 text-[15px] text-zinc-300"><Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />{feature}</li>))}</ul><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3 px-6 text-[15px] font-semibold rounded-full bg-white hover:bg-zinc-100 transition-colors shadow-[0_0_24px_rgba(139,92,246,0.2)]" style={{ color: '#09090b' }}><span style={{ color: '#09090b' }}>Start Free Trial</span></a></div></div><p className="text-center text-[13px] text-zinc-600 mt-8">Prices shown in USD. Billed through the App Store. Cancel anytime.</p></div></section>

      <section id="faq" className="relative py-28 md:py-36 border-t border-white/[0.04]"><div className="max-w-2xl mx-auto px-6 sm:px-10"><p className="text-[13px] uppercase tracking-[0.2em] text-violet-400/70 font-semibold text-center mb-5">FAQ</p><h2 className="text-[clamp(1.75rem,4vw,3.25rem)] font-black tracking-[-0.04em] text-center mb-16 leading-[1.02]">Questions? Answered.</h2><div className="space-y-3">{faqItems.map((item) => (<details key={item.q} className="group rounded-[16px] border border-white/[0.06] bg-white/[0.015] overflow-hidden"><summary className="flex items-center justify-between gap-4 px-7 py-5 cursor-pointer text-[16px] font-semibold text-zinc-200 hover:text-white transition-colors [&::-webkit-details-marker]:hidden list-none">{item.q}<ChevronDown className="w-4 h-4 text-zinc-600 shrink-0 transition-transform duration-200 group-open:rotate-180" /></summary><div className="px-7 pb-6 text-[15px] text-zinc-500 leading-relaxed">{item.a}</div></details>))}</div></div></section>

      <section className="relative py-32 md:py-40 border-t border-white/[0.04] overflow-hidden"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/[0.15] blur-[140px] rounded-full pointer-events-none" /><div className="relative max-w-2xl mx-auto px-6 sm:px-10 text-center"><h2 className="text-[clamp(2rem,5vw,4rem)] font-black tracking-[-0.045em] leading-[0.96] mb-6">Ready to stop<br /><span className="bg-gradient-to-r from-[#b794ff] via-[#f0abfc] to-[#ddd6fe] bg-clip-text text-transparent italic">missing bills?</span></h2><p className="text-zinc-500 text-lg mb-12 max-w-md mx-auto">Download Duezo and set up your first bill in minutes. Free on iPhone. No bank linking required.</p><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3 px-12 py-5 text-[17px] font-bold bg-white rounded-full hover:bg-zinc-100 transition-all shadow-[0_0_70px_rgba(139,92,246,0.35)] hover:shadow-[0_0_90px_rgba(139,92,246,0.45)]" style={{ color: '#09090b' }}><Apple className="w-5 h-5" style={{ color: '#09090b' }} /><span style={{ color: '#09090b' }}>Download Free for iPhone</span></a></div></section>

      <footer className="border-t border-white/[0.04] py-10"><div className="max-w-7xl mx-auto px-6 sm:px-10"><div className="flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-2.5"><Image src="/duezo-d-logo-transparent.png" alt="Duezo" width={22} height={22} className="rounded-[6px]" /></div><div className="flex items-center gap-6 text-[13px] text-zinc-600"><Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link><Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link><Link href="/about" className="hover:text-zinc-400 transition-colors">About</Link><Link href="/blog" className="hover:text-zinc-400 transition-colors">Blog</Link><a href="mailto:support@duezo.app" className="hover:text-zinc-400 transition-colors">Contact</a><a href="https://x.com/duezoapp" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors" aria-label="Duezo on X">𝕏</a></div><p className="text-[13px] text-zinc-600">© {new Date().getFullYear()} Duezo</p></div></div></footer>
    </div>
  );
}
