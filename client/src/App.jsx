import { BrowserRouter, Routes, Route } from "react-router";
import Navbar from './components/Navbar';
import Home from './components/Home';
import Mail from "./components/Mail";
import Helpdesk from "./components/Helpdesk";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AnalyticsDashboard from "./components/dashboard";

function App() {
  const fallbackAccountId = "96b0d249-61d6-11f1-adde-e86538d58b3c";

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/mail' element={<Mail />} />
        <Route path='/analyticsDashboard' element={<AnalyticsDashboard accountId={fallbackAccountId} />} />
        <Route path='/helpdesk' element={<Helpdesk />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;