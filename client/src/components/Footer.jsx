import React from "react";
import { Link } from "react-router";
import { Send } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors mt-auto py-10">
      <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-600 dark:text-slate-400">
        
        {/* Brand */}
        <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white text-base">
          <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <Send className="w-3.5 h-3.5" />
          </div>
          <span>MailEngine</span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
          <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Overview</Link>
          <Link to="/mail" className="hover:text-slate-900 dark:hover:text-white transition-colors">Email Studio</Link>
          <Link to="/helpdesk" className="hover:text-slate-900 dark:hover:text-white transition-colors">Helpdesk Inbox</Link>
          <Link to="/analyticsDashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">Analytics</Link>
        </div>

        {/* Copyright */}
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} MailEngine. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

export default Footer;
