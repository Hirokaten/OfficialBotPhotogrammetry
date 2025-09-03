import { users, lectures, downloads, type User, type InsertUser, type Lecture, type InsertLecture, type InsertDownload, type Download } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAdminStatus(telegramId: string, isAdmin: boolean): Promise<User | undefined>;

  // Lecture operations
  getLectures(limit?: number, offset?: number): Promise<Lecture[]>;
  getLectureById(id: string): Promise<Lecture | undefined>;
  createLecture(lecture: InsertLecture): Promise<Lecture>;
  deleteLecture(id: string): Promise<boolean>;
  updateLectureDownloadCount(id: string): Promise<void>;
  getLecturesBySubject(subject: string): Promise<Lecture[]>;

  // Download operations
  recordDownload(download: InsertDownload): Promise<void>;
  getUserDownloads(userId: string): Promise<Download[]>;

  // Statistics
  getStats(): Promise<{
    totalLectures: number;
    activeStudents: number;
    totalDownloads: number;
    storageUsed: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserAdminStatus(telegramId: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.telegramId, telegramId))
      .returning();
    return user || undefined;
  }

  async getLectures(limit = 20, offset = 0): Promise<Lecture[]> {
    return await db
      .select()
      .from(lectures)
      .orderBy(desc(lectures.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getLectureById(id: string): Promise<Lecture | undefined> {
    const [lecture] = await db.select().from(lectures).where(eq(lectures.id, id));
    return lecture || undefined;
  }

  async createLecture(insertLecture: InsertLecture): Promise<Lecture> {
    const [lecture] = await db
      .insert(lectures)
      .values(insertLecture)
      .returning();
    return lecture;
  }

  async deleteLecture(id: string): Promise<boolean> {
    // First delete all downloads for this lecture
    await db.delete(downloads).where(eq(downloads.lectureId, id));
    
    // Then delete the lecture
    const result = await db.delete(lectures).where(eq(lectures.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateLectureDownloadCount(id: string): Promise<void> {
    await db
      .update(lectures)
      .set({ 
        downloadCount: sql`${lectures.downloadCount} + 1`
      })
      .where(eq(lectures.id, id));
  }

  async getLecturesBySubject(subject: string): Promise<Lecture[]> {
    return await db
      .select()
      .from(lectures)
      .where(eq(lectures.subject, subject))
      .orderBy(desc(lectures.createdAt));
  }

  async recordDownload(insertDownload: InsertDownload): Promise<void> {
    await db.insert(downloads).values(insertDownload);
    await this.updateLectureDownloadCount(insertDownload.lectureId);
  }

  async getUserDownloads(userId: string): Promise<Download[]> {
    return await db
      .select()
      .from(downloads)
      .where(eq(downloads.userId, userId))
      .orderBy(desc(downloads.downloadedAt));
  }

  async getStats(): Promise<{
    totalLectures: number;
    activeStudents: number;
    totalDownloads: number;
    storageUsed: number;
  }> {
    const [lectureCount] = await db.select({ count: count() }).from(lectures);
    const [studentCount] = await db.select({ count: count() }).from(users).where(eq(users.isAdmin, false));
    const [downloadCount] = await db.select({ count: count() }).from(downloads);
    const [storageResult] = await db.select({ total: sql<number>`COALESCE(SUM(${lectures.fileSize}), 0)` }).from(lectures);

    return {
      totalLectures: lectureCount.count,
      activeStudents: studentCount.count,
      totalDownloads: downloadCount.count,
      storageUsed: storageResult.total,
    };
  }
}

export const storage = new DatabaseStorage();
