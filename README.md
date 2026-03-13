Live Link - http://16.171.35.55:5173/dashboard

The application is built using a Microservices Architecture, containerized with Docker, and utilizes RabbitMQ for asynchronous event-driven notifications.

🏗 System Architecture
The backend is split into isolated services communicating through an API Gateway and a Message Broker:
Frontend Client: React SPA that provides the Admin Dashboard and Public Booking pages.
API Gateway (Port 8080): Routes incoming frontend requests to the appropriate internal microservice.
Event Service (Port 3002): Manages EventType and multiple Availability schedules (CRUD operations).
Booking Service (Port 3003): Handles meeting creation, rescheduling, cancellation, and complex availability math (calculating 1-minute buffers and preventing overlapping bookings).
Notification Service (Port 3004): A headless worker service that consumes messages from RabbitMQ to trigger async email notifications for confirmations and cancellations.
PostgreSQL Database: The single source of truth, interacted with via Prisma ORM.
RabbitMQ: Message broker for decoupled inter-service communication.

💻 Tech Stack
Frontend: React, TypeScript, Tailwind CSS, React Router, Axios, Lucide React (Icons).
Backend: Node.js, Express.js, TypeScript.
Database & ORM: PostgreSQL, Prisma.
Message Broker: RabbitMQ (amqplib).
Infrastructure: Docker, Docker Compose.

🧠 Assumptions
Email Notifications:
Assumption: Real emails are not sent.
Implementation: The Notification Service acts as a sink, consuming RabbitMQ messages and formatting terminal logs to simulate an SMTP server.