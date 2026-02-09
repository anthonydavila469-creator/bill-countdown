'use client';

import { useState } from 'react';
import { Smartphone, Copy, Check, RefreshCw, Eye, EyeOff } from 'lucide-react';

export function WidgetSection() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const generateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/widget/token');
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
      }
    } catch (error) {
      console.error('Failed to generate token:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <Smartphone className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white">iOS Widget</h3>
          <p className="text-sm text-zinc-400">Add a widget to your home screen</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <h4 className="text-sm font-medium text-white mb-3">Setup Instructions</h4>
        <ol className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <span className="text-orange-400 font-medium">1.</span>
            Generate your widget token below
          </li>
          <li className="flex gap-2">
            <span className="text-orange-400 font-medium">2.</span>
            Long-press on your home screen
          </li>
          <li className="flex gap-2">
            <span className="text-orange-400 font-medium">3.</span>
            Tap the + button and search for "Duezo"
          </li>
          <li className="flex gap-2">
            <span className="text-orange-400 font-medium">4.</span>
            Choose your widget size and add it
          </li>
        </ol>
      </div>

      {/* Token Section */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white">Widget Token</h4>
          <span className="text-xs text-zinc-500">Valid for 30 days</span>
        </div>

        {!token ? (
          <button
            onClick={generateToken}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium text-sm hover:bg-orange-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                Generate Widget Token
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-lg bg-black/30 font-mono text-xs text-zinc-300 overflow-hidden">
                {showToken ? (
                  <span className="break-all">{token}</span>
                ) : (
                  <span>••••••••••••••••••••••••••••••••</span>
                )}
              </div>
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {showToken ? (
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Eye className="w-4 h-4 text-zinc-400" />
                )}
              </button>
              <button
                onClick={copyToken}
                className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
            <button
              onClick={generateToken}
              disabled={loading}
              className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Regenerate Token
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Keep this token private. If you regenerate it, you'll need to update your widget.
      </p>
    </div>
  );
}
