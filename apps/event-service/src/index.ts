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

// --- AVAILABILITY ENDPOINTS ---

// Get user's availability
app.get('/api/availability/:userId', async (req, res) => {
  try {
    let availability = await prisma.availability.findFirst({
      where: { userId: req.params.userId }
    });

    // If they don't have one, return a default template matching Cal.com
    if (!availability) {
      const defaultDays = [
        { day: 'Sunday', active: false, start: '09:00', end: '17:00' },
        { day: 'Monday', active: true, start: '09:00', end: '17:00' },
        { day: 'Tuesday', active: true, start: '09:00', end: '17:00' },
        { day: 'Wednesday', active: true, start: '09:00', end: '17:00' },
        { day: 'Thursday', active: true, start: '09:00', end: '17:00' },
        { day: 'Friday', active: true, start: '09:00', end: '17:00' },
        { day: 'Saturday', active: false, start: '09:00', end: '17:00' },
      ];
      return res.json({ name: "Working hours", days: defaultDays, timeZone: "Asia/Kolkata" });
    }

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
    console.log("user does not exist");
  }
});

// Save or update availability
app.post('/api/availability', async (req, res) => {
  try {
    const { userId, name, days, timeZone } = req.body;
    
    // Upsert: Update if exists, Create if it doesn't
    const existing = await prisma.availability.findFirst({ where: { userId } });
    
    let result;
    if (existing) {
      result = await prisma.availability.update({
        where: { id: existing.id },
        data: { name, days, timeZone }
      });
    } else {
      result = await prisma.availability.create({
        data: { userId, name, days, timeZone, isDefault: true }
      });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({ error: 'Failed to save availability' });
  }
});


// UPDATE an event type
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, urlSlug } = req.body;
    
    const updatedEvent = await prisma.eventType.update({
      where: { id },
      data: { title, description, duration, urlSlug }
    });
    
    res.json(updatedEvent);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: 'Failed to update event type' });
  }
});

// DELETE an event type
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.eventType.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
});

app.listen(PORT, () => {
  console.log(`Event service listening on port ${PORT}`);
});