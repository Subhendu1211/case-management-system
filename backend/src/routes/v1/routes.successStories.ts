import { Router } from 'express';
// You may need to adjust the import path for your ORM or DB client
// import { getLatestSuccessStory } from '../services/successStories.service';

const router = Router();

// Dummy implementation: Replace with real DB/service call
router.get('/success-story-image', async (req, res) => {
  // Example: Fetch the latest success story from DB/service
  // const story = await getLatestSuccessStory();
  // const imageUrl = story?.imageUrl;
  const imageUrl = '/uploads/success-stories/latest.jpg'; // Replace with real logic
  if (imageUrl) {
    res.json({ imageUrl });
  } else {
    res.status(404).json({ error: 'No success story image found' });
  }
});

export default router;
