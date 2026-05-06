import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

// Get all news
router.get('/', async (req, res) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Add news
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const news = await prisma.news.create({ data: { title, content } });
    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add news' });
  }
});

// Optionally: Add update/delete endpoints here
export default router;
