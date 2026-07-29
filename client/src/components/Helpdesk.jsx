import React, { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { ToastContainer, toast } from 'react-toastify';

const Helpdesk = () => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [subject, setSubject] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(true);
    // Dynamic approach using Vite environment variables
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    // Track next status choice for approval submission (Option 2: Dropdown + Send Button)
    const [nextStatus, setNextStatus] = useState('RESOLVED');

    // 1. Load pending tickets from the backend on component initialization
    const fetchPendingTickets = async () => {
        const cachedAccountId = localStorage.getItem("accountId");
        if (!cachedAccountId) {
            toast.error("Session expired. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            console.log(`user fetching from accountId: ${cachedAccountId}`);
            
            const response = await fetch(`${API_BASE_URL}/helpdesk/pending/${cachedAccountId}`);    
            const data = await response.json();

            if (data.success) {
                // Backend now passes actual enum strings (e.g., 'OPEN', 'IN_PROGRESS') instead of booleans
                setTickets(data.tickets);
            } else {
                toast.error("Failed to load helpdesk inbox tracking queue.");
            }
        } catch (error) {
            console.error("Database connection exception:", error);
            toast.error("Could not sync with central MailEngine layers.");
        } finally {
            loading && setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingTickets();
    }, []);

    // 2. Select a ticket card to review its information
    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
        setSubject(`Re: ${ticket.subject}`);
        setResult(''); // Clear out any old generation text blocks
        // Set a smart default next status based on intuitive workflows
        setNextStatus(ticket.status === 'OPEN' ? 'PENDING_CUSTOMER' : 'RESOLVED');
    };

    // Helper to render Tailwind dynamic styling for the requested status badges
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'IN_PROGRESS': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'PENDING_CUSTOMER': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    // Inline status updates handler (Dropdown feature from Section B)
    const handleStatusUpdate = async (tickId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/helpdesk/ticket-status/${tickId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Ticket status successfully changed to ${newStatus}`);
                
                // Update local state arrays
                setTickets(prev => prev.map(t => t.tick_id === tickId ? { ...t, status: newStatus } : t));
                if (selectedTicket && selectedTicket.tick_id === tickId) {
                    setSelectedTicket(prev => ({ ...prev, status: newStatus }));
                }
            } else {
                toast.error(`Status transition failed: ${data.message}`);
            }
        } catch (error) {
            console.error("Status modify error:", error);
            toast.error("Failed to forward status patch configuration.");
        }
    };

    // 3. AI Generation Handler using Gemini
    const generateContent = async (e) => {
        e.preventDefault();
        if (!subject) {
            toast.warn("Please select a ticket or provide a subject header first!");
            return;
        }
        try {
            const apikey = import.meta.env.VITE_GEMINI_API_KEY;
            const ai = new GoogleGenAI({ apiKey: apikey });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate an email response for a customer support ticket with subject "${subject}" and complaint detail: "${selectedTicket?.raw_complaint || ''}"`,
                config: {
                    systemInstruction: "You are a strict email body generator. Output ONLY a single, complete email body. Do not include introductory text, multiple options, markdown titles (like ###), subject lines, or tips at the end. Start immediately with a professional greeting and end with a sign-off."
                },
            });

            setResult(response.text);
            toast.info("Draft reply compiled successfully via Gemini AI.");
        } catch (error) {
            console.error("Error generating content", error);
            toast.error("Failed to communicate with Google GenAI engines.");
        }
    };

    // 4. Submit approved response out to the customer and update ticket status via choice (Section C)
    const handleProcessSubmission = async (e) => {
        e.preventDefault();

        const cachedAccountId = localStorage.getItem("accountId");
        if (!selectedTicket) {
            toast.warn("Please select a ticket from your queue to process.");
            return;
        }
        if (!result) {
            toast.warn("Please generate or write a response body first.");
            return;
        }

        try {
            toast.info("Dispatching queue authorization token...");
            const realRecipient = selectedTicket.customer_email || "support-fallback@yourdomain.com";

            const response = await fetch(`${API_BASE_URL}/mail/approve-ticket`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickId: selectedTicket.tick_id,
                    accountId: cachedAccountId,
                    recipientEmail: realRecipient,
                    replyBodyContent: result,
                    nextStatus: nextStatus // ✅ Section C Implementation
                })
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Ticket approved & email successfully pushed to ${realRecipient}!`);

                // Sweep the processed item out of the list layout if it transitioned out of actionable scopes
                setTickets(prev => prev.filter(t => t.tick_id !== selectedTicket.tick_id));
                setSelectedTicket(null);
                setSubject('');
                setResult('');
            } else {
                toast.error(`Approval rejected: ${data.message}`);
            }
        } catch (error) {
            console.error("Communication socket exception:", error);
            toast.error("Failed to forward validation command to backend.");
        }
    };

    return (
        <>
            <ToastContainer position="bottom-right" autoClose={5000} theme="light" />

            <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-6">

                {/* LEFT SIDE: Incoming Tickets Queue */}
                <div className="w-full md:w-2/5 bg-white p-6 border border-gray-200 rounded-3xl shadow-sm h-[calc(100vh-100px)] overflow-y-auto">
                    <h2 className="font-extrabold text-xl text-slate-800 mb-4 border-b pb-2">Pending Complaints Inbox</h2>

                    {loading ? (
                        <div className="text-center py-6 text-gray-500">Loading workspace stream...</div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-3xl mb-2">🎉</p>
                            <p className="text-sm font-semibold">All clear! No pending tickets.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tickets.map((t) => (
                                <div
                                    key={t.tick_id}
                                    onClick={() => handleSelectTicket(t)}
                                    className={`p-4 border rounded-2xl cursor-pointer transition-all duration-150 hover:bg-slate-50 relative ${selectedTicket?.tick_id === t.tick_id ? "border-indigo-600 bg-indigo-50/40" : "border-gray-200"}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-mono text-gray-400">#{t.tick_id.substring(0, 8)}</span>
                                        {/* ✅ Section A: Explicit Badges */}
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full uppercase tracking-wider ${getStatusBadgeClass(t.status)}`}>
                                            {t.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 truncate pr-6">{t.subject}</h4>
                                    
                                    {/* ✅ Section A/E: Priority Indicator & Metadata */}
                                    <div className="flex gap-2 my-1 items-center">
                                        <span className="text-[10px] bg-red-50 text-red-700 font-semibold px-1.5 py-0.2 rounded border border-red-200">
                                            {t.priority || 'MEDIUM'}
                                        </span>
                                        <p className="text-[11px] text-indigo-600 font-semibold truncate">{t.customer_email || 'Unknown Sender'}</p>
                                    </div>
                                    
                                    <p className="text-xs text-gray-500 truncate mt-1">"{t.raw_complaint}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: Email Generator & Audit Review Studio */}
                <div className="flex-1 bg-white p-10 border border-gray-200 rounded-3xl shadow-sm">
                    {selectedTicket ? (
                        <form onSubmit={handleProcessSubmission}>
                            <div className="mb-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                    <h2 className="font-extrabold text-2xl text-slate-800">Audit Response Studio</h2>
                                    
                                    {/* ✅ Section B: Inline status dropdown selector controls */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-gray-500 font-semibold">Change Status:</label>
                                        <select 
                                            value={selectedTicket.status} 
                                            onChange={(e) => handleStatusUpdate(selectedTicket.tick_id, e.target.value)}
                                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 bg-white font-medium shadow-sm"
                                        >
                                            <option value="OPEN">Open</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="PENDING_CUSTOMER">Pending Customer</option>
                                            <option value="RESOLVED">Resolved</option>
                                            <option value="CLOSED">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 font-mono mb-4">Reviewing Ticket ID: {selectedTicket.tick_id}</p>

                                {/* ✅ Section E: Meta Dashboard details panel */}
                                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-gray-700">
                                    <div className="grid grid-cols-2 gap-2 mb-3 border-b border-amber-200/60 pb-2">
                                        <div><span className="text-xs text-amber-900/60 block font-bold">CURRENT STATUS</span>
                                            <span className={`inline-block text-[11px] font-extrabold px-2 py-0.5 rounded border uppercase mt-0.5 ${getStatusBadgeClass(selectedTicket.status)}`}>
                                                {selectedTicket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div><span className="text-xs text-amber-900/60 block font-bold">PRIORITY</span>
                                            <span className="font-mono text-xs font-bold text-amber-950 uppercase">{selectedTicket.priority || 'MEDIUM'}</span>
                                        </div>
                                        <div><span className="text-xs text-amber-900/60 block font-bold">CUSTOMER EMAIL</span>
                                            <span className="font-mono text-xs text-indigo-700 break-all">{selectedTicket.customer_email || "System Fallback Data Row"}</span>
                                        </div>
                                        <div><span className="text-xs text-amber-900/60 block font-bold">RECEIVED ON</span>
                                            <span className="font-mono text-xs text-amber-950">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    <span className="font-bold block text-amber-950 mb-1">Inbound Complaint Text:</span>
                                    <span className="italic text-gray-600 block bg-white/60 p-2.5 rounded-xl border border-amber-200/40">"{selectedTicket.raw_complaint}"</span>
                                </div>

                                <div className="flex flex-row justify-between items-center p-3 py-4">
                                    <label htmlFor="title" className="block text-lg font-semibold text-gray-800">Subject</label>
                                    <button
                                        type="button"
                                        onClick={generateContent}
                                        className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_3px_8px_#00000030] h-9 w-36 active:shadow-none active:translate-y-[2px] transition-all"
                                    >
                                        <div className="px-4 text-[0.95rem] flex items-center justify-center gap-2 font-semibold tracking-[0.5px] border-b-[2.5px] border-solid border-[#374e72] rounded-[12px] bg-gradient-to-b from-[#5771a5] to-[#121b29] text-white h-full w-full">
                                            AI Writer
                                        </div>
                                    </button>
                                </div>

                                <input value={subject} onChange={(e) => setSubject(e.target.value)} type="text" id="title" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" required />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="content" className="block text-lg font-semibold text-gray-800 mb-2">Draft Reply Content</label>
                                <textarea value={result} onChange={(e) => setResult(e.target.value)} id="content" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" rows="6" required></textarea>
                            </div>

                            {/* ✅ Section C: Choose target execution layout before dispatch payload routing */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-gray-200">
                                    <label htmlFor="nextStatus" className="text-xs font-bold text-gray-600 whitespace-nowrap">After Sending, Set Status To:</label>
                                    <select 
                                        id="nextStatus"
                                        value={nextStatus} 
                                        onChange={(e) => setNextStatus(e.target.value)}
                                        className="text-xs border border-gray-300 rounded-lg p-1 bg-white font-medium focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="PENDING_CUSTOMER">Pending Customer</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="CLOSED">Closed</option>
                                        <option value="OPEN">Open</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="cursor-pointer border-[3px] border-solid border-[#161616] border-t-0 rounded-[15px] relative shadow-[0px_4px_10px_#00000035] h-10 px-6 active:shadow-none active:translate-y-[2px] transition-all"
                                >
                                    <div className="text-[1rem] flex items-center justify-center gap-2 font-bold tracking-[0.5px] border-b-[2.5px] border-solid border-[#1b4332] rounded-[12px] bg-gradient-to-b from-[#2d6a4f] to-[#081c15] text-white h-full w-full">
                                        Approve & Send
                                    </div>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-24">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-3 text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 0A48.536 48.536 0 0 1 12 3c1.28 0 2.533.049 3.77.146H15" />
                            </svg>
                            <h3 className="text-xl font-bold text-gray-500">No Ticket Selected</h3>
                            <p className="text-sm text-gray-400 text-center mt-1 max-w-xs">Select a pending complaint from the left panel column list to open the workspace review deck.</p>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
};

export default Helpdesk;