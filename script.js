/* 
   🌿 Mindful Haven - Core Logic (Multi-Page Version)
   Handles User Flow, State, and Features across pages
*/

// --- State Management ---
const AppState = {
    user: {
        name: '',
        age: '',
        profession: '',
        stressLevel: 0
    },
    audioContext: null
};

// --- Storage Helpers ---
function saveUserData() {
    localStorage.setItem('mindful_haven_user', JSON.stringify(AppState.user));
}

function loadUserData() {
    const stored = localStorage.getItem('mindful_haven_user');
    if (stored) {
        AppState.user = JSON.parse(stored);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    checkAuth();

    // Page Specific Initializers
    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        updateDashboardContent();
        initAssistant("Welcome back to your sanctuary.");
    } else if (path.includes('games.html')) {
        initAssistant("Explore. Play. Heal.");
        // We will init specific games only when their modal/section is opened to save resources
        // But for the main canvas games that are always visible:
        if (document.getElementById('bubble-canvas')) initBubbleGame();
        if (document.getElementById('play-canvas')) initCanvas();
    } else if (path.includes('music.html')) {
        initAssistant("Listen to the calm.");
    } else if (path.includes('jarnalling.html')) {
        initAssistant("Write it all out.");
        renderTasks();
    } else if (path.includes('help.html')) {
        initAssistant("You are safe here.");
    } else if (path.includes('index.html') || path.endsWith('/')) {
        if (!AppState.user.name) {
            showSection('entry');
        }
    }

    // Global Assistant
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleChatInput);
    }
});

function checkAuth() {
    const path = window.location.pathname;
    // Allow login.html and index.html as public entry points
    const isPublic = path.includes('index.html') || path.includes('login.html') || path.endsWith('/') || path.endsWith('webmh4/1.1.1/');

    // If user is logged in and tries to access entry pages, go to dashboard
    if (isPublic && AppState.user.name) {
        window.location.href = 'dashboard.html';
        return;
    }
    // If user is NOT logged in and tries to access protected pages (not public), go to login
    if (!isPublic && !AppState.user.name) {
        window.location.href = 'login.html';
    }
}

// --- Navigation Helpers ---
function navigateTo(page) {
    window.location.href = page;
}

function showSection(id) {
    const sections = document.querySelectorAll('section');
    sections.forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`view-${id}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }
}

// --- User Flow ---
function startJourney() { showSection('onboarding'); }
function submitOnboarding(e) { e.preventDefault(); AppState.user.name = e.target.name.value; AppState.user.profession = e.target.profession.value; saveUserData(); showSection('welcome'); }
function handleWelcomeResponse(type) { showSection('stress'); }
function selectStress(level) {
    AppState.user.stressLevel = parseInt(level);
    saveUserData();
    updateAssistant("Redirecting to your sanctuary...");
    setTimeout(() => {
        window.location.href = level >= 8 ? 'help.html' : 'dashboard.html';
    }, 500);
}

// --- Dashboard ---
const dashboardContent = {
    Student: `<div class="glass-card" style="grid-column:span 2; background:linear-gradient(120deg,rgba(255,255,255,0.7),rgba(230,230,250,0.5));"><h3>🎓 Study Space</h3><div style="display:flex;gap:1rem;margin-top:1rem;"><button class="btn" onclick="startTimer(25)">🍅 Focus (25m)</button></div></div>`,
    Teacher: `<div class="glass-card" style="grid-column:span 2; background:linear-gradient(120deg,rgba(255,245,230,0.7),rgba(255,228,196,0.3));"><h3>🍎 Teacher's Lounge</h3><div style="display:flex;gap:1rem;margin-top:1rem;"><button class="btn" onclick="updateAssistant('Listening...')">🎙️ Voice Journal</button></div></div>`,
    Medical: `<div class="glass-card" style="grid-column:span 2; background:linear-gradient(to right,rgba(20,30,48,0.6),rgba(36,59,85,0.6));color:white;"><h3>🩺 Healer's Respite</h3><div style="display:flex;gap:1rem;margin-top:1rem;"><button class="btn" style="background:rgba(255,255,255,0.2);" onclick="startTimer(2)">⚡ 2 Min Reset</button></div></div>`
};
function updateDashboardContent() {
    const dashboardView = document.getElementById('dashboard-container');
    if (!dashboardView || document.getElementById('custom-dashboard-section')) return;
    const featureGrid = dashboardView.querySelector('.feature-grid');
    const content = dashboardContent[AppState.user.profession] || dashboardContent['Student'];
    const wrapper = document.createElement('div');
    wrapper.id = 'custom-dashboard-section';
    wrapper.innerHTML = content;
    wrapper.style.gridColumn = '1 / -1';
    featureGrid.insertBefore(wrapper, featureGrid.firstChild);
    const greeting = document.getElementById('user-greeting');
    if (greeting) greeting.textContent = `Welcome, ${AppState.user.name}`;
}

