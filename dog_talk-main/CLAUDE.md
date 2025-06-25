# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
No specific test framework is configured in this project.

## Project Architecture

### Overview
This is a dog emotion analysis web service called "멍멍이의 마음" (Dog's Heart) that analyzes dog audio/video to determine emotional states. It's built with Next.js 15 and uses React 19.

### Key Technologies
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Audio Processing**: Web Audio API, WaveSurfer.js
- **File Handling**: react-dropzone, IndexedDB storage
- **Animation**: Framer Motion
- **State Management**: Client-side React state

### Core Architecture

#### File Upload Flow
1. User uploads audio/video files via drag-and-drop (`FileUpload.tsx`)
2. Files are validated for format (MP4, MOV, MP3, WAV, OGG) and duration (max 10 minutes)
3. Files are stored in IndexedDB with unique timestamps
4. Users are redirected to appropriate editor based on file type

#### Editor System
- **Audio Editor**: `/audio-editor` - Direct audio analysis
- **Video Editor**: `/video-editor` - Extract audio from video, select time segments
- Both editors allow segment selection (3-30 seconds recommended)

#### API Integration
- **Upload**: `/api/emotion/upload/route.ts` - Uploads audio to external emotion analysis API
- **Results**: `/api/emotion/result/route.ts` - Polls for analysis results
- External API: `https://pippo.petpuls.net/emo2/v1/analysis/`

#### Emotion Analysis
- Processes dog audio to identify emotions: angry, attention, defensive, demanding, energetic, lonely, sick, talkative
- Returns structured results with `ansFilter` and `ansDog` properties
- Pre-built audio samples available in `/public/sounds/` for each emotion type (120 samples total)

### File Structure

#### Core Components
- `FileUpload.tsx` - Main upload interface with validation
- `VideoEditor.tsx` - Video timeline and segment selection
- `AudioEditor.tsx` - Audio waveform and segment selection
- `EditorLayout.tsx` - Shared editor UI layout
- `Header.tsx` - Navigation header

#### Utilities
- `utils/audio.ts` - Audio processing, trimming, WAV conversion
- `utils/storage.ts` - IndexedDB file storage
- `constants/api.ts` - API credentials and endpoints

#### Pages
- `/` - Landing page with file upload
- `/video-editor` - Video editing interface
- `/audio-editor` - Audio editing interface
- `/result` - Analysis results display

### Audio Processing Details
- Converts audio to mono 16kHz WAV format for API compatibility
- Uses Web Audio API for real-time audio manipulation
- Supports segment trimming with precise sample-level accuracy
- File naming includes timestamps for uniqueness

### Storage Strategy
- Large files stored in IndexedDB as base64
- Temporary processing uses browser's File API and Blob objects
- Results cached in localStorage for cross-tab compatibility

### UI/UX Patterns
- Responsive design with clamp() CSS functions for adaptive sizing
- Full-screen hero layout with background image overlay
- Warning system for file validation errors
- Loading states with Lucide React icons
- Korean language interface with English subtitles