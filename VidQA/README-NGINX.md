# Nginx Setup & Architecture for VidQA

This document explains how Nginx is integrated as the reverse proxy, load balancer, and static asset gateway for VidQA.

---

## 🏗 Architecture Overview

```
                      +-----------------------------+
                      |       Client Browser        |
                      |    (http://localhost:80)    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |         Nginx Proxy         |
                      |           Port 80           |
                      +--------------+--------------+
                                     |
            +------------------------+------------------------+
            | (HTML, Auth, /api, CSS/JS)                      | (/process_video, /ask, /fastapi)
            v                                                 v
+-----------------------+                         +-----------------------+
|    Node.js Express    |                         |    Python FastAPI     |
|       Port 3000       |                         |       Port 8000       |
| (Frontend & Session)  |                         |  (AI & Transcripts)   |
+-----------------------+                         +-----------------------+
```

### Route Mappings

| Route Pattern | Target Upstream | Description |
|---|---|---|
| `/` | `node_service` (3000) | Login page (`login.html`) |
| `/vidqa` | `node_service` (3000) | VidQA main dashboard (`index.html`) |
| `/login` | `node_service` (3000) | Authentication endpoint |
| `/api/` | `node_service` (3000) | Application APIs & video history |
| `/process_video` | `fastapi_service` (8000) | Direct transcript processing |
| `/ask` | `fastapi_service` (8000) | Direct question-answering with embeddings |
| `/fastapi/*` | `fastapi_service` (8000) | FastAPI direct prefix |
| `*.css`, `*.js`, images | `node_service` (3000) | Static assets with Gzip + 7-day browser caching |

---

## 🚀 Running with Docker Compose (Recommended)

Run the entire stack (Nginx + Node.js + FastAPI) with one command:

```bash
# Navigate to the VidQA directory
cd VidQA

# Start all containers in detached mode (builds automatically)
docker compose up --build -d
```

Or using npm:
```bash
npm run docker:up
```

To stop the containers:
```bash
docker compose down
```

Visit **`http://localhost`** in your browser.

---

## 💻 Running with Native Nginx (Windows / Linux / WSL)

If you have Nginx installed on your local machine:

### 1. Start backend services
In Terminal 1:
```bash
cd VidQA
npm install
npm start
```
*(Runs Node.js on `http://127.0.0.1:3000`)*

In Terminal 2:
```bash
cd VidQA
pip install -r requirements.txt
npm run start:py
```
*(Runs FastAPI on `http://127.0.0.1:8000`)*

### 2. Start Nginx
Using the provided config file [nginx.conf](file:///c:/Users/SushanthRahulAntonyB/OneDrive/Desktop/Projects/VidQA%20Youtube%20transcripts/VidQA/nginx/nginx.conf):

- **On Windows:**
  ```powershell
  nginx.exe -p "c:\Users\SushanthRahulAntonyB\OneDrive\Desktop\Projects\VidQA Youtube transcripts\VidQA" -c nginx/nginx.conf
  ```
  To reload after edits:
  ```powershell
  nginx.exe -s reload
  ```
  To stop:
  ```powershell
  nginx.exe -s stop
  ```

- **On Linux / WSL:**
  ```bash
  sudo nginx -c /path/to/VidQA/nginx/nginx.conf
  ```

---

## 🔍 Verification & Health Check

1. Open `http://localhost/` in your browser. You should see the **VidQA Login** page.
2. Login with:
   - Email: `sushanth@gmail.com`
   - Password: `1234`
3. Upon login, you will be redirected to `http://localhost/vidqa`.
4. Paste a YouTube URL and click **Process Video**. Nginx will seamlessly proxy requests and stream responses back.
