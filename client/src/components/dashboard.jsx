import AnalyticsDashboard from './Analyticsdashboard';

function App() {
  const currentAccountId = "96b0d249-61d6-11f1-adde-e86538d58b3c";

  return (
    <div className="App">
      <AnalyticsDashboard accountId={currentAccountId} />
    </div>
  );
}

export default App;