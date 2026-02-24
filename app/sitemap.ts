import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://duezo.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://duezo.app/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://duezo.app/signup',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://duezo.app/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://duezo.app/vs',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // SEO landing pages
    {
      url: 'https://duezo.app/prism-alternative',
      lastModified: new Date('2026-02-11'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://duezo.app/finovera-alternative',
      lastModified: new Date('2026-02-19'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://duezo.app/mint-alternative',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://duezo.app/vs/rocket-money',
      lastModified: new Date('2026-02-11'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/vs/ynab',
      lastModified: new Date('2026-02-11'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/vs/mint',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/vs/copilot-money',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://duezo.app/vs/chronicle',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://duezo.app/vs/prism',
      lastModified: new Date('2026-02-20'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Blog
    {
      url: 'https://duezo.app/blog',
      lastModified: new Date('2026-02-19'),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: 'https://duezo.app/blog/best-prism-alternatives-2026',
      lastModified: new Date('2026-02-11'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/blog/bill-tracker-no-bank-account',
      lastModified: new Date('2026-02-19'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://duezo.app/blog/best-bill-reminder-app-2026',
      lastModified: new Date('2026-02-24'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
