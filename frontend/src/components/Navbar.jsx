import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { History, Home, Info, Sparkles, X, Menu, Settings, Key, Cpu, Check, ShieldCheck } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey } from '../services/api';

export const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setApiKeyInput(getStoredApiKey());
  }, [showSettingsModal]);

  const isActive = (path) => location.pathname === path;

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setStoredApiKey(apiKeyInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const hasApiKey = Boolean(apiKeyInput.trim());

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center font-black text-white text-xl shadow-glow group-hover:scale-105 transition-transform duration-200">
                V
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  VidQA
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    RAG AI
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Video Q&A with timestamps
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1.5">
              <Link
                to="/"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive('/')
                    ? 'bg-slate-800/90 text-cyan-300 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link
                to="/history"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive('/history')
                    ? 'bg-slate-800/90 text-cyan-300 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <History className="w-4 h-4" />
                History
              </Link>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-cyan-300 hover:bg-slate-800/50 transition-all"
                title="AI & API Settings"
              >
                <Settings className="w-4 h-4 text-cyan-400" />
                AI Settings
              </button>
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                <Info className="w-4 h-4" />
                About
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-[#0b0f19] px-4 pt-2 pb-4 space-y-1">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <Home className="w-4 h-4 text-cyan-400" />
              Home
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <History className="w-4 h-4 text-cyan-400" />
              History
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowSettingsModal(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
              AI Settings
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setShowAboutModal(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              <Info className="w-4 h-4 text-cyan-400" />
              About
            </button>
          </div>
        )}
      </nav>

      {/* AI Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111827] border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative text-slate-200">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-glow">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Engine & API Key</h3>
                <p className="text-xs text-slate-400">Manage RAG model pipeline and provider keys</p>
              </div>
            </div>

            {/* Current Engine Badge */}
            <div className="mb-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`}></span>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {hasApiKey ? 'OpenAI Mode (GPT-4o-mini + text-embedding-3)' : 'Local ONNX Semantic RAG Mode'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {hasApiKey ? 'Generative grounded answers with citations' : 'Zero-cost local embeddings + grounded citation extraction'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${hasApiKey ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'}`}>
                {hasApiKey ? 'OpenAI' : 'Local Fast'}
              </span>
            </div>

            {/* API Key Form */}
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  OpenAI API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Leave blank to use the built-in local ChromaDB ONNX model. If provided, key is securely stored in your local browser and sent directly to the RAG service.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    setStoredApiKey('');
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 2000);
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear Key (Use Local Mode)
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      Saved!
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Full privacy: Videos & transcripts are indexed locally in ChromaDB.</span>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">About VidQA</h3>
                <p className="text-xs text-slate-400">Retrieval-Augmented Generation for YouTube</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>VidQA</strong> lets you paste any YouTube video link, extracts and chunks captions with exact second-level timestamps, and indexes them into ChromaDB.
              </p>
              <p>
                Ask natural questions to receive answers strictly grounded in the video's transcript, complete with clickable timestamp chips that seek the embedded YouTube player directly to the exact moment.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
