import {
  Home,
  Zap as Bolt,
  Wifi,
  Tv,
  Phone,
  CreditCard,
  Shield,
  Car,
  Heart,
  Dumbbell,
  Droplet,
  Flame,
  Trash2,
  Building,
  Music,
  Film,
  DollarSign,
  FileText,
  Receipt,
  LucideIcon,
} from 'lucide-react';
import { BillIconKey } from '@/types';

// Icon mapping for bill categories - maps icon keys to Lucide icons
export const iconMap: Record<BillIconKey, LucideIcon> = {
  home: Home,
  bolt: Bolt,
  wifi: Wifi,
  tv: Tv,
  phone: Phone,
  creditcard: CreditCard,
  shield: Shield,
  car: Car,
  heart: Heart,
  dumbbell: Dumbbell,
  water: Droplet,
  flame: Flame,
  trash: Trash2,
  building: Building,
  music: Music,
  film: Film,
  dollar: DollarSign,
  file: FileText,
};

// Auto-detect icon from bill name
export function getIconFromName(name: string): { icon: LucideIcon; colorClass: string } {
  const lowerName = name.toLowerCase();

  // Utilities - Electric/Power
  if (lowerName.includes('electric') || lowerName.includes('power') || lowerName.includes('energy') || lowerName.includes('txu') || lowerName.includes('reliant')) {
    return { icon: Bolt, colorClass: 'text-yellow-400' };
  }

  // Utilities - Gas
  if (lowerName.includes('gas') || lowerName.includes('propane')) {
    return { icon: Flame, colorClass: 'text-orange-400' };
  }

  // Utilities - Water
  if (lowerName.includes('water') || lowerName.includes('sewer') || lowerName.includes('utility')) {
    return { icon: Droplet, colorClass: 'text-cyan-400' };
  }

  // Internet/WiFi
  if (lowerName.includes('internet') || lowerName.includes('wifi') || lowerName.includes('broadband') || lowerName.includes('spectrum') || lowerName.includes('comcast') || lowerName.includes('xfinity') || lowerName.includes('att') || lowerName.includes('at&t') || lowerName.includes('verizon fios')) {
    return { icon: Wifi, colorClass: 'text-blue-400' };
  }

  // Phone/Mobile
  if (lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('cell') || lowerName.includes('verizon') || lowerName.includes('t-mobile') || lowerName.includes('tmobile') || lowerName.includes('sprint')) {
    return { icon: Phone, colorClass: 'text-green-400' };
  }

  // Streaming/TV
  if (lowerName.includes('netflix') || lowerName.includes('hulu') || lowerName.includes('disney') || lowerName.includes('hbo') || lowerName.includes('streaming') || lowerName.includes('cable') || lowerName.includes('directv') || lowerName.includes('youtube') || lowerName.includes('peacock') || lowerName.includes('paramount') || lowerName.includes('apple tv')) {
    return { icon: Tv, colorClass: 'text-purple-400' };
  }

  // Music subscriptions
  if (lowerName.includes('spotify') || lowerName.includes('apple music') || lowerName.includes('pandora') || lowerName.includes('tidal') || lowerName.includes('music')) {
    return { icon: Music, colorClass: 'text-green-400' };
  }

  // Auto/Car
  if (lowerName.includes('auto') || lowerName.includes('car') || lowerName.includes('vehicle') || lowerName.includes('toyota') || lowerName.includes('ford') || lowerName.includes('honda') || lowerName.includes('chevy') || lowerName.includes('lease')) {
    return { icon: Car, colorClass: 'text-red-400' };
  }

  // Insurance
  if (lowerName.includes('insurance') || lowerName.includes('geico') || lowerName.includes('allstate') || lowerName.includes('state farm') || lowerName.includes('progressive') || lowerName.includes('liberty mutual')) {
    return { icon: Shield, colorClass: 'text-indigo-400' };
  }

  // Rent/Mortgage/Housing
  if (lowerName.includes('rent') || lowerName.includes('mortgage') || lowerName.includes('apartment') || lowerName.includes('housing') || lowerName.includes('hoa') || lowerName.includes('lease')) {
    return { icon: Home, colorClass: 'text-amber-400' };
  }

  // Credit Card
  if (lowerName.includes('credit') || lowerName.includes('visa') || lowerName.includes('mastercard') || lowerName.includes('amex') || lowerName.includes('discover') || lowerName.includes('chase') || lowerName.includes('capital one') || lowerName.includes('citi') || lowerName.includes('bank of america') || lowerName.includes('wells fargo')) {
    return { icon: CreditCard, colorClass: 'text-blue-400' };
  }

  // Health/Medical/Gym
  if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('doctor') || lowerName.includes('dental') || lowerName.includes('pharmacy')) {
    return { icon: Heart, colorClass: 'text-rose-400' };
  }

  if (lowerName.includes('gym') || lowerName.includes('fitness') || lowerName.includes('planet') || lowerName.includes('la fitness') || lowerName.includes('equinox') || lowerName.includes('peloton')) {
    return { icon: Dumbbell, colorClass: 'text-orange-400' };
  }

  // Loans
  if (lowerName.includes('loan') || lowerName.includes('student') || lowerName.includes('personal') || lowerName.includes('sallie mae') || lowerName.includes('navient') || lowerName.includes('sofi')) {
    return { icon: DollarSign, colorClass: 'text-green-400' };
  }

  // Trash/Waste
  if (lowerName.includes('trash') || lowerName.includes('waste') || lowerName.includes('garbage') || lowerName.includes('recycling')) {
    return { icon: Trash2, colorClass: 'text-zinc-400' };
  }

  // Default
  return { icon: Receipt, colorClass: 'text-emerald-400' };
}

