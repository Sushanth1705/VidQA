const processBtn = document.getElementById('processBtn');
const sendBtn = document.getElementById('sendBtn');
const urlInput = document.getElementById('youtubeUrl');
const questionInput = document.getElementById('questionInput');
const statusIndicator = document.getElementById('statusIndicator');
const videoTitle = document.getElementById('videoTitle');
const chatMessages = document.getElementById('chatMessages');

function addMessage(text, type) {
    const message = document.createElement('div');
    message.className = `chat-message ${type}`;
    message.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(message);
}

function setStatus(text, state) {
    statusIndicator.textContent = text;
    statusIndicator.className = `status ${state}`;
}

processBtn?.addEventListener('click', () => {

    const url = urlInput.value.trim();

    if (!url) {

        setStatus('Enter a URL', 'pending');
        addMessage('Please paste a YouTube URL to continue.', 'bot');

        return;

    }

    setStatus('Processing', 'pending');

    const title = url.includes('watch?v=')
        ? 'Processed YouTube video'
        : 'Video ready';

    videoTitle.textContent = title;

    addMessage(`Processing: ${url}`, 'bot');

    setTimeout(() => {

        setStatus('Ready', 'ready');

        addMessage('The video is ready for questions.', 'bot');

    }, 900);

});

sendBtn?.addEventListener('click', () => {

    const question = questionInput.value.trim();

    if (!question) {

        addMessage('Please type a question first.', 'bot');

        return;

    }

    addMessage(question, 'user');

    questionInput.value = "";

    const answer = `I can help with that. The video seems to mention the topic around ${question.split(' ').slice(0,3).join(' ')}.`;

    setTimeout(() => {

        addMessage(answer, 'bot');

    },600);

});

questionInput?.addEventListener('keydown',(event)=>{

    if(event.key==="Enter"){

        sendBtn.click();

    }

});