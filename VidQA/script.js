document.addEventListener('DOMContentLoaded', () => {
    const processBtn = document.getElementById('processBtn');
    const sendBtn = document.getElementById('sendBtn');
    const urlInput = document.getElementById('youtubeUrl');
    const questionInput = document.getElementById('questionInput');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusAlert = document.getElementById('statusAlert');
    const videoTitle = document.getElementById('videoTitle');
    const chunksCount = document.getElementById('chunksCount');
    const chatMessages = document.getElementById('chatMessages');
    const thumbnailImg = document.getElementById('videoThumbnail');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const mainIframe = document.getElementById('mainIframe');
    const playerFallback = document.getElementById('playerFallback');
    const historyGrid = document.getElementById('historyGrid');

    let currentVideoId = null;

    function showAlert(msg, type = 'info') {
        if (!statusAlert) return;
        statusAlert.textContent = msg;
        statusAlert.className = `status-alert ${type}`;
        statusAlert.style.display = 'block';
    }

    function hideAlert() {
        if (!statusAlert) return;
        statusAlert.style.display = 'none';
    }

    function setStatus(text, state) {
        if (!statusIndicator) return;
        statusIndicator.textContent = text;
        statusIndicator.className = `status ${state}`;
    }

    function addMessage(text, type, timestamps = []) {
        if (!chatMessages) return;
        const msg = document.createElement('div');
        msg.className = `chat-message ${type}`;
        const p = document.createElement('p');
        p.textContent = text;
        msg.appendChild(p);

        if (Array.isArray(timestamps) && timestamps.length > 0) {
            const chipContainer = document.createElement('div');
            chipContainer.className = 'timestamp-chips';
            timestamps.forEach(ts => {
                const rawSec = typeof ts === 'object' && ts !== null ? (ts.start ?? 0) : Number(ts);
                const label = typeof ts === 'object' && ts?.label ? ts.label : formatSec(rawSec);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'ts-chip';
                btn.textContent = `▶ ${label}`;
                btn.title = `Jump to ${label}`;
                btn.addEventListener('click', () => {
                    seekVideo(rawSec);
                });
                chipContainer.appendChild(btn);
            });
            msg.appendChild(chipContainer);
        }

        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatSec(seconds) {
        const num = Math.floor(Math.max(0, Number(seconds) || 0));
        const m = Math.floor(num / 60);
        const s = num % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function extractYouTubeId(url) {
        if (!url) return null;
        const trimmed = url.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
        const patterns = [
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
            /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
        ];
        for (const p of patterns) {
            const m = trimmed.match(p);
            if (m && m[1]) return m[1];
        }
        return null;
    }

    async function fetchVideoMeta(vid) {
        try {
            const oembed = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`;
            const resp = await fetch(oembed);
            if (resp.ok) return await resp.json();
        } catch {}
        return {
            title: `YouTube Video (${vid})`,
            thumbnail_url: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
        };
    }

    function loadVideoPlayer(vid) {
        if (!mainIframe) return;
        mainIframe.src = `https://www.youtube.com/embed/${vid}?enablejsapi=1&autoplay=0`;
        mainIframe.style.display = 'block';
        if (playerFallback) playerFallback.style.display = 'none';
    }

    function seekVideo(seconds) {
        if (!mainIframe || !mainIframe.contentWindow) return;
        const targetSec = Math.max(0, Math.floor(seconds));
        mainIframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'seekTo', args: [targetSec, true] }),
            '*'
        );
        mainIframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*'
        );
    }

    async function handleProcess(url) {
        if (!url) {
            showAlert('Please paste a YouTube URL to continue.', 'error');
            return;
        }
        const vid = extractYouTubeId(url);
        if (!vid) {
            showAlert('The URL does not look like a valid YouTube link.', 'error');
            return;
        }

        hideAlert();
        currentVideoId = vid;
        setStatus('Processing...', 'pending');
        if (processBtn) processBtn.disabled = true;

        // Fetch meta preview
        const meta = await fetchVideoMeta(vid);
        if (videoTitle) videoTitle.textContent = meta.title || vid;
        if (thumbnailImg) {
            thumbnailImg.src = meta.thumbnail_url || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
            thumbnailImg.style.display = 'block';
        }
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';

        addMessage(`Indexing transcript for: ${meta.title || vid}...`, 'bot');

        try {
            const resp = await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${vid}`, videoId: vid })
            });
            const data = await resp.json();
            if (!resp.ok) {
                setStatus('Failed', 'error');
                showAlert(`Processing error: ${data.detail || data.message || 'Failed to process transcript'}`, 'error');
                addMessage(`Could not process video: ${data.detail || data.message}`, 'bot');
                return;
            }

            setStatus('Ready', 'ready');
            if (chunksCount) chunksCount.textContent = data.chunks || data.chunksCount || '—';
            addMessage(`Video is ready! Indexed into chunks with timestamps. Ask anything below!`, 'bot');
            loadVideoPlayer(vid);
            loadHistory();
        } catch (err) {
            console.error(err);
            setStatus('Error', 'error');
            showAlert('Unable to reach processing service. Ensure FastAPI (8000) is running.', 'error');
            addMessage('Network error: Unable to contact processing service.', 'bot');
        } finally {
            if (processBtn) processBtn.disabled = false;
        }
    }

    async function handleAsk(questionText) {
        const question = (questionText || questionInput.value || '').trim();
        if (!question) return;

        if (!currentVideoId) {
            showAlert('Please process a video first before asking questions.', 'error');
            return;
        }

        hideAlert();
        addMessage(question, 'user');
        if (questionInput) questionInput.value = '';
        if (sendBtn) sendBtn.disabled = true;

        const loadingMsg = document.createElement('div');
        loadingMsg.className = 'chat-message bot';
        loadingMsg.innerHTML = '<p><em>Searching transcript chunks...</em></p>';
        chatMessages.appendChild(loadingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const resp = await fetch(`/api/videos/${currentVideoId}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });
            const data = await resp.json();
            chatMessages.removeChild(loadingMsg);

            if (!resp.ok) {
                addMessage(`Error: ${data.detail || data.message || 'Unable to generate answer'}`, 'bot');
                return;
            }

            const answer = data.answer || 'No answer generated.';
            const tsList = data.timestamps || data.rawTimestamps || [];
            addMessage(answer, 'bot', tsList);
        } catch (err) {
            chatMessages.removeChild(loadingMsg);
            console.error(err);
            addMessage('Error communicating with Q&A service.', 'bot');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    async function loadHistory() {
        if (!historyGrid) return;
        try {
            const resp = await fetch('/api/videos/history');
            if (!resp.ok) return;
            const list = await resp.json();
            if (!Array.isArray(list) || list.length === 0) {
                historyGrid.innerHTML = '<p class="history-empty">No processed videos yet. Process your first video above.</p>';
                return;
            }

            historyGrid.innerHTML = '';
            list.forEach(v => {
                const card = document.createElement('article');
                card.className = 'history-card';
                card.innerHTML = `
                    <img class="history-thumb" src="${v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}" alt="thumb" />
                    <div class="history-body">
                        <h4>${v.title || v.videoId}</h4>
                        <p>ID: ${v.videoId} · Ready</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    urlInput.value = v.youtubeUrl || `https://www.youtube.com/watch?v=${v.videoId}`;
                    handleProcess(urlInput.value);
                });
                historyGrid.appendChild(card);
            });
        } catch {}
    }

    // Attach event listeners
    processBtn?.addEventListener('click', () => {
        handleProcess(urlInput.value);
    });

    urlInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleProcess(urlInput.value);
    });

    sendBtn?.addEventListener('click', () => {
        handleAsk();
    });

    questionInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAsk();
    });

    // Sample buttons
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (url) {
                urlInput.value = url;
                handleProcess(url);
            }
        });
    });

    // Starter chips
    document.querySelectorAll('.starter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            if (query) handleAsk(query);
        });
    });

    // Initial history fetch
    loadHistory();
});