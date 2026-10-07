import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, deleteVideo } from '../services/api';
import VideoCard from '../components/VideoCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { History as HistoryIcon, Search, Plus, Film } from 'lucide-react';

export const History = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History fetch error:', err);
      setError(err.message || 'Failed to retrieve video history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (videoId) => {
    try {
      await deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
    } catch (err) {
      alert(err.message || 'Failed to delete video.');
    }
  };

  // Filtered by title or URL or video ID
  const filteredVideos = videos.filter((v) => {
    const q = searchQuery.toLowerCase();
    const title = (v.title || '').toLowerCase();
    const id = (v.videoId || '').toLowerCase();
    const url = (v.youtubeUrl || '').toLowerCase();
    return title.includes(q) || id.includes(q) || url.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 text-white mb-1">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <HistoryIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Video History</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Access and manage previously indexed YouTube videos for instant Q&A.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition-all shadow-md hover:shadow-glow w-fit"
        >
          <Plus className="w-4 h-4" />
          Process New Video
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-8 max-w-md relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, video ID, or link..."
          className="w-full bg-[#111827] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Content State */}
      {isLoading ? (
        <Loading message="Loading history records..." fullScreen />
      ) : error ? (
        <ErrorMessage
          title="Could not load history"
          message={error}
          onRetry={fetchHistory}
        />
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#111827]/50 border border-slate-800/80 max-w-lg mx-auto my-12">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto mb-4">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">
            {searchQuery ? 'No matching videos found' : 'No processed videos yet'}
          </h3>
          <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
            {searchQuery
              ? 'Try changing your search keywords or clear the filter.'
              : 'Paste a YouTube video URL on the Home page to index your first video.'}
          </p>
          <button
            onClick={() => {
              if (searchQuery) setSearchQuery('');
              else navigate('/');
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            {searchQuery ? 'Clear Search' : 'Go to Home'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
