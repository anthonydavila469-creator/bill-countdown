import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { 
  Apple, 
  Calendar, 
  Bell, 
  LayoutDashboard, 
  Camera, 
  History, 
  Palette, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight,
  Zap,
  Smartphone,
  CreditCard,
  EyeOff
} from "lucide-react";

const APP_STORE_URL = "https://apps.apple.com/us/app/duezo/id6759273131";

export default function GeminiPreviewPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans antialiased selection:bg-purple-500/30 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
        .mockup-shadow {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 20px 40px -10px rgba(0,0,0,0.8), 0 0 80px -20px rgba(147, 51, 234, 0.4);
        }
        .bg-grid-pattern {
          background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/duezo-d-logo-transparent.png" 
              alt="Duezo Logo" 
              width={32} 
              height={32} 
              className="w-8 h-8 object-contain"
            />
          </div>
          <Link 
            href={APP_STORE_URL}
            className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
          >
            <Apple className="w-4 h-4" />
            <span>Get the App</span>
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              Native iPhone Experience
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]">
              Every bill.<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Counted down.</span>
            </h1>
            
            <p className="text-2xl md:text-3xl text-zinc-400 mb-6 leading-tight font-light">
              Your brain can't track 10 due dates.<br className="hidden md:block"/> Your phone can.
            </p>
            
            <p className="text-lg text-zinc-300 mb-10 font-medium border-l-2 border-purple-500 pl-4 py-1 max-w-lg">
              Duezo is the bill countdown app for people who know what they owe but can't keep track of when it's all due. No bank linking. No budgets. Just every bill, counted down to the day.
            </p>

            <Link 
              href={APP_STORE_URL}
              className="flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-2xl text-lg font-bold hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] group"
            >
              <Apple className="w-6 h-6" />
              <span>Download for Free</span>
              <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
            </Link>
          </div>

          <div className="lg:col-span-6 relative h-[600px] w-full flex justify-center items-center">
            <div className="absolute inset-0 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            {/* Secondary Hero Phone (Behind and tilted right) */}
            <div className="absolute right-0 sm:-right-4 top-12 w-[260px] sm:w-[280px] rounded-[48px] border-[8px] border-zinc-900 bg-black/80 shadow-2xl overflow-hidden aspect-[1179/2556] z-10 rotate-[8deg] opacity-60 scale-95 blur-[1px]">
               <Image
                src="/new_dashboard.jpg"
                alt="Duezo Dashboard Detail"
                fill
                className="object-cover object-bottom"
                priority
              />
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Primary Hero Phone */}
            <div className="relative w-[280px] sm:w-[320px] rounded-[48px] border-[8px] border-zinc-900 bg-black mockup-shadow overflow-hidden aspect-[1179/2556] z-20 rotate-[-2deg] hover:rotate-0 transition-transform duration-700">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-black rounded-full z-20" />
              <Image
                src="/new_dashboard.jpg"
                alt="Duezo Dashboard"
                fill
                className="object-cover"
                priority
              />
            </div>
            
            {/* Floating Alert */}
            <div className="absolute -left-4 sm:left-4 top-1/4 z-30 bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '4s' }}>
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <ShieldAlert className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Car Insurance</p>
                <p className="text-sm text-red-400 font-medium">Due Tomorrow</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUE PROP: NO BUDGETS, NO BANKS */}
      <section className="py-24 bg-zinc-950 px-6 border-y border-white/5 relative z-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5 flex flex-col items-start hover:bg-zinc-900/60 transition-colors">
            <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <EyeOff className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">No Bank Linking</h3>
            <p className="text-zinc-400 leading-relaxed text-lg">We don't want your bank login. Duezo is manual-first and private. Keep your bill tracking completely separate from your bank account.</p>
          </div>
          
          <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5 flex flex-col items-start hover:bg-zinc-900/60 transition-colors">
            <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Zap className="w-7 h-7 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Zero Budgeting</h3>
            <p className="text-zinc-400 leading-relaxed text-lg">We don't care how much you spent on coffee. Duezo is ruthlessly focused on one thing: making sure your bills are paid on time.</p>
          </div>

          <div className="bg-zinc-900/40 p-8 rounded-[32px] border border-white/5 flex flex-col items-start hover:bg-zinc-900/60 transition-colors">
            <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Smartphone className="w-7 h-7 text-zinc-300" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">iPhone Native</h3>
            <p className="text-zinc-400 leading-relaxed text-lg">Not a web wrapper. Built specifically for iOS with smooth haptics, seamless animations, and a premium feel you deserve.</p>
          </div>
        </div>
      </section>

      {/* PRODUCT MOMENT 1: AI PHOTO SCAN */}
      <section className="py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative flex justify-center">
            {/* Phone Mockup with AI Scan Overlay */}
            <div className="relative w-[300px] rounded-[48px] border-[8px] border-zinc-800 bg-black mockup-shadow overflow-hidden aspect-[1179/2556] z-20">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[32px] bg-black rounded-full z-20" />
              <Image
                src="/new_dashboard.jpg"
                alt="Duezo Dashboard AI Scan"
                fill
                className="object-cover blur-[3px]"
              />
              
              {/* Fake AI Scanner UI */}
              <div className="absolute inset-0 bg-black/50 z-10" />
              
              <div className="absolute inset-x-6 top-32 bottom-40 border-2 border-white/30 rounded-3xl z-20 overflow-hidden bg-white/5 backdrop-blur-sm shadow-2xl">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-xl" />
                
                {/* Scanning Laser */}
                <div className="absolute left-0 right-0 h-1 bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.9)] animate-scan z-30" />
                
                {/* Simulated Bill Snippet */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-white rounded-xl shadow-2xl p-4 opacity-95 transform -rotate-1">
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2 mb-3">
                    <div className="w-1/2 h-4 bg-zinc-300 rounded" />
                    <div className="w-8 h-8 bg-zinc-200 rounded-full" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                       <div className="text-[10px] text-zinc-500 font-bold mb-1">TOTAL AMOUNT</div>
                       <div className="text-lg font-bold text-black border-2 border-green-500 px-2 py-1 rounded inline-block">$124.50</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 font-bold mb-1">DUE DATE</div>
                      <div className="text-lg font-bold text-black border-2 border-purple-500 px-2 py-1 rounded inline-block">12 / 15</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-12 left-0 right-0 text-center z-20 flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mb-3">
                   <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                     <Camera className="w-6 h-6 text-black" />
                   </div>
                 </div>
                 <p className="text-white font-semibold text-sm drop-shadow-md">Extracting Details...</p>
              </div>
            </div>
            
            {/* Background Glow */}
            <div className="absolute inset-0 bg-purple-500/20 blur-[100px] rounded-full z-10" />
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-bold mb-6">
              <Camera className="w-4 h-4" />
              <span>Pro Feature</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Snap a picture.<br />We do the rest.
            </h2>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
              Don't want to type? Use AI Photo Scan to instantly extract the amount and due date from any paper statement or screen. Setting up a new bill takes seconds.
            </p>
            <ul className="space-y-5 text-lg text-zinc-300">
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <span className="font-medium">Reads amounts and dates automatically</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-purple-400" />
                </div>
                <span className="font-medium">Works on paper bills or digital screens</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* PRODUCT MOMENT 2: WIDGETS & NOTIFICATIONS */}
      <section className="py-24 md:py-32 px-6 bg-zinc-950 border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Out of sight,<br />never out of mind.
            </h2>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
              Bring your due dates to your Home Screen with beautiful, color-coded widgets. Combine them with custom push reminders, and you'll never be surprised by a bill again.
            </p>
            <div className="flex flex-col gap-8 mt-8">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <LayoutDashboard className="w-7 h-7 text-zinc-300" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Home Screen Widgets</h4>
                  <p className="text-zinc-400 text-lg">Multiple sizes to fit your setup. See exactly what's due at a glance without opening the app.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Bell className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Custom Reminder Timing</h4>
                  <p className="text-zinc-400 text-lg">Pro users can choose exactly when they want to be reminded—days before, or on the exact day.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative flex justify-center lg:justify-end items-center h-[500px]">
            {/* Background Phone Crop */}
            <div className="absolute right-0 w-[280px] h-[450px] rounded-l-[48px] border-y-[8px] border-l-[8px] border-zinc-800 bg-black overflow-hidden z-10 translate-x-4 shadow-2xl">
               <Image
                src="/new_dashboard.jpg"
                alt="Duezo Dashboard Cropped"
                fill
                className="object-cover object-top scale-110 origin-top"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Floating iOS Widget (Small Square) */}
            <div className="relative z-30 w-44 h-44 bg-zinc-900 rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 flex flex-col justify-between -translate-x-12 -translate-y-16 hover:scale-105 transition-transform duration-300">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Image src="/duezo-d-logo-transparent.png" alt="Icon" width={20} height={20} className="opacity-80" />
                </div>
                <div className="w-12 h-12 rounded-full border-[4px] border-red-500 flex items-center justify-center bg-zinc-800">
                  <span className="text-sm font-bold text-white">1</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-red-400 uppercase tracking-widest font-bold mb-1">Tomorrow</p>
                <p className="text-lg font-bold text-white leading-tight">Internet Bill</p>
              </div>
            </div>

            {/* Floating iOS Widget (Medium Rectangle) */}
            <div className="absolute z-20 w-80 h-40 bg-zinc-900 rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 flex flex-col justify-between translate-y-28 -translate-x-8 hover:scale-105 transition-transform duration-300">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <p className="text-lg font-bold text-white">Car Loan</p>
                </div>
                <p className="text-lg font-bold text-zinc-300">$450.00</p>
              </div>
              <div className="flex justify-between items-center pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                  <p className="text-lg font-bold text-white">Electric</p>
                </div>
                <p className="text-lg font-bold text-zinc-400">In 5 Days</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BENTO BOX FEATURES (Product Truth locked) */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Everything you need.<br/>Nothing you don't.</h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">Simple tools designed to reduce cognitive load and keep your payment history crystal clear.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Feature 1: Manual / Quick Add */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 md:col-span-2 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
              <div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <CreditCard className="w-7 h-7 text-zinc-300" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Quick & Manual Add</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">No tedious onboarding. Tap the plus button, enter a name, amount, and date. You're tracking a new bill in under 5 seconds.</p>
              </div>
            </div>

            {/* Feature 2: Calendar View */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
              <div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <Calendar className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">Calendar View</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">See your entire month at a glance. Visual dots show exactly when payments fall due.</p>
              </div>
            </div>

            {/* Feature 3: Payment History */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 flex flex-col justify-between hover:bg-zinc-900/60 transition-colors">
              <div>
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <History className="w-7 h-7 text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold mb-3">Payment History</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Keep a reliable record of what you paid and when. Look back at past months easily.</p>
              </div>
            </div>

            {/* Feature 4: Themes */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 md:col-span-2 flex flex-col sm:flex-row gap-8 items-center justify-between hover:bg-zinc-900/60 transition-colors">
              <div className="flex-1">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <Palette className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Custom Themes</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">Personalize Duezo to match your style. Includes Purple, Pink, Sunset, Mint, and Cherry themes to make the app yours.</p>
              </div>
              <div className="flex gap-3 p-5 bg-black/50 rounded-[24px] border border-white/5 shadow-inner">
                <div className="w-10 h-10 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] border-2 border-white/20" />
                <div className="w-10 h-10 rounded-full bg-pink-500 border-2 border-white/10" />
                <div className="w-10 h-10 rounded-full bg-orange-400 border-2 border-white/10" />
                <div className="w-10 h-10 rounded-full bg-emerald-400 border-2 border-white/10" />
                <div className="w-10 h-10 rounded-full bg-rose-500 border-2 border-white/10" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING (LOCKED TRUTH) */}
      <section className="py-24 bg-zinc-950 px-6 border-y border-white/5 relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Simple pricing.<br/>No surprises.</h2>
            <p className="text-xl text-zinc-400">Free to download. Upgrade only if you need more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-[40px] p-10 flex flex-col backdrop-blur-sm">
              <h3 className="text-3xl font-bold mb-2 text-white">Free Tier</h3>
              <div className="mb-6 flex items-end gap-2">
                <span className="text-6xl font-bold text-white">$0</span>
              </div>
              <p className="text-zinc-400 mb-10 text-lg">Perfect for tracking a few important bills.</p>
              
              <div className="flex-grow">
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-300 text-lg font-medium">Track up to 5 bills</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-300 text-lg font-medium">Manual / Quick add entry</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-300 text-lg font-medium">Standard push reminders</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-300 text-lg font-medium">Default Purple theme</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-gradient-to-b from-purple-900/40 to-zinc-900 border border-purple-500/30 rounded-[40px] p-10 relative flex flex-col shadow-[0_0_50px_rgba(168,85,247,0.1)] backdrop-blur-sm">
              <div className="absolute -top-4 right-10 bg-purple-500 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg">
                Duezo Pro
              </div>
              <h3 className="text-3xl font-bold mb-2 text-white">Yearly</h3>
              <div className="mb-2 flex items-end gap-2">
                <span className="text-6xl font-bold text-white">$19.99</span>
                <span className="text-zinc-400 pb-2 text-lg">/year</span>
              </div>
              <p className="text-purple-300 mb-10 text-lg font-medium">Or $3.99/month. Includes 7-day free trial.</p>
              
              <div className="flex-grow">
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-white text-lg font-bold">Unlimited bills</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-200 text-lg font-medium">AI Photo Scan</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-200 text-lg font-medium">Custom reminder timing</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-200 text-lg font-medium">Home screen widgets</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-200 text-lg font-medium">Calendar view & history</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-200 text-lg font-medium">All five color themes</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <FaqItem 
              question="Does Duezo link to my bank account?"
              answer="No. Duezo does not require any bank connections or logins. You simply enter the bills you want to track manually or via AI Scan."
            />
            <FaqItem 
              question="Is Duezo a budgeting app?"
              answer="No. Duezo won't yell at you for spending money. It's strictly a countdown tool to ensure you never miss a due date. If you want a full budget, you need a different app."
            />
            <FaqItem 
              question="Do I need a subscription to use it?"
              answer="No, Duezo is free to download and use for up to 5 bills. If you need more bills, widgets, or AI scanning, you can upgrade to Duezo Pro with a 7-day free trial."
            />
            <FaqItem 
              question="How does AI Photo Scan work?"
              answer="You simply snap a photo of any paper bill or digital statement. Duezo Pro will automatically read the amount and due date, saving you from typing."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-6 border-t border-white/5 relative overflow-hidden flex justify-center text-center">
        <div className="absolute inset-0 bg-purple-600/10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[60%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-3xl relative z-10">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">Stop stressing over due dates.</h2>
          <p className="text-2xl text-zinc-400 mb-12">Get Duezo today and clear your head.</p>
          
          <Link 
            href={APP_STORE_URL}
            className="inline-flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-full text-xl font-bold hover:scale-105 transition-transform duration-300 shadow-[0_0_50px_rgba(255,255,255,0.15)] group"
          >
            <Apple className="w-7 h-7" />
            <span>Download on the App Store</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-zinc-600 border-t border-white/5 text-sm font-medium">
        <p>© {new Date().getFullYear()} Duezo. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 hover:bg-zinc-900/60 transition-colors">
      <h4 className="text-xl font-bold text-white mb-3">{question}</h4>
      <p className="text-zinc-400 text-lg leading-relaxed">{answer}</p>
    </div>
  );
}
