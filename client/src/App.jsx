import { BrowserRouter, Routes, Route, Router} from "react-router";
import Navbar from './components/Navbar'
import Home from './components/Home'
import Mail from "./components/Mail";
import Helpdesk from "./components/Helpdesk";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AnalyticsDashboard from "./components/Analyticsdashboard";

function App() {

  return (
    <>
      <BrowserRouter>
        <Navbar />
          <Routes>
            <Route path='/' element={<Home/>} />
            <Route path='/mail' element={<Mail />} />
            <Route path='/analyticsDashboard' element={<AnalyticsDashboard />} />
            <Route path='/helpdesk' element={<Helpdesk />} />
            <Route path='/login' element={<Login/>}/>
            <Route path='/signup' element={<Signup/>}/>
          </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
