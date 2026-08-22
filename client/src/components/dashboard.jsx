import React from 'react';
import AnalyticsDashboard from './Analyticsdashboard';

function Dashboard() {
  const accountId = localStorage.getItem("accountId") || "96b0d249-61d6-11f1-adde-e86538d58b3c";

  return <AnalyticsDashboard accountId={accountId} />;
}

export default Dashboard;