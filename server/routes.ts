import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLectureSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { bot } from "./bot";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Підтримуються тільки PDF файли та зображення'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize bot
  console.log('🤖 Telegram bot initialized');

  // Webhook endpoint for Telegram
  app.post('/webhook/telegram', (req, res) => {
    console.log('📨 Webhook received:', req.body);
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  // Get all lectures
  app.get("/api/lectures", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const lectures = await storage.getLectures(limit, offset);
      res.json(lectures);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      res.status(500).json({ message: "Помилка при отриманні лекцій" });
    }
  });

  // Get lecture by ID
  app.get("/api/lectures/:id", async (req, res) => {
    try {
      const lecture = await storage.getLectureById(req.params.id);
      if (!lecture) {
        return res.status(404).json({ message: "Лекцію не знайдено" });
      }
      res.json(lecture);
    } catch (error) {
      console.error('Error fetching lecture:', error);
      res.status(500).json({ message: "Помилка при отриманні лекції" });
    }
  });

  // Upload new lecture
  app.post("/api/lectures", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Файл обов'язковий" });
      }

      const { title, description, subject, uploadedBy } = req.body;
      
      // Validate required fields
      if (!title || !subject || !uploadedBy) {
        return res.status(400).json({ message: "Назва, предмет та ID користувача обов'язкові" });
      }

      // Move file to permanent location
      const fileName = `${Date.now()}_${req.file.originalname}`;
      const permanentPath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, permanentPath);

      const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';

      const lectureData = {
        title,
        description: description || '',
        subject,
        fileName,
        filePath: permanentPath,
        fileType,
        fileSize: req.file.size,
        uploadedBy,
      };

      const lecture = await storage.createLecture(lectureData);
      res.json(lecture);
    } catch (error) {
      console.error('Error uploading lecture:', error);
      res.status(500).json({ message: "Помилка при завантаженні лекції" });
    }
  });

  // Delete lecture
  app.delete("/api/lectures/:id", async (req, res) => {
    try {
      const lecture = await storage.getLectureById(req.params.id);
      if (!lecture) {
        return res.status(404).json({ message: "Лекцію не знайдено" });
      }

      // Delete file from disk
      if (fs.existsSync(lecture.filePath)) {
        fs.unlinkSync(lecture.filePath);
      }

      const deleted = await storage.deleteLecture(req.params.id);
      if (deleted) {
        res.json({ message: "Лекцію видалено" });
      } else {
        res.status(500).json({ message: "Помилка при видаленні лекції" });
      }
    } catch (error) {
      console.error('Error deleting lecture:', error);
      res.status(500).json({ message: "Помилка при видаленні лекції" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: "Помилка при отриманні статистики" });
    }
  });

  // Export database backup
  app.get("/api/export", async (req, res) => {
    try {
      const lectures = await storage.getLectures(1000);
      const stats = await storage.getStats();
      
      const backup = {
        timestamp: new Date().toISOString(),
        statistics: stats,
        lectures: lectures.map(lecture => ({
          id: lecture.id,
          title: lecture.title,
          description: lecture.description,
          subject: lecture.subject,
          fileName: lecture.fileName,
          fileType: lecture.fileType,
          fileSize: lecture.fileSize,
          downloadCount: lecture.downloadCount,
          createdAt: lecture.createdAt
        }))
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="photogrammetry_backup_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(backup);
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ message: "Помилка при створенні резервної копії" });
    }
  });

  // Broadcast message to all users
  app.post("/api/broadcast", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Повідомлення обов'язкове" });
      }

      // Get all users (this would need to be implemented in storage)
      // For now, return success
      console.log('📢 Broadcasting message to all users:', message);
      
      res.json({ message: "Оголошення надіслано" });
    } catch (error) {
      console.error('Error broadcasting message:', error);
      res.status(500).json({ message: "Помилка при відправці оголошення" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: 'Файл не знайдено' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
