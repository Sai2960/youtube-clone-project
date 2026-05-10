# YouTube Clone — Full-Stack Video Streaming Platform

A full-featured YouTube clone built with Next.js and TypeScript — supporting video streaming, uploads, shorts, live video calls, downloads, premium subscriptions, channel management, and an admin panel.

**Live Demo:** [https://youtube-clone-project-eosin.vercel.app](https://youtube-clone-project-eosin.vercel.app)

**Backend:** [https://youtube-clone-project-q3pd.onrender.com](https://youtube-clone-project-q3pd.onrender.com)

**Stack:** Next.js · TypeScript · Node.js · MongoDB · WebRTC · Docker · Railway · Vercel · Cheerio

---

## What is this project?

A production-grade YouTube clone that replicates core YouTube features — watch and stream videos, upload content, create a channel, call other users via WebRTC, download videos, manage subscriptions, and access premium content. Built with a Next.js frontend and a separate Node.js backend, containerized with Docker and deployed on Railway.

---

## Features

### Video
- Watch and stream videos with a custom gesture-based video player
- Video quality selector (360p, 720p, 1080p)
- Related videos sidebar on watch page
- Like and dislike videos
- Comments section on each video
- Download any video

### Shorts
- Upload and watch short-form vertical videos
- Dedicated Shorts feed

### Upload
- Upload full videos and shorts
- Video uploader with thumbnail support
- Delete your own videos

### Channel
- Full channel pages with tabs (Videos, Shorts, About)
- Edit channel name, description, and avatar
- Subscribe and unsubscribe to channels
- Channel header with subscriber count

### Video Calls
- Real-time peer-to-peer video calls using WebRTC
- Call any user directly from the platform

### User Features
- Watch later — save videos to watch later
- Watch history — auto-saved viewing history
- Liked videos — collection of all liked content
- Search videos and channels
- User profile and authentication

### Premium
- Premium subscription modal
- Subscription page with plan details
- Premium content access control

### Admin Panel
- Admin dashboard for platform management
- Manage users and content

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS, globals.css |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Real-time Calls | WebRTC (peer-to-peer video calls) |
| Scraping | Cheerio |
| Containerization | Docker |
| Deployment (Backend) | Railway |
| Deployment (Frontend) | Vercel |

---

## Project Structure

```
youtube-clone-project/
├── server/                          # Node.js backend
│   └── ...                          # API routes, controllers, models
├── yourtube/                        # Next.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChannelHeader.tsx
│   │   │   ├── ChannelVideos.tsx
│   │   │   ├── Channeltabs.tsx
│   │   │   ├── Comments.tsx
│   │   │   ├── DeleteVideoButton.tsx
│   │   │   ├── DownloadButton.tsx
│   │   │   ├── EditChannelModal.tsx
│   │   │   ├── GestureVideoPlayer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── HistoryContent.tsx
│   │   │   ├── LikedContent.tsx
│   │   │   ├── PremiumModal.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── QualitySelector.tsx
│   │   │   ├── RelatedVideos.tsx
│   │   │   ├── SearchResult.tsx
│   │   │   ├── ShortsUploader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SubscribeButton.tsx
│   │   │   ├── SubscriptionPage.tsx
│   │   │   ├── VideoInfo.tsx
│   │   │   ├── VideoSkeleton.tsx
│   │   │   ├── VideoUploader.tsx
│   │   │   ├── Videogrid.tsx
│   │   │   ├── Videoplayer.tsx
│   │   │   ├── WatchLaterContent.tsx
│   │   │   ├── category-tabs.tsx
│   │   │   ├── channeldialogue.tsx
│   │   │   └── videocard.tsx
│   │   ├── hooks/
│   │   │   └── useProfileUpdate.ts
│   │   ├── lib/                     # Utilities and helpers
│   │   └── pages/
│   │       ├── api/                 # Next.js API routes
│   │       ├── call/                # WebRTC video call page
│   │       ├── channel/[id]/        # Dynamic channel page
│   │       ├── downloads/           # Downloads page
│   │       ├── history/             # Watch history
│   │       ├── liked/               # Liked videos
│   │       ├── premium/             # Premium subscription
│   │       ├── search/              # Search results
│   │       ├── shorts/              # Shorts feed
│   │       ├── watch-later/         # Watch later list
│   │       ├── watch/[id]/          # Dynamic video watch page
│   │       ├── AdminPanel.tsx       # Admin dashboard
│   │       ├── Profile.tsx          # User profile
│   │       ├── index.tsx            # Home feed
│   │       ├── login.tsx            # Login page
│   │       └── subscription.tsx     # Subscriptions page
├── Dockerfile                       # Docker container config
├── railway.json                     # Railway deployment config
└── nixpacks.toml                    # Railway build config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Docker (optional, for containerized run)

### Installation

```bash
git clone https://github.com/Sai2960/youtube-clone-project.git
cd youtube-clone-project
```

### Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

```bash
npm start
```

### Frontend Setup

```bash
cd yourtube
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Setup

```bash
docker build -t youtube-clone .
docker run -p 3000:3000 youtube-clone
```

---

## Pages

| Route | Description |
| --- | --- |
| `/` | Home feed with video grid |
| `/watch/[id]` | Video watch page with player and comments |
| `/channel/[id]` | Channel page with videos and info |
| `/shorts` | Shorts feed |
| `/search` | Search results |
| `/history` | Watch history |
| `/liked` | Liked videos |
| `/watch-later` | Watch later list |
| `/downloads` | Downloaded videos |
| `/call` | WebRTC video call |
| `/premium` | Premium subscription |
| `/subscription` | Subscriptions page |
| `/AdminPanel` | Admin dashboard |
| `/Profile` | User profile |
| `/login` | Login page |

---

## Deployment

The project is deployed using a split architecture:

- **Frontend** — Vercel (Next.js optimized deployment)
- **Backend** — Railway (Dockerized Node.js server)
- **Database** — MongoDB Atlas

The `Dockerfile`, `railway.json`, and `nixpacks.toml` in the root handle the Railway backend deployment configuration.

---

## Key Technical Highlights

- **WebRTC video calls** — peer-to-peer real-time video calling between users
- **Gesture-based video player** — custom player with swipe and tap gestures
- **Video quality selector** — users can switch between multiple quality levels
- **Docker containerization** — backend fully containerized for consistent deployment
- **Next.js App Router** — dynamic routes for watch pages and channel pages
- **Cheerio scraping** — server-side data utilities
- **1,500+ commits** — actively developed and maintained codebase

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

*Built with Next.js · Node.js · WebRTC · Deployed on Vercel + Railway*
