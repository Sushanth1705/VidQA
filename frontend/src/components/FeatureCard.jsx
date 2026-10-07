import React from 'react';

export const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="group p-6 rounded-2xl bg-[#111827] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#131d31] transition-all duration-300 shadow-card hover:shadow-glow flex flex-col items-start">
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:border-cyan-500/40 transition-transform duration-200">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;
