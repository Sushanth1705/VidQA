import React from 'react';
import { User, Sparkles, Clock } from 'lucide-react';
import TimestampChip from './TimestampChip';

export const ChatMessage = ({ message, onTimestampClick }) => {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 my-3">
        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white shadow-md">
          <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3 my-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0 mt-1 shadow-glow">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="max-w-[90%] md:max-w-[80%] rounded-2xl rounded-tl-sm bg-[#1e293b] border border-slate-700/80 px-4 py-3.5 shadow-card">
        <p className="text-sm md:text-[15px] leading-relaxed text-slate-200 whitespace-pre-wrap">{message.text}</p>

        {/* Timestamp Chips */}
        {Array.isArray(message.timestamps) && message.timestamps.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              Source timestamps:
            </span>
            {message.timestamps.map((ts, idx) => (
              <TimestampChip
                key={`${ts}-${idx}`}
                seconds={ts}
                onClick={onTimestampClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
