import { Link, useNavigate } from 'react-router';
import { useGoogleLogin } from '@react-oauth/google';

const Login = () => {
    const navigate = useNavigate();

    // Helper function to commit session tracking tokens to state memory
    const saveSessionData = (realUuidFromBackend, userEmail) => {
        // ✅ SUCCESS: This will now receive and store the true 36-character database UUID string
        localStorage.setItem("accountId", realUuidFromBackend);
        localStorage.setItem("userEmail", userEmail);

        // Keep your ticket tracking instance tag generator active
        const generatedTickId = `TICK-${Date.now().toString().slice(-6)}`;
        localStorage.setItem("currentTickId", generatedTickId);
    };

    // 1. GOOGLE AUTHENTICATION PIPELINE
    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            console.log("Google Login Token Received:", tokenResponse);
            
            try {
                // A. Request user details directly from Google's OAuth platform using the token
                const googleUserRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const googleUser = await googleUserRes.json();

                // B. Forward credentials to your backend database router engine
                const response = await fetch('https://mailengine-ueu6.onrender/auth/login', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        googleId: googleUser.sub,
                        name: googleUser.name,
                        email: googleUser.email
                    })
                });

                const data = await response.json();

                if (data.success && data.user) {
                    // ✅ FIX: Read the true database auto-generated key (.id) sent from MySQL!
                    saveSessionData(data.user.id, data.user.email);
                    navigate("/");
                } else {
                    console.error("Backend login synchronization error:", data.error);
                    alert("Could not synchronize authentication metrics with backend.");
                }
            } catch (err) {
                console.error("Failed to run Google authentication network request:", err);
            }
        },
        onError: () => console.error("Google Login Failed"),
    });

    // 2. TRADITIONAL FORM SUBMISSION PIPELINE
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const inputEmail = document.getElementById("login").value;
        const inputPassword = document.getElementById("password").value;

        try {
            // Pointing to your credential processing backend endpoint
            const response = await fetch('https://mailengine-ueu6.onrender/auth/login', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inputEmail,
                    password: inputPassword
                })
            });

            const data = await response.json();

            if (data.success && data.user) {
                // ✅ SUCCESS: Pass the true auto-generated UUID returned straight from your MySQL table match
                saveSessionData(data.user.id, data.user.email);
                navigate("/");
            } else {
                alert(`Login Failed: ${data.message || 'Invalid Credentials'}`);
            }
        } catch (error) {
            console.error("Traditional Login authentication handshake pipeline error:", error);
            alert("Database connection drop detected during login transaction.");
        }
    };

    return (
        <div className="relative py-12 bg-gray-50 min-h-screen flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto bg-white p-8 border border-gray-200 shadow-xl rounded-3xl">
                <div className="w-full">
                    <div className="flex items-center justify-center mb-6">
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">LOGIN</h2>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div>
                            <label className="font-semibold text-sm text-gray-600 pb-1 block" htmlFor="login">E-mail</label>
                            <input className="border border-gray-300 rounded-xl px-4 py-3 text-sm w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-gray-700" type="email" id="login" required />
                        </div>

                        <div>
                            <label className="font-semibold text-sm text-gray-600 pb-1 block" htmlFor="password">Password</label>
                            <input className="border border-gray-300 rounded-xl px-4 py-3 text-sm w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-gray-700" type="password" id="password" required />
                        </div>

                        <div className="text-right">
                            <a className="text-xs font-semibold text-gray-500 hover:text-blue-600 cursor-pointer transition-colors" href="#">Forgot Password?</a>
                        </div>

                        <div className="pt-2">
                            <button type="submit" className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-2 text-white transition ease-in duration-200 text-center text-base font-semibold shadow-md focus:outline-none focus:ring-2 rounded-xl cursor-pointer">Log in</button>
                        </div>
                    </form>

                    <div className="relative flex items-center justify-center my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <span className="relative px-3 bg-white text-sm text-gray-400 font-medium">or</span>
                    </div>

                    <div className="w-full mb-6">
                        <button type="button" onClick={() => login()} className="flex items-center justify-center w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 text-gray-700 transition ease-in duration-200 text-center text-base font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-xl cursor-pointer">
                            <svg viewBox="0 0 24 24" height="22" width="22" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                                <path d="M12,5c1.6167603,0,3.1012573,0.5535278,4.2863159,1.4740601l3.637146-3.4699707 C17.8087769,1.1399536,15.0406494,0,12,0C7.392395,0,3.3966675,2.5999146,1.3858032,6.4098511l4.0444336,3.1929321 C6.4099731,6.9193726,8.977478,5,12,5z" fill="#F44336"></path>
                                <path d="M23.8960571,13.5018311C23.9585571,13.0101929,24,12.508667,24,12 c0-0.8578491-0.093689-1.6931763-0.2647705-2.5H12v5h6.4862061c-0.5247192,1.3637695-1.4589844,2.5177612-2.6481934,3.319458 l4.0594482,3.204834C22.0493774,19.135437,23.5219727,16.4903564,23.8960571,13.5018311z" fill="#2196F3"></path>
                                <path d="M5,12c0-0.8434448,0.1568604-1.6483765,0.4302368-2.3972168L1.3858032,6.4098511 C0.5043335,8.0800171,0,9.9801636,0,12c0,1.9972534,0.4950562,3.8763428,1.3582153,5.532959l4.0495605-3.1970215 C5.1484375,13.6044312,5,12.8204346,5,12z" fill="#FFC107"></path>
                                <path d="M12,19c-3.0455322,0-5.6295776-1.9484863-6.5922241-4.6640625L1.3582153,17.532959 C3.3592529,21.3734741,7.369812,24,12,24c3.027771,0,5.7887573-1.1248169,7.8974609-2.975708l-4.0594482-3.204834 C14.7412109,18.5588989,13.4284058,19,12,19z" fill="#00B060"></path>
                            </svg>
                            <span>Sign in with Google</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <span className="w-1/4 border-b border-gray-200"></span>
                        <Link className="text-xs text-gray-500 uppercase hover:text-blue-600 hover:underline font-medium" to="/signup">or sign up</Link>
                        <span className="w-1/4 border-b border-gray-200"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;