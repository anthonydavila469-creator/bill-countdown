'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { initPostHog } from '@/lib/posthog'

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}

export function PostHogPageview() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      posthog.capture('$pageview', { $current_url: window.origin + pathname })
    }
  }, [pathname])

  return null
}
