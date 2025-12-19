/**
 * Limoges Office Soundboard - Playful Edition
 *
 * Sounds are organized by person. Each person has:
 * - name: Display name
 * - avatar: SVG icon identifier
 * - sounds: Array of sound objects with name, file, and key
 */

// === Theme Management ===
const ThemeManager = {
    init() {
        // Check for saved theme preference or default to light
        const savedTheme = localStorage.getItem('soundboard-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');

        this.setTheme(theme, false);
        this.setupToggle();
        this.setupSystemThemeListener();
    },

    setTheme(theme, save = true) {
        document.body.dataset.theme = theme;
        if (save) {
            localStorage.setItem('soundboard-theme', theme);
        }
    },

    toggle() {
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },

    setupToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    },

    setupSystemThemeListener() {
        // Listen for system theme changes (only if no saved preference)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('soundboard-theme')) {
                this.setTheme(e.matches ? 'dark' : 'light', false);
            }
        });
    }
};

const soundsByPerson = {
    adrien: {
        name: "Adrien",
        avatar: "rocket",
        sounds: [
            { name: "Sound 1", file: "sounds/adrien-1.m4a", key: "A" },
            { name: "Sound 2", file: "sounds/adrien-2.mp3", key: "B" },
            { name: "Sound 3", file: "sounds/adrien-3.m4a", key: "C" },
            { name: "Sound 4", file: "sounds/adrien-4.m4a", key: "D" }
        ]
    },
    alex: {
        name: "Alex",
        avatar: "star",
        sounds: [
            { name: "Sound 1", file: "sounds/alex-1.m4a", key: "E" },
            { name: "Sound 2", file: "sounds/alex-2.m4a", key: "F" }
        ]
    },
    lambert: {
        name: "Lambert",
        avatar: "music",
        sounds: [
            { name: "Sound 1", file: "sounds/lambert-1.m4a", key: "G" },
            { name: "Sound 2", file: "sounds/lambert-2.m4a", key: "H" }
        ]
    },
    delgado: {
        name: "Delgado",
        avatar: "bolt",
        sounds: [
            { name: "Sound 1", file: "sounds/delgado-1.m4a", key: "I" }
        ]
    },
    momo: {
        name: "Momo",
        avatar: "heart",
        sounds: [
            { name: "Sound 1", file: "sounds/momo-1.m4a", key: "J" }
        ]
    }
};

// Flatten sounds for easy lookup
const sounds = [];
const soundToPersonMap = new Map();
Object.entries(soundsByPerson).forEach(([personId, person]) => {
    person.sounds.forEach(sound => {
        const index = sounds.length;
        sounds.push({ ...sound, personId });
        soundToPersonMap.set(index, personId);
    });
});

// Check if we're running on a server (needed for audio visualizer)
const isServedOverHttp = window.location.protocol.startsWith('http');

// Cache buster for audio files (forces reload with CORS headers)
const audioCacheBuster = isServedOverHttp ? `?v=${Date.now()}` : '';

// === SVG Avatars ===
const avatars = {
    rocket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>`,
    star: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>`,
    music: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
    </svg>`,
    bolt: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`
};

// === Person Colors ===
const personColors = {
    adrien: '#0077CC',
    alex: '#FF6600',
    lambert: '#00B8A9',
    delgado: '#9B59B6',
    momo: '#E91E63'
};

// === State ===
let currentlyPlaying = null;
let lastPlayedSound = null;
const audioElements = new Map();
let progressAnimationId = null;

// === DOM Elements ===
const soundboard = document.getElementById('soundboard');
const nowPlaying = document.getElementById('now-playing');
const nowPlayingName = document.getElementById('now-playing-name');
const playbackBar = document.getElementById('playback-bar');
const particleContainer = document.getElementById('particle-container');
const audioVisualizer = document.getElementById('audio-visualizer');

