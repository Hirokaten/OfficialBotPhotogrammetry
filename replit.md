# Overview

This is a full-stack educational platform that provides an admin dashboard for managing lecture content and a Telegram bot for students to interact with the system. The application allows administrators to upload and manage educational materials (PDFs and images) while students can browse and download content through a Telegram bot interface. The system includes user management, file handling, download tracking, and comprehensive statistics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Upload**: Multer middleware for handling multipart file uploads
- **Session Management**: Express sessions with PostgreSQL storage via connect-pg-simple
- **Error Handling**: Centralized error middleware with proper HTTP status codes

## Database Architecture
- **Database**: PostgreSQL with Neon serverless connection pooling
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Design**: 
  - Users table for Telegram user management with admin roles
  - Lectures table for educational content with metadata and file references
  - Downloads table for tracking user engagement and analytics
- **Migrations**: Drizzle Kit for schema migrations and database management

## File Storage Strategy
- **Storage**: Local filesystem storage in uploads directory
- **File Types**: PDF documents and images (JPEG, PNG) with 20MB size limit
- **File Organization**: Multer-generated unique filenames to prevent conflicts
- **Metadata Tracking**: File size, type, and path stored in database for integrity

## Authentication & Authorization
- **Telegram Integration**: Bot token-based authentication for user identification
- **Admin System**: Role-based access control with admin privileges
- **Session Management**: Secure session handling with PostgreSQL backing store

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL database hosting with WebSocket connections
- **Telegram Bot API**: Official Telegram Bot API for messaging and user interaction

## Development & Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **Replit Integration**: Vite plugin for runtime error overlay and cartographer debugging
- **ESBuild**: Server-side bundling for production deployment

## UI & Styling Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Utility for creating variant-based component APIs

## File & Data Handling
- **Multer**: Express middleware for handling multipart/form-data file uploads
- **Zod**: TypeScript-first schema validation library
- **Date-fns**: Utility library for date manipulation and formatting

## Query & State Management
- **TanStack Query**: Powerful data synchronization for React applications
- **React Hook Form**: Performant forms library with minimal re-renders