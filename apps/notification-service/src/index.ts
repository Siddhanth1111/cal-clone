import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';

async function init() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'booking_notifications';

    await channel.assertQueue(queue, { durable: true });
    console.log(" [*] Notification Service waiting for messages in %s.", queue);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const booking = JSON.parse(msg.content.toString());
        console.log(" 📧 SENDING EMAIL TO:", booking.bookerEmail);
        console.log(` Hi ${booking.bookerName}, your booking for ${booking.startTime} is confirmed!`);
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Notification Service Error:", error);
    setTimeout(init, 5000); // Retry connection
  }
}

init();