// --- Assistant ---
function initAssistant(msg) { updateAssistant(msg); }
function updateAssistant(text) { const el = document.getElementById('assistant-text'); if (el) { el.style.opacity = 0; setTimeout(() => { el.textContent = text; el.style.opacity = 1; }, 300); } }
function toggleChatWindow() { const win = document.getElementById('active-chat-window'); if (win) win.classList.toggle('hidden'); }

async function handleChatInput(e) {
    if (e.key === 'Enter' || e.type === 'click') {
        const input = e.target.tagName === 'BUTTON' ? document.getElementById('chat-input') : e.target;
        const txt = input.value.trim();
        if (!txt) return;

        addChatMsg(txt, 'user');
        input.value = "";

        // Check for Real AI
        const apiKey = localStorage.getItem('mh_api_key');
        if (apiKey) {
            addChatMsg("...", 'bot-loading');
            try {
                const response = await fetchChatResponse(txt, apiKey);
                removeLoadingMsg();
                addChatMsg(response, 'bot');
            } catch (err) {
                removeLoadingMsg();
                addChatMsg("I'm having trouble connecting. " + err.message, 'bot');
            }
        } else {
            // Fallback Mock
            setTimeout(() => addChatMsg("I am here with you. (Enable AI in Settings for more)", 'bot'), 1000);
        }
    }
}

function addChatMsg(text, sender) {
    const h = document.getElementById('chat-history');
    if (!h) return;
    const d = document.createElement('div');
    d.textContent = text;
    d.style.padding = '10px';
    d.style.borderRadius = '12px';
    d.style.maxWidth = '80%';
    d.style.lineHeight = '1.5';

    if (sender === 'user') {
        d.style.alignSelf = 'flex-end';
        d.style.background = 'var(--primary)';
        d.style.color = 'white';
    } else if (sender === 'bot-loading') {
        d.id = 'bot-loading-msg';
        d.style.alignSelf = 'flex-start';
        d.style.background = 'rgba(255,255,255,0.5)';
        d.style.fontStyle = 'italic';
    } else {
        d.style.alignSelf = 'flex-start';
        d.style.background = 'rgba(255,255,255,0.8)';
    }

    h.appendChild(d);
    h.scrollTop = h.scrollHeight;
}

function removeLoadingMsg() {
    const l = document.getElementById('bot-loading-msg');
    if (l) l.remove();
}

