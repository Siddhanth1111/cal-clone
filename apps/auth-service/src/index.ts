import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'Auth service is running perfectly' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    let user = await prisma.user.findFirst({
      where: { email: 'admin@calclone.com' }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Default Admin',
          email: 'admin@calclone.com',
          timeZone: 'Asia/Kolkata'
        }
      });
      console.log('Seeded default admin user.');
    }

    res.json(user);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: 'Failed to connect to the database' });
  }
});

app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`);
});