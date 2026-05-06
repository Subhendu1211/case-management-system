import { Router } from 'express';
import { fetchPage } from '../../services/cmsService.js';

const router = Router();

// API to get the summary (caption) for the Success Stories page
router.get('/success-stories-caption', async (req, res) => {
  try {
    // You may want to use slug or path depending on your CMS setup
    const page = await fetchPage({ slug: 'success-stories' });
    if (page && page.summary) {
      res.json({ summary: page.summary });
    } else {
      res.status(404).json({ error: 'No summary found for Success Stories' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
