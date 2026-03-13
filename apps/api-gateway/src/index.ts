import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8080;

// Allow the React frontend to talk to the Gateway
app.use(cors({
  origin: '*', // For development. In production, set this to your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is routing traffic perfectly' });
});

// Route everything starting with /api/auth to the Auth Service
app.use('/api/auth', createProxyMiddleware({ 
  target: 'http://auth-service:3001', 
  changeOrigin: true 
}));

// Route everything starting with /api/events to the Event Service
app.use('/api/events', createProxyMiddleware({ 
  target: 'http://event-service:3002', 
  changeOrigin: true 
}));

// Route everything starting with /api/bookings to the Booking Service
app.use('/api/bookings', createProxyMiddleware({ 
  target: 'http://booking-service:3003', 
  changeOrigin: true 
}));

app.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});