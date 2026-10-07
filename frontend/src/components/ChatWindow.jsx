import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquareText } from 'lucide-react';
import ChatMessage from './ChatMessage';

export const ChatWindow = ({ messages, onSendMessage, isLoading, onTimestampClick }) => {
  const [inputQuestion, setInputQuestion] = useState('');
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputQuestion.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInputQuestion('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-slate-800 rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <h3 className="font-semibold text-slate-200 text-sm md:text-base">Ask About This Video</h3>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          RAG Q&A
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-cyan-400 mb-3 shadow-glow">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-200 mb-1">Ask questions about this video</p>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Answers are grounded directly in the transcript with clickable timestamp seek pills.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {[
                'Summarize this video',
                'What are the main topics discussed?',
                'What is the key takeaway?'
              ].map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSendMessage(starter)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-cyan-300 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  💡 {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessage
              key={msg.id || idx}
              message={msg}
              onTimestampClick={onTimestampClick}
            />
          ))
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-3 my-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-[#1e293b] border border-slate-700 px-4 py-3 text-slate-300 text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              Searching transcript & generating answer...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3.5 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the video..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium text-sm flex items-center gap-2 hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-glow transform active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Ask</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
