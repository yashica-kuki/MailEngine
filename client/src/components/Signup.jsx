import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGoogleLogin } from '@react-oauth/google';
import { Send, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const Signup = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const saveSessionData = (token, realUuidFromBackend, userEmail) => {
        localStorage.setItem("token", token);
        localStorage.setItem("accountId", realUuidFromBackend);
        localStorage.setItem("userEmail", userEmail);
        const generatedTickId = `TICK-${Date.now().toString().slice(-6)}`;
        localStorage.setItem("currentTickId", generatedTickId);
    };

    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setErrorMsg('');
            setLoading(true);
            try {
                const googleUserRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const googleUser = await googleUserRes.json();

                const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
                    saveSessionData(data.token, data.user.id, data.user.email);
                    navigate("/");
                } else {
                    setErrorMsg(data.message || "Failed to authenticate.");
                }
            } catch (err) {
                console.error("Google auth error:", err);
                setErrorMsg("Network error during Google sign-in.");
            } finally {
                setLoading(false);
            }
        },
        onError: () => setErrorMsg("Google sign-in cancelled."),
    });

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!agreeTerms) {
            setErrorMsg("Please accept the terms to continue.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name, 
                    email, 
                    pass: password 
                })
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMsg("Account created! Redirecting to login...");
                setTimeout(() => navigate("/login"), 1200);
            } else {
                setErrorMsg(data.message || "Failed to create account.");
            }
        } catch (error) {
            console.error("Signup error:", error);
            setErrorMsg("Could not connect to registration server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-16 sm:py-20 px-4 flex items-center justify-center">
            <div className="w-full max-w-md">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3.5 shadow-xs">
                        <Send className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Create your account
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                        Get started with MailEngine in seconds
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-8 border border-gray-200 dark:border-slate-700/80 shadow-xs space-y-5">
                    
                    {errorMsg && (
                        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-300 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="name">
                                Full Name
                            </label>
                            <input 
                                type="text" 
                                id="name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Alex Morgan"
                                className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
                                Email Address
                            </label>
                            <input 
                                type="email" 
                                id="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full px-3.5 py-2.5 text-sm sm:text-base rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    id="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-3.5 pr-10 py-2.5 text-sm sm:text-base rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 pt-1">
                            <input 
                                type="checkbox" 
                                id="terms" 
                                checked={agreeTerms}
                                onChange={(e) => setAgreeTerms(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="terms" className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                I agree to the Terms and Conditions
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50 mt-2 shadow-xs"
                        >
                            {loading ? "Creating account..." : "Sign up"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-4">
                        <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                        <span className="absolute px-3 bg-white dark:bg-slate-800 text-xs font-medium text-slate-400 uppercase">
                            or
                        </span>
                    </div>

                    {/* Google OAuth */}
                    <button 
                        type="button" 
                        onClick={() => googleLogin()} 
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
                    >
                        <svg viewBox="0 0 24 24" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12,5c1.6167603,0,3.1012573,0.5535278,4.2863159,1.4740601l3.637146-3.4699707 C17.8087769,1.1399536,15.0406494,0,12,0C7.392395,0,3.3966675,2.5999146,1.3858032,6.4098511l4.0444336,3.1929321 C6.4099731,6.9193726,8.977478,5,12,5z" fill="#F44336"></path>
                            <path d="M23.8960571,13.5018311C23.9585571,13.0101929,24,12.508667,24,12 c0-0.8578491-0.093689-1.6931763-0.2647705-2.5H12v5h6.4862061c-0.5247192,1.3637695-1.4589844,2.5177612-2.6481934,3.319458 l4.0594482,3.204834C22.0493774,19.135437,23.5219727,16.4903564,23.8960571,13.5018311z" fill="#2196F3"></path>
                            <path d="M5,12c0-0.8434448,0.1568604-1.6483765,0.4302368-2.3972168L1.3858032,6.4098511 C0.5043335,8.0800171,0,9.9801636,0,12c0,1.9972534,0.4950562,3.8763428,1.3582153,5.532959l4.0495605-3.1970215 C5.1484375,13.6044312,5,12.8204346,5,12z" fill="#FFC107"></path>
                            <path d="M12,19c-3.0455322,0-5.6295776-1.9484863-6.5922241-4.6640625L1.3582153,17.532959 C3.3592529,21.3734741,7.369812,24,12,24c3.027771,0,5.7887573-1.1248169,7.8974609-2.975708l-4.0594482-3.204834 C14.7412109,18.5588989,13.4284058,19,12,19z" fill="#00B060"></path>
                        </svg>
                        <span>Continue with Google</span>
                    </button>

                    <div className="text-center pt-2 text-sm text-slate-500 dark:text-slate-400">
                        Already have an account?{" "}
                        <Link className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" to="/login">
                            Sign in
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Signup;