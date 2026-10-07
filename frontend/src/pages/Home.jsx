import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import VideoCard from '../components/VideoCard';
import { processVideo, getHistory, deleteVideo } from '../services/api';
import { Sparkles, History, ArrowRight } from 'lucide-react';

export const Home = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [recentVideos, setRecentVideos] = useState([]);

  useEffect(() => {
    // Load recent history videos for preview
    getHistory()
      .then((videos) => {
        if (Array.isArray(videos)) {
          setRecentVideos(videos.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const handleProcessUrl = async (youtubeUrl) => {
    setIsProcessing(true);
    setError('');

    try {
      const data = await processVideo(youtubeUrl);
      if (data && data.videoId) {
        navigate(`/video/${data.videoId}`);
      } else {
        throw new Error('Video processing completed without returning a videoId.');
      }
    } catch (err) {
      console.error('Process error:', err);
      setError(err.message || 'Failed to process YouTube video. Please ensure the link is valid and has captions.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteRecent = async (id) => {
    try {
      await deleteVideo(id);
      setRecentVideos((prev) => prev.filter((v) => v.videoId !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete video');
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section with URL Input */}
      <Hero
        onProcess={handleProcessUrl}
        isProcessing={isProcessing}
        error={error}
      />

      {/* Features Panel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Built for intelligent video workflows
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
            Instant insights from every YouTube video
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            VidQA blends transcript retrieval, timestamped references, and AI-powered answers into a polished experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon="💡"
            title="Transcript Extraction"
            description="Automatically fetches YouTube captions and prepares them for intelligent searching."
          />
          <FeatureCard
            icon="🧠"
            title="AI Question Answering"
            description="Uses Retrieval-Augmented Generation to answer questions using only relevant transcript chunks."
          />
          <FeatureCard
            icon="⏱️"
            title="Timestamp Navigation"
            description="Every answer contains clickable timestamps that jump directly to the correct moment."
          />
        </div>
      </section>

      {/* Recent Videos Section if any exist */}
      {recentVideos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-cyan-400" />
              <h3 className="text-xl font-bold">Recently Processed</h3>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recentVideos.map((video) => (
              <VideoCard
                key={video.videoId}
                video={video}
                onDelete={handleDeleteRecent}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
