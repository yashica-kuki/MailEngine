import React from "react";
import { Link } from "react-router";
import { Mail, Inbox, BarChart2, ArrowRight, Check } from "lucide-react";

const Home = () => {
  return (
    <div className="py-12 sm:py-20 w-full">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        
        {/* HERO SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-semibold shadow-xs">
            Multi-Tenant Email &amp; Helpdesk Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight sm:leading-none">
            Customer communications, simplified.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Manage incoming support tickets, generate AI-assisted replies with Gemini, and dispatch bulk email campaigns with tenant isolation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link to="/mail">
              <button className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors cursor-pointer shadow-sm">
                Open Email Studio
              </button>
            </Link>
            <Link to="/helpdesk">
              <button className="px-6 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-base transition-colors cursor-pointer shadow-xs">
                View Helpdesk Inbox
              </button>
            </Link>
          </div>
        </div>

        {/* 3 CORE FEATURE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          
          {/* Card 1: Mail Campaigns */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Email Studio
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                Compose custom outbound emails, generate drafts instantly with AI, upload recipient lists (.txt), and dispatch via SMTP.
              </p>
            </div>
            <Link to="/mail" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1.5">
              Launch Campaign Studio <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Helpdesk */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Helpdesk Inbox
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                Track customer complaints, review incoming messages, draft replies with Gemini, and update ticket lifecycle states.
              </p>
            </div>
            <Link to="/helpdesk" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5">
              Review Open Tickets <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Analytics */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Analytics
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                Monitor resolution rates, email volumes, AI-assisted response ratios, and ticket distribution across statuses.
              </p>
            </div>
            <Link to="/analyticsDashboard" className="text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1.5">
              View Analytics Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

        {/* HIGHLIGHTS */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center sm:text-left">
            <div className="space-y-1.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Account Isolation
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Data separated per business tenant for security and compliance.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Gemini Integration
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Direct API access to produce concise, contextual email bodies.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Fast Delivery
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Integrated SMTP and Resend dispatch pipeline with error tracking.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;