# 🚀 VidQA Deployment Guide

VidQA consists of 3 services:
1. **Frontend**: React + Vite + Tailwind CSS (SPA)
2. **Backend**: Node.js + Express + MongoDB (API & Session persistence)
3. **Processing**: Python 3.11 + FastAPI + ChromaDB + SentenceTransformers / OpenAI (RAG Engine)

Below are the easiest and most reliable ways to deploy VidQA.

---

## Option 1: 1-Click Free Cloud Deployment (Render + MongoDB Atlas) ⭐ *Recommended*

This is the fastest, completely free tier deployment that requires zero server management.

### Step 1: Set Up Free MongoDB Atlas Cluster
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free M0 cluster.
2. In **Network Access**, add `0.0.0.0/0` (allow access from anywhere).
3. In **Database Access**, create a user (e.g. `vidqa_admin` with password).
4. Click **Connect** -> **Drivers** (Node.js) and copy your connection string:
   ```
   mongodb+srv://vidqa_admin:<password>@cluster0.xxxx.mongodb.net/vidqa?retryWrites=true&w=majority
   ```

### Step 2: Deploy with Render Blueprint
1. Go to [render.com](https://render.com) and link your GitHub account.
2. Click **New +** -> **Blueprint**.
3. Select your repository: `https://github.com/Sushanth1705/VidQA`.
4. Render will detect `render.yaml` and configure:
   - `vidqa-processing` (FastAPI Python engine)
   - `vidqa-backend` (Express API)
   - `vidqa-frontend` (React Static Site)
5. Fill in the prompted environment variables:
   - `MONGO_URI`: Paste your MongoDB Atlas URI.
   - `OPENAI_API_KEY`: *(Optional)* Your OpenAI key, or leave blank to use the built-in local zero-cost ONNX model.
6. Click **Apply**. Render will automatically build and deploy all three services!

---

## Option 2: Docker Compose on a Cloud VPS (DigitalOcean / AWS EC2 / Hetzner / Linode)

If you have a Linux virtual machine ($4 - $6/month droplet or EC2 instance):

### 1. SSH into your server
```bash
ssh root@your-server-ip
```

### 2. Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 3. Clone Repository & Launch
```bash
git clone https://github.com/Sushanth1705/VidQA.git
cd VidQA
```

### 4. Create `.env` (optional)
```bash
echo "OPENAI_API_KEY=your_key_here" > .env
```

### 5. Start All Containers
```bash
docker compose up --build -d
```
All services (FastAPI on 8000, Express on 5000, MongoDB on 27017, and Nginx Gateway on port 80) will start automatically. Visit `http://your-server-ip` in your browser!

### 6. Add Free HTTPS / SSL (Certbot)
To point your custom domain (e.g. `vidqa.yourdomain.com`):
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d vidqa.yourdomain.com
```

---

## Option 3: Hybrid Deployment (Vercel Frontend + Render Backend)

### Frontend on Vercel:
1. Go to [vercel.com](https://vercel.com) and import the repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend-service.onrender.com/api`
5. Click **Deploy**.

---

## Environment Variables Reference

| Service | Variable | Description | Default |
|---|---|---|---|
| **Frontend** | `VITE_API_URL` | Base API URL pointing to Express Backend | `/api` |
| **Backend** | `PORT` | HTTP Port for Express | `5000` |
| **Backend** | `MONGO_URI` | MongoDB Connection String | `mongodb://localhost:27017/vidqa` |
| **Backend** | `FASTAPI_URL` | URL to the Python FastAPI service | `http://localhost:8000` |
| **Processing** | `PORT` | HTTP Port for FastAPI | `8000` |
| **Processing** | `OPENAI_API_KEY` | Optional OpenAI API Key (falls back to local model if omitted) | `""` |
| **Processing** | `CHROMA_PATH` | Storage directory for vector database | `./chroma_db` |
