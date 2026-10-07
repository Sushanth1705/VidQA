import React from 'react';
import { Youtube, AlertCircle } from 'lucide-react';

export const VideoPlayer = ({ videoId, title, error }) => {
  return (
    <div className="flex flex-col bg-[#111827] border border-slate-800 rounded-2xl shadow-card overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-400">
          <Youtube className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-slate-200 text-sm md:text-base line-clamp-1">
            {title || 'Video Player'}
          </h3>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          YouTube Embedded
        </span>
      </div>

      {/* Video Container (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {error ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-rose-400">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div id="youtube-player-container" className="w-full h-full" />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
