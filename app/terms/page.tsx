import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Duezo',
  description: 'Terms and conditions for using Duezo.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0F0A1E] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Due<span className="text-violet-400">zo</span>
              </span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-zinc-500 text-sm">Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10">
          {/* Introduction */}
          <section>
            <p className="text-zinc-300 leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Duezo
              (&ldquo;the Service&rdquo;), operated at duezo.app. By creating an account or using
              the Service, you agree to be bound by these Terms.
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Service Description</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>
                Duezo is a bill tracking application that helps you manage and track
                bill due dates. The Service includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Manual bill creation and tracking with countdown cards</li>
                <li>Optional Gmail integration to detect bills from your inbox</li>
                <li>Bill detail extraction (amounts, due dates, categories)</li>
                <li>Payment reminders and notifications</li>
                <li>Calendar view and payment history</li>
                <li>Home screen widgets</li>
              </ul>
              <p>
                Duezo is a bill <em>tracking</em> tool. We do not process payments, transfer funds,
                or act as a financial institution. Duezo is free to use.
              </p>
            </div>
          </section>

          {/* Account Responsibilities */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Account Responsibilities</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>When you create an account, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Provide accurate and complete information</li>
                <li>Keep your login credentials secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Be responsible for all activity that occurs under your account</li>
              </ul>
              <p>
                You must be at least 18 years old to use the Service. Accounts are for individual
                use only and may not be shared.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Acceptable Use</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to other users&rsquo; data</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Reverse-engineer, decompile, or attempt to extract the source code</li>
                <li>Use automated tools to scrape or extract data from the Service</li>
                <li>Resell, sublicense, or redistribute access to the Service</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Limitation of Liability</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>
                Duezo is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
                warranties of any kind, either express or implied.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  We do not guarantee that bill information will be 100% accurate.
                  Always verify amounts and due dates before making payments.
                </li>
                <li>
                  We are not responsible for late fees, missed payments, or financial losses
                  resulting from reliance on the Service.
                </li>
              </ul>
              <p>
                We strive for high uptime but do not guarantee uninterrupted availability. Scheduled
                maintenance and unforeseen outages may occur.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Changes to These Terms</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by
              email or through a notice within the application. Continued use of Duezo after changes
              take effect constitutes acceptance of the updated Terms. If you do not agree with the
              changes, you may delete your account at any time.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a
                href="mailto:support@duezo.app"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                support@duezo.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Duezo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <span className="text-white">Terms</span>
              <a href="mailto:support@duezo.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Duezo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
