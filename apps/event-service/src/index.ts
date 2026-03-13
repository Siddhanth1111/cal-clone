import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

const defaultDaysTemplate = [
  { day: 'Sunday', active: false, start: '09:00', end: '17:00' },
  { day: 'Monday', active: true, start: '09:00', end: '17:00' },
  { day: 'Tuesday', active: true, start: '09:00', end: '17:00' },
  { day: 'Wednesday', active: true, start: '09:00', end: '17:00' },
  { day: 'Thursday', active: true, start: '09:00', end: '17:00' },
  { day: 'Friday', active: true, start: '09:00', end: '17:00' },
  { day: 'Saturday', active: false, start: '09:00', end: '17:00' },
];

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
    const { title, description, duration, urlSlug, userId, availabilityId } = req.body;
    const newEvent = await prisma.eventType.create({
      data: { title, description, duration, urlSlug, userId, availabilityId } // <-- Added here
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
    let availabilities = await prisma.availability.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'asc' }
    });

    // If they have zero schedules, create a default one automatically
    if (availabilities.length === 0) {
      const newAvail = await prisma.availability.create({
        data: { userId: req.params.userId, name: "Working Hours", days: defaultDaysTemplate, timeZone: "Asia/Kolkata", isDefault: true }
      });
      availabilities = [newAvail];
    }
    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

app.post('/api/availability', async (req, res) => {
  try {
    const { userId, name, timeZone } = req.body;
    const result = await prisma.availability.create({
      data: { userId, name, days: defaultDaysTemplate, timeZone, isDefault: false }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create availability' });
  }
});

// 3. UPDATE an existing schedule (Times, Days, Name)
app.put('/api/availability/:id', async (req, res) => {
  try {
    const { name, days, timeZone, isDefault } = req.body;
    
    // If setting this to default, remove default from all others first
    if (isDefault) {
      const current = await prisma.availability.findUnique({ where: { id: req.params.id }});
      await prisma.availability.updateMany({
        where: { userId: current?.userId },
        data: { isDefault: false }
      });
    }

    const result = await prisma.availability.update({
      where: { id: req.params.id },
      data: { name, days, timeZone, isDefault }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// 4. DELETE a schedule
app.delete('/api/availability/:id', async (req, res) => {
  try {
    await prisma.availability.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete availability' });
  }
});


// UPDATE an event type
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, urlSlug, availabilityId } = req.body;
    
    const updatedEvent = await prisma.eventType.update({
      where: { id },
      data: { title, description, duration, urlSlug, availabilityId } // <-- Added here
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