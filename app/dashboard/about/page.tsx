import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/logo-transparent-96.png"
          alt="Duezo"
          width={80}
          height={80}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-white mb-1">
          Due<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-300">zo</span>
        </h1>
        <p className="text-sm text-zinc-400 mb-1">Version 1.0.0</p>
        <p className="text-sm text-zinc-500 mb-8">Never miss a bill again.</p>

        <div className="space-y-3 mb-10">
          <Link
            href="/privacy"
            className="block w-full px-4 py-3 rounded-xl text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="block w-full px-4 py-3 rounded-xl text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            Terms of Service
          </Link>
          <a
            href="mailto:support@duezo.app"
            className="block w-full px-4 py-3 rounded-xl text-sm font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
          >
            Contact Support
          </a>
        </div>

        <p className="text-xs text-zinc-600">Made with ❤️ in Texas</p>
      </div>
    </div>
  );
}
