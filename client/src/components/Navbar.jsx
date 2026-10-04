import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { useTheme } from "../context/ThemeContext";
import { 
  Mail, 
  Inbox, 
  BarChart2, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Send
} from "lucide-react";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Overview" },
    { path: "/mail", label: "Email Studio", icon: Mail },
    { path: "/helpdesk", label: "Helpdesk Inbox", icon: Inbox },
    { path: "/analyticsDashboard", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="w-full px-4 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Brand */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white tracking-tight text-lg sm:text-xl">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span>MailEngine</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

            {localStorage.getItem("token") ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden lg:inline-block max-w-[150px] truncate">
                  {localStorage.getItem("userEmail") || "Signed in"}
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("accountId");
                    localStorage.removeItem("userEmail");
                    localStorage.removeItem("currentTickId");
                    window.location.href = "/login";
                  }}
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <button className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                    Log in
                  </button>
                </Link>

                <Link to="/signup">
                  <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-xs">
                    Sign up
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-2 bg-white dark:bg-slate-900 shadow-lg">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                  active
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            {localStorage.getItem("token") ? (
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("accountId");
                  localStorage.removeItem("userEmail");
                  localStorage.removeItem("currentTickId");
                  window.location.href = "/login";
                }}
                className="w-full py-2.5 rounded-lg border border-rose-200 dark:border-rose-900 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Log out ({localStorage.getItem("userEmail") || "Account"})
              </button>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Log in
                  </button>
                </Link>
                <Link to="/signup" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                    Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;