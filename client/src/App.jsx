import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from './components/Navbar';
import Home from './components/Home';
import Mail from "./components/Mail";
import Helpdesk from "./components/Helpdesk";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/dashboard";
import Footer from "./components/Footer";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
          <Navbar />
          <main className="flex-1 w-full">
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/mail' element={<Mail />} />
              <Route path='/analyticsDashboard' element={<Dashboard />} />
              <Route path='/helpdesk' element={<Helpdesk />} />
              <Route path='/login' element={<Login />} />
              <Route path='/signup' element={<Signup />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;