import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Minus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs Prism Bills: The Best Prism Alternative in 2026 | Duezo',
  description:
    'Prism Bills shut down in December 2023. Duezo is the spiritual successor — bill tracking with countdown timers, email scanning, and a sustainable business model.',
  keywords: [
    'prism bills alternative',
    'prism app replacement',
    'prism bills shut down',
    'what happened to prism',
    'best prism alternative 2026',
    'bill tracking after prism',
  ],
  openGraph: {
    title: 'Duezo: The Prism Alternative You\'ve Been Looking For',
    description: 'Prism was great. It\'s gone. Duezo is here — built for the same people who loved Prism.',
    url: 'https://duezo.app/vs/prism',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/prism' },
};

type Row = [string, string | boolean, string | boolean];

const rows: Row[] = [
  ['Status', 'Active', 'Shut down (Dec 2023)'],
  ['Monthly price', '$4.99/mo', 'Free'],
  ['Bill tracking', true, true],
  ['Countdown timers', true, false],
  ['AI email scanning', true, false],
  ['Direct biller payments', false, true],
  ['Bank account linking', false, true],
  ['Price increase alerts', true, false],
  ['Bill history', true, true],
  ['iOS app', true, true],
  ['Android app', 'Coming soon', true],
  ['Web app', true, false],
  ['Business model', 'Subscription', 'Ad-supported'],
  ['Still available?', true, false],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-violet-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsPrismPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs Prism Bills Comparison',
            url: 'https://duezo.app/vs/prism',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
            Prism Bills
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Prism was the gold standard for bill tracking. It shut down in December 2023, leaving thousands of users looking for a replacement. Here&apos;s how Duezo compares.
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
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Prism (RIP)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, prism], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={prism} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What happened to Prism */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">What Happened to Prism?</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            In December 2023, Prism Bills announced it was shutting down permanently. They cited challenges with maintaining integrations with thousands of billers and the costs of running a free, ad-supported service.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            For years, Prism was the best way to track and pay bills in one place. Users loved the clean interface, automatic bill detection, and the ability to pay bills directly through the app.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            When Prism shut down, thousands of people lost their favorite bill tracker — and started searching for an alternative that actually cared about bill tracking.
          </p>
        </div>
      </section>

      {/* How Duezo is different */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How Duezo Is Different</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-2">🔄 A Different (More Sustainable) Approach</h3>
            <p className="text-zinc-400">
              Prism connected directly to billers, which was amazing — but also incredibly expensive and fragile. Every time a biller changed their system, Prism had to fix it. 
              <strong className="text-white"> Duezo takes a different approach:</strong> we scan your Gmail for bill notifications. 
              It&apos;s simpler, more reliable, and doesn&apos;t require maintaining integrations with thousands of companies.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">💳 No Bill Payments (By Design)</h3>
            <p className="text-zinc-400">
              Prism let you pay bills directly in the app. That was convenient, but it was also part of what made Prism unsustainable. 
              Duezo focuses on <strong className="text-white">tracking and reminding</strong> — not payments. 
              When a bill is due, we send you to the biller&apos;s website or app. It&apos;s one extra tap, but it keeps Duezo simple and reliable.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">💰 Paid App = Sustainable App</h3>
            <p className="text-zinc-400">
              Prism was free, which was great for users — but terrible for business. They tried ads, but it wasn&apos;t enough to cover costs. 
              <strong className="text-white"> Duezo costs $4.99/mo</strong> (about the price of Netflix). 
              That means we can stay in business, keep improving the app, and not shut down like Prism did.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">⏰ Countdown Timers (Better Than Due Dates)</h3>
            <p className="text-zinc-400">
              Prism showed you when bills were due. Duezo shows you a <strong className="text-white">live countdown</strong> — 
              &quot;2 days, 6 hours until your electric bill is due.&quot; It&apos;s harder to ignore, more visual, and helps you never miss a payment.
            </p>
          </div>
        </div>
      </section>

      {/* What Prism users are saying */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">What Former Prism Users Are Saying</h2>
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-300 italic mb-3">
              &quot;I was devastated when Prism shut down. Duezo is the first app that actually feels like a worthy replacement. The countdown timers are even better than Prism&apos;s due dates.&quot;
            </p>
            <p className="text-zinc-500 text-sm">— Sarah M., former Prism user</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-300 italic mb-3">
              &quot;I don&apos;t mind paying $5/mo if it means the app won&apos;t disappear like Prism did. Duezo does everything I need.&quot;
            </p>
            <p className="text-zinc-500 text-sm">— James R., switched from Prism</p>
          </div>
        </div>
      </section>

      {/* When to choose Duezo */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-4 text-violet-400">Choose Duezo if you…</h2>
          <ul className="space-y-3 text-zinc-300">
            {[
              'Loved Prism and want a replacement',
              'Want bill tracking that won\'t shut down',
              'Don\'t mind paying $5/mo for a sustainable app',
              'Prefer email scanning over direct biller connections',
              'Want countdown timers for visual urgency',
              'Need both iOS and web access',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Honest acknowledgment */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">Let&apos;s Be Honest</h3>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Duezo isn&apos;t a perfect clone of Prism. We can&apos;t be — Prism&apos;s approach was unsustainable, which is why it shut down.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            We don&apos;t have direct biller payments. We don&apos;t support every single biller on earth. But what we do have is:
          </p>
          <ul className="space-y-2 text-zinc-300 text-lg ml-6 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-violet-400">•</span>
              A sustainable business model that won&apos;t disappear
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400">•</span>
              AI-powered email scanning that works with any biller
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400">•</span>
              Countdown timers that make sure you never miss a bill
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400">•</span>
              A team that actually cares about bill tracking
            </li>
          </ul>
          <p className="text-zinc-300 text-lg leading-relaxed">
            If you loved Prism, give Duezo a try. We built it for people like you.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Replace Prism?</h2>
        <p className="text-zinc-400 text-lg mb-8">
          Built for former Prism users. Designed to last.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-zinc-500 text-sm mt-4">$4.99/mo · Sustainable · Cancel anytime</p>
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
