import React, { useEffect, useState } from 'react';
import { 
  BarChart2, 
  CheckCircle, 
  Bot, 
  Mail, 
  Loader2,
  AlertCircle
} from "lucide-react";

const AnalyticsDashboard = ({ accountId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/${accountId}`);
        const data = await response.json();

        if (data.success) {
          setAnalytics(data.analytics);
        } else {
          setError('Failed to load metrics.');
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Could not connect to backend.');
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchAnalytics();
    }
  }, [accountId]);

  if (loading) return (
    <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-sm gap-2">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      <span>Loading platform metrics...</span>
    </div>
  );

  if (error) return (
    <div className="py-20 text-center text-red-500 text-sm">
      <AlertCircle className="w-6 h-6 mx-auto mb-2" />
      {error}
    </div>
  );

  if (!analytics) return null;

  const maxStatusCount = Math.max(...Object.values(analytics.statusBreakdown), 1);

  return (
    <div className="py-10 sm:py-14 px-4 sm:px-8 lg:px-12 w-full max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Analytics &amp; Metrics
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Overview of ticket resolution, campaign volumes, and AI usage.
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-semibold mb-3">
            <span>Total Tickets</span>
            <BarChart2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
            {analytics.totalTickets}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-semibold mb-3">
            <span>Resolution Rate</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            {analytics.resolutionRate}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-semibold mb-3">
            <span>AI Drafts</span>
            <Bot className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-purple-600 dark:text-purple-400 font-mono">
            {analytics.aiAssistedCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm font-semibold mb-3">
            <span>Emails Processed</span>
            <Mail className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
            {analytics.totalEmailsProcessed}
          </div>
        </div>

      </div>

      {/* Ticket Status Breakdown Card */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
          Ticket Status Distribution
        </h3>

        <div className="space-y-4 pt-2">
          {Object.entries(analytics.statusBreakdown).map(([status, count]) => {
            const percentage = Math.round((count / maxStatusCount) * 100);
            return (
              <div key={status} className="space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <span className="capitalize font-semibold">{status.replace('_', ' ').toLowerCase()}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-600 dark:bg-blue-500 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.max(percentage, count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default AnalyticsDashboard;