// === Audio Visualizer ===
class AudioVisualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isInitialized = false;
        this.connectedElements = new WeakSet();
    }

    init() {
        if (this.isInitialized) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;

        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);

        this.isInitialized = true;
    }

    connectAudio(audioElement) {
        if (!this.isInitialized) this.init();

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Only connect once per audio element
        if (!this.connectedElements.has(audioElement)) {
            try {
                const source = this.audioContext.createMediaElementSource(audioElement);
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                this.connectedElements.add(audioElement);
            } catch (err) {
                console.warn('Could not connect audio to visualizer:', err.message);
            }
        }
    }

    draw(color = '#0077CC') {
        if (!this.analyser) return;

        this.animationId = requestAnimationFrame(() => this.draw(color));

        this.analyser.getByteFrequencyData(this.dataArray);

        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        const barCount = 12;
        const gap = 2;
        const barWidth = (width - (barCount - 1) * gap) / barCount;
        const step = Math.floor(this.dataArray.length / barCount);

        for (let i = 0; i < barCount; i++) {
            const value = this.dataArray[i * step];
            // Minimum bar height so something is always visible
            const minHeight = 4;
            const barHeight = Math.max(minHeight, (value / 255) * height * 0.9);
            const x = i * (barWidth + gap);
            const y = height - barHeight;

            // Create gradient
            const gradient = this.ctx.createLinearGradient(x, height, x, y);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.lightenColor(color, 60));

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            // Fallback for browsers without roundRect
            if (this.ctx.roundRect) {
                this.ctx.roundRect(x, y, barWidth, barHeight, 2);
            } else {
                this.ctx.rect(x, y, barWidth, barHeight);
            }
            this.ctx.fill();
        }
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 255) + percent);
        const g = Math.min(255, ((num >> 8) & 255) + percent);
        const b = Math.min(255, (num & 255) + percent);
        return `rgb(${r}, ${g}, ${b})`;
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

const visualizer = new AudioVisualizer(audioVisualizer);

// === Particle System ===
class ParticleSystem {
    constructor(container) {
        this.container = container;
        this.shapes = ['circle', 'square', 'star'];
    }

    burst(x, y, color, count = 20) {
        const colors = [color, this.lightenColor(color, 30), this.lightenColor(color, 60), '#ffffff'];

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
            particle.className = `particle ${shape !== 'circle' ? shape : ''}`;

            // Random color from palette
            const particleColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.background = particleColor;

            // Position
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            // Random size
            const size = 6 + Math.random() * 10;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // Random velocity
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const velocity = 80 + Math.random() * 120;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity - 50; // Bias upward
            const rotation = Math.random() * 720 - 360;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            particle.style.setProperty('--rotation', `${rotation}deg`);

            this.container.appendChild(particle);

            // Remove after animation
            setTimeout(() => particle.remove(), 800);
        }
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, ((num >> 16) & 255) + percent);
        const g = Math.min(255, ((num >> 8) & 255) + percent);
        const b = Math.min(255, (num & 255) + percent);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }
}

const particles = new ParticleSystem(particleContainer);

// === Initialize ===
function init() {
    ThemeManager.init();
    renderSoundboard();
    setupKeyboardListeners();
    animateCardsIn();
}

// === Render Soundboard ===
function renderSoundboard() {
    soundboard.innerHTML = '';

    if (sounds.length === 0) {
        soundboard.innerHTML = `
            <div class="empty-state">
                <h2>No sounds yet!</h2>
                <p>
                    Open <code>app.js</code> and add your sounds to the
                    <code>soundsByPerson</code> object at the top of the file.
                </p>
            </div>
        `;
        return;
    }

    let globalIndex = 0;

    Object.entries(soundsByPerson).forEach(([personId, person]) => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.dataset.person = personId;

        const soundButtons = person.sounds.map((sound, i) => {
            const index = globalIndex++;
            return `
                <button class="sound-btn" data-index="${index}" data-person="${personId}" title="Press ${sound.key} to play">
                    <span class="key-badge">${sound.key}</span>
                    <span class="sound-name">${sound.name}</span>
                    <div class="progress-bar"></div>
                </button>
            `;
        }).join('');

        card.innerHTML = `
            <div class="person-header">
                <div class="person-avatar">${avatars[person.avatar] || avatars.music}</div>
                <h2 class="person-name">${person.name}</h2>
            </div>
            <div class="person-sounds">
                ${soundButtons}
            </div>
        `;

        soundboard.appendChild(card);

        // Preload audio for this person
        person.sounds.forEach((sound, i) => {
            const soundIndex = globalIndex - person.sounds.length + i;
            const audio = new Audio();
            audio.preload = 'auto';
            // Only set crossOrigin when served over HTTP (needed for visualizer)
            // Must be set BEFORE setting src
            if (isServedOverHttp) {
                audio.crossOrigin = 'anonymous';
            }
            audio.src = sound.file + audioCacheBuster;
            audioElements.set(soundIndex, audio);
        });
    });

    // Add click listeners
    soundboard.querySelectorAll('.sound-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            playSound(index);
        });
    });
}

