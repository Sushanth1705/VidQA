import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import VideoQA from './pages/VideoQA';
import History from './pages/History';
import NotFound from './pages/NotFound';

export const App = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/video/:videoId" element={<VideoQA />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
