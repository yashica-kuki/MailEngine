import React, { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { ToastContainer, toast } from 'react-toastify';
import { 
  Inbox, 
  Sparkles, 
  Send, 
  Search, 
  RefreshCw, 
  Loader2
} from "lucide-react";

const Helpdesk = () => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [subject, setSubject] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [nextStatus, setNextStatus] = useState('RESOLVED');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const fetchPendingTickets = async () => {
        const cachedAccountId = localStorage.getItem("accountId") || "96b0d249-61d6-11f1-adde-e86538d58b3c";
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/helpdesk/pending/${cachedAccountId}`);    
            const data = await response.json();

            if (data.success) {
                setTickets(data.tickets);
            } else {
                toast.error("Failed to load tickets.");
            }
        } catch (error) {
            console.error("Fetch pending tickets exception:", error);
            toast.error("Could not reach backend.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingTickets();
    }, []);

    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
        setSubject(`Re: ${ticket.subject}`);
        setResult(''); 
        setNextStatus(ticket.status === 'OPEN' ? 'PENDING_CUSTOMER' : 'RESOLVED');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': 
                return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900';
            case 'IN_PROGRESS': 
                return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900';
            case 'PENDING_CUSTOMER': 
                return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900';
            case 'RESOLVED': 
                return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900';
            case 'CLOSED': 
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
            default: 
                return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const handleStatusUpdate = async (tickId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/helpdesk/ticket-status/${tickId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Status updated to ${newStatus}`);
                setTickets(prev => prev.map(t => t.tick_id === tickId ? { ...t, status: newStatus } : t));
                if (selectedTicket && selectedTicket.tick_id === tickId) {
                    setSelectedTicket(prev => ({ ...prev, status: newStatus }));
                }
            } else {
                toast.error(data.message || "Failed to update status.");
            }
        } catch (error) {
            console.error("Status update error:", error);
            toast.error("Failed to update status.");
        }
    };

    const generateContent = async (e) => {
        e.preventDefault();
        if (!subject) {
            toast.warn("Please select a ticket first.");
            return;
        }
        setGenerating(true);
        try {
            const apikey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apikey) {
                toast.error("VITE_GEMINI_API_KEY is not configured.");
                setGenerating(false);
                return;
            }
            const ai = new GoogleGenAI({ apiKey: apikey });

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Generate a polite email response to customer ticket subject "${subject}" and complaint: "${selectedTicket?.raw_complaint || ''}"`,
                config: {
                    systemInstruction: "You are a customer support agent. Output ONLY a clean email reply body. Do not include markdown headers, options, or extra commentary. Start with greeting and end with sign-off."
                },
            });

            setResult(response.text);
            toast.success("Draft generated.");
        } catch (error) {
            console.error("Error generating content", error);
            toast.error("Gemini AI error.");
        } finally {
            setGenerating(false);
        }
    };

    const handleProcessSubmission = async (e) => {
        e.preventDefault();
        const cachedAccountId = localStorage.getItem("accountId") || "96b0d249-61d6-11f1-adde-e86538d58b3c";

        if (!selectedTicket) {
            toast.warn("Please select a ticket to process.");
            return;
        }
        if (!result) {
            toast.warn("Please add a response before sending.");
            return;
        }

        setSending(true);

        try {
            const realRecipient = selectedTicket.customer_email || "support@example.com";

            const response = await fetch(`${API_BASE_URL}/mail/approve-ticket`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickId: selectedTicket.tick_id,
                    accountId: cachedAccountId,
                    recipientEmail: realRecipient,
                    replyBodyContent: result,
                    nextStatus: nextStatus
                })
            });
            const data = await response.json();

            if (data.success) {
                toast.success(`Reply sent to ${realRecipient}`);
                setTickets(prev => prev.filter(t => t.tick_id !== selectedTicket.tick_id));
                setSelectedTicket(null);
                setSubject('');
                setResult('');
            } else {
                toast.error(data.message || "Failed to approve ticket.");
            }
        } catch (error) {
            console.error("Approve ticket error:", error);
            toast.error("Server error while sending reply.");
        } finally {
            setSending(false);
        }
    };

    const filteredTickets = tickets.filter(t => 
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer_email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="py-10 sm:py-12 px-4 sm:px-8 lg:px-12 w-full">
            <ToastContainer position="bottom-right" autoClose={3000} />

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Helpdesk Inbox
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                        Manage customer inquiries, draft AI-assisted responses, and resolve support tickets.
                    </p>
                </div>

                <button 
                    onClick={fetchPendingTickets}
                    disabled={loading}
                    className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
                    <span>Refresh Tickets</span>
                </button>
            </div>

            {/* 2-Column Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Column 1: Ticket List */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter tickets by subject, email..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Tickets Stream */}
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                <span>Loading inbox queue...</span>
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                                No pending tickets found.
                            </div>
                        ) : (
                            filteredTickets.map((t) => {
                                const isSelected = selectedTicket?.tick_id === t.tick_id;
                                return (
                                    <div
                                        key={t.tick_id}
                                        onClick={() => handleSelectTicket(t)}
                                        className={`p-4 rounded-xl border transition-colors cursor-pointer text-left ${
                                            isSelected 
                                                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40" 
                                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                                                #{t.tick_id.substring(0, 8)}
                                            </span>
                                            
                                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                                                {t.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate mb-1.5">
                                            {t.subject}
                                        </h4>

                                        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                            <span className="truncate max-w-[200px] font-medium text-blue-600 dark:text-blue-400">
                                                {t.customer_email || 'Unknown sender'}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                                                {t.priority || 'MEDIUM'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

                {/* Column 2: Audit Response Pane */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                    {selectedTicket ? (
                        <form onSubmit={handleProcessSubmission} className="space-y-5">
                            
                            {/* Selected Ticket Meta */}
                            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                        Ticket #{selectedTicket.tick_id.substring(0, 8)}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                        From: <span className="font-semibold text-slate-900 dark:text-slate-200">{selectedTicket.customer_email || 'Unknown'}</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Status:</span>
                                    <select 
                                        value={selectedTicket.status} 
                                        onChange={(e) => handleStatusUpdate(selectedTicket.tick_id, e.target.value)}
                                        className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="PENDING_CUSTOMER">Pending Customer</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Customer Inquiry Box */}
                            <div>
                                <label className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                                    Customer Complaint Inquiry
                                </label>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                                    "{selectedTicket.raw_complaint || 'No message text provided.'}"
                                </div>
                            </div>

                            {/* Reply Subject */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label htmlFor="replySubject" className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200">
                                        Reply Subject
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateContent}
                                        disabled={generating}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-slate-700"
                                    >
                                        {generating ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                        <span>Draft with AI</span>
                                    </button>
                                </div>
                                <input 
                                    value={subject} 
                                    onChange={(e) => setSubject(e.target.value)} 
                                    type="text" 
                                    id="replySubject" 
                                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" 
                                    required 
                                />
                            </div>

                            {/* Reply Body */}
                            <div>
                                <label htmlFor="replyContent" className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                                    Reply Content
                                </label>
                                <textarea 
                                    value={result} 
                                    onChange={(e) => setResult(e.target.value)} 
                                    id="replyContent" 
                                    placeholder="Type response or click 'Draft with AI' above..."
                                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans" 
                                    rows={7} 
                                    required
                                />
                            </div>

                            {/* Footer / Send Action */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                    <span>Set next status to:</span>
                                    <select 
                                        value={nextStatus} 
                                        onChange={(e) => setNextStatus(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200"
                                    >
                                        <option value="PENDING_CUSTOMER">Pending Customer</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Sending Reply...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Approve &amp; Send</span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </form>
                    ) : (
                        <div className="py-24 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Select a ticket from the left panel to inspect customer details and reply.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Helpdesk;