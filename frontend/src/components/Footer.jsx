import React from 'react';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#0b0f19] py-8 px-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white text-xs">
            V
          </div>
          <span className="text-slate-400 font-semibold">VidQA</span>
          <span>— Video Retrieval-Augmented Generation</span>
        </div>

        <p className="text-slate-500">
          Built with React, Express, FastAPI, ChromaDB & OpenAI.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
