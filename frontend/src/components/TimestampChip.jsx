import React from 'react';
import { Play } from 'lucide-react';

export const formatSeconds = (totalSeconds) => {
  const val = typeof totalSeconds === 'object' && totalSeconds !== null ? totalSeconds.start : totalSeconds;
  const num = Number(val);
  if (isNaN(num) || num < 0) return '00:00';
  const minutes = Math.floor(num / 60);
  const seconds = Math.floor(num % 60);
  const paddedMins = String(minutes).padStart(2, '0');
  const paddedSecs = String(seconds).padStart(2, '0');
  return `${paddedMins}:${paddedSecs}`;
};

export const TimestampChip = ({ seconds, onClick, className = '' }) => {
  const rawSecs = typeof seconds === 'object' && seconds !== null ? seconds.start : Number(seconds);
  const formatted = typeof seconds === 'object' && seconds?.label ? seconds.label : formatSeconds(rawSecs);

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(rawSecs)}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full 
        bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 
        hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400
        transition-all duration-150 transform hover:scale-105 active:scale-95 shadow-sm ${className}`}
      title={`Jump to ${formatted}`}
    >
      <Play className="w-2.5 h-2.5 fill-current" />
      <span>{formatted}</span>
    </button>
  );
};

export default TimestampChip;
