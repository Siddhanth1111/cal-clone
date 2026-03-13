import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.get('/health', (req, res) => {
  res.json({ status: 'Event service is running perfectly' });
});

// Fetch all events (we'll filter by userId from the frontend later)
app.get('/api/events', async (req, res) => {
  try {
    const events = await prisma.eventType.findMany();
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create a new event type
app.post('/api/events', async (req, res) => {
  try {
    const { title, description, duration, urlSlug, userId } = req.body;
    const newEvent = await prisma.eventType.create({
      data: { title, description, duration, urlSlug, userId }
    });
    res.json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.listen(PORT, () => {
  console.log(`Event service listening on port ${PORT}`);
});