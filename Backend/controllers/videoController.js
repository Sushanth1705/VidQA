import { Video } from '../models/Video.js';
import { Chat } from '../models/Chat.js';
import { callProcessVideo, callAskQuestion, callDeleteVideo } from '../services/processingService.js';
import axios from 'axios';

// Regex for extracting 11-char YouTube ID
export const extractVideoId = (urlOrId) => {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // Direct 11-character alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const p of patterns) {
    const match = trimmed.match(p);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Fetch YouTube oEmbed metadata for title & thumbnail
const fetchOembed = async (videoId) => {
  const fallbackThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await axios.get(oembedUrl, { timeout: 5000 });
    return {
      title: res.data.title || `YouTube Video (${videoId})`,
      thumbnail: res.data.thumbnail_url || fallbackThumb,
    };
  } catch {
    return {
      title: `YouTube Video (${videoId})`,
      thumbnail: fallbackThumb,
    };
  }
};

/**
 * POST /api/videos
 * Process a YouTube video URL
 */
export const processVideo = async (req, res, next) => {
  try {
    const { youtubeUrl, url } = req.body;
    const inputUrl = youtubeUrl || url;

    if (!inputUrl) {
      const err = new Error('Missing youtubeUrl in request body');
      err.statusCode = 400;
      return next(err);
    }

    const videoId = extractVideoId(inputUrl);
    if (!videoId) {
      const err = new Error('Invalid YouTube URL or Video ID. Please provide a valid YouTube link.');
      err.statusCode = 400;
      return next(err);
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Check if video already exists in MongoDB
    let video = await Video.findOne({ videoId });

    if (video && video.transcriptStatus === 'ready') {
      return res.status(200).json({
        videoId: video.videoId,
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        thumbnail: video.thumbnail,
        status: 'ready',
        message: 'Video is already processed and ready for Q&A.',
      });
    }

    // Fetch video metadata
    const meta = await fetchOembed(videoId);

    // Upsert video as 'processing'
    if (!video) {
      video = new Video({
        videoId,
        title: meta.title,
        youtubeUrl: standardUrl,
        thumbnail: meta.thumbnail,
        transcriptStatus: 'processing',
      });
      await video.save();
    } else {
      video.transcriptStatus = 'processing';
      video.errorMessage = null;
      if (meta.title) video.title = meta.title;
      if (meta.thumbnail) video.thumbnail = meta.thumbnail;
      await video.save();
    }

    // Extract optional API key
    const apiKey = req.headers['x-openai-api-key'] || req.body.apiKey || null;

    // Call FastAPI to extract transcript, chunk, embed, and store in ChromaDB
    try {
      const fastApiResult = await callProcessVideo(videoId, apiKey);
      video.transcriptStatus = 'ready';
      if (fastApiResult.title) video.title = fastApiResult.title;
      if (fastApiResult.thumbnail) video.thumbnail = fastApiResult.thumbnail;
      await video.save();

      return res.status(200).json({
        videoId: video.videoId,
        title: video.title,
        youtubeUrl: video.youtubeUrl,
        thumbnail: video.thumbnail,
        status: 'ready',
        chunksCount: fastApiResult.chunksCount,
      });
    } catch (processError) {
      video.transcriptStatus = 'failed';
      video.errorMessage = processError.message;
      await video.save();
      throw processError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/:id
 * Get video details and past chat history
 */
export const getVideoById = async (req, res, next) => {
  try {
    const videoId = extractVideoId(req.params.id) || req.params.id;
    const video = await Video.findOne({ videoId });

    if (!video) {
      const err = new Error(`Video with ID ${videoId} not found in database.`);
      err.statusCode = 404;
      return next(err);
    }

    // Retrieve chat history
    const chats = await Chat.find({ videoId }).sort({ askedAt: 1 });

    return res.status(200).json({
      videoId: video.videoId,
      title: video.title,
      youtubeUrl: video.youtubeUrl,
      thumbnail: video.thumbnail,
      duration: video.duration,
      status: video.transcriptStatus,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt,
      chats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/videos/:id/ask
 * Ask a question about the video
 */
export const askVideoQuestion = async (req, res, next) => {
  try {
    const videoId = extractVideoId(req.params.id) || req.params.id;
    const { question } = req.body;

    if (!question || !question.trim()) {
      const err = new Error('Question cannot be empty.');
      err.statusCode = 400;
      return next(err);
    }

    // Verify video exists
    const video = await Video.findOne({ videoId });
    if (!video) {
      const err = new Error('Video not found. Please process it first.');
      err.statusCode = 404;
      return next(err);
    }

    if (video.transcriptStatus !== 'ready') {
      const err = new Error(`Video transcript is not ready yet (Current status: ${video.transcriptStatus}).`);
      err.statusCode = 400;
      return next(err);
    }

    // Forward to FastAPI for RAG answer generation
    const apiKey = req.headers['x-openai-api-key'] || req.body.apiKey || null;
    const ragResult = await callAskQuestion(videoId, question.trim(), apiKey);

    // Save Q&A to MongoDB Chat history
    const chatEntry = new Chat({
      videoId,
      question: question.trim(),
      answer: ragResult.answer,
      timestamps: ragResult.timestamps || [],
    });
    await chatEntry.save();

    return res.status(200).json({
      answer: ragResult.answer,
      timestamps: ragResult.timestamps || [],
      sourceChunks: ragResult.sourceChunks || [],
      chatId: chatEntry._id,
      askedAt: chatEntry.askedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/videos/history
 * List all processed videos
 */
export const getHistory = async (req, res, next) => {
  try {
    const videos = await Video.find({}).sort({ createdAt: -1 });
    return res.status(200).json(videos);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/videos/:id
 * Delete video, chat records, and ChromaDB collection
 */
export const deleteVideo = async (req, res, next) => {
  try {
    const videoId = extractVideoId(req.params.id) || req.params.id;

    // Delete from MongoDB Video
    const deletedVideo = await Video.findOneAndDelete({ videoId });
    // Delete from MongoDB Chat
    await Chat.deleteMany({ videoId });

    // Delete from ChromaDB via FastAPI
    await callDeleteVideo(videoId);

    if (!deletedVideo) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Video ${videoId} and its data have been deleted successfully.`,
      videoId,
    });
  } catch (error) {
    next(error);
  }
};
