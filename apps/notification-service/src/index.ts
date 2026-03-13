import express from 'express';
import amqp from 'amqplib';

const app = express();
const PORT = process.env.PORT || 3004;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';

async function startWorker() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'booking_notifications';

    await channel.assertQueue(queue, { durable: true });
    console.log(` [*] Waiting for messages in ${queue}.`);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const booking = JSON.parse(msg.content.toString());
        
        console.log(`\n=== SENDING EMAIL TO: ${booking.bookerEmail} ===`);
        
        // NEW: Check the status of the booking!
        if (booking.status === 'CANCELLED') {
          console.log(`Hi ${booking.bookerName}, your booking for ${booking.startTime} is cancelled!`);
        } else {
          console.log(`Hi ${booking.bookerName}, your booking for ${booking.startTime} is confirmed!`);
        }
        
        console.log('================================================\n');

        // Acknowledge the message so RabbitMQ removes it from the queue
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("RabbitMQ Connection Error:", error);
    // If RabbitMQ isn't ready yet, try again in 5 seconds
    setTimeout(startWorker, 5000);
  }
}

// Start listening to the queue
startWorker();

app.get('/health', (req, res) => {
  res.json({ status: 'Notification service is running perfectly' });
});

app.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});