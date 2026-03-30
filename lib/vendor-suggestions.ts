import { BillCategory } from '@/types';

export interface VendorSuggestion {
  name: string;
  typical_amount: number | null;
  typical_due_day: number | null;
  category: BillCategory;
  icon_key: string;
  payment_url: string | null;
}

export const vendorDatabase: VendorSuggestion[] = [
  // Streaming & Entertainment
  { name: 'Netflix', typical_amount: 17.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.netflix.com/account' },
  { name: 'Spotify', typical_amount: 11.99, typical_due_day: null, category: 'subscription', icon_key: 'music', payment_url: 'https://www.spotify.com/account' },
  { name: 'Hulu', typical_amount: 9.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://secure.hulu.com/account' },
  { name: 'Disney+', typical_amount: 13.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.disneyplus.com/account' },
  { name: 'YouTube Premium', typical_amount: 13.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.youtube.com/paid_memberships' },
  { name: 'Amazon Prime', typical_amount: 14.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.amazon.com/gp/primecentral' },
  { name: 'Max', typical_amount: 16.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.max.com/account' },
  { name: 'Paramount+', typical_amount: 11.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.paramountplus.com/account/' },
  { name: 'Peacock', typical_amount: 7.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.peacocktv.com/account' },
  { name: 'Apple TV+', typical_amount: 9.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://tv.apple.com/account' },
  { name: 'Apple Music', typical_amount: 10.99, typical_due_day: null, category: 'subscription', icon_key: 'music', payment_url: 'https://music.apple.com/account' },
  { name: 'Apple One', typical_amount: 19.95, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://one.apple.com' },
  { name: 'Audible', typical_amount: 14.95, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.audible.com/account' },
  { name: 'Crunchyroll', typical_amount: 7.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.crunchyroll.com/account' },

  // Cloud & Software
  { name: 'iCloud+', typical_amount: 2.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.icloud.com/account' },
  { name: 'Google One', typical_amount: 2.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://one.google.com' },
  { name: 'Dropbox', typical_amount: 11.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://www.dropbox.com/account' },
  { name: 'Microsoft 365', typical_amount: 9.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://account.microsoft.com/services' },
  { name: 'Adobe Creative Cloud', typical_amount: 59.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://account.adobe.com' },

  // Gaming
  { name: 'Xbox Game Pass', typical_amount: 16.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://account.xbox.com/subscriptions' },
  { name: 'PlayStation Plus', typical_amount: 13.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://store.playstation.com/subscriptions' },
  { name: 'Nintendo Switch Online', typical_amount: 3.99, typical_due_day: null, category: 'subscription', icon_key: 'tv', payment_url: 'https://accounts.nintendo.com' },

  // Phone
  { name: 'T-Mobile', typical_amount: 75.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://www.t-mobile.com/account' },
  { name: 'Verizon Wireless', typical_amount: 80.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://www.verizon.com/signin' },
  { name: 'AT&T Wireless', typical_amount: 75.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://www.att.com/my' },
  { name: 'Mint Mobile', typical_amount: 25.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://my.mintmobile.com' },
  { name: 'Cricket Wireless', typical_amount: 55.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://www.cricketwireless.com/myaccount' },
  { name: 'Google Fi', typical_amount: 35.00, typical_due_day: null, category: 'phone', icon_key: 'phone', payment_url: 'https://fi.google.com/account' },

  // Internet
  { name: 'Xfinity Internet', typical_amount: 75.00, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://customer.xfinity.com/billing' },
  { name: 'Spectrum Internet', typical_amount: 49.99, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://www.spectrum.net/billing' },
  { name: 'AT&T Internet', typical_amount: 55.00, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://www.att.com/my' },
  { name: 'Verizon Fios', typical_amount: 49.99, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://www.verizon.com/signin' },
  { name: 'Starlink', typical_amount: 120.00, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://www.starlink.com/account' },
  { name: 'Google Fiber', typical_amount: 70.00, typical_due_day: null, category: 'internet', icon_key: 'wifi', payment_url: 'https://fiber.google.com/account' },

  // Insurance
  { name: 'GEICO', typical_amount: 150.00, typical_due_day: null, category: 'insurance', icon_key: 'shield', payment_url: 'https://www.geico.com/login' },
  { name: 'Progressive', typical_amount: 140.00, typical_due_day: null, category: 'insurance', icon_key: 'shield', payment_url: 'https://account.progressive.com' },
  { name: 'State Farm', typical_amount: 155.00, typical_due_day: null, category: 'insurance', icon_key: 'shield', payment_url: 'https://www.statefarm.com/customer-care/insurance-bill-pay' },
  { name: 'Allstate', typical_amount: 160.00, typical_due_day: null, category: 'insurance', icon_key: 'shield', payment_url: 'https://myaccount.allstate.com' },

  // Credit Cards
  { name: 'Chase Credit Card', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: 'https://www.chase.com/personal/credit-cards/login-account-management' },
  { name: 'Capital One', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: 'https://myaccounts.capitalone.com' },
  { name: 'American Express', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: 'https://www.americanexpress.com/en-us/account/login' },
  { name: 'Discover Card', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: 'https://portal.discover.com' },
  { name: 'Citi Credit Card', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: 'https://online.citi.com' },
  { name: 'Apple Card', typical_amount: null, typical_due_day: null, category: 'credit_card', icon_key: 'creditcard', payment_url: null },

  // Utilities
  { name: 'Electric Bill', typical_amount: 120.00, typical_due_day: null, category: 'utilities', icon_key: 'bolt', payment_url: null },
  { name: 'Water Bill', typical_amount: 50.00, typical_due_day: null, category: 'utilities', icon_key: 'water', payment_url: null },
  { name: 'Gas Bill', typical_amount: 60.00, typical_due_day: null, category: 'utilities', icon_key: 'flame', payment_url: null },
  { name: 'Trash/Waste', typical_amount: 35.00, typical_due_day: null, category: 'utilities', icon_key: 'trash', payment_url: null },

  // Loans
  { name: 'Car Payment', typical_amount: 400.00, typical_due_day: null, category: 'loan', icon_key: 'car', payment_url: null },
  { name: 'Student Loan', typical_amount: 300.00, typical_due_day: null, category: 'loan', icon_key: 'dollar', payment_url: null },

  // Rent & Housing
  { name: 'Rent', typical_amount: null, typical_due_day: 1, category: 'rent', icon_key: 'home', payment_url: null },
  { name: 'Mortgage', typical_amount: null, typical_due_day: 1, category: 'housing', icon_key: 'building', payment_url: null },
  { name: 'HOA Fee', typical_amount: null, typical_due_day: 1, category: 'housing', icon_key: 'building', payment_url: null },

  // Health & Fitness
  { name: 'Planet Fitness', typical_amount: 25.00, typical_due_day: null, category: 'health', icon_key: 'dumbbell', payment_url: 'https://www.planetfitness.com/my-account' },
  { name: 'Peloton', typical_amount: 44.00, typical_due_day: null, category: 'health', icon_key: 'dumbbell', payment_url: 'https://www.onepeloton.com/settings/subscriptions' },
];

/**
 * Search vendors by name prefix (case-insensitive, fuzzy).
 * Returns up to `limit` matches, prioritizing prefix matches.
 */
export function searchVendors(query: string, limit = 6): VendorSuggestion[] {
  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();

  // Prefix matches first, then includes matches
  const prefixMatches: VendorSuggestion[] = [];
  const includesMatches: VendorSuggestion[] = [];

  for (const vendor of vendorDatabase) {
    const name = vendor.name.toLowerCase();
    if (name.startsWith(q)) {
      prefixMatches.push(vendor);
    } else if (name.includes(q)) {
      includesMatches.push(vendor);
    }
  }

  return [...prefixMatches, ...includesMatches].slice(0, limit);
}
