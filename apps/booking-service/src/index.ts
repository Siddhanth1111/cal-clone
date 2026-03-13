import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import amqp from 'amqplib';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3003;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';

async function sendToQueue(booking: any) {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'booking_notifications';

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(booking)));
    console.log(" [x] Sent booking to RabbitMQ:", booking.id);
    
    setTimeout(() => connection.close(), 500);
  } catch (error) {
    console.error("RabbitMQ Error:", error);
  }
}

// Fetch all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      // Sort so the newest/upcoming bookings are at the top
      orderBy: { startTime: 'asc' }
    });
    res.json(bookings);
  } catch (error) {
    console.error("Fetch Bookings Error:", error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    // 1. Added notes to the extracted body
    const { bookerName, bookerEmail, notes, startTime, endTime, eventTypeId, userId } = req.body;
    
    // 2. Added notes to the database creation object
    const newBooking = await prisma.booking.create({
      data: { 
        bookerName, 
        bookerEmail, 
        notes, 
        startTime: new Date(startTime), 
        endTime: new Date(endTime), 
        eventTypeId, 
        userId 
      }
    });

    // Fire and forget the notification via RabbitMQ
    sendToQueue(newBooking);

    res.json(newBooking);
  } catch (error) {
    // 3. Log the actual error so it doesn't hide from us!
    console.error("Booking Creation Error:", error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});


// GET busy slots for a specific date and event type
// GET busy slots for a specific date and USER
app.get('/api/bookings/busy', async (req, res) => {
  try {
    // 1. Change eventTypeId to userId
    const { userId, start, end } = req.query; 

    const busySlots = await prisma.booking.findMany({
      where: {
        // 2. Filter by userId so we block time across ALL event types
        userId: userId as string, 
        status: 'CONFIRMED',
        startTime: { 
          gte: new Date(start as string), 
          lte: new Date(end as string) 
        }
      },
      select: { startTime: true, endTime: true }
    });
    
    res.json(busySlots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch busy slots' });
  }
});

// CANCEL a booking
app.put('/api/bookings/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// RESCHEDULE a booking
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    // First, find the existing booking to get the userId
    const existingBooking = await prisma.booking.findUnique({ where: { id } });
    if (!existingBooking) return res.status(404).json({ error: 'Booking not found' });

    // SAFETY CHECK: Ensure the new time doesn't overlap with another confirmed booking!
    const overlapping = await prisma.booking.findFirst({
      where: {
        userId: existingBooking.userId,
        status: 'CONFIRMED',
        id: { not: id }, // Ignore the booking we are currently moving
        // Check if the times cross over each other
        startTime: { lt: new Date(endTime) },
        endTime: { gt: new Date(startTime) }
      }
    });

    if (overlapping) {
      return res.status(400).json({ error: 'This time slot overlaps with an existing booking.' });
    }

    // If safe, update the times!
    const updated = await prisma.booking.update({
      where: { id },
      data: { 
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      }
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Reschedule Error:", error);
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

app.listen(PORT, () => console.log(`Booking service on ${PORT}`));