// === Animate Cards In ===
function animateCardsIn() {
    const cards = document.querySelectorAll('.person-card');
    cards.forEach((card, i) => {
        setTimeout(() => {
            card.classList.add('visible');
        }, i * 150 + 100);
    });
}

// === Play Sound ===
function playSound(index) {
    const sound = sounds[index];
    if (!sound) return;

    // Stop currently playing sound
    stopAllSounds();

    // Get or create audio element
    let audio = audioElements.get(index);
    if (!audio) {
        audio = new Audio();
        if (isServedOverHttp) {
            audio.crossOrigin = 'anonymous';
        }
        audio.src = sound.file + audioCacheBuster;
        audioElements.set(index, audio);
    }

    // Connect to visualizer (only works over HTTP)
    if (isServedOverHttp) {
        visualizer.connectAudio(audio);
    }

    // Reset and play
    audio.currentTime = 0;
    audio.play().catch(err => {
        console.error('Error playing sound:', err);
    });

    // Update state
    currentlyPlaying = { index, audio };
    lastPlayedSound = index;

    // Get person color
    const personId = sound.personId;
    const color = personColors[personId] || '#0077CC';

    // Start visualizer (only works over HTTP)
    if (isServedOverHttp) {
        visualizer.draw(color);
    }

    // Trigger particle burst
    const button = soundboard.querySelector(`[data-index="${index}"]`);
    if (button) {
        const rect = button.getBoundingClientRect();
        particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, color);
    }

    // Update UI
    updatePlayingState(index, true);
    showNowPlaying(sound.name);
    startProgressAnimation();

    // Handle end of playback
    audio.onended = () => {
        if (isServedOverHttp) {
            visualizer.stop();
        }
        updatePlayingState(index, false);
        hideNowPlaying();
        stopProgressAnimation();
        currentlyPlaying = null;
    };
}

// === Stop All Sounds ===
function stopAllSounds() {
    if (currentlyPlaying) {
        currentlyPlaying.audio.pause();
        currentlyPlaying.audio.currentTime = 0;
        updatePlayingState(currentlyPlaying.index, false);
        currentlyPlaying = null;
    }
    if (isServedOverHttp) {
        visualizer.stop();
    }
    hideNowPlaying();
    stopProgressAnimation();
}

// === Replay Last Sound ===
function replayLastSound() {
    if (lastPlayedSound !== null) {
        playSound(lastPlayedSound);
    }
}

// === Update Playing State ===
function updatePlayingState(index, isPlaying) {
    const button = soundboard.querySelector(`[data-index="${index}"]`);
    if (button) {
        button.classList.toggle('playing', isPlaying);
        if (!isPlaying) {
            const progressBar = button.querySelector('.progress-bar');
            if (progressBar) progressBar.style.width = '0%';
        }
    }
}

// === Progress Animation ===
function startProgressAnimation() {
    updateProgress();
}

function updateProgress() {
    if (!currentlyPlaying) return;

    const { audio, index } = currentlyPlaying;
    const button = soundboard.querySelector(`[data-index="${index}"]`);
    const progressBar = button?.querySelector('.progress-bar');

    if (progressBar && audio.duration && !isNaN(audio.duration)) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${progress}%`;

        // Update main playback bar too
        if (playbackBar) {
            playbackBar.style.width = `${progress}%`;
        }
    }

    progressAnimationId = requestAnimationFrame(updateProgress);
}

function stopProgressAnimation() {
    if (progressAnimationId) {
        cancelAnimationFrame(progressAnimationId);
        progressAnimationId = null;
    }
    if (playbackBar) {
        playbackBar.style.width = '0%';
    }
}

// === Now Playing Indicator ===
function showNowPlaying(name) {
    nowPlayingName.textContent = name;
    nowPlaying.classList.remove('hidden');
}

function hideNowPlaying() {
    nowPlaying.classList.add('hidden');
}

// === Keyboard Listeners ===
function setupKeyboardListeners() {
    document.addEventListener('keydown', (event) => {
        // Ignore if typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        const key = event.key.toUpperCase();

        // Escape - Stop all sounds
        if (event.key === 'Escape') {
            stopAllSounds();
            return;
        }

        // Space - Replay last sound
        if (event.key === ' ') {
            event.preventDefault();
            replayLastSound();
            return;
        }

        // Find sound by key
        const soundIndex = sounds.findIndex(s => s.key.toUpperCase() === key);
        if (soundIndex !== -1) {
            event.preventDefault();
            playSound(soundIndex);
        }
    });
}

// === Start ===
document.addEventListener('DOMContentLoaded', init);
