import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lectures = pgTable("lectures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(), // 'pdf' or 'image'
  fileSize: integer("file_size").notNull(), // in bytes
  downloadCount: integer("download_count").default(0).notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const downloads = pgTable("downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  lectureId: varchar("lecture_id").references(() => lectures.id).notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  uploadedLectures: many(lectures),
  downloads: many(downloads),
}));

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [lectures.uploadedBy],
    references: [users.id],
  }),
  downloads: many(downloads),
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
  user: one(users, {
    fields: [downloads.userId],
    references: [users.id],
  }),
  lecture: one(lectures, {
    fields: [downloads.lectureId],
    references: [lectures.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertLectureSchema = createInsertSchema(lectures).omit({
  id: true,
  createdAt: true,
  downloadCount: true,
});

export const insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  downloadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLecture = z.infer<typeof insertLectureSchema>;
export type Lecture = typeof lectures.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloads.$inferSelect;
