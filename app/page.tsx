import Link from 'next/link';
import Image from 'next/image';
import { BillCard } from '@/components/bill-card';
import { Bill } from '@/types';
import {
  Mail,
  Sparkles,
  Bell,
  Moon,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Repeat,
  Calendar,
  BarChart3,
  Check,
  X,
  Crown,
} from 'lucide-react';

// Demo bills for the hero showcase
const demoBills: Bill[] = [
  {
    id: '1',
    user_id: 'demo',
    name: 'Netflix',
    amount: 22.99,
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    emoji: '📺',
    category: 'subscription',
    is_paid: false,
    paid_at: null,
    paid_method: null,
    last_paid_amount: null,
    is_recurring: true,
    recurrence_interval: 'monthly',
    recurrence_day_of_month: null,
    recurrence_weekday: null,
    next_due_date: null,
    parent_bill_id: null,
    generated_next: false,
    source: 'gmail',
    gmail_message_id: null,
    payment_url: null,
    is_autopay: true,
    previous_amount: 15.99, // Shows price increase!
    icon_key: 'tv',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'demo',
    name: 'Electric Bill',
    amount: 142.50,
    due_date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    emoji: '💡',
    category: 'utilities',
    is_paid: false,
    paid_at: null,
    paid_method: null,
    last_paid_amount: null,
    is_recurring: true,
    recurrence_interval: 'monthly',
    recurrence_day_of_month: null,
    recurrence_weekday: null,
    next_due_date: null,
    parent_bill_id: null,
    generated_next: false,
    source: 'gmail',
    gmail_message_id: null,
    payment_url: null,
    is_autopay: false,
    previous_amount: null,
    icon_key: 'bolt',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'demo',
    name: 'Rent',
    amount: 1850.00,
    due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    emoji: '🏠',
    category: 'rent',
    is_paid: false,
    paid_at: null,
    paid_method: null,
    last_paid_amount: null,
    is_recurring: true,
    recurrence_interval: 'monthly',
    recurrence_day_of_month: null,
    recurrence_weekday: null,
    next_due_date: null,
    parent_bill_id: null,
    generated_next: false,
    source: 'manual',
    gmail_message_id: null,
    payment_url: null,
    is_autopay: true,
    previous_amount: null,
    icon_key: 'home',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const features = [
  {
    icon: Mail,
    title: 'AI Email Sync',
    description:
      'Connect Gmail and let AI automatically detect and extract bills from your inbox.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Sparkles,
    title: 'Beautiful Countdowns',
    description:
      'Stunning visual cards that change color as due dates approach. Never lose track.',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    icon: Bell,
    title: 'Smart Reminders',
    description:
      'Get notified 7 days, 3 days, and 1 day before each bill is due.',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    icon: Repeat,
    title: 'Recurring Bills',
    description:
      'Set up weekly, biweekly, monthly, or yearly bills that auto-generate on schedule.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Calendar,
    title: 'Calendar View',
    description:
      'See all your bills on a monthly calendar. Drag and drop to reschedule due dates.',
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description:
      'Track spending trends, category breakdowns, and monthly comparisons at a glance.',
    gradient: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Moon,
    title: 'Dark Mode',
    description:
      'Easy on your eyes with automatic dark mode that follows your system preference.',
    gradient: 'from-slate-500 to-zinc-600',
  },
];

const steps = [
  {
    number: '01',
    title: 'Connect Your Email',
    description:
      'Securely link your Gmail account with one click. We only read bill-related emails.',
    icon: Mail,
  },
  {
    number: '02',
    title: 'AI Extracts Bills',
    description:
      'Our AI scans your inbox and automatically identifies bills, amounts, and due dates.',
    icon: Sparkles,
  },
  {
    number: '03',
    title: 'Never Miss a Payment',
    description:
      'Watch your dashboard fill with beautiful countdown cards. Pay on time, every time.',
    icon: CheckCircle2,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-white overflow-hidden">
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/logo-transparent-64.png"
                alt="Duezo"
                width={32}
                height={32}
              />
              <span className="text-xl font-bold tracking-tight">
                Due<span className="text-blue-400">zo</span>
              </span>
            </div>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Pricing
              </a>
              <a
                href="#how-it-works"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                How it Works
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 text-sm font-medium bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                AI-Powered Bill Tracking
              </div>

              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
              >
                Never Miss a{' '}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Bill Payment
                </span>{' '}
                Again
              </h1>

              {/* Subheadline */}
              <p
                className="text-lg text-zinc-400 mb-8 max-w-lg mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
              >
                Connect your email and let AI automatically track your bills.
                Beautiful countdown cards show exactly when each payment is due.
              </p>

              {/* CTAs */}
              <div
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
              >
                <Link
                  href="/signup"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-full hover:opacity-90 transition-opacity"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                >
                  See How it Works
                </a>
              </div>

              {/* Trust indicators */}
              <div
                className="flex items-center gap-6 mt-10 justify-center lg:justify-start text-sm text-zinc-500 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  Bank-level security
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Free to start
                </div>
              </div>
            </div>

            {/* Right: App Preview */}
            <div
              className="relative animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
            >
              {/* Floating cards */}
              <div className="relative w-full max-w-md mx-auto">
                {/* Glow behind cards */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-3xl" />

                {/* Card stack with stagger animation */}
                <div className="relative space-y-4">
                  {demoBills.map((bill, index) => (
                    <div
                      key={bill.id}
                      className="animate-in fade-in slide-in-from-right-2"
                      style={{
                        animationDelay: `${400 + index * 150}ms`,
                        animationFillMode: 'backwards',
                        transform: `translateX(${index * 20}px)`,
                      }}
                    >
                      <BillCard bill={bill} variant="compact" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Stay on Top
              </span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Powerful features designed to make bill management effortless and
              even enjoyable.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="text-sm font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent uppercase tracking-wider">
              Simple Pricing
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Plan
              </span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">
              Start free and upgrade when you need more
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Card */}
            <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$0</span>
                  <span className="text-zinc-500">/forever</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Up to 5 bills</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Bill templates for quick setup</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Due date tracking & reminders</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>1 Gmail sync to try AI extraction</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-500">
                  <X className="w-5 h-5 text-zinc-600 flex-shrink-0" />
                  <span>Calendar view</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-500">
                  <X className="w-5 h-5 text-zinc-600 flex-shrink-0" />
                  <span>Analytics & insights</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full py-3 text-center font-semibold bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Card */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/30">
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-full text-white">
                  Best Value
                </span>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-bold text-white">Pro</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">$4.99</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="text-sm text-emerald-400 mt-1">
                  or $39.99/year (save 33%)
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Unlimited bills</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Unlimited Gmail syncs + daily auto-sync</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Payment links ("Pay Now")</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Calendar view</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Analytics & insights</span>
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>Full notification controls</span>
                </li>
              </ul>

              <Link
                href="/signup"
                className="block w-full py-3 text-center font-semibold bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 rounded-xl transition-opacity"
              >
                Get Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="how-it-works"
        className="relative py-24 border-t border-white/5"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Get Started in{' '}
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                3 Simple Steps
              </span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              From signup to peace of mind in under 5 minutes.
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-blue-500/30 via-violet-500/20 to-transparent" />
                )}

                <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.04]">
                  {/* Step number + Icon row */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="text-5xl font-bold bg-gradient-to-b from-white/10 to-white/[0.02] bg-clip-text text-transparent select-none">
                      {step.number}
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <step.icon className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[300px] bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-[100px]" />
          </div>

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Ready to Take Control of{' '}
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                Your Bills?
              </span>
            </h2>
            <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
              Join thousands of users who never miss a payment. Start for free,
              upgrade when you need more.
            </p>

            <Link
              href="/signup"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="text-sm text-zinc-500 mt-4">
              No credit card required • Free forever for up to 5 bills
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Image
                src="/logo-transparent-48.png"
                alt="Duezo"
                width={24}
                height={24}
              />
              <span className="font-semibold">Duezo</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <a href="mailto:support@duezo.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>

            {/* Copyright */}
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} Duezo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
