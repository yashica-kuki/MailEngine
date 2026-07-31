import React, { useEffect, useState } from 'react';

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
          setError('Failed to load analytics data.');
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Network error while loading analytics.');
      } finally {
        setLoading(false);
      }
    };

    if (accountId) {
      fetchAnalytics();
    }
  }, [accountId]);

  if (loading) return <div className="p-6 text-center text-gray-500 font-medium">Loading analytics metrics...</div>;
  if (error) return <div className="p-6 text-center text-red-500 font-medium">{error}</div>;
  if (!analytics) return null;

  // Calculate maximum value for relative chart bar scaling
  const maxStatusCount = Math.max(...Object.values(analytics.statusBreakdown), 1);

  return (
    <div className="p-6 bg-gray-50 rounded-xl shadow-sm border border-gray-100 max-w-5xl mx-auto font-sans">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Helpdesk Analytics Dashboard</h2>
      
      {/* Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Tickets</span>
          <span className="text-3xl font-extrabold text-blue-600 mt-2">{analytics.totalTickets}</span>
        </div>
        
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Resolution Rate</span>
          <span className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics.resolutionRate}</span>
        </div>
        
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">AI-Assisted Responses</span>
          <span className="text-3xl font-extrabold text-purple-600 mt-2">{analytics.aiAssistedCount}</span>
        </div>
        
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Emails Processed</span>
          <span className="text-3xl font-extrabold text-indigo-600 mt-2">{analytics.totalEmailsProcessed}</span>
        </div>
      </div>

      {/* Visual Bar Chart Breakdown Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Ticket Status Distribution Chart</h3>
        <div className="space-y-4">
          {Object.entries(analytics.statusBreakdown).map(([status, count]) => {
            const percentage = Math.round((count / maxStatusCount) * 100);
            return (
              <div key={status} className="flex flex-col">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                  <span className="capitalize">{status.replace('_', ' ').toLowerCase()}</span>
                  <span className="font-bold text-gray-900">{count}</span>
                </div>
                {/* Visual Progress Bar acting as a bar chart */}
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${percentage}%` }}
                  ></div>
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