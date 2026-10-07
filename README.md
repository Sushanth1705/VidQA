# VidQA — AI-Powered Video Question Answering (RAG)

VidQA is a full-stack, Retrieval-Augmented Generation (RAG) web application that enables users to paste any YouTube video URL with captions, automatically index and chunk its transcript into a persistent vector store, and ask natural language questions. Answers are generated strictly using grounded transcript context by an LLM and feature interactive, clickable timestamps that seek the embedded YouTube player directly to the exact second.

---

## 🌟 Key Features

1. **Seamless YouTube Ingestion**: Paste standard YouTube watch links, `youtu.be` links, YouTube Shorts, or embed URLs.
2. **Automated Transcript Extraction**: Automatically fetches captions using `youtube-transcript-api` and detects manual vs auto-generated subtitles.
3. **Sentence-Aware Semantic Chunking**: Chunks transcript text into ~180-word segments with 20% overlap while strictly tracking start and end second timestamps.
4. **Persistent Vector Store (ChromaDB)**: Embeds transcript chunks with OpenAI's `text-embedding-3-small` and stores them in isolated collections per video (`video_<videoId>`).
5. **Context-Grounded LLM Answers**: Queries OpenAI `gpt-4o-mini` with strict system constraints to prevent hallucinations and return structured JSON with supporting timestamps.
6. **Interactive YouTube Seeking**: Click any timestamp chip (e.g., `[02:15]`) to jump the embedded YouTube player directly to that moment (`player.seekTo(135, true)`).
7. **History & Persistence**: MongoDB stores indexed video metadata and user chat history for quick reloading and management.
8. **Modern Dark Theme Aesthetic**: Built with React 18, Tailwind CSS, modern typography, glassmorphic cards, glowing accents, and responsive two-column layout.

---

## 🏛 System Architecture

```
                                +-------------------------------+
                                |        Client Browser         |
                                | (React + Tailwind + YT Player)|
                                +---------------+---------------+
                                                |
                                    HTTP Requests (/api/*)
                                                v
                                +-------------------------------+
                                |       Express.js Backend      |
                                |          (Port 5000)          |
                                +-------+---------------+-------+
                                        |               |
                         Mongoose Models|               |Axios Requests
                                        v               v
                         +------------------+   +-------------------------------+
                         | MongoDB Database |   |     FastAPI RAG Service       |
                         | - Video Metadata |   |         (Port 8000)           |
                         | - Chat Records   |   +-------+---------------+-------+
                         +------------------+           |               |
                                            Transcript API              |
                                                        |               |
                                                        v               v
                                            +-------------------+   +-------------------+
                                            | ChromaDB (Vector) |   | OpenAI API        |
                                            | - 180-word chunks |   | - text-embedding-3|
                                            | - Cosine distance |   | - gpt-4o-mini     |
                                            +-------------------+   +-------------------+
```

---

## 🛠 Tech Stack

- **Frontend**: React.js 18, Tailwind CSS, React Router v6, Axios, Lucide React, YouTube IFrame Player API, Vite.
- **Backend API**: Node.js, Express.js, Mongoose (MongoDB), Axios, CORS, Dotenv.
- **AI / Processing Service**: Python 3.11, FastAPI, Uvicorn, `youtube-transcript-api`, ChromaDB, OpenAI Python SDK (`text-embedding-3-small` & `gpt-4o-mini`).
- **Deployment & Gateway**: Nginx, Docker, Docker Compose.

---

## 📁 Repository Structure

```
VidQA/
├── backend/                        # Node.js Express Backend
│   ├── config/
│   │   └── db.js                   # Mongoose connection
│   ├── controllers/
│   │   └── videoController.js      # Video validation, proxying, history & deletion
│   ├── middleware/
│   │   └── errorHandler.js         # Centralized error responses
│   ├── models/
│   │   ├── Chat.js                 # Chat Q&A schema
│   │   └── Video.js                # Video metadata & status schema
│   ├── routes/
│   │   └── videoRoutes.js          # REST API endpoints
│   ├── services/
│   │   └── processingService.js    # Client calling FastAPI
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js                   # Express server entrypoint (port 5000)
│
├── frontend/                       # React 18 + Vite + Tailwind Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx     # User & Bot chat bubbles
│   │   │   ├── ChatWindow.jsx      # Message stream & input box
│   │   │   ├── ErrorMessage.jsx    # Alert toast & retry button
│   │   │   ├── FeatureCard.jsx     # Landing page capability cards
│   │   │   ├── Footer.jsx          # Bottom footer
│   │   │   ├── Hero.jsx            # URL input & hero copy
│   │   │   ├── Loading.jsx         # Spinners & skeletons
│   │   │   ├── Navbar.jsx          # Top navigation & about dialog
│   │   │   ├── TimestampChip.jsx   # Clickable [mm:ss] seek pill
│   │   │   ├── VideoCard.jsx       # History card with thumbnail & status
│   │   │   └── VideoPlayer.jsx     # YouTube IFrame wrapper
│   │   ├── hooks/
│   │   │   └── useYouTubePlayer.js # Custom hook controlling YT Player
│   │   ├── pages/
│   │   │   ├── History.jsx         # Processed video registry & search
│   │   │   ├── Home.jsx            # Landing page
│   │   │   ├── NotFound.jsx        # 404 page
│   │   │   └── VideoQA.jsx         # Two-column interactive Q&A workspace
│   │   ├── services/
│   │   │   └── api.js              # Axios API service
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js              # Dev server (port 3000)
│
├── processing/                     # Python FastAPI RAG Processing Service
│   ├── chunking.py                 # Semantic chunking (~180 words, 20% overlap)
│   ├── embeddings.py               # OpenAI text-embedding-3-small
│   ├── llm.py                      # GPT-4o-mini grounded prompt & parser
│   ├── main.py                     # FastAPI entrypoint (port 8000)
│   ├── transcript.py               # youtube-transcript-api fetcher
│   ├── vector_store.py             # ChromaDB persistent collection manager
│   ├── youtube_utils.py            # URL parser & oEmbed metadata fetcher
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml              # Multi-container orchestration
├── nginx.conf                      # Production Nginx reverse proxy configuration
├── start-vidqa.bat                 # 1-click Windows development launcher
└── README.md
```

