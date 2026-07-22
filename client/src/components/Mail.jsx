import React, { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { ToastContainer, toast } from 'react-toastify';

const Mail = () => {
    const [subject, setSubject] = useState('');
    const [result, setResult] = useState('');
    const [recipients, setRecipients] = useState([]); // Stores parsed objects: [{ name, email }]

    // AI Generation Handler using Gemini
    const generateContent = async (e) => {
        e.preventDefault();
        if (!subject) {
            toast.warn("Please enter a subject first!");
            return;
        }
        try {
            const apikey = import.meta.env.VITE_GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey: apikey });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash", 
                contents: `Generate an Email Body for ${subject}`,
                config: {
                    systemInstruction: "You are a strict email body generator. Output ONLY a single, complete email body for the given subject. Do not include introductory text, multiple options, markdown titles (like ###), subject lines, or tips at the end. Start immediately with a greeting and end with a sign-off."
                },
            });
            console.log("Checking API Key availability:", import.meta.env.VITE_GEMINI_API_KEY);
            setResult(response.text);
            toast.info("Content generated successfully using Gemini AI.");
        } catch (error) {
            console.error("Error generating content", error);
            toast.error("Failed to connect to Google GenAI engines.");
        }
    };

    // Native Text File Parser (Handles Windows \r\n and Unix \n line breaks cleanly)
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = (event) => {
            const fileContent = event.target.result;
            
            // ✅ CRITICAL FIX: Split line strings matching both Unix \n and Windows \r\n formats
            const lines = fileContent.split(/\r?\n/);
            const parsedCustomers = [];

            lines.forEach(line => {
                // Ignore empty rows or whitespace lines safely
                if (!line.trim()) return;

                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const email = parts[1].trim();

                    // Validation gate to verify string layouts match an email parameter
                    if (email.includes('@')) {
                        parsedCustomers.push({ name, email });
                    }
                }
            });
            
            if (parsedCustomers.length === 0) {
                toast.error("Could not find valid records. Format must be 'Name, email@domain.com'");
                setRecipients([]);
                return;
            }

            setRecipients(parsedCustomers);
            toast.success(`Loaded ${parsedCustomers.length} client targets natively from text file!`);
        };

        reader.onerror = () => {
            toast.error("Failed to process the uploaded file template.");
        };

        reader.readAsText(file);
    };

    // Sequential API Batch Dispatch Controller
    const processFormSubmission = async (e) => {
        e.preventDefault();

        // Pulls historical identification schemas established upon login
        const cachedAccountId = localStorage.getItem("accountId");
        const cachedTickId = localStorage.getItem("currentTickId");

        if (!cachedAccountId || !cachedTickId) {
            toast.error("Authentication expired or missing tokens. Please log in again.");
            return;
        }

        if (recipients.length === 0) {
            toast.warn("Please upload a text file containing client record pairs.");
            return;
        }

        if (!result) {
            toast.warn("Please add or generate your email body content first.");
            return;
        }

        let successes = 0;
        toast.info("Initializing background transactional dispatch queue...");

        // Iterates dynamically across every target pulled from the text document split arrays
        for (const target of recipients) {
            const deliverySuccess = await handleSendMailAPI({
                accountId: cachedAccountId,
                recipientEmail: target.email,
                tickId: cachedTickId
            });
            if (deliverySuccess) successes++;
        }

        if (successes > 0) {
            toast.success(`Dispatched ${successes} notification items via our SMTP engine!`);
        } else {
            toast.error("All delivery iterations failed. Verify backend credentials.");
        }
    };

    // Express Communication Pipeline
    const handleSendMailAPI = async ({ accountId, recipientEmail, tickId }) => {
        try {
            const response = await fetch('http://localhost:3000/mail/fetch', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId,
                    recipientEmail,
                    tickId,
                    emailContent: result,
                    sub: subject
                })
            });
            
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error("Network socket pipeline exception:", error);
            return false;
        }
    };

    return (
        <>
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            
            <div className="max-w-2xl mx-auto p-4">
                <div className="bg-gray-100 p-10 m-5 rounded-3xl shadow-sm border border-gray-200">
                    <form onSubmit={processFormSubmission}>
                        
                        {/* Subject Input Row */}
                        <div className="mb-6">
                            <h2 className="font-extrabold text-3xl text-center text-slate-800 mb-6">Email Studio</h2>
                            <div className="flex flex-row justify-between items-center p-3 py-4">
                                <label htmlFor="title" className="block text-lg font-semibold text-gray-700">Subject</label>
                                <button 
                                    type="button" 
                                    onClick={generateContent} 
                                    className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_3px_8px_#00000030] h-9 w-36 active:shadow-none active:translate-y-[2px] transition-all duration-150"
                                >
                                    <div className="px-4 text-[0.95rem] flex items-center justify-center gap-2 font-semibold tracking-[0.5px] border-b-[2.5px] border-solid border-[#374e72] rounded-[12px] bg-gradient-to-b from-[#5771a5] to-[#121b29] text-white [text-shadow:1px_1px_#000] h-full w-full">
                                        <svg viewBox="0 0 256 256" className="w-[1.1em] h-[1.1em] fill-current">
                                            <path d="M240 128a15.79 15.79 0 0 1-10.5 15l-63.44 23.07L143 229.5a16 16 0 0 1-30 0l-23.06-63.44L26.5 143a16 16 0 0 1 0-30l63.44-23.06L113 26.5a16 16 0 0 1 30 0l23.07 63.44L229.5 113a15.79 15.79 0 0 1 10.5 15" />
                                        </svg>
                                        AI Writer
                                    </div>
                                </button>
                            </div>
                            <input value={subject} onChange={(e) => setSubject(e.target.value)} type="text" id="title" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" required />
                        </div>

                        {/* Textarea Body Editor */}
                        <div className="mb-6">
                            <label htmlFor="content" className="block text-lg font-semibold text-gray-700 mb-2">Message Body</label>
                            <textarea value={result} onChange={(e) => setResult(e.target.value)} id="content" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" rows="6" required></textarea>
                        </div>

                        {/* File Upload Configurations */}
                        <div className="mb-8">
                            <div className="flex flex-row gap-4">
                                <div className="w-1/2">
                                    <label className="font-semibold text-gray-700 block mb-2">Upload Client List (.txt)</label>
                                    <input type="file" id="textFile" accept=".txt" onChange={handleFileUpload} className="border border-gray-300 p-2 w-full rounded-xl bg-white focus:outline-none cursor-pointer text-sm" required />
                                </div>
                                <div className="w-1/2">
                                    <label className="font-semibold text-gray-700 block mb-2">Attach Media Assets</label>
                                    <input type="file" id="attachments" accept="image/*" className="border border-gray-300 p-2 w-full rounded-xl bg-white focus:outline-none cursor-pointer text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Submit Execution Actions */}
                        <div className="flex justify-end">
                            <button 
                                type="submit" 
                                className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_4px_10px_#00000035] h-10 w-44 active:shadow-none active:translate-y-[2px] transition-all duration-150"
                            >
                                <div className="px-4 text-[1rem] flex items-center justify-center gap-2 font-bold tracking-[0.5px] border-b-[2.5px] border-solid border-[#22573e] rounded-[12px] bg-gradient-to-b from-[#3ba874] to-[#0f3a24] text-white [text-shadow:1px_1px_#000] h-full w-full">
                                    Submit Dispatch
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default Mail;