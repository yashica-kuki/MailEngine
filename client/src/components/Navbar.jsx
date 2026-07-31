import { Link } from "react-router"

const Navbar = () => {
    return (
        <nav className="dark:bg-gray-800">
            <div className="mycontainer flex justify-between items-center px-4 py-5 h-15">
                <div className="text-white logo font-bold text-2xl flex flex-row justify-center items-center">
                    <img className="h-9 w-9" src="src\assets\logo.png"></img>
                    Mail
                    <span className="text-blue-500"> ENGINE </span>
                </div>
                <ul >
                    <li className="text-white flex gap-4 font-2xl">
                        <a className="hover:font-bold" href='/'>Home</a>
                        <a className="hover:font-bold" href='/about'>Dashboard</a>
                    </li>
                </ul>
                <div className="flex flex-row">
                    <Link to='/login'>
                        <button className="text-white bg-blue-500 flex justify-around items-center w-30 m-1 p-1 rounded-full hover:bg-blue-400">
                            <img className="h-8 w-8 p-1" src="src\assets\login.png" alt="github"></img>
                            <span className="font-bold px-1" >Login</span>
                        </button>
                    </Link>
                    <Link to='/signup'>
                        <button className="text-white bg-blue-500 flex justify-around items-center w-30 m-1 p-1 rounded-full hover:bg-blue-400">
                            <img className="h-8 w-8 p-1" src="src\assets\signup.png" alt="github"></img>
                            <span className="font-bold px-1" >Sign Up</span>
                        </button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}

export default Navbar