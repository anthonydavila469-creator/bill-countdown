'use client';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 20, color: 'white', background: '#111' }}>
      <h2>Login Page Error</h2>
      <pre style={{ whiteSpace: 'pre-wrap', color: '#f88' }}>
        {error.message}
      </pre>
      <p>Digest: {error.digest}</p>
      <button onClick={reset} style={{ padding: '8px 16px', marginTop: 10 }}>
        Try again
      </button>
    </div>
  );
}
