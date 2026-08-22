import React from "react";
import { Sparkles } from "lucide-react";

export default function GenerateButton({ onClick, loading, text = "Generate" }) {
  return (
    <button 
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wide shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-200 cursor-pointer disabled:opacity-50 active:scale-95 border border-blue-400/20"
    >
      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
      <span>{loading ? "Generating..." : text}</span>
    </button>
  );
}