async function fetchChatResponse(userText, key) {
    // Using Gemini API as default
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`;
    const data = {
        contents: [{
            parts: [{
                text: `You are a calm, empathetic mental health assistant. Keep responses short, warm, and comforting. User says: ${userText}`
            }]
        }]
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.candidates[0].content.parts[0].text;
}

// --- Audio ---
function playSound(type) { if (!AppState.audioContext) AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)(); const ctx = AppState.audioContext; if (ctx.state === 'suspended') ctx.resume(); const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.connect(g); g.connect(ctx.destination); osc.frequency.value = type === 'Rain' ? 100 : 200; g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1); osc.start(); osc.stop(ctx.currentTime + 1); }

// =========================================================
// NEW GAME ENGINES (Expansion)
// =========================================================

// 1. Zen Garden (Sand Raker)
let zenCanvas, zenCtx, zenDrawing = false;
function initZenGarden() {
    zenCanvas = document.getElementById('zen-garden-canvas');
    if (!zenCanvas) return;
    zenCtx = zenCanvas.getContext('2d');
    const r = zenCanvas.getBoundingClientRect();
    zenCanvas.width = r.width;
    zenCanvas.height = r.height;

    // Sand Background
    zenCtx.fillStyle = '#fdf6e3';
    zenCtx.fillRect(0, 0, zenCanvas.width, zenCanvas.height);

    zenCanvas.onmousedown = (e) => { zenDrawing = true; zenCtx.beginPath(); zenCtx.moveTo(e.offsetX, e.offsetY); };
    zenCanvas.onmousemove = (e) => {
        if (!zenDrawing) return;
        zenCtx.lineWidth = 15;
        zenCtx.lineCap = 'round';
        zenCtx.strokeStyle = '#e6dbc4'; // Darker sand
        zenCtx.shadowBlur = 5;
        zenCtx.shadowColor = 'rgba(0,0,0,0.1)';
        zenCtx.lineTo(e.offsetX, e.offsetY);
        zenCtx.stroke();
    };
    zenCanvas.onmouseup = () => zenDrawing = false;
}

// 2. Virtual Plant Care
let plantStage = 0;
function initPlantCare() {
    const p = document.getElementById('virtual-plant');
    if (!p) return;
    updatePlantUI();
}
function waterPlant() {
    const p = document.getElementById('virtual-plant');
    plantStage++;
    if (plantStage > 3) {
        updateAssistant("It's blooming beautifully! You did this.");
        plantStage = 3; // Max
    } else {
        updateAssistant("The plant drinks happily.");
    }
    updatePlantUI();
    playSound('Rain'); // reusing sound
}
function updatePlantUI() {
    const p = document.getElementById('virtual-plant');
    // Using simple emojis for stages, could be images
    const stages = ["🌱", "🌿", "🪴", "🌺"];
    p.textContent = stages[plantStage] || "🌱";
    p.style.transform = `scale(${1 + plantStage * 0.2})`;
}

// 3. Flow Breathing Orb
function initBreathingGame() {
    const orb = document.getElementById('breathing-orb');
    if (!orb) return;
    // CSS Keyframes handle the visual, JS just updates text
    const text = document.getElementById('breathing-text');
    setInterval(() => {
        // Assuming 4s cycle (2s in, 2s out)
        setTimeout(() => text.textContent = "Inhale...", 0);
        setTimeout(() => text.textContent = "Exhale...", 4000); // 8s loop
    }, 8000);
}

// 4. Gratitude Jar
function initGratitudeJar() {
    // Only Setup Logic needed if saving persistence, for now visual only
}
function addGratitude() {
    const input = document.getElementById('gratitude-input');
    const jar = document.getElementById('gratitude-jar-visual');
    if (input.value) {
        const drop = document.createElement('div');
        drop.innerText = "✨"; // Or input.value compressed
        drop.style.position = 'absolute';
        drop.style.left = Math.random() * 80 + '%';
        drop.style.top = '0';
        drop.className = 'falling-star';
        jar.appendChild(drop);

        updateAssistant(`Stored: "${input.value}"`);
        input.value = "";

        // Accumulate at bottom
        setTimeout(() => {
            drop.style.top = (80 - Math.random() * 20) + '%';
        }, 100);
    }
}

// 5. Light Pulse (Rhythm)
function initLightPulse() {
    const light = document.getElementById('pulse-light');
}
function tapLight() {
    const light = document.getElementById('pulse-light');
    if (light.classList.contains('glowing')) {
        updateAssistant("Perfect sync.");
        light.style.transform = "scale(1.2)";
        setTimeout(() => light.style.transform = "scale(1)", 200);
    } else {
        updateAssistant("Wait for the glow...");
    }
}

// 6. Color Therapy
function setColorTherapy(color) {
    // Logic to select active color for SVG coloring in games.html
    currentPaintColor = color;
}
let currentPaintColor = '#ffb7b2';
function paintShape(e) {
    e.target.style.fill = currentPaintColor;
    updateAssistant("Beautiful choice.");
}

// --- Legacy Game Logic (Bubbles & Canvas) ---
let bubbles = []; let canvas, ctx, isDrawing = false;
function initBubbleGame() {
    canvas = document.getElementById('bubble-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width; canvas.height = rect.height;
    bubbles = []; for (let i = 0; i < 10; i++) spawnBubble();
    canvas.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        bubbles = bubbles.filter(b => {
            if (Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2) < b.r) { playSound('Pop'); spawnBubble(); return false; } return true;
        });
    };
    animateBubbles();
}
function spawnBubble() { bubbles.push({ x: Math.random() * canvas.width, y: canvas.height + 50, r: 20 + Math.random() * 30, speed: 0.5 + Math.random() * 1.5, color: `hsla(${Math.random() * 360},70%,70%,0.6)` }); }
function animateBubbles() {
    if (!canvas) return; ctx.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach(b => { b.y -= b.speed; if (b.y < -50) b.y = canvas.height + 50; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = b.color; ctx.fill(); ctx.stroke(); });
    requestAnimationFrame(animateBubbles);
}
// Legacy Play Canvas
function initCanvas() {
    canvas = document.getElementById('play-canvas'); if (!canvas) return;
    ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect(); canvas.width = rect.width; canvas.height = rect.height;
    ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = '#3b82f6';
    canvas.onmousedown = (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    canvas.onmousemove = (e) => { if (isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
    canvas.onmouseup = () => isDrawing = false;
}
function setPenColor(c) { ctx.strokeStyle = c; }
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

// --- Exports ---
window.startJourney = startJourney;
window.submitOnboarding = submitOnboarding;
window.handleWelcomeResponse = handleWelcomeResponse;
window.selectStress = selectStress;
window.logout = () => { localStorage.clear(); window.location.href = 'login.html'; };
window.startTimer = (m) => updateAssistant(`Timer set for ${m}m`);
window.playSound = playSound;
window.toggleChatWindow = toggleChatWindow;
window.handleChatInput = handleChatInput;
window.initBubbleGame = initBubbleGame;
window.initCanvas = initCanvas;
// --- Grounding Tool (5-4-3-2-1) ---
let groundingStep = 0;
const groundingPrompts = [
    "Look around. Find 5 things you can see.",
    "Listen. Find 4 things you can hear.",
    "Touch. Find 3 things you can feel.",
    "Breathe. Find 2 scents you can smell.",
    "Taste. Find 1 thing you can taste."
];

function startGrounding() {
    groundingStep = 0;
    const el = document.getElementById('grounding-step');
    if (el) el.textContent = groundingPrompts[0];
    updateAssistant("I am right here with you.");
}

function nextGroundingStep() {
    groundingStep++;
    const el = document.getElementById('grounding-step');
    if (!el) return;

    if (groundingStep < groundingPrompts.length) {
        el.textContent = groundingPrompts[groundingStep];
        updateAssistant("Good. Keep going.");
    } else {
        el.textContent = "You are safe. You are here.";
        updateAssistant("Well done.");
        groundingStep = 0; // Reset for next time
    }
}

// --- Timers ---
let activeTimer = null;
function startMeditationTimer(minutes) {
    if (activeTimer) clearInterval(activeTimer);
    let seconds = minutes * 60;
    updateAssistant(`Meditation started: ${minutes}m`);

    // Create or find a timer display if specific page needs it, 
    // otherwise just use assistant updates for now to keep it simple across pages
    activeTimer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(activeTimer);
            updateAssistant("Meditation complete. Welcome back.");
            playSound('Rain'); // Gentle alarm
        } else if (seconds % 60 === 0) {
            updateAssistant(`${seconds / 60} minutes remaining...`);
        }
    }, 1000);
}

// --- New Exports ---
window.initZenGarden = initZenGarden;
window.waterPlant = waterPlant;
window.initPlantCare = initPlantCare;
window.addGratitude = addGratitude;
window.tapLight = tapLight;
window.setColorTherapy = setColorTherapy;
window.paintShape = paintShape;
window.initBreathingGame = initBreathingGame;
window.startGrounding = startGrounding;
window.nextGroundingStep = nextGroundingStep;
window.startMeditationTimer = startMeditationTimer;
window.toggleBreathing = () => {
    const c = document.getElementById('breathing-circle');
    if (c) {
        if (c.style.animationPlayState === 'paused') {
            c.style.animationPlayState = 'running';
            updateAssistant("Breathe in... Breathe out...");
        } else {
            c.style.animationPlayState = 'paused';
            updateAssistant("Breathing paused.");
        }
    }
};
