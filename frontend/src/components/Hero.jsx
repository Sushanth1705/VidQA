import React, { useState } from 'react';
import { Youtube, ArrowRight, Loader2, Sparkles, Lightbulb } from 'lucide-react';

export const Hero = ({ onProcess, isProcessing, error }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || isProcessing) return;
    onProcess(trimmed);
  };

  return (
    <div className="relative py-12 md:py-20 flex flex-col items-center text-center px-4 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-blue-600/15 via-cyan-500/10 to-indigo-600/15 blur-[100px] pointer-events-none rounded-full" />

      {/* Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-cyan-300 text-xs font-semibold mb-6 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Context-Aware Video RAG System</span>
      </div>

      {/* Main Hero Headings */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15] mb-6">
        Ask Questions About <br />
        <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">
          Any YouTube Video
        </span>
      </h1>

      <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
        AI-powered Retrieval-Augmented Generation (RAG) system that finds answers directly from YouTube transcripts with clickable timestamps.
      </p>

      {/* URL Input Form Card */}
      <div className="w-full max-w-2xl relative z-10">
        <form
          onSubmit={handleSubmit}
          className="p-2 sm:p-2.5 rounded-2xl bg-[#111827]/90 border border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center gap-2.5 focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all"
        >
          <div className="flex items-center gap-3 w-full px-3 py-2 text-slate-400 flex-1">
            <Youtube className="w-6 h-6 text-red-500 flex-shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube URL here..."
              disabled={isProcessing}
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !url.trim()}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-glow flex-shrink-0"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing video...</span>
              </>
            ) : (
              <>
                <span>Process Video</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Tip Box & Sample Links */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              <strong className="text-slate-300">Tip:</strong> Works with any YouTube video containing captions.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Try sample:</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw');
                onProcess('https://www.youtube.com/watch?v=jNQXAC9IVRw');
              }}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Me at the zoo
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                onProcess('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
              }}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              Rick Astley
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm text-center animate-in fade-in">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hero;
