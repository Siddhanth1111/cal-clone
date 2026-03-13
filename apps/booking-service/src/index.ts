import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;

app.get('/health', (req, res) => {
  res.json({ status: 'Booking service is running perfectly' });
});

// Fetch all bookings (we will filter by userId from the frontend)
app.get('/api/bookings', async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId: String(userId) } : {};
    
    const bookings = await prisma.booking.findMany({ where: filter });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { bookerName, bookerEmail, startTime, endTime, eventTypeId, userId } = req.body;
    
    // In a real app, we'd check availability via the event-service here before saving!
    
    const newBooking = await prisma.booking.create({
      data: { bookerName, bookerEmail, startTime: new Date(startTime), endTime: new Date(endTime), eventTypeId, userId }
    });
    res.json(newBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.listen(PORT, () => {
  console.log(`Booking service listening on port ${PORT}`);
});