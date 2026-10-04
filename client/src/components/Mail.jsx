import React, { useState } from "react";
import { GoogleGenAI } from "@google/genai";
import { ToastContainer, toast } from 'react-toastify';
import {
    Sparkles,
    Send,
    Users,
    Loader2,
    FileText
} from "lucide-react";

const Mail = () => {
    const [subject, setSubject] = useState('');
    const [result, setResult] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [dispatching, setDispatching] = useState(false);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const generateContent = async (e) => {
        e.preventDefault();
        if (!subject) {
            toast.warn("Please enter a subject line first.");
            return;
        }
        setGenerating(true);
        try {
            const apikey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apikey) {
                toast.error("VITE_GEMINI_API_KEY is not configured in .env.");
                setGenerating(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey: apikey });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate an email body for the subject: "${subject}"`,
                config: {
                    systemInstruction: "You are an email assistant. Output ONLY a clean ready-to-send email body. Do not include introductory notes, multiple choices, or markdown headers. Start with a greeting and finish with a sign-off."
                },
            });

            setResult(response.text);
            toast.success("Draft generated.");
        } catch (error) {
            console.error("Error generating content", error);
            toast.error("Failed to generate draft with Gemini.");
        } finally {
            setGenerating(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            const fileContent = event.target.result;
            const lines = fileContent.split(/\r?\n/);
            const parsedCustomers = [];

            lines.forEach(line => {
                if (!line.trim()) return;
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const email = parts[1].trim();

                    if (email.includes('@')) {
                        parsedCustomers.push({ name, email });
                    }
                }
            });

            if (parsedCustomers.length === 0) {
                toast.error("Format must be: Name, email@example.com (one per line).");
                setRecipients([]);
                return;
            }

            setRecipients(parsedCustomers);
            toast.success(`Loaded ${parsedCustomers.length} recipients.`);
        };

        reader.onerror = () => {
            toast.error("Failed to read file.");
        };

        reader.readAsText(file);
    };

    const processFormSubmission = async (e) => {
        e.preventDefault();

        const currentToken = localStorage.getItem("token");
        const cachedAccountId = localStorage.getItem("accountId") || "";
        const cachedTickId = localStorage.getItem("currentTickId") || "";

        if (!currentToken || currentToken === "null" || currentToken === "undefined") {
            toast.error("Please log in again to dispatch campaigns.");
            return;
        }

        if (recipients.length === 0) {
            toast.warn("Please upload a .txt file with recipient records.");
            return;
        }

        if (!result) {
            toast.warn("Please add message content before sending.");
            return;
        }

        setDispatching(true);
        toast.info(`Enqueueing campaign for ${recipients.length} recipients...`);

        try {
            // Single API call to post batch list to the backend worker queue
            const response = await fetch(`${API_BASE_URL}/mail/dispatch-batch`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${currentToken}`
                },
                body: JSON.stringify({
                    accountId: cachedAccountId,
                    tickId: cachedTickId,
                    recipients,
                    emailContent: result,
                    sub: subject
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success("Campaign queued successfully for background processing!");
            } else {
                toast.error(data.message || "Failed to enqueue campaign.");
            }
        } catch (err) {
            console.error("Campaign dispatch error:", err);
            toast.error("An unexpected error occurred during dispatch.");
        } finally {
            setDispatching(false);
        }
    };

    return (
        <div className="py-10 sm:py-14 px-4 sm:px-8 lg:px-12 w-full max-w-5xl mx-auto">
            <ToastContainer autoClose="{3000}" position="bottom-right"/>

            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Email Studio
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                    Compose campaigns, generate drafts with Gemini AI, and dispatch to your uploaded recipient list.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={processFormSubmission} className="space-y-6">

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="title" className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                                Subject Line
                            </label>

                            <button
                                type="button"
                                onClick={generateContent}
                                disabled={generating}
                                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-slate-700"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600"/>
                                        <span>Drafting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400"/>
                                        <span>Draft with AI</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            type="text"
                            id="title"
                            placeholder="e.g. Service Update for Q3"
                            className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="content" className="block text-sm font-bold text-slate-900 dark:text-slate-200">
                                Message Body
                            </label>
                            {result && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                    {result.length} characters
                                </span>
                            )}
                        </div>
                        <textarea
                            value={result}
                            onChange={(e) => setResult(e.target.value)}
                            id="content"
                            placeholder="Write your email content or use 'Draft with AI' above..."
                            className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                            rows={8}
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">

                            <div>
                                <label className="block text-sm font-bold text-slate-900 dark:text-slate-200 mb-2">
                                    Recipient File (.txt)
                                </label>
                                <input
                                    type="file"
                                    id="textFile"
                                    accept=".txt"
                                    onChange={handleFileUpload}
                                    className="block w-full text-xs sm:text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-800 dark:file:bg-slate-800 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer border border-slate-300 dark:border-slate-700 rounded-xl p-1.5 bg-white dark:bg-slate-950"
                                    required
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Format: Name, email@domain.com (one per line)</p>
                            </div>

                            <div>
                                {recipients.length > 0 ? (
                                    <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs sm:text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2.5 font-medium">
                                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0"/>
                                        <span><strong>{recipients.length}</strong> recipients ready to dispatch</span>
                                    </div>
                                ) : (
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2.5">
                                        <FileText className="w-5 h-5 text-slate-400 shrink-0"/>
                                        <span>No recipient file uploaded yet</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                        <button
                            type="submit"
                            disabled={dispatching}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                            {dispatching ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                    <span>Enqueueing Campaign...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4"/>
                                    <span>Send Campaign</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Mail;