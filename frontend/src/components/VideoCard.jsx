import React, { useState } from 'react';
import { Play, Trash2, Calendar, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VideoCard = ({ video, onDelete }) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = video.createdAt
    ? new Date(video.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const isReady = video.transcriptStatus === 'ready';
  const isFailed = video.transcriptStatus === 'failed';

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${video.title || video.videoId}" from history?`)) return;
    setIsDeleting(true);
    try {
      await onDelete(video.videoId);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={() => isReady && navigate(`/video/${video.videoId}`)}
      className={`group relative flex flex-col rounded-2xl bg-[#111827] border border-slate-800 overflow-hidden shadow-card transition-all duration-200 ${
        isReady ? 'hover:border-cyan-500/50 hover:shadow-glow cursor-pointer' : 'opacity-80'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            No preview
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isReady && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 backdrop-blur-md">
              Ready
            </span>
          )}
          {isFailed && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-500/40 backdrop-blur-md flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Failed
            </span>
          )}
          {!isReady && !isFailed && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-500/40 backdrop-blur-md">
              Processing
            </span>
          )}
        </div>

        {/* Hover play icon overlay */}
        {isReady && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-slate-200 text-sm md:text-base line-clamp-2 mb-1 group-hover:text-cyan-300 transition-colors">
            {video.title || `Video ${video.videoId}`}
          </h4>
          <a
            href={video.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1 line-clamp-1 mb-3"
          >
            <span className="truncate">{video.youtubeUrl}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Delete video from history"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