// Category color schemes for consistent styling
export const categoryColors: Record<string, { bg: string; border: string; accent: string }> = {
  utilities: { bg: 'from-yellow-500/15 to-orange-500/10', border: 'border-yellow-500/30', accent: 'bg-yellow-500' },
  subscription: { bg: 'from-purple-500/15 to-violet-500/10', border: 'border-purple-500/30', accent: 'bg-purple-500' },
  rent: { bg: 'from-amber-500/15 to-orange-500/10', border: 'border-amber-500/30', accent: 'bg-amber-500' },
  housing: { bg: 'from-amber-500/15 to-orange-500/10', border: 'border-amber-500/30', accent: 'bg-amber-500' },
  insurance: { bg: 'from-indigo-500/15 to-blue-500/10', border: 'border-indigo-500/30', accent: 'bg-indigo-500' },
  phone: { bg: 'from-green-500/15 to-emerald-500/10', border: 'border-green-500/30', accent: 'bg-green-500' },
  internet: { bg: 'from-blue-500/15 to-cyan-500/10', border: 'border-blue-500/30', accent: 'bg-blue-500' },
  credit_card: { bg: 'from-blue-500/15 to-indigo-500/10', border: 'border-blue-500/30', accent: 'bg-blue-500' },
  loan: { bg: 'from-green-500/15 to-teal-500/10', border: 'border-green-500/30', accent: 'bg-green-500' },
  health: { bg: 'from-rose-500/15 to-pink-500/10', border: 'border-rose-500/30', accent: 'bg-rose-500' },
  other: { bg: 'from-emerald-500/15 to-teal-500/10', border: 'border-emerald-500/30', accent: 'bg-emerald-500' },
};

export function getCategoryColors(category: string | null) {
  return categoryColors[category || 'other'] || categoryColors.other;
}

// Helper to get icon component from bill - prefers explicit icon_key, falls back to auto-detection
export function getBillIcon(bill: { icon_key?: string | null; name: string }): { icon: LucideIcon; colorClass: string; isAutoDetected: boolean } {
  if (bill.icon_key && bill.icon_key in iconMap) {
    const icon = iconMap[bill.icon_key as BillIconKey];
    // For explicit icons, use emerald as default color
    return { icon, colorClass: 'text-emerald-400', isAutoDetected: false };
  }

  const autoDetected = getIconFromName(bill.name);
  return { ...autoDetected, isAutoDetected: true };
}
