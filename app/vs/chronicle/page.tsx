import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs Chronicle: Which Bill Organizer Is Better? (2026) | Duezo',
  description:
    'Compare Duezo vs Chronicle Bill Organizer. Both are $4.99/mo, but Duezo scans your Gmail automatically while Chronicle requires manual entry. See the full comparison.',
  keywords: [
    'duezo vs chronicle',
    'chronicle bill organizer alternative',
    'chronicle vs duezo',
    'bill tracker comparison',
    'automatic bill tracking',
  ],
  openGraph: {
    title: 'Duezo vs Chronicle: Which Bill Organizer Is Better?',
    description: 'Same price, different approach. Chronicle requires manual entry. Duezo scans your email automatically.',
    url: 'https://duezo.app/vs/chronicle',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/chronicle' },
};

type Row = [string, string | boolean, string | boolean];

const rows: Row[] = [
  ['Monthly price', '$4.99/mo', '$4.99/mo'],
  ['Annual price', '$39.99/yr', '$49.99/yr'],
  ['Bill tracking', true, true],
  ['Countdown timers', true, false],
  ['AI email scanning', true, false],
  ['Manual bill entry', 'Optional', 'Required'],
  ['iOS app', true, true],
  ['Web app', true, false],
  ['Android support', 'Coming soon', false],
  ['Price increase alerts', true, false],
  ['Bill payment reminders', true, true],
  ['Dark mode', true, true],
  ['Setup time', '~2 min', '~10 min'],
  ['Privacy-focused', true, true],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-orange-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsChroniclePage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs Chronicle Comparison',
            url: 'https://duezo.app/vs/chronicle',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            Chronicle
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Both apps track bills. Both cost $4.99/mo. But Chronicle makes you type in every bill manually. Duezo scans your email and does it for you.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-orange-400 font-medium">Duezo</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Chronicle</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, chronicle], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={chronicle} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* When to choose each */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-orange-400">Choose Duezo if you…</h2>
            <ul className="space-y-3 text-zinc-300">
              {[
                'Want bills detected automatically from email',
                'Don\'t want to manually type in due dates',
                'Need both iOS and web access',
                'Want visual countdown timers',
                'Want price increase alerts',
                'Prefer automation over manual tracking',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-zinc-300">Choose Chronicle if you…</h2>
            <ul className="space-y-3 text-zinc-400">
              {[
                'Prefer full manual control over entries',
                'Don\'t mind typing in all your bills',
                'Only need an iOS app (no web)',
                'Already have a system for organizing bills',
                'Want a simple, no-frills organizer',
                'Don\'t use email for most bills',
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

      {/* Key differences */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">The Big Difference</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-2">🤖 Automation vs Manual Entry</h3>
            <p className="text-zinc-400">
              This is the core difference. Chronicle is a beautiful, simple bill organizer — but you have to type in every bill, every due date, every amount. 
              Duezo uses AI to scan your Gmail and automatically detect bills. That means <strong className="text-white">zero manual entry</strong> for most users.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">📱 Platform Support</h3>
            <p className="text-zinc-400">
              Chronicle is iOS-only. If you ever want to check your bills on a computer or Android device, you&apos;re out of luck. 
              Duezo works on <strong className="text-white">iOS and the web</strong>, so you can access your bills from anywhere.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">⏰ Countdown Timers</h3>
            <p className="text-zinc-400">
              Chronicle shows you when bills are due. Duezo shows you a live countdown — &quot;3 days, 4 hours until Netflix is due.&quot; 
              It&apos;s more visual and harder to ignore, which means <strong className="text-white">fewer missed payments</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Honest take */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">Honest Take</h3>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Chronicle is a solid app. It&apos;s clean, privacy-focused, and does what it says. But in 2026, manually typing in bills feels outdated.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            If you&apos;re going to pay $4.99/mo for a bill tracker, why not get one that <strong className="text-white">does the work for you</strong>? 
            That&apos;s the philosophy behind Duezo.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Try Duezo?</h2>
        <p className="text-zinc-400 text-lg mb-8">
          Automatic bill detection. No manual entry. $4.99/mo.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
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
