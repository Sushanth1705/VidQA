import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

const users = [
    {
        email: "sushanth@gmail.com",
        password: "1234"
    },
    {
        email: "rahul@gmail.com",
        password: "4321"
    }
];

// Login page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

// VidQA page
app.get("/vidqa", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

// In-memory processed video registry
const processed = {};

// --- API endpoints ---
// Proxy POST /api/videos -> FastAPI processing service
app.post('/api/videos', async (req, res) => {
    const { url, videoId, youtubeUrl } = req.body;
    const targetUrl = url || youtubeUrl;
    let targetId = videoId;
    if (!targetId && targetUrl) {
        const m = targetUrl.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
        if (m) targetId = m[1];
    }
    if (!targetUrl && !targetId) {
        return res.status(400).json({ message: 'Missing url or videoId' });
    }
    const standardId = targetId || videoId;
    try {
        const resp = await fetch(`${FASTAPI_URL}/process_video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl, video_id: standardId, videoId: standardId })
        });
        const data = await resp.json();
        if (resp.ok) {
            processed[standardId] = {
                videoId: standardId,
                title: data.title || `YouTube Video (${standardId})`,
                youtubeUrl: targetUrl || `https://www.youtube.com/watch?v=${standardId}`,
                thumbnail: data.thumbnail || `https://img.youtube.com/vi/${standardId}/hqdefault.jpg`,
                status: 'ready',
                chunks: data.chunks || data.chunksCount || 1,
                createdAt: new Date().toISOString()
            };
        }
        return res.status(resp.status).json(data);
    } catch (err) {
        console.error('Error proxying to processing service', err);
        return res.status(502).json({ message: 'Processing service unavailable. Ensure Python FastAPI is running on port 8000.' });
    }
});

app.post('/api/videos/:id/ask', async (req, res) => {
    const videoId = req.params.id;
    const { question } = req.body;
    if (!question) return res.status(400).json({ message: 'Missing question' });
    try {
        const resp = await fetch(`${FASTAPI_URL}/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: videoId, videoId, question })
        });
        const data = await resp.json();
        return res.status(resp.status).json(data);
    } catch (err) {
        console.error('Error proxying ask to processing service', err);
        return res.status(502).json({ message: 'Processing service unavailable' });
    }
});

app.get('/api/videos/:id', (req, res) => {
    const id = req.params.id;
    if (processed[id]) return res.json(processed[id]);
    return res.status(404).json({ message: 'Video not found' });
});

app.get('/api/videos/history', (req, res) => {
    return res.json(Object.values(processed).reverse());
});

app.delete('/api/videos/:id', async (req, res) => {
    const id = req.params.id;
    delete processed[id];
    try {
        await fetch(`${FASTAPI_URL}/video/${id}`, { method: 'DELETE' });
    } catch {
        // non-fatal
    }
    return res.json({ success: true, message: 'Video deleted' });
});

// Login API
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find(
        u => u.email === email && u.password === password
    );

    if (user) {
        return res.status(200).json({
            message: "Login Successful"
        });
    }

    return res.status(401).json({
        message: "Invalid Email or Password"
    });
});

app.listen(PORT, () => {
    console.log(`[VidQA Node] Server running on http://localhost:${PORT}`);
});