---

## ⚙️ Environment Variables

### 1. `backend/.env`
```ini
MONGO_URI=mongodb://127.0.0.1:27017/vidqa
FASTAPI_URL=http://localhost:8000
PORT=5000
```

### 2. `processing/.env`
```ini
OPENAI_API_KEY=sk-your-openai-api-key-here
CHROMA_PATH=./chroma_db
PORT=8000
```

### 3. `frontend/.env`
```ini
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started (Local Development)

### Option A: 1-Click Launch (Windows)
Double-click `start-vidqa.bat` in the project root. It will automatically open 3 terminal windows running FastAPI (8000), Express (5000), and React Vite (3000).

---

### Option B: Manual Step-by-Step Setup

#### Step 1: Start the Python FastAPI Service
```bash
cd processing
# Create and activate virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate      # On Windows
# source venv/bin/activate # On macOS/Linux

pip install -r requirements.txt
cp .env.example .env      # Add your OPENAI_API_KEY inside .env
uvicorn main:app --reload --port 8000
```
*Health Check: `http://localhost:8000/health`*

#### Step 2: Start the Express Backend API
Make sure your MongoDB instance is running locally (`mongod`) or provide a MongoDB Atlas URI in `backend/.env`.
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
*Health Check: `http://localhost:5000/api/health`*

#### Step 3: Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🐳 Running with Docker Compose

Run all services (MongoDB, FastAPI, Express, React build, and Nginx) with a single command:

```bash
# 1. Build and start all containers
docker compose up --build -d

# 2. View logs
docker compose logs -f

# 3. Stop containers
docker compose down
```

Visit **`http://localhost`** in your browser.

---

## 📡 REST API Reference

### 1. Process Video
- **`POST /api/videos`**
- **Request Body**:
  ```json
  {
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
  ```
- **Response**:
  ```json
  {
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "status": "ready"
  }
  ```

### 2. Get Video Details & Chat History
- **`GET /api/videos/:id`**
- **Response**:
  ```json
  {
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "status": "ready",
    "chats": [
      {
        "question": "What is the theme?",
        "answer": "The singer expresses devotion...",
        "timestamps": [18, 45]
      }
    ]
  }
  ```

### 3. Ask a Question (RAG)
- **`POST /api/videos/:id/ask`**
- **Request Body**:
  ```json
  {
    "question": "What are the main principles explained in the video?"
  }
  ```
- **Response**:
  ```json
  {
    "answer": "The speaker outlines three main concepts...",
    "timestamps": [135, 302],
    "sourceChunks": [...]
  }
  ```

### 4. Video History
- **`GET /api/videos/history`**
- Returns array of all processed video documents sorted by latest.

### 5. Delete Video & Vector Store
- **`DELETE /api/videos/:id`**
- Deletes MongoDB record, chat records, and the corresponding ChromaDB vector collection.

---

## 🌐 Nginx Deployment

The included `nginx.conf` configures production-grade reverse proxying:
- Serves the static Vite production bundle (`frontend/dist`)
- Handles client-side routing fallback (`try_files $uri $uri/ /index.html;`)
- Proxies `/api/` requests to the Express backend (`http://127.0.0.1:5000`)
- Gzip compression for CSS, JS, SVG, and JSON
- 7-day browser caching headers for static assets
- 120-second timeouts for AI generation

To test Nginx with the production build:
```bash
cd frontend
npm run build
```
Then start Nginx pointing to `nginx.conf`.

---

## ❓ Troubleshooting & Common Questions

1. **Error: "Captions/transcripts are disabled for this video"**
   - The video creator did not enable captions or auto-generated subtitles are not available. Try another video that has captions enabled.
2. **Error: "OPENAI_API_KEY is not configured"**
   - Ensure your OpenAI API key is set in `processing/.env` as `OPENAI_API_KEY=sk-...`.
3. **MongoDB connection timeout**
   - Ensure local MongoDB is running (`mongod` or via MongoDB Compass). If using MongoDB Atlas, update `MONGO_URI` in `backend/.env`.
4. **YouTube player shows error 150 or embedding disabled**
   - Some music videos have embedding disabled by copyright holders on external websites. Test with educational or public talk videos.
