import { Link } from "react-router";

const Home = () => {
    return (
        <div>
            <div className="justify-center align-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
                <div className="items-center justify-center container mx-auto px-4 py-8">
                    <h2 className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-200 mb-8">
                        Featured Resources
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2  gap-8">
                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                            <img 
                                src="https://tailwindcss.com/_next/static/media/headlessui@75.c1d50bc1.jpg"
                                alt="Headless UI" 
                                className="w-full h-64 object-cover"
                            />
                            <div className="p-4 md:p-6">
                                <h3 className="text-xl font-semibold text-indigo-500 dark:text-indigo-300 mb-2">
                                    Generate Email
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-4 two-lines">
                                    Draft, personalize, and launch mass email campaigns globally. Select your campaign type and let AI do the heavy lifting.
                                </p>
                                <Link 
                                    className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-full" 
                                    to="/mail" target="_blank"
                                >
                                    Generate Now
                                </Link>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                            <img 
                                src="https://tailwindcss.com/_next/static/media/heropatterns@75.82a09697.jpg"
                                alt="Hero Patterns" 
                                className="w-full h-64 object-cover"
                            />
                            <div className="p-4 md:p-6">
                                <h3 className="text-xl font-semibold text-cyan-500 dark:text-cyan-300 mb-2">
                                    Customer Helpdesk
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-4 two-lines">
                                    Fetch unread customer complaints, generate instant AI responses, and route tickets to available executives automatically.
                                </p>
                                <Link 
                                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full" 
                                    to="/helpdesk"
                                >
                                    Draft Smart Reply
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;