import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs Mint: Bill Tracking After Mint Shut Down (2026) | Duezo',
  description:
    'Mint shut down in 2024 and merged into Credit Karma. If you just used Mint for bill tracking, Duezo is a simpler, privacy-focused alternative at $4.99/mo.',
  keywords: [
    'mint alternative',
    'mint app replacement',
    'mint shut down',
    'what replaced mint',
    'bill tracking after mint',
    'mint vs duezo',
  ],
  openGraph: {
    title: 'Duezo vs Mint: The Bill Tracker That Won\'t Shut Down',
    description: 'Mint is gone. Duezo is here — focused on bills, not ads or budgeting complexity.',
    url: 'https://duezo.app/vs/mint',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/mint' },
};

type Row = [string, string | boolean, string | boolean];

const rows: Row[] = [
  ['Status', 'Active', 'Shut down (2024)'],
  ['Monthly price', '$4.99/mo', 'Free'],
  ['Bill tracking', true, true],
  ['Bill reminders', true, true],
  ['Countdown timers', true, false],
  ['AI email scanning', true, false],
  ['Full budgeting', false, true],
  ['Investment tracking', false, true],
  ['Credit score', false, true],
  ['Ads', false, true],
  ['Privacy concerns', false, true],
  ['iOS app', true, true],
  ['Web app', true, true],
  ['Business model', 'Subscription', 'Ad/data-driven'],
  ['Still available?', true, false],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-violet-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsMintPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs Mint Comparison',
            url: 'https://duezo.app/vs/mint',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
            Mint
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Mint shut down in 2024 after 16 years. If you just used Mint for bill tracking and reminders, Duezo is a simpler, privacy-focused alternative.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-violet-400 font-medium">Duezo</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Mint (RIP)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, mint], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={mint} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What happened to Mint */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">What Happened to Mint?</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            In late 2023, Intuit announced that Mint would shut down permanently in January 2024, after 16 years of service. 
            Users were encouraged to migrate to Credit Karma, Intuit&apos;s other financial app.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Mint was popular because it was free — but it was also <strong className="text-white">ad-supported and monetized user data</strong>. 
            The free model eventually became unsustainable as regulations tightened and user expectations grew.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            Many Mint users didn&apos;t need all the budgeting features. They just wanted <strong className="text-white">a simple way to track bill due dates</strong> — 
            which is exactly what Duezo does.
          </p>
        </div>
      </section>

      {/* Why Duezo is different */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Why Duezo Is Different</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 Focused on Bills, Not Everything</h3>
            <p className="text-zinc-400">
              Mint tried to do it all — budgeting, bill tracking, investment tracking, credit scores, spending insights. 
              That&apos;s great if you need all of it. But most people just used Mint to <strong className="text-white">remember when bills were due</strong>. 
              Duezo does that one thing exceptionally well, without the bloat.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">🚫 No Ads, No Data Selling</h3>
            <p className="text-zinc-400">
              Mint was free, but you paid with your data. The app showed ads and monetized your financial information. 
              <strong className="text-white"> Duezo costs $4.99/mo</strong>, which means our business model is simple: you pay us, we serve you. 
              No ads. No selling your data. No hidden agenda.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">🔒 Privacy-First Approach</h3>
            <p className="text-zinc-400">
              Mint required linking all your bank accounts and credit cards. Duezo scans your <strong className="text-white">Gmail for bill notifications</strong> — 
              no bank linking required. Your financial data stays with your bank, where it belongs.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">⏰ Better Than Reminders: Countdown Timers</h3>
            <p className="text-zinc-400">
              Mint sent you bill reminders (if you remembered to set them up). Duezo gives you <strong className="text-white">live countdown timers</strong> — 
              &quot;3 days, 12 hours until Netflix is due.&quot; It&apos;s more visual, more engaging, and harder to ignore.
            </p>
          </div>
        </div>
      </section>

      {/* Migration guide */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Switching from Mint to Duezo</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <p className="text-zinc-300 text-lg leading-relaxed mb-6">
            If you only used Mint for bill tracking, switching to Duezo is simple:
          </p>
          <ol className="space-y-4 text-zinc-300 text-lg">
            <li className="flex gap-3">
              <span className="text-violet-400 font-bold">1.</span>
              <span>Sign up for Duezo (2 minutes)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400 font-bold">2.</span>
              <span>Connect your Gmail account</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400 font-bold">3.</span>
              <span>Duezo automatically scans for bill notifications — no manual entry needed</span>
            </li>
            <li className="flex gap-3">
              <span className="text-violet-400 font-bold">4.</span>
              <span>You&apos;re done. Bills appear with countdown timers.</span>
            </li>
          </ol>
          <p className="text-zinc-400 mt-6">
            No need to manually add every biller like you had to with Mint.
          </p>
        </div>
      </section>

      {/* When to choose each */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-violet-400">Choose Duezo if you…</h2>
            <ul className="space-y-3 text-zinc-300">
              {[
                'Only used Mint for bill tracking',
                'Want a simpler, less bloated app',
                'Don\'t want ads or data monetization',
                'Prefer not to link bank accounts',
                'Want automatic bill detection',
                'Don\'t mind paying $5/mo for privacy',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-zinc-300">Try Credit Karma if you…</h2>
            <ul className="space-y-3 text-zinc-400">
              {[
                'Want the official Mint replacement',
                'Need full budgeting and spending tracking',
                'Want credit monitoring and scores',
                'Don\'t mind ads and data collection',
                'Used all of Mint\'s features regularly',
                'Want a free app (but ad-supported)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Honest take */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">The Truth About &quot;Free&quot; Apps</h3>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Mint was free for 16 years. Then it shut down. Prism Bills was free for 8 years. Then it shut down too.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Free apps either disappear or find other ways to make money — usually through ads, data monetization, or getting acquired and shut down.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            Duezo costs <strong className="text-white">$4.99/mo</strong>. That&apos;s the price of staying in business, 
            keeping your data private, and actually caring about bill tracking. If you want an app that will still be here in 5 years, it has to make money from users — not from selling your data.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Replace Mint?</h2>
        <p className="text-zinc-400 text-lg mb-8">
          No ads. No data selling. Just simple bill tracking.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-zinc-500 text-sm mt-4">$4.99/mo · Privacy-focused · Cancel anytime</p>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/vs" className="hover:text-zinc-300 transition-colors">All Comparisons</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
      </div>
    </main>
  );
}
