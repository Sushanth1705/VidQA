import express from 'express';
import {
  processVideo,
  getVideoById,
  askVideoQuestion,
  getHistory,
  deleteVideo,
} from '../controllers/videoController.js';

const router = express.Router();

// Order matters: /history before /:id
router.post('/', processVideo);
router.get('/history', getHistory);
router.get('/:id', getVideoById);
router.post('/:id/ask', askVideoQuestion);
router.delete('/:id', deleteVideo);

export default router;
