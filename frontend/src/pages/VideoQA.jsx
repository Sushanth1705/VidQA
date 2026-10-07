import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideo, askQuestion } from '../services/api';
import useYouTubePlayer from '../hooks/useYouTubePlayer';
import VideoPlayer from '../components/VideoPlayer';
import ChatWindow from '../components/ChatWindow';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';

export const VideoQA = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [videoData, setVideoData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState(null);

  // YouTube player controller hook
  const { seekTo, error: playerError } = useYouTubePlayer('youtube-player-container', videoId);

  // Fetch video information and chat history
  const fetchVideoInfo = async () => {
    setIsLoadingVideo(true);
    setError(null);
    try {
      const data = await getVideo(videoId);
      setVideoData(data);

      // Prepopulate messages from stored chat history
      if (Array.isArray(data.chats)) {
        const formatted = [];
        data.chats.forEach((c) => {
          formatted.push({
            id: `q-${c._id || Math.random()}`,
            sender: 'user',
            text: c.question,
          });
          formatted.push({
            id: `a-${c._id || Math.random()}`,
            sender: 'bot',
            text: c.answer,
            timestamps: c.timestamps || [],
          });
        });
        setMessages(formatted);
      }
    } catch (err) {
      // If video was not found in DB, attempt to process it automatically
      if (err.status === 404) {
        try {
          const processed = await processVideo(`https://www.youtube.com/watch?v=${videoId}`);
          setVideoData(processed);
          return;
        } catch (procErr) {
          setError(procErr.message || 'Failed to process this video.');
          return;
        }
      }
      console.error('Fetch video error:', err);
      setError(err.message || 'Failed to load video information.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchVideoInfo();
    }
  }, [videoId]);

  // Handle asking a question
  const handleSendMessage = async (questionText) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: questionText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAsking(true);

    try {
      const response = await askQuestion(videoId, questionText);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.answer,
        timestamps: response.timestamps || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Ask error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: `Error: ${err.message || 'Unable to generate an answer at this time.'}`,
        timestamps: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleTimestampClick = (seconds) => {
    if (typeof seconds === 'number') {
      seekTo(seconds, true);
    }
  };

  if (isLoadingVideo) {
    return <Loading fullScreen message="Loading video workspace..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <ErrorMessage
          title="Could not load video"
          message={error}
          onRetry={fetchVideoInfo}
        />
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex items-center gap-3">
          <a
            href={videoData?.youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <span>Watch on YouTube</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={fetchVideoInfo}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Refresh video info"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Player (7 Cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <VideoPlayer
            videoId={videoId}
            title={videoData?.title}
            error={playerError}
          />

          {/* Quick instructions / tips */}
          <div className="p-4 rounded-xl bg-[#111827] border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              💡 <strong>Seeking:</strong> Click any timestamp chip in the answers to jump directly to that part of the video.
            </span>
          </div>
        </div>

        {/* Right Column: Q&A Chat Window (5 Cols on desktop) */}
        <div className="lg:col-span-5 h-[580px] lg:h-[620px]">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isAsking}
            onTimestampClick={handleTimestampClick}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoQA;
