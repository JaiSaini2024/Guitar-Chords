function convertSongChords() {
    const songRoot = document.getElementById('song-root');
    if (!songRoot) return;

    songRoot.querySelectorAll('p').forEach(paragraph => {
        let html = paragraph.innerHTML;

        // Smart Regex: Chord aur uske baad wale spaces ko capture karega
        html = html.replace(/\{([^}]+)\}(\s*)/g, function(match, chord, space) {
            // Agar space hai, toh use &nbsp; mein badal dein taki width bani rahe
            let spaceHtml = '';
            if (space.length > 0) {
                // Har ek space ke liye ek &nbsp; aur thodi extra doori
                spaceHtml = space.replace(/ /g, '&nbsp;').replace(/\u00A0/g, '&nbsp;');
            }

            // Agar chord ke baad space hai, toh 'has-space' class lagayenge
            const className = space.length > 0 ? "cw has-space" : "cw";
            
            return `<span class="${className}"><span class="chord">${chord.trim()}</span></span>${spaceHtml}`;
        });

        paragraph.innerHTML = html;
    });
}
window.addEventListener('DOMContentLoaded', convertSongChords);

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAz3iD45chxwHfGcAnfmx7V3jWYLfcXZOU",
    authDomain: "rating-c371c.firebaseapp.com",
    databaseURL: "https://rating-c371c-default-rtdb.firebaseio.com",
    projectId: "rating-c371c",
    storageBucket: "rating-c371c.appspot.com",
    messagingSenderId: "214609855829",
    appId: "1:214609855829:web:05a8e678bb209087c1dbdc"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.appAuth = firebase.auth();
window.appDb = firebase.database();

// ================== CHORD DATA ==================
const chromaticSharps = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const chromaticFlats = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

const noteIndex = {
    'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,
    'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
};

const enharmonicToSharp = { 'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#' };
const openStringNotes = ['E','A','D','G','B','E'];

const fullShapes = {
    'C':  { major:"x32010", minor:"x35543", seven:"x32310", maj7:"x32000", m7:"x35343", sus4:"x33011", sus2:"x30013", add9:"x32030", power:"x355xx", dim:"x3454x", aug:"x32110" },
    'C#': { major:"x46664", minor:"x46654", seven:"x46464", maj7:"x46564", m7:"x46454", sus4:"x46674", sus2:"x446644", add9:"x4364x", power:"x466xx", dim:"x4565x", aug:"x4322x" },
    'D':  { major:"xx0232", minor:"xx0231", seven:"xx0212", maj7:"xx0222", m7:"xx0211", sus4:"xx0233", sus2:"xx0230", add9:"xx0230", power:"xx023x", dim:"xx0101", aug:"xx0332" },
    'D#': { major:"x68886", minor:"x68876", seven:"x68686", maj7:"x68786", m7:"x68676", sus4:"x68896", sus2:"x668866", add9:"x6586x", power:"x688xx", dim:"x6787x", aug:"x6544x" },
    'E':  { major:"022100", minor:"022000", seven:"020100", maj7:"021100", m7:"020000", sus4:"022200", sus2:"024400", add9:"024100", power:"022xxx", dim:"0120xx", aug:"032110" },
    'F':  { major:"133211", minor:"133111", seven:"131211", maj7:"132211", m7:"131111", sus4:"133311", sus2:"133011", add9:"x03011", power:"133xxx", dim:"1231xx", aug:"143221" },
    'F#': { major:"244322", minor:"244222", seven:"242322", maj7:"243322", m7:"242222", sus4:"244422", sus2:"x44122", add9:"224322", power:"244xxx", dim:"2342xx", aug:"255433" },
    'G':  { major:"320003", minor:"355333", seven:"320001", maj7:"320002", m7:"353333", sus4:"330013", sus2:"300233", add9:"320203", power:"355xxx", dim:"xx2323", aug:"321003" },
    'G#': { major:"466544", minor:"466444", seven:"464544", maj7:"465544", m7:"464444", sus4:"466644", sus2:"x66344", add9:"446544", power:"466xxx", dim:"4564xx", aug:"477655" },
    'A':  { major:"x02220", minor:"x02210", seven:"x02020", maj7:"x02120", m7:"x02010", sus4:"x02230", sus2:"x02200", add9:"x02420", power:"x022xx", dim:"x0121x", aug:"x03221" },
    'A#': { major:"x13331", minor:"x13321", seven:"x13131", maj7:"x13231", m7:"x13121", sus4:"x13341", sus2:"x13311", add9:"x10311", power:"x133xx", dim:"x1232x", aug:"x14332" },
    'B':  { major:"x24442", minor:"x24432", seven:"x21202", maj7:"x24342", m7:"x20202", sus4:"x24452", sus2:"x24422", add9:"x21422", power:"x244xx", dim:"x2343x", aug:"x25553" }
};

const slashShapes = {
    'G/B': 'x20033',
    'G#/C': 'x31144',
    'A/C#': 'x42225',
    'A#/D': 'x53336',
    'B/D#': 'x64447',
    'C/E': '032010',
    'C#/F': 'x43121',
    'D/F#': '2x0232',
    'D#/G': '355343',
    'E/G#': '4x2454',
    'F/A': 'x03211',
    'F#/A#': 'x14322',
    'Am/G': '302210'
};

let currentShift = 0;
let useFlats = false;
let chordSoundEnabled = true;
let toastTimer = null;
let toastQueue = [];
let isToastShowing = false;
let currentUser = null;

let originalKeyRoot = 'C';
let originalKeyMode = 'major';

const MIN_TRANSPOSE = -12;
const MAX_TRANSPOSE = 12;

let longPressInterval = null;
let longPressTimeout = null;
let isLongPressing = false;

let clickTimer = null;
let clickCount = 0;
let lastClickTime = 0;
let lastClickedCard = null;

let chordLongPressTimer = null;
let touchStartCard = null;
const LONG_PRESS_DURATION = 500;
const FAST_TRANSPOSE_DELAY = 150;

const chordCache = new Map();
const transposedChordCache = new Map();

// ================== LOGIN FUNCTION ==================
function loginWithGoogle() {
    if (!window.appAuth) {
        showToast("Authentication system not ready", "error");
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    window.appAuth.signInWithPopup(provider)
        .then((result) => {
            showToast("Login successful! You can now play chords.", "success");
        })
        .catch((error) => {
            console.error("Login error:", error);
            showToast("Login failed. Please try again.", "error");
        });
}

// ================== TOAST ==================
function showToast(msg, type = "success", duration = 4000, isPriority = true) {
    const t = document.getElementById("rating-toast");
    if (!t) return;
    
    // Special handling for login toast - make it clickable
    if (msg.includes("Login") && msg.includes("play chords")) {
        type = "login-required";
        duration = 5000;
    }
    
    if (isPriority) {
        toastQueue.push({ msg, type, duration });
        if (!isToastShowing) processToastQueue();
    } else {
        if (toastTimer) clearTimeout(toastTimer);
        t.innerHTML = msg;
        t.className = `rating-toast ${type} show`;
        
        // Add click handler for login toast
        if (type === "login-required") {
            t.style.cursor = "pointer";
            t.style.pointerEvents = "auto";
            t.onclick = () => {
                loginWithGoogle();
                t.classList.remove("show");
            };
        }
        
        toastTimer = setTimeout(() => t.classList.remove("show"), duration);
    }
}

function processToastQueue() {
    if (toastQueue.length === 0) {
        isToastShowing = false;
        return;
    }
    isToastShowing = true;
    const { msg, type, duration } = toastQueue.shift();
    const t = document.getElementById("rating-toast");
    if (!t) {
        isToastShowing = false;
        processToastQueue();
        return;
    }
    if (toastTimer) clearTimeout(toastTimer);
    t.innerHTML = msg;
    t.className = `rating-toast ${type} show`;
    
    // Add click handler for login toast
    if (type === "login-required") {
        t.style.cursor = "pointer";
        t.style.pointerEvents = "auto";
        t.onclick = () => {
            loginWithGoogle();
            t.classList.remove("show");
        };
    }
    
    toastTimer = setTimeout(() => {
        t.classList.remove("show");
        setTimeout(processToastQueue, 200);
    }, duration);
}

// ================== PREFERENCE MANAGEMENT ==================
function loadChordSoundPreference() {
    const localPref = localStorage.getItem('user_pref_chordSound');
    
    if (localPref !== null) {
        try {
            chordSoundEnabled = JSON.parse(localPref);
        } catch(e) {
            chordSoundEnabled = false;
        }
    } else {
        chordSoundEnabled = false;
    }
    
    updateChordCardsVisualState();
    console.log('Chord sound preference loaded:', chordSoundEnabled);
}

function updateChordCardsVisualState() {
    document.querySelectorAll('.chord-card').forEach(card => {
        if (chordSoundEnabled && currentUser) {
            card.classList.remove('chord-sound-disabled');
        } else {
            card.classList.add('chord-sound-disabled');
        }
    });
}

// ================== EVENT LISTENERS FOR PREFERENCE CHANGES ==================
window.addEventListener('chordSoundChanged', function(event) {
    const enabled = event.detail.enabled;
    console.log('Chord sound changed event received:', enabled);
    chordSoundEnabled = enabled;
    localStorage.setItem('user_pref_chordSound', JSON.stringify(enabled));
    updateChordCardsVisualState();
    showToast(enabled ? '🔊 Chord Sound ON' : '🔇 Chord Sound OFF', enabled ? 'success' : 'info', 1500, false);
});

window.addEventListener('login', function() {
    console.log('Login event received - reloading preferences');
    currentUser = window.appAuth?.currentUser;
    loadChordSoundPreference();
    updateChordCardsVisualState();
    showToast('✓ Logged in - You can now play chords!', 'success', 2000, false);
});

window.addEventListener('logout', function() {
    console.log('Logout event received - disabling chord sound');
    currentUser = null;
    chordSoundEnabled = false;
    localStorage.setItem('user_pref_chordSound', JSON.stringify(false));
    updateChordCardsVisualState();
    showToast('🔒 Please login to play chords', 'login-required', 4000, false);
});

// Listen for storage events from other tabs
window.addEventListener('storage', function(e) {
    if (e.key === 'user_pref_chordSound') {
        try {
            const newValue = JSON.parse(e.newValue);
            if (chordSoundEnabled !== newValue) {
                console.log('Storage event - chord sound changed to:', newValue);
                chordSoundEnabled = newValue;
                updateChordCardsVisualState();
                showToast(chordSoundEnabled ? '🔊 Chord Sound ON' : '🔇 Chord Sound OFF', chordSoundEnabled ? 'success' : 'info', 1500, false);
            }
        } catch(e) {
            console.error('Error parsing storage event:', e);
        }
    }
});

// ================== AUDIO ==================
const chordAudio = new Audio();
chordAudio.preload = 'auto';
chordAudio.volume = 0.75;
let isChordPlaying = false;
let chordQueue = [];

function playChordAudio(src) {
    if (!chordSoundEnabled || !currentUser || !src) return;
    if (isChordPlaying) { chordQueue.push(src); return; }
    isChordPlaying = true;
    chordAudio.pause();
    chordAudio.currentTime = 0;
    chordAudio.src = src;
    const finishPlay = () => {
        chordAudio.onended = null;
        chordAudio.onerror = null;
        isChordPlaying = false;
        if (chordQueue.length) playChordAudio(chordQueue.shift());
    };
    chordAudio.onended = finishPlay;
    chordAudio.onerror = finishPlay;
    chordAudio.play().catch(() => finishPlay());
}

function handleChordClick(card, chordName) {
    // Check if user is logged in
    if (!currentUser) {
        showToast('🔐 Please <a href="javascript:void(0)" onclick="loginWithGoogle()" style="color:white;text-decoration:underline;">Login</a> to play chords', 'login-required', 5000, true);
        return;
    }
    
    // Check if chord sound is enabled
    if (!chordSoundEnabled) {
        showToast('🔇 Chord sound is disabled in settings', 'info', 2000, false);
        return;
    }
    
    const now = Date.now();
    if (lastClickedCard !== card || (now - lastClickTime) > 450) clickCount = 0;
    clickCount++;
    lastClickTime = now;
    lastClickedCard = card;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
        let src = '', msg = '';
        if (clickCount >= 3) { src = card.dataset.strum; msg = `Strumming ${chordName}`; }
        else if (clickCount === 2) { src = card.dataset.fast; msg = `Fast strum: ${chordName}`; }
        else { src = card.dataset.slow; msg = `Playing ${chordName}`; }
        if (src && chordSoundEnabled && currentUser) { 
            showToast(msg, 'info', 1200, false); 
            playChordAudio(src);
        }
        clickCount = 0;
        clickTimer = null;
    }, 280);
}

// ================== CHORD FUNCTIONS ==================
function getChordSVG(chordName) {
    if (!chordCache.has(chordName)) {
        chordCache.set(chordName, generateChordSVG(chordName));
    }
    return chordCache.get(chordName);
}

function getTransposedChord(original, shift) {
    const cacheKey = `${original}|${shift}|${useFlats}`;
    if (!transposedChordCache.has(cacheKey)) {
        transposedChordCache.set(cacheKey, transposeChordName(original, shift));
    }
    return transposedChordCache.get(cacheKey);
}

function clearChordCache() {
    chordCache.clear();
    transposedChordCache.clear();
}

function preloadCommonChords() {
    const commonChords = ['C', 'G', 'Am', 'F', 'Dm', 'Em', 'D', 'E', 'A', 'Bm', 'C#', 'F#', 'G#', 'A#'];
    commonChords.forEach(chord => getChordSVG(chord));
}

// ================== DIFFICULTY COMPUTATION ==================
function computeDifficulty() {
    const songRoot = document.getElementById('song-root');
    const diffSpan = document.getElementById('difficulty');
    
    if (!songRoot || !diffSpan) return;

    // Har post body ke converted chords ko collect karein
    const chordElements = Array.from(songRoot.querySelectorAll('.chord'));
    const chords = chordElements.map(el => el.textContent.trim()).filter(t => t !== "");
    
    if (chords.length === 0) {
        diffSpan.textContent = "N/A";
        diffSpan.className = "diff-tag na";
        return;
    }

    let score = 0;
    const uniqueChords = new Set(chords);
    const uniqueCount = uniqueChords.size;

    // 1. UNIQUE CHORDS SCORING (More variety = More difficult)
    if (uniqueCount <= 3) score += 2;
    else if (uniqueCount <= 6) score += 5;
    else if (uniqueCount <= 9) score += 8;
    else score += 12;

    // 2. INDIVIDUAL CHORD ANALYSIS
    uniqueChords.forEach(ch => {
        // Global functions check
        const shape = (typeof getChordPosition === 'function') ? getChordPosition(ch) : null;
        const parsed = (typeof parseChord === 'function') ? parseChord(ch) : null;

        // Barre detection (High difficulty factor)
        if (shape && detectBarreFromShape(shape)) score += 5;
        
        // Slash chords (G/B, D/F#) - Professional/Intermediate level
        if (ch.includes('/')) score += 3;
        
        // Extensions & Modifiers
        if (parsed && parsed.type) {
            const type = parsed.type.toLowerCase();
            if (type.includes('dim') || type.includes('aug')) score += 6; // Very hard
            else if (type.includes('maj7') || type.includes('m7')) score += 3; // Intermediate
            else if (type.includes('7') || type.includes('sus') || type.includes('add')) score += 2;
        }

        // High Fret check (Chords above 5th fret are usually harder for beginners)
        if (shape) {
            const frets = shape.split('').filter(f => /\d/.test(f)).map(Number);
            if (frets.some(f => f >= 6)) score += 2;
        }
    });

    // 3. TRANSITION / SWITCHING DIFFICULTY (Fret jumps)
    let totalJumps = 0;
    for (let i = 1; i < chords.length; i++) {
        const pS = (typeof getChordPosition === 'function') ? getChordPosition(chords[i-1]) : null;
        const cS = (typeof getChordPosition === 'function') ? getChordPosition(chords[i]) : null;
        
        if (pS && cS) {
            const getAvgFret = (s) => {
                const f = s.split('').filter(x => /\d/.test(x)).map(Number);
                return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0;
            };
            const jump = Math.abs(getAvgFret(pS) - getAvgFret(cS));
            if (jump >= 4) totalJumps += 3; // Hard switch
            else if (jump >= 2) totalJumps += 1;
        }
    }
    // Limit switch score influence
    score += Math.min(totalJumps, 15);

    // FINAL DIFFICULTY MAPPING
    let level = "Easy";
    let statusClass = "easy";

    if (score > 35) {
        level = "Hard";
        statusClass = "hard";
    } else if (score > 15) {
        level = "Medium";
        statusClass = "medium";
    }

    // UPDATE UI WITH PROFESSIONAL STYLING
    diffSpan.textContent = level;
    diffSpan.className = "diff-tag " + statusClass;
    
    // Console log for debugging (Optional)
    // console.log(`Post Analysis: Chords=${chords.length}, Unique=${uniqueCount}, Score=${score}`);
}

/**
 * Enhanced Barre Detection
 */
function detectBarreFromShape(shape) {
    if (!shape || typeof shape !== 'string') return false;
    const fretCounts = {};
    const notes = shape.split('');
    notes.forEach(f => {
        if (f !== 'x' && f !== '0') {
            fretCounts[f] = (fretCounts[f] || 0) + 1;
        }
    });
    // Agar ek hi fret par 3 ya usse zyada strings dabani padein toh wo Barre hai
    return Object.values(fretCounts).some(count => count >= 3);
}

// Ensure execution after chord rendering
window.addEventListener('load', () => {
    setTimeout(computeDifficulty, 800);
});
// ================== TRANSPOSE ==================
function updateTransposeUI() {
    const downBtn = document.getElementById('transpose-down');
    const upBtn = document.getElementById('transpose-up');
    const trValue = document.getElementById('tr-value');
    const keySpan = document.getElementById('current-key');

    if (keySpan && originalKeyRoot) {
        const originalIdx = noteIndex[normalizeRoot(originalKeyRoot)];
        const newIdx = (originalIdx + currentShift + 12) % 12;
        const newRoot = useFlats ? chromaticFlats[newIdx] : chromaticSharps[newIdx];
        const keyName = originalKeyMode === 'minor' ? `${newRoot}m` : newRoot;
        keySpan.textContent = `Key: ${keyName}`;
    }

    if (downBtn) downBtn.disabled = (currentShift <= MIN_TRANSPOSE);
    if (upBtn) upBtn.disabled = (currentShift >= MAX_TRANSPOSE);
    if (trValue) {
        trValue.textContent = (currentShift > 0 ? '+' : '') + currentShift;
        trValue.classList.add('active');
        setTimeout(() => trValue.classList.remove('active'), 150);
        if (Math.abs(currentShift) === 12) {
            trValue.style.fontWeight = 'bold';
            trValue.classList.add("transpose-max");
        } else {
            trValue.style.fontWeight = 'normal';
            trValue.classList.remove("transpose-max");
        }
    }
}

let lastToastTime = 0;
function safeToast(msg){
    const now = Date.now();
    if(now - lastToastTime > 500){
        showToast(msg, 'info', 1200, false);
        lastToastTime = now;
    }
}

function performTranspose(step) {
    const newShift = currentShift + step;
    if (newShift >= MIN_TRANSPOSE && newShift <= MAX_TRANSPOSE) {
        currentShift = newShift;
        updateSongAndDiagrams();
        computeDifficulty();
        const shiftText = currentShift === 0 ? 'Original Key' : `${currentShift > 0 ? '+' : ''}${currentShift} steps`;
        const octaveText = Math.abs(currentShift) === 12 ? ' (1 octave)' : '';
        safeToast(`Transpose: ${shiftText}${octaveText}`);
        return true;
    }
    return false;
}

function startFastTranspose(step, button) {
    if (longPressInterval) clearInterval(longPressInterval);
    if (longPressTimeout) clearTimeout(longPressTimeout);
    button.classList.add('pressed');
    isLongPressing = true;
    performTranspose(step);
    longPressTimeout = setTimeout(() => {
        if (isLongPressing) {
            longPressInterval = setInterval(() => {
                if (isLongPressing) performTranspose(step);
                else stopFastTranspose();
            }, FAST_TRANSPOSE_DELAY);
        }
    }, 400);
}

function stopFastTranspose() {
    isLongPressing = false;
    if (longPressInterval) clearInterval(longPressInterval);
    if (longPressTimeout) clearTimeout(longPressTimeout);
    const downBtn = document.getElementById('transpose-down');
    const upBtn = document.getElementById('transpose-up');
    if (downBtn) downBtn.classList.remove('pressed');
    if (upBtn) upBtn.classList.remove('pressed');
}

// ================== ZOOM ==================
function openZoom(svgHtml, chordName) {
    const existingZoom = document.querySelector('.chord-zoom-overlay');
    if (existingZoom) existingZoom.remove();
    const zoomDiv = document.createElement('div');
    zoomDiv.className = 'chord-zoom-overlay';
    let fixedSvgHtml = svgHtml;
    if (!fixedSvgHtml.includes('viewBox')) fixedSvgHtml = fixedSvgHtml.replace('<svg', '<svg viewBox="0 0 400 520"');
    fixedSvgHtml = fixedSvgHtml.replace(/width="\d+%"/g, '').replace(/height="auto"/g, '');
    zoomDiv.innerHTML = `
        <div class="chord-zoom-container">
            <div class="chord-zoom-header">
                <button class="chord-zoom-close" aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <div class="chord-zoom-title">${chordName}</div>
                <div class="chord-zoom-spacer"></div>
            </div>
            <div class="chord-zoom-body">
                <div class="chord-zoom-svg-wrapper">
                    <div class="chord-zoom-svg">${fixedSvgHtml}</div>
                </div>
            </div>
            <div class="chord-zoom-footer">
                <span class="chord-zoom-hint">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 16V20H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M15 10L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 8V4H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 14L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 12H12V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 12H12V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Tap outside or swipe down to close
                </span>
            </div>
        </div>
    `;
    document.body.appendChild(zoomDiv);
    document.body.style.overflow = 'hidden';
    const closeZoom = () => {
        zoomDiv.classList.add('closing');
        document.body.style.overflow = '';
        setTimeout(() => zoomDiv.remove(), 200);
    };
    zoomDiv.querySelector('.chord-zoom-close').onclick = closeZoom;
    zoomDiv.onclick = (e) => { if (e.target === zoomDiv) closeZoom(); };
}

// ================== CORE CHORD FUNCTIONS ==================
function normalizeRoot(root) { return enharmonicToSharp[root] || root; }

function parseChord(chord) {
    const m = chord.match(/^([A-G][#b]?)([^\/]*)(?:\/([A-G][#b]?))?$/);
    return m ? { root: m[1], type: m[2] || '', bass: m[3] || '' } : null;
}

function getShapeType(type) {
    const map = { '':'major', 'm':'minor', '7':'seven', 'maj7':'maj7', 'm7':'m7', 'sus4':'sus4', 'sus2':'sus2', 'add9':'add9', '5':'power', 'dim':'dim', 'aug':'aug' };
    return map[type] || 'major';
}

function transposeChordName(chord, amount) {
    const parsed = parseChord(chord);
    if (!parsed) return chord;
    const rootNorm = normalizeRoot(parsed.root);
    let rootIdx = (noteIndex[rootNorm] + amount) % 12;
    if (rootIdx < 0) rootIdx += 12;
    let result = (useFlats ? chromaticFlats[rootIdx] : chromaticSharps[rootIdx]) + (parsed.type || '');
    if (parsed.bass) {
        const bassNorm = normalizeRoot(parsed.bass);
        let bassIdx = (noteIndex[bassNorm] + amount) % 12;
        if (bassIdx < 0) bassIdx += 12;
        result += '/' + (useFlats ? chromaticFlats[bassIdx] : chromaticSharps[bassIdx]);
    }
    return result;
}

function getChordPosition(chordName) {
    const parsed = parseChord(chordName);
    if (!parsed) return 'xxxxxx';
    const sharpRoot = normalizeRoot(parsed.root);
    const sharpBass = parsed.bass ? normalizeRoot(parsed.bass) : '';
    const shapeChordName = sharpBass ? (sharpRoot + (parsed.type || '') + '/' + sharpBass) : (sharpRoot + (parsed.type || ''));
    if (slashShapes[shapeChordName]) return slashShapes[shapeChordName];
    const shapeType = getShapeType((parsed.type || '').trim());
    return (fullShapes[sharpRoot] && fullShapes[sharpRoot][shapeType]) ? fullShapes[sharpRoot][shapeType] : 'xxxxxx';
}

function getNoteAtStringFret(stringIndex, fret) {
    const open = openStringNotes[stringIndex];
    const idx = (noteIndex[open] + fret) % 12;
    return useFlats ? chromaticFlats[idx] : chromaticSharps[idx];
}

function generateChordSVG(chordName) {
    const pos = getChordPosition(chordName);
    if (pos === 'xxxxxx') return '';
    
    const stringX = [80,128,176,224,272,320];
    const stringLabels = ['E','A','D','G','B','e'];
    const topY = { title: 42, marks: 84, labels: 128, nut: 162, gridBottom: 486 };
    const fretGap = 81;
    const fretY = [topY.nut, topY.nut+fretGap, topY.nut+fretGap*2, topY.nut+fretGap*3, topY.nut+fretGap*4];
    
    const nums = [...pos].filter(ch => /\d/.test(ch)).map(n => parseInt(n)).filter(n => n > 0);
    const minFret = nums.length ? Math.min(...nums) : 1;
    const displayFrets = Array.from({length:4}, (_,i) => minFret + i);
    
    let svg = `<svg class="chord-svg" viewBox="0 0 400 520">
        <text x="200" y="${topY.title}" font-family="Arial" font-size="48" text-anchor="middle" font-weight="bold">${chordName}</text>
        ${[...pos].map((p,i) => {
            const x = stringX[i];
            if(p === 'x') return `<line stroke-width="3" x1="${x-12}" x2="${x+12}" y1="${topY.marks-10}" y2="${topY.marks+10}"/><line stroke-width="3" x1="${x-12}" x2="${x+12}" y1="${topY.marks+10}" y2="${topY.marks-10}"/>`;
            if(p === '0') return `<circle r="12" cx="${x}" cy="${topY.marks}" stroke="currentColor" stroke-width="2.5" fill="none"/>`;
            return '';
        }).join('')}
        <line stroke-width="${minFret === 1 ? '7' : '2.5'}" x1="79" x2="321" y1="${topY.nut}" y2="${topY.nut}"/>
        ${fretY.slice(1).map(y => `<line stroke-width="2.5" x1="80" x2="320" y1="${y}" y2="${y}"/>`).join('')}
        ${stringX.map(x => `<line stroke-width="2.5" x1="${x}" x2="${x}" y1="${topY.nut}" y2="${topY.gridBottom}"/>`).join('')}
        ${stringLabels.map((name,i) => `<text x="${stringX[i]}" y="${topY.labels}" font-size="20" text-anchor="middle" font-weight="bold">${name}</text>`).join('')}
        ${displayFrets.map((f,i) => `<text font-size="22" text-anchor="end" x="58" y="${fretY[i] + 49}">${f}</text>`).join('')}
        ${displayFrets.map((f,i) => [3,5,7,9,12,15].includes(f) ? `<circle r="11" cx="200" cy="${fretY[i] + 40}" fill="var(--th-14)" stroke-width="0"/>` : '').join('')}
    `;
    
    [...pos].forEach((p,i) => {
        if (p === 'x' || p === '0') return;
        const fretValue = parseInt(p);
        const rel = fretValue - minFret;
        if (rel < 0 || rel > 3) return;
        const x = stringX[i];
        const y = fretY[rel] + 40;
        const noteName = getNoteAtStringFret(i, fretValue);
        svg += `<circle r="21" cx="${x}" cy="${y}" fill="var(--themeC)" class="chord-circle"/><text font-size="15" text-anchor="middle" x="${x}" y="${y+5}" fill="currentColor" font-weight="bold">${noteName}</text>`;
    });
    
    const barreFret = detectBarreFromShape(pos);
    if (barreFret) {
        const fretNum = parseInt(barreFret);
        const rel = fretNum - minFret;
        if (rel >= 0 && rel < 4) {
            const barreStrings = [];
            [...pos].forEach((p, idx) => {
                if (p === barreFret) barreStrings.push(idx);
            });
            if (barreStrings.length >= 2) {
                barreStrings.sort((a, b) => a - b);
                const firstX = stringX[barreStrings[0]];
                const lastX = stringX[barreStrings[barreStrings.length - 1]];
                const width = lastX - firstX + 20;
                const xPos = firstX - 10;
                const yPos = fretY[rel] + 31;
                svg += `<rect x="${xPos}" y="${yPos}" width="${width}" height="18" rx="9" fill="var(--themeC)" opacity="0.45" stroke="none"/>`;
            }
        }
    }

    svg += `</svg>`;

    const parsed = parseChord(chordName);
    const sharpRoot = parsed ? normalizeRoot(parsed.root) : chordName;
    const sharpBass = parsed && parsed.bass ? normalizeRoot(parsed.bass) : '';
    const sharpName = parsed ? (sharpRoot + (parsed.type || '') + (sharpBass ? '/' + sharpBass : '')) : chordName;
    const audioSlug = encodeURIComponent(sharpName);
    const disabledClass = (chordSoundEnabled && currentUser) ? '' : 'chord-sound-disabled';
    
    return `<div class="chord-card ${disabledClass}" data-chord-name="${chordName}"
        data-slow="https://cdn.jsdelivr.net/gh/JaiSaini2024/Guitar-Chords@main/${audioSlug}-slow.mp3"
        data-fast="https://cdn.jsdelivr.net/gh/JaiSaini2024/Guitar-Chords@main/${audioSlug}-fast.mp3"
        data-strum="https://cdn.jsdelivr.net/gh/JaiSaini2024/Guitar-Chords@main/${audioSlug}-strum.mp3">${svg}</div>`;
}

function updateSongAndDiagrams() {
    const song = document.getElementById('song-root');
    const app = document.getElementById('chord-app');
    if (!song || !app) return;
    
    const used = new Map();
    song.querySelectorAll('.chord').forEach(el => {
        const original = el.getAttribute('data-original') || el.textContent.trim();
        if (!el.getAttribute('data-original')) el.setAttribute('data-original', original);
        const transposed = getTransposedChord(original, currentShift);
        el.textContent = transposed;
        if (!used.has(transposed)) used.set(transposed, transposed);
    });
    
    updateTransposeUI();
    
    const noteBtn = document.getElementById('toggle-flat-btn');
    if (noteBtn) noteBtn.innerHTML = useFlats ? '♭' : '♯';
    
    app.innerHTML = '';
    Array.from(used.values()).forEach(ch => {
        app.insertAdjacentHTML('beforeend', getChordSVG(ch));
    });
    updateChordCardsVisualState();
}

const majorScales = {
  'C': ['C','Dm','Em','F','G','Am','Bdim'],
  'G': ['G','Am','Bm','C','D','Em','F#dim'],
  'D': ['D','Em','F#m','G','A','Bm','C#dim'],
  'A': ['A','Bm','C#m','D','E','F#m','G#dim'],
  'E': ['E','F#m','G#m','A','B','C#m','D#dim'],
  'B': ['B','C#m','D#m','E','F#','G#m','A#dim'],
  'F#': ['F#','G#m','A#m','B','C#','D#m','E#dim'],
  'C#': ['C#','D#m','E#m','F#','G#','A#m','B#dim'],

  'F': ['F','Gm','Am','Bb','C','Dm','Edim'],
  'Bb': ['Bb','Cm','Dm','Eb','F','Gm','Adim'],
  'Eb': ['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'],
  'Ab': ['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'],
  'Db': ['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'],
  'Gb': ['Gb','Abm','Bbm','Cb','Db','Ebm','Fdim'],
  'Cb': ['Cb','Dbm','Ebm','Fb','Gb','Abm','Bbdim']
};

const majorScales7 = {
  'C': ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5'],
  'G': ['Gmaj7','Am7','Bm7','Cmaj7','D7','Em7','F#m7b5'],
  'D': ['Dmaj7','Em7','F#m7','Gmaj7','A7','Bm7','C#m7b5'],
  'A': ['Amaj7','Bm7','C#m7','Dmaj7','E7','F#m7','G#m7b5'],
  'E': ['Emaj7','F#m7','G#m7','Amaj7','B7','C#m7','D#m7b5'],
  'B': ['Bmaj7','C#m7','D#m7','Emaj7','F#7','G#m7','A#m7b5'],
  'F#': ['F#maj7','G#m7','A#m7','Bmaj7','C#7','D#m7','E#m7b5'],
  'C#': ['C#maj7','D#m7','E#m7','F#maj7','G#7','A#m7','B#m7b5'],

  'F': ['Fmaj7','Gm7','Am7','Bbmaj7','C7','Dm7','Em7b5'],
  'Bb': ['Bbmaj7','Cm7','Dm7','Ebmaj7','F7','Gm7','Am7b5'],
  'Eb': ['Ebmaj7','Fm7','Gm7','Abmaj7','Bb7','Cm7','Dm7b5'],
  'Ab': ['Abmaj7','Bbm7','Cm7','Dbmaj7','Eb7','Fm7','Gm7b5'],
  'Db': ['Dbmaj7','Ebm7','Fm7','Gbmaj7','Ab7','Bbm7','Cm7b5'],
  'Gb': ['Gbmaj7','Abm7','Bbm7','Cbmaj7','Db7','Ebm7','Fm7b5'],
  'Cb': ['Cbmaj7','Dbm7','Ebm7','Fbmaj7','Gb7','Abm7','Bbm7b5']
};



const minorScales = {
  'Am': ['Am','Bdim','C','Dm','Em','F','G'],
  'Em': ['Em','F#dim','G','Am','Bm','C','D'],
  'Bm': ['Bm','C#dim','D','Em','F#m','G','A'],
  'F#m': ['F#m','G#dim','A','Bm','C#m','D','E'],
  'C#m': ['C#m','D#dim','E','F#m','G#m','A','B'],
  'G#m': ['G#m','A#dim','B','C#m','D#m','E','F#'],
  'D#m': ['D#m','E#dim','F#','G#m','A#m','B','C#'],
  'A#m': ['A#m','B#dim','C#','D#m','E#m','F#','G#'],

  'Dm': ['Dm','Edim','F','Gm','Am','Bb','C'],
  'Gm': ['Gm','Adim','Bb','Cm','Dm','Eb','F'],
  'Cm': ['Cm','Ddim','Eb','Fm','Gm','Ab','Bb'],
  'Fm': ['Fm','Gdim','Ab','Bbm','Cm','Db','Eb'],
  'Bbm': ['Bbm','Cdim','Db','Ebm','Fm','Gb','Ab'],
  'Ebm': ['Ebm','Fdim','Gb','Abm','Bbm','Cb','Db'],
  'Abm': ['Abm','Bbdim','Cb','Dbm','Ebm','Fb','Gb']
};

const minorScales7 = {
  'Am': ['Am7','Bm7b5','Cmaj7','Dm7','Em7','Fmaj7','G7'],
  'Em': ['Em7','F#m7b5','Gmaj7','Am7','Bm7','Cmaj7','D7'],
  'Bm': ['Bm7','C#m7b5','Dmaj7','Em7','F#m7','Gmaj7','A7'],
  'F#m': ['F#m7','G#m7b5','Amaj7','Bm7','C#m7','Dmaj7','E7'],
  'C#m': ['C#m7','D#m7b5','Emaj7','F#m7','G#m7','Amaj7','B7'],
  'G#m': ['G#m7','A#m7b5','Bmaj7','C#m7','D#m7','Emaj7','F#7'],
  'D#m': ['D#m7','E#m7b5','F#maj7','G#m7','A#m7','Bmaj7','C#7'],

  'Dm': ['Dm7','Em7b5','Fmaj7','Gm7','Am7','Bbmaj7','C7'],
  'Gm': ['Gm7','Am7b5','Bbmaj7','Cm7','Dm7','Ebmaj7','F7'],
  'Cm': ['Cm7','Dm7b5','Ebmaj7','Fm7','Gm7','Abmaj7','Bb7'],
  'Fm': ['Fm7','Gm7b5','Abmaj7','Bbm7','Cm7','Dbmaj7','Eb7'],
  'Bbm': ['Bbm7','Cm7b5','Dbmaj7','Ebm7','Fm7','Gbmaj7','Ab7'],
  'Ebm': ['Ebm7','Fm7b5','Gbmaj7','Abm7','Bbm7','Cbmaj7','Db7'],
  'Abm': ['Abm7','Bbm7b5','Cbmaj7','Dbm7','Ebm7','Fbmaj7','Gb7']
};

// ================== DOMINANT MAP (V chord) ==================
const dominantMap = {
  'C': 'G', 'G': 'D', 'D': 'A', 'A': 'E',
  'E': 'B', 'B': 'F#', 'F#': 'C#', 'C#': 'G#',

  'F': 'C', 'Bb': 'F', 'Eb': 'Bb', 'Ab': 'Eb',
  'Db': 'Ab', 'Gb': 'Db', 'Cb': 'Gb'
};



// Clean chord (remove extensions)
function normalizeChordForKey(chord) {
  return chord
    .replace(/maj7|m7|7|sus2|sus4|add9|dim|aug|5/g, '')
    .trim();
}

// Extract root + minor
function simplifyChord(chord) {
  const parsed = parseChord(chord);
  if (!parsed) return chord;

  let root = normalizeRoot(parsed.root);
  let type = parsed.type || '';

  if (type.startsWith('m') && !type.startsWith('maj')) {
    return root + 'm';
  }
  return root;
}

function applyDominantResolutionBonus(chords, key, isMinor) {
  let bonus = 0;

  const tonic = isMinor ? key + 'm' : key;
  const dominant = dominantMap[key];

  for (let i = 0; i < chords.length - 1; i++) {
    const current = simplifyChord(chords[i]);
    const next = simplifyChord(chords[i + 1]);

    // V → I (major)
    if (!isMinor && current === dominant && next === tonic) {
      bonus += 5;
    }

    // V → i (minor)
    if (isMinor && current === dominant && next === tonic) {
      bonus += 6; // minor me zyada strong
    }
  }

  return bonus;
}


function detectKeyAdvanced(chords) {
    let bestKey = null;
    let bestMode = 'major';
    let maxScore = -1; // -1 se start karein taaki 0 score bhi pick ho sake

    function scoreScale(scale, key, isMinor) {
      let score = 0;

      chords.forEach(ch => {
        let clean = normalizeChordForKey(ch);
        let simple = simplifyChord(clean);

        if (scale.includes(simple)) {
          score += 2;
        }
      });

      // 🎯 First chord (tonic hint)
      const first = simplifyChord(chords[0] || '');
      if (scale.includes(first)) score += 4;

      // 🎯 Last chord (resolution)
      const last = simplifyChord(chords[chords.length - 1] || '');
      if (scale.includes(last)) score += 3;

      // 🔥 NEW: Dominant resolution bonus
      score += applyDominantResolutionBonus(chords, key, isMinor);

      return score;
    }


    // Pehle MINOR check karein (kyunki aapka blog minor songs ke liye zyada use hota hai)
    for (let key in minorScales) {
        let score = scoreScale(minorScales[key], key.replace('m',''), true);
        if (score > maxScore) {
            maxScore = score;
            bestKey = key.replace('m', '');
            bestMode = 'minor';
        }
    }

    // Phir MAJOR check karein
    for (let key in majorScales) {
        let score = scoreScale(majorScales[key], key, false);
        if (score > maxScore) {
            maxScore = score;
            bestKey = key;
            bestMode = 'major';
        }
    }

    return { root: bestKey || 'C', mode: bestMode };
}

function detectOriginalKey() {
    const chordElements = document.querySelectorAll('#song-root .chord');

    // ❌ No chords fallback
    if (!chordElements.length) {
        return { root: 'C', mode: 'major' };
    }

    const chords = Array.from(chordElements)
        .map(el => el.textContent.trim())
        .filter(Boolean);

    // ================== TRY ADVANCED DETECTION ==================
    try {
        if (typeof detectKeyAdvanced === 'function') {
            const advanced = detectKeyAdvanced(chords);

            if (advanced && advanced.root) {
                return advanced; // ✅ Best result
            }
        }
    } catch (e) {
        console.warn("Advanced key detection failed:", e);
    }

    // ================== FALLBACK (YOUR OLD LOGIC) ==================
    const freq = new Map();
    let firstRoot = null;
    let firstType = null;

    chords.forEach((ch, idx) => {
        const parsed = parseChord(ch);
        if (!parsed) return;

        const root = parsed.root;
        const type = parsed.type;

        if (idx === 0) {
            firstRoot = root;
            firstType = type;
        }

        freq.set(root, (freq.get(root) || 0) + 1);
    });

    let maxRoot = null, maxCount = 0;

    for (let [root, count] of freq) {
        if (count > maxCount) {
            maxCount = count;
            maxRoot = root;
        }
    }

    if (!maxRoot) maxRoot = firstRoot || 'C';

    let isMinor = false;

    if (firstType && firstType.includes('m')) {
        isMinor = true;
    } else {
        const hasMinor = chords.some(ch => {
            const p = parseChord(ch);
            return p && p.root === maxRoot && p.type.includes('m');
        });
        isMinor = hasMinor;
    }

    return {
        root: maxRoot,
        mode: isMinor ? 'minor' : 'major'
    };
}


// ================== AUTH STATE LISTENER ==================
function initAuthListener() {
    if (!window.appAuth) {
        console.error("Firebase Auth not initialized");
        return;
    }
    
    window.appAuth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log("User logged in:", user.email);
            loadChordSoundPreference();
            updateChordCardsVisualState();
            // Dispatch login event for other components
            window.dispatchEvent(new Event('login'));
        } else {
            console.log("User logged out");
            currentUser = null;
            chordSoundEnabled = false;
            localStorage.setItem('user_pref_chordSound', JSON.stringify(false));
            updateChordCardsVisualState();
            // Show login required message
            showToast('🔐 Please login to play chords', 'login-required', 4000, false);
            // Dispatch logout event for other components
            window.dispatchEvent(new Event('logout'));
        }
    });
}

// ================== EVENT LISTENERS ==================
document.addEventListener('DOMContentLoaded', function() {
  convertSongChords();
  detectOriginalKey();
  
    // Initialize Firebase Auth listener
    initAuthListener();
    
    const keyInfo = detectOriginalKey();
    originalKeyRoot = keyInfo.root;
    originalKeyMode = keyInfo.mode;

    loadChordSoundPreference();
    updateSongAndDiagrams();
    updateTransposeUI();
    computeDifficulty();
    setTimeout(preloadCommonChords, 500);
    
    const downBtn = document.getElementById('transpose-down');
    const upBtn = document.getElementById('transpose-up');
    if (downBtn) {
        downBtn.addEventListener('mousedown', () => startFastTranspose(-1, downBtn));
        downBtn.addEventListener('mouseup', stopFastTranspose);
        downBtn.addEventListener('mouseleave', stopFastTranspose);
        downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startFastTranspose(-1, downBtn); });
        downBtn.addEventListener('touchend', stopFastTranspose);
        downBtn.addEventListener('touchcancel', stopFastTranspose);
    }
    if (upBtn) {
        upBtn.addEventListener('mousedown', () => startFastTranspose(1, upBtn));
        upBtn.addEventListener('mouseup', stopFastTranspose);
        upBtn.addEventListener('mouseleave', stopFastTranspose);
        upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startFastTranspose(1, upBtn); });
        upBtn.addEventListener('touchend', stopFastTranspose);
        upBtn.addEventListener('touchcancel', stopFastTranspose);
    }

    const resetBtn = document.getElementById('reset-transpose-btn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            currentShift = 0;
            updateSongAndDiagrams();
            computeDifficulty();
            showToast('Reset to Original Key', 'success', 2000, false);
        };
    }

    const flatBtn = document.getElementById('toggle-flat-btn');
    if (flatBtn) {
        flatBtn.onclick = () => {
            useFlats = !useFlats;
            clearChordCache();
            updateSongAndDiagrams();
            computeDifficulty();
            showToast(`Note: ${useFlats ? 'Flats (♭)' : 'Sharps (♯)'}`, 'info', 2000, false);
        };
    }

    const chordApp = document.getElementById('chord-app');
    if (!chordApp) return;

    chordApp.addEventListener('click', function(e) {
        const card = e.target.closest('.chord-card');
        if (!card) return;
        if (chordLongPressTimer) clearTimeout(chordLongPressTimer);
        const chordName = card.getAttribute('data-chord-name') || 'Chord';
        handleChordClick(card, chordName);
    });

    chordApp.addEventListener('touchstart', function(e) {
        const card = e.target.closest('.chord-card');
        if (!card) return;
        touchStartCard = card;
        const svgHtml = card.querySelector('svg')?.outerHTML;
        if (svgHtml) {
            chordLongPressTimer = setTimeout(() => {
                if (touchStartCard === card) {
                    if (window.navigator?.vibrate) window.navigator.vibrate(50);
                    openZoom(svgHtml, card.getAttribute('data-chord-name') || 'Chord');
                }
                chordLongPressTimer = null;
            }, LONG_PRESS_DURATION);
        }
    });

    chordApp.addEventListener('touchmove', () => { if (chordLongPressTimer) { clearTimeout(chordLongPressTimer); chordLongPressTimer = null; } });
    chordApp.addEventListener('touchend', () => { if (chordLongPressTimer) { clearTimeout(chordLongPressTimer); chordLongPressTimer = null; } touchStartCard = null; });
    chordApp.addEventListener('touchcancel', () => { if (chordLongPressTimer) { clearTimeout(chordLongPressTimer); chordLongPressTimer = null; } touchStartCard = null; });
    chordApp.addEventListener('mousedown', function(e) {
        const card = e.target.closest('.chord-card');
        if (!card) return;
        const svgHtml = card.querySelector('svg')?.outerHTML;
        if (svgHtml) {
            chordLongPressTimer = setTimeout(() => {
                openZoom(svgHtml, card.getAttribute('data-chord-name') || 'Chord');
                chordLongPressTimer = null;
            }, LONG_PRESS_DURATION);
        }
    });
    chordApp.addEventListener('mouseup', () => { if (chordLongPressTimer) { clearTimeout(chordLongPressTimer); chordLongPressTimer = null; } });
});
  
    
    
    const albumContainer = document.querySelector('.album-container-wrapper');

    // Enable horizontal scrolling with mouse wheel and dragging
    albumContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      albumContainer.scrollLeft += e.deltaY;
    });

    let isDown = false;
    let startX;
    let scrollLeft;

    albumContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      albumContainer.classList.add('active');
      startX = e.pageX - albumContainer.offsetLeft;
      scrollLeft = albumContainer.scrollLeft;
    });

    albumContainer.addEventListener('mouseleave', () => {
      isDown = false;
      albumContainer.classList.remove('active');
    });

    albumContainer.addEventListener('mouseup', () => {
      isDown = false;
      albumContainer.classList.remove('active');
    });

    albumContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - albumContainer.offsetLeft;
      const walk = (x - startX) * 2; // Multiply for faster scroll
      albumContainer.scrollLeft = scrollLeft - walk;
    });
       
    


    
    
    
  // player script  
  document.addEventListener('DOMContentLoaded', function() {
    if (typeof Vue !== 'undefined') {
      function convertTimeHHMMSS(val) {
        let hhmmss = new Date(val * 1000).toISOString().substr(11, 8);
        return hhmmss.indexOf("00:") === 0 ? hhmmss.substr(3) : hhmmss;
      }

      const { createApp } = Vue;

      const app = createApp({});

      app.component('AudioPlayer', {
        template: `
          <div class="player" v-show="!closed" :class="{ minimized }">
            <div class="player-topbar">
              <span class="player-title-text" :title="fileName">
                <span class="player-title-scroll">{{ fileName }}</span>
              </span>
              <button class="player-toggle" @click="minimized = !minimized" :title="minimized ? 'Expand' : 'Minimize'">
                <svg v-if="minimized" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1.5 10.5l6-6 6 6h-12z"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1.5 5.5l6 6 6-6h-12z"/>
                </svg>
              </button>
              <button class="player-close" @click="stop(); closed = true" title="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.5 2.5l11 11M13.5 2.5l-11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <div class="player-controls" v-show="!minimized">
              <div id="stop">
                <button @click.prevent="stop" title="Stop" class="player-control">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path fill="currentColor" d="M16,4.995v9.808C16,15.464,15.464,16,14.804,16H4.997C4.446,16,4,15.554,4,15.003V5.196C4,4.536,4.536,4,5.196,4h9.808C15.554,4,16,4.446,16,4.995z"/>
                  </svg>
                </button>
              </div>

              <div id="play">
                <button @click.prevent="playing = !playing" :title="playing ? 'Pause' : 'Play'" class="player-control">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path v-if="!playing" fill="currentColor" d="M15,10.001c0,0.299-0.305,0.514-0.305,0.514l-8.561,5.303C5.51,16.227,5,15.924,5,15.149V4.852c0-0.777,0.51-1.078,1.135-0.67l8.561,5.305C14.695,9.487,15,9.702,15,10.001z"/>
                    <path v-else fill="currentColor" d="M15,3h-2v14h2V3zM7,3H5v14h2V3z"/>
                  </svg>
                </button>
              </div>

              <div id="seek" style="grid-area: seek;">
                <div class="player-timeline">
                  <div :style="progressStyle" class="player-progress"></div>
                  <div @click="seek" class="player-seeker" title="Seek"></div>
                </div>
                <div class="player-time">
                  <div class="player-time-current">{{ currentSecondsConverted }}</div>
                  <div class="player-title"></div>
                  <div class="player-time-total">{{ durationSecondsConverted }}</div>
                </div>
              </div>

              <div id="loop" v-show="!showVolume">
                <button @click.prevent="looping = !looping" class="player-control" title="Loop">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path v-if="!looping" fill="currentColor" d="M1,12V5h3v6h10V8l5,4.5L14,17v-3H3C1.895,14,1,13.104,1,12z"/>
                    <path v-else fill="currentColor" d="M20,7v7c0,1.103-0.896,2-2,2H2c-1.104,0-2-0.897-2-2V7c0-1.104,0.896-2,2-2h7V3l4,3.5L9,10V8H3v5h14V8h-3V5h4C19.104,5,20,5.896,20,7z"/>
                  </svg>
                </button>
              </div>

              <div id="mute" v-show="!showVolume">
                <button v-on:click.prevent="mute" class="player-control" title="Mute">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path v-if="!muted" fill="currentColor" d="M5.312,4.566C4.19,5.685-0.715,12.681,3.523,16.918c4.236,4.238,11.23-0.668,12.354-1.789c1.121-1.119-0.335-4.395-3.252-7.312C9.706,4.898,6.434,3.441,5.312,4.566z M14.576,14.156c-0.332,0.328-2.895-0.457-5.364-2.928C6.745,8.759,5.956,6.195,6.288,5.865c0.328-0.332,2.894,0.457,5.36,2.926C14.119,11.258,14.906,13.824,14.576,14.156zM15.434,5.982l1.904-1.906c0.391-0.391,0.391-1.023,0-1.414c-0.39-0.391-1.023-0.391-1.414,0L14.02,4.568c-0.391,0.391-0.391,1.024,0,1.414C14.41,6.372,15.043,6.372,15.434,5.982z M11.124,3.8c0.483,0.268,1.091,0.095,1.36-0.388l1.087-1.926c0.268-0.483,0.095-1.091-0.388-1.36c-0.482-0.269-1.091-0.095-1.36,0.388L10.736,2.44C10.468,2.924,10.642,3.533,11.124,3.8z M19.872,6.816c-0.267-0.483-0.877-0.657-1.36-0.388l-1.94,1.061c-0.483,0.268-0.657,0.878-0.388,1.36c0.268,0.483,0.877,0.657,1.36,0.388l1.94-1.061C19.967,7.907,20.141,7.299,19.872,6.816z"/>
                    <path v-else fill="currentColor" d="M14.201,9.194c1.389,1.883,1.818,3.517,1.559,3.777c-0.26,0.258-1.893-0.17-3.778-1.559l-5.526,5.527c4.186,1.838,9.627-2.018,10.605-2.996c0.925-0.922,0.097-3.309-1.856-5.754L14.201,9.194z M8.667,7.941c-1.099-1.658-1.431-3.023-1.194-3.26c0.233-0.234,1.6,0.096,3.257,1.197l1.023-1.025C9.489,3.179,7.358,2.519,6.496,3.384C5.568,4.31,2.048,9.261,3.265,13.341L8.667,7.941z M18.521,1.478c-0.39-0.391-1.023-0.391-1.414,0L1.478,17.108c-0.391,0.391-0.391,1.024,0,1.414c0.391,0.391,1.023,0.391,1.414,0l15.629-15.63C18.912,2.501,18.912,1.868,18.521,1.478z"/>
                  </svg>
                </button>
              </div>

              <div id="volume">
                <button @mouseenter="showVolume = true" @mouseleave="showVolume = false" :title="volumeTitle" class="player-control">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path fill="currentColor" d="M3 7v6h4l5 5V2L7 7H3z"/>
                  </svg>
                  <input v-model.lazy.number="volume" v-show="showVolume" class="player-volume" type="range" min="0" max="100"/>
                </button>
              </div>
            </div>

            <audio :loop="looping" ref="audio" :src="file" @timeupdate="update" @loadeddata="load" @pause="playing = false" @play="playing = true" preload="auto" style="display: none;"></audio>
          </div>
        `,
        props: {
          autoPlay: { type: Boolean, default: false },
        file: { type: String, required: true }, // Changed to required since it's essential
        loop: { type: Boolean, default: false }
      },
        data() {
          return {
            currentSeconds: 0,
            durationSeconds: 0,
            loaded: false,
            looping: this.loop,
            playing: false,
            previousVolume: 35,
            showVolume: false,
            volume: 100,
            minimized: true,
            closed: true
          };
        },
        computed: {
          currentSecondsConverted() {
            return convertTimeHHMMSS(this.currentSeconds);
          },
          durationSecondsConverted() {
            return convertTimeHHMMSS(this.durationSeconds);
          },
          muted() {
            return this.volume === 0;
          },
          percentComplete() {
        return Math.floor((this.currentSeconds / (this.durationSeconds || 1)) * 100); // Added fallback
      },
          progressStyle() {
            return { width: `${this.percentComplete}%` };
          },
          volumeTitle() {
            return `Volume (${this.volume}%)`;
          },
          fileName() {
            try {
          const url = new URL(this.file); // Better URL parsing
          const pathParts = url.pathname.split('/');
          return decodeURIComponent(pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, ''));
        } catch {
          return 'Audio Track';
        }
      }
    },
        watch: {
          playing(value) {
        if (value && this.$refs.audio) {
          this.$refs.audio.play().catch(e => console.error("Playback failed:", e));
        } else if (this.$refs.audio) {
          this.$refs.audio.pause();
        }
      },
      volume(value) {
        if (this.$refs.audio) {
          this.$refs.audio.volume = value / 100;
        }
      },
      loop(value) {
        this.looping = value; // Sync prop to data
      }
    },
        methods: {
          load() {
        if (this.$refs.audio && this.$refs.audio.readyState >= 2) {
          this.loaded = true;
          this.durationSeconds = Math.floor(this.$refs.audio.duration);
          if (this.autoPlay) {
            this.playing = true;
          }
        }
      },
          update() {
            this.currentSeconds = parseInt(this.$refs.audio.currentTime);
          },
          stop() {
        this.playing = false;
        if (this.$refs.audio) {
          this.$refs.audio.currentTime = 0;
        }
      },
          mute() {
            if (this.muted) {
              this.volume = this.previousVolume;
            } else {
              this.previousVolume = this.volume;
              this.volume = 0;
            }
          },
          seek(e) {
        if (!this.loaded || !this.$refs.audio) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        const seekRatio = (e.clientX - bounds.left) / bounds.width;
        this.$refs.audio.currentTime = Math.min(
          seekRatio * this.durationSeconds, 
          this.durationSeconds - 0.1
        );
      }
    },
        created() {
          this.looping = this.loop;
        },
		mounted() {
          // Add error handling for audio element
          if (this.$refs.audio) {
            this.$refs.audio.addEventListener('error', () => {
              console.error("Error loading audio file");
            });
          }
        }
      });

      const vm = app.mount('#audio'); 

// Expose reference to restore function
      window.restorePlayer = function () {

        const player = vm.$refs.playerComponent;
        if (player) {
          player.closed = false;
          document.getElementById("restore-player-button").style.display = "none";
        }
      };

    }
  });

window.addEventListener(&#39;DOMContentLoaded&#39;, function () {
  const firebaseConfig = {
    apiKey: &quot;AIzaSyAz3iD45chxwHfGcAnfmx7V3jWYLfcXZOU&quot;,
    authDomain: &quot;rating-c371c.firebaseapp.com&quot;,
    databaseURL: &quot;https://rating-c371c-default-rtdb.firebaseio.com&quot;,
    projectId: &quot;rating-c371c&quot;,
    storageBucket: &quot;rating-c371c.appspot.com&quot;,
    messagingSenderId: &quot;214609855829&quot;,
    appId: &quot;1:214609855829:web:05a8e678bb209087c1dbdc&quot;
  };

  if (typeof firebase === &quot;undefined&quot;) {
    console.error(&quot;Firebase library not loaded.&quot;);
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  window.appFirebase = firebase;
  window.appAuth = firebase.auth();
  window.appDb = firebase.database();
  window.appProvider = new firebase.auth.GoogleAuthProvider();
});

    
    
// Audio Chord play 

document.addEventListener(&#39;DOMContentLoaded&#39;, function () {
  function waitForFirebase(callback, retry = 0) {
    if (window.appAuth) {
      callback();
      return;
    }

    if (retry &gt; 50) {
      if (window.showToast) window.showToast(&quot;System not ready. Please refresh.&quot;, &quot;error&quot;);
      return;
    }

    setTimeout(() =&gt; waitForFirebase(callback, retry + 1), 200);
  }

  waitForFirebase(function () {
    const auth = window.appAuth;
    const audioPlayer = new Audio();

    let isPlaying = false;
    let playQueue = [];
    let currentUser = null;
    let clickState = { count: 0, lastTarget: null, lastClickTime: 0, timer: null };
    let authReady = false;

    auth.onAuthStateChanged((user) =&gt; {
      currentUser = user;
      authReady = true;
      sessionStorage.setItem(&#39;fb-auth-pending&#39;, &#39;false&#39;);
    });

    function chordSoundEnabled() {
      return localStorage.getItem(&quot;user_pref_chordSound&quot;) === &quot;true&quot;;
    }

    function clearActiveState() {
      document.querySelectorAll(&#39;.chord-svg.active-chord, .chord-svg.play-slow, .chord-svg.play-fast, .chord-svg.play-strum&#39;)
        .forEach(el =&gt; {
          el.classList.remove(&#39;active-chord&#39;, &#39;play-slow&#39;, &#39;play-fast&#39;, &#39;play-strum&#39;);
        });
    }

    function stopCurrentPlayback() {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.removeAttribute(&#39;src&#39;);
      isPlaying = false;
      playQueue = [];
      clearActiveState();
    }

    function getAudioDurationFallback(type) {
      if (type === &#39;fast&#39;) return 1400;
      if (type === &#39;strum&#39;) return 2200;
      return 1800;
    }

    function playNextFromQueue() {
      if (isPlaying || !playQueue.length) return;
      const next = playQueue.shift();
      playChord(next);
    }

    function playChord({ svg, audioSrc, feedbackClass, playType }) {
      if (!audioSrc || !svg) {
        if (window.showToast) window.showToast(&quot;Audio source missing!&quot;, &quot;error&quot;);
        return;
      }

      if (!chordSoundEnabled()) {
        stopCurrentPlayback();
        if (window.showToast) window.showToast(&quot;Chord sound is disabled in your settings.&quot;, &quot;info&quot;);
        return;
      }

      isPlaying = true;
      clearActiveState();

      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.src = audioSrc;

      const finishPlayback = () =&gt; {
        isPlaying = false;
        clearActiveState();
        audioPlayer.onended = null;
        audioPlayer.onerror = null;
        playNextFromQueue();
      };

      audioPlayer.onended = finishPlayback;

      audioPlayer.onerror = function () {
        isPlaying = false;
        clearActiveState();
        if (window.showToast) window.showToast(&quot;Playback failed. Try again.&quot;, &quot;error&quot;);
        playNextFromQueue();
      };

      audioPlayer.play()
        .then(() =&gt; {
          svg.classList.add(feedbackClass, &#39;active-chord&#39;);

          setTimeout(() =&gt; {
            svg.classList.remove(feedbackClass, &#39;active-chord&#39;);
          }, Math.min(getAudioDurationFallback(playType), 1200));
        })
        .catch(() =&gt; {
          isPlaying = false;
          clearActiveState();
          if (window.showToast) window.showToast(&quot;Playback failed. Try again.&quot;, &quot;error&quot;);
          playNextFromQueue();
        });
    }

    function preloadAudio(src) {
      return new Promise((resolve, reject) =&gt; {
        if (!src) {
          reject(new Error(&quot;missing-src&quot;));
          return;
        }

        const testAudio = new Audio();
        let done = false;

        const cleanup = () =&gt; {
          testAudio.oncanplaythrough = null;
          testAudio.onerror = null;
        };

        testAudio.preload = &quot;auto&quot;;
        testAudio.src = src;

        testAudio.oncanplaythrough = () =&gt; {
          if (done) return;
          done = true;
          cleanup();
          resolve(src);
        };

        testAudio.onerror = () =&gt; {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error(&quot;audio-load-failed&quot;));
        };

        testAudio.load();

        setTimeout(() =&gt; {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error(&quot;audio-timeout&quot;));
        }, 4000);
      });
    }

    document.addEventListener(&#39;click&#39;, function (e) {
      const chordCard = e.target.closest(&#39;.chord-card&#39;);
      if (!chordCard) return;

      const svg = chordCard.querySelector(&#39;.chord-svg&#39;);
      if (!svg) return;

      if (!authReady) return;

      if (!currentUser) {
        if (window.showToast) {
          window.showToast(&quot;Please <a href='javascript:void(0)' onclick='window.loginWithGoogle()' style='color:inherit;text-decoration:underline;font-weight:700;'>Login</a> to play chords&quot;, &quot;error&quot;);
        }
        return;
      }

      if (!chordSoundEnabled()) {
        stopCurrentPlayback();
        if (window.showToast) window.showToast(&quot;Chord sound is disabled in your settings.&quot;, &quot;info&quot;);
        return;
      }

      const now = Date.now();
      if (clickState.lastTarget !== chordCard || (now - clickState.lastClickTime) &gt; 500) {
        clickState.count = 0;
      }

      clickState.count++;
      clickState.lastTarget = chordCard;
      clickState.lastClickTime = now;

      if (clickState.timer) clearTimeout(clickState.timer);

      clickState.timer = setTimeout(async () =&gt; {
        let audioSrc = &#39;&#39;;
        let feedbackClass = &#39;&#39;;
        let playType = &#39;slow&#39;;

        if (clickState.count &gt;= 3) {
          audioSrc = chordCard.getAttribute(&#39;data-strum&#39;);
          feedbackClass = &#39;play-strum&#39;;
          playType = &#39;strum&#39;;
        } else if (clickState.count === 2) {
          audioSrc = chordCard.getAttribute(&#39;data-fast&#39;);
          feedbackClass = &#39;play-fast&#39;;
          playType = &#39;fast&#39;;
        } else {
          audioSrc = chordCard.getAttribute(&#39;data-slow&#39;);
          feedbackClass = &#39;play-slow&#39;;
          playType = &#39;slow&#39;;
        }

        clickState.count = 0;

        if (!audioSrc) {
          if (window.showToast) window.showToast(&quot;Audio source missing!&quot;, &quot;error&quot;);
          return;
        }

        if (!chordSoundEnabled()) {
          stopCurrentPlayback();
          return;
        }

        try {
          await preloadAudio(audioSrc);

          const clickData = { svg, audioSrc, feedbackClass, playType };

          if (!isPlaying) {
            playChord(clickData);
          } else {
            playQueue.push(clickData);
          }
        } catch (err) {
          if (window.showToast) window.showToast(&quot;Audio not available for this chord.&quot;, &quot;error&quot;);
        }
      }, 300);
    });

    window.addEventListener(&#39;storage&#39;, function (e) {
      if (e.key === &#39;user_pref_chordSound&#39;) {
        if (e.newValue !== &#39;true&#39;) {
          stopCurrentPlayback();
        }
      }
    });
  });
});


window.addEventListener('DOMContentLoaded', function () {
  function waitForFirebase(callback, retry = 0) {
    if (window.appAuth && window.appDb && window.appProvider) {
      callback();
      return;
    }

    if (retry > 50) {
      console.error("Firebase not ready for login/rating system.");
      return;
    }

    setTimeout(() => waitForFirebase(callback, retry + 1), 200);
  }

  waitForFirebase(function () {
    const auth = window.appAuth;
    const db = window.appDb;
    const provider = window.appProvider;

    let loginInProgress = false;
    let toastTimer = null;
    const ratingInstances = {};

    function sanitizeId(id) {
      return String(id).replace(/[.#$\[\]]/g, '_');
    }

    function getGreeting(name) {
      const hour = new Date().getHours();
      const part = hour < 12 ? "Morning" : (hour < 18 ? "Afternoon" : "Evening");
      return `Good ${part}, ${name}`;
    }

    const messages = {
      initFailed: "Couldn't initialize rating system. Please refresh.",
      ratingError: "Failed to submit rating. Try again.",
      ratingInProgress: "Submitting...",
      loginRequired: "Please <a href='javascript:void(0)' onclick='window.loginWithGoogle()' style='color:inherit;text-decoration:underline;font-weight:700;'>Login</a> to rate this post.",
      loginOpening: "Opening Google sign-in...",
      loginFailed: "Login failed. Please try again.",
      logoutFailed: "Logout failed. Please try again.",
      starHover: v => `Rate this ${v} star${v > 1 ? 's' : ''}`,
      currentRating: (avg, count) => `Average: ${avg.toFixed(1)} (${count} votes)`
    };

    function showToast(msg, type = "success", duration = 4000) {
      const t = document.getElementById("rating-toast");
      if (!t) return;

      if (toastTimer) clearTimeout(toastTimer);

      t.innerHTML = msg;
      t.className = `rating-toast ${type} show`;

      toastTimer = setTimeout(() => {
        t.classList.remove("show");
      }, duration);
    }

    window.showToast = showToast;

    async function loginWithGoogle(errorEl = null) {
      if (loginInProgress) {
        if (errorEl) errorEl.textContent = "Login already in progress. Please wait.";
        showToast("Login already in progress. Please wait.", "error");
        return;
      }

      loginInProgress = true;
      if (errorEl) errorEl.textContent = "";

      showToast(messages.loginOpening, "loading", 1500);

      try {
        await auth.signInWithPopup(provider);
      } catch (e) {
        console.error("Login failed:", e);

        if (e.code === "auth/cancelled-popup-request") {
          if (errorEl) errorEl.textContent = "Another login popup is already open.";
          showToast("Another login popup is already open.", "error");
        } else if (e.code === "auth/popup-closed-by-user") {
          if (errorEl) errorEl.textContent = "Login popup was closed before sign-in.";
          showToast("Login popup was closed before sign-in.", "error");
        } else {
          if (errorEl) errorEl.textContent = "Login failed: " + e.message;
          showToast(messages.loginFailed, "error");
        }
      } finally {
        loginInProgress = false;
      }
    }

window.loginWithGoogle = loginWithGoogle;

    async function logoutGoogle() {
      try {
        await auth.signOut();
        if (window.showToast) {
             window.showToast("Logged out successfully. See you soon!", "success");
          }
      } catch (e) {
        console.error("Logout failed:", e);
        if (window.showToast) {
           window.showToast("Logout failed. Please try again.", "error");
        }
      }
    }
	window.logoutGoogle = logoutGoogle;

    function setupLikeButtons(user) {
      const uid = user.uid;
      const userName = user.displayName || "Anonymous";

      document.querySelectorAll('.like-container-wrapper').forEach(wrapper => {
        wrapper.style.display = 'flex';
      });

      document.querySelectorAll('.like-container').forEach(container => {
        const postId = container.dataset.postId;
        const postName = container.dataset.postTitle || "Untitled";
        const btn = container.querySelector('.like-btn');
        const countEl = container.querySelector('.like-count');
        const status = container.querySelector('.like-status');
        const errorEl = container.querySelector('.like-error');

        if (!btn || !postId) return;

        btn.style.display = 'flex';

        if (!container.dataset.likeRealtimeBound) {
          container.dataset.likeRealtimeBound = "true";

          db.ref(`likes/${postId}`).on('value', snap => {
            const count = snap.numChildren();
            if (countEl) countEl.textContent = `(${count})`;
            if (status) {
              status.textContent = count > 0
                ? `${count} people liked this.`
                : "Be the first to like this.";
            }
          });
        }

        db.ref(`likes/${postId}`).orderByChild('uid').equalTo(uid).once('value')
          .then(snap => {
            if (snap.exists()) {
              const firstLike = Object.entries(snap.val())[0];
              btn.dataset.likeKey = firstLike[0];
              btn.classList.add('liked');
            } else {
              btn.classList.remove('liked');
              delete btn.dataset.likeKey;
            }
          });

        if (!btn.dataset.clickBound) {
          btn.dataset.clickBound = "true";

          btn.addEventListener('click', async function () {
            const currentUser = auth.currentUser;

            if (!currentUser) {
              await loginWithGoogle(errorEl);
              return;
            }

            const currentUid = currentUser.uid;
            const currentName = currentUser.displayName || "Anonymous";
            const likeKey = btn.dataset.likeKey;

            if (likeKey) {
              db.ref(`likes/${postId}/${likeKey}`).remove().then(() => {
                db.ref(`userLikes/${currentUid}/${postId}`).remove();
                btn.classList.remove('liked');
                delete btn.dataset.likeKey;
                showToast("Like removed.", "success");
              }).catch(err => {
                if (errorEl) errorEl.textContent = "Error unliking: " + err.message;
                showToast("Error removing like.", "error");
              });
            } else {
              const newLikeRef = db.ref(`likes/${postId}`).push();
              const likeData = {
                uid: currentUid,
                userName: currentName,
                timestamp: Date.now(),
                postName
              };

              newLikeRef.set(likeData).then(() => {
                db.ref(`userLikes/${currentUid}/${postId}`).set({
                  postId,
                  title: postName,
                  url: container.dataset.postUrl || window.location.href,
                  image: container.dataset.postImage || "",
                  timestamp: Date.now()
                });
                btn.classList.add('liked');
                btn.dataset.likeKey = newLikeRef.key;
                showToast("You liked this post.", "success");
              }).catch(err => {
                if (errorEl) errorEl.textContent = "Error liking: " + err.message;
                showToast("Error liking post.", "error");
              });
            }
          });
        }
      });
    }

    function createRatingInstance(postId) {
      const div = document.getElementById(`post-rating-${postId}`);
      if (!div) return null;

      const safePostId = sanitizeId(postId);
      const stars = div.querySelectorAll(".star");
      const avgEl = div.querySelector(".average-rating");
      const countEl = div.querySelector(".total-ratings");
      const summary = div.querySelector(".rating-summary");
      const userMsg = div.querySelector(".rating-user-message");
      const starWrap = div.querySelector(".star-rating");
      const postRef = db.ref(`posts/${safePostId}`);

      const instance = {
        postId,
        safePostId,
        userMsg,
        div,
        stars,
        avgEl,
        countEl,
        summary,
        starWrap,
        postRef,
        ratingLiveBound: false,

        update(avg, total) {
          avg = (!avg || isNaN(avg)) ? 0 : avg;
          if (this.avgEl) this.avgEl.textContent = avg.toFixed(1);
          if (this.countEl) this.countEl.textContent = total;
          if (this.summary) {
            this.summary.title = messages.currentRating(avg, total);
          }
        },

        setStars(val) {
          this.stars.forEach(star => {
            const sVal = parseInt(star.dataset.value, 10);
            star.classList.toggle("active", sVal <= val);
            star.classList.toggle("selected", sVal === val);
          });
        },

        clearStars() {
          this.stars.forEach(star => {
            star.classList.remove("active", "selected");
          });
        },

        async enableForUser(user) {
          if (this.starWrap) this.starWrap.classList.remove("disabled");
		  if (this.userMsg) this.userMsg.innerHTML = "";

          const userRef = db.ref(`visitorRatings/${user.uid}/${this.safePostId}`);

          try {
            const snap = await userRef.once('value');

            if (snap.exists()) {
              const rating = snap.val().rating;
              this.setStars(rating);

              if (this.userMsg) {
                this.userMsg.style.display = "block";
                this.userMsg.innerHTML = `You already rated this post <b>${rating} star${rating > 1 ? 's' : ''}</b>. You can update your rating anytime.`;
              }
            } else {
              this.clearStars();

              if (this.userMsg) {
                this.userMsg.style.display = "block";
                this.userMsg.innerHTML = `Enjoyed this post? Give your rating below.`;
              }
            }
          } catch (e) {
            console.error(e);
          }

          this.stars.forEach(star => {
            const val = parseInt(star.dataset.value, 10);
            star.title = messages.starHover(val);

            star.onclick = async () => {
              if (!auth.currentUser) {
                showToast(messages.loginRequired, "error");
                return;
              }

              try {
                showToast(messages.ratingInProgress, "loading", 1500);

                const activeUser = auth.currentUser;
                const activeUserRef = db.ref(`visitorRatings/${activeUser.uid}/${this.safePostId}`);
                const existingSnap = await activeUserRef.once('value');

                let oldRating = null;
                if (existingSnap.exists()) {
                  oldRating = existingSnap.val().rating;
                }

                await this.postRef.transaction(d => {
                  if (!d) return { totalVotes: 1, totalValue: val };

                  if (oldRating !== null) {
                    return {
                      totalVotes: d.totalVotes,
                      totalValue: d.totalValue - oldRating + val
                    };
                  }

                  return {
                    totalVotes: (d.totalVotes || 0) + 1,
                    totalValue: (d.totalValue || 0) + val
                  };
                });

                await activeUserRef.set({
                  rating: val,
                  time: Date.now()
                });

                this.setStars(val);

                if (this.userMsg) {
                  this.userMsg.style.display = "block";
                  this.userMsg.innerHTML = oldRating !== null
                    ? `Your rating has been updated to <b>${val} star${val > 1 ? 's' : ''}</b>.`
                    : `Thanks for rating this post <b>${val} star${val > 1 ? 's' : ''}</b>.`;
                }

                showToast(oldRating !== null ? "Rating updated successfully!" : "Thanks for your rating!", "success");
              } catch (e) {
                console.error(e);
                showToast(messages.ratingError, "error");
              }
            };
          });
        },

        disable() {
          if (this.starWrap) {
            this.starWrap.classList.add("disabled");
          }

          this.clearStars();

          this.stars.forEach(star => {
            star.onclick = () => showToast(messages.loginRequired, "error");
          });

          if (this.userMsg) {
            this.userMsg.style.display = "block";
            this.userMsg.innerHTML = messages.loginRequired;
          }
        },

        bindLiveRating() {
          if (this.ratingLiveBound) return;
          this.ratingLiveBound = true;

          this.postRef.on('value', snap => {
            if (snap.exists()) {
              const d = snap.val();
              const totalVotes = d.totalVotes || 0;
              const totalValue = d.totalValue || 0;
              this.update(totalVotes ? totalValue / totalVotes : 0, totalVotes);
            } else {
              this.update(0, 0);
            }
          }, error => {
            console.error(error);
            if (this.summary) this.summary.innerHTML = messages.initFailed;
          });
        }
      };

      instance.bindLiveRating();
      return instance;
    }

    function initOrUpdateRating(postId, user) {
      if (!ratingInstances[postId]) {
        ratingInstances[postId] = createRatingInstance(postId);
      }

      const instance = ratingInstances[postId];
      if (!instance) return;

      if (user) {
        instance.enableForUser(user);
      } else {
        instance.disable();
      }
    }

    const loginWidget = document.getElementById("login-widget");
    const loginBtn = document.getElementById("google-login-btna");
    const userInfo = document.getElementById("user-info");
    const userPhoto = document.getElementById("user-photo");
    const greetMsg = document.getElementById("greet-msg");
    const logoutBtn = document.getElementById("logout-btn");
    const emailEl = document.getElementById("user-email");
    const uidEl = document.getElementById("user-uid");

    if (loginBtn && !loginBtn.dataset.bound) {
      loginBtn.dataset.bound = "true";
      loginBtn.addEventListener("click", function (e) {
        e.preventDefault();
        loginWithGoogle();
      });
    }

    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = "true";
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        logoutGoogle();
      });
    }

	let initialLoad = true;
    auth.onAuthStateChanged(user => {
      const playBtn = document.getElementById("audio-start-btn");
      const userInfoRate = document.getElementById("user-info-rate");
      const loginWidget = document.getElementById("login-widget");
      const userInfo = document.getElementById("user-info");
      const logoutBtn = document.getElementById("logout-btn");
      const userPhoto = document.getElementById("user-photo");
      const greetMsg = document.getElementById("greet-msg");
      const emailEl = document.getElementById("user-email");	

		sessionStorage.setItem('fb-auth-pending', 'false');
      if (user) {

        if (loginWidget) loginWidget.style.setProperty('display', 'none', 'important');
        if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');
        if (logoutBtn) logoutBtn.style.display = "inline-block";

        if (userPhoto) userPhoto.src = user.photoURL || "";
        if (greetMsg) greetMsg.textContent = `${getGreeting(user.displayName || "User")}!`;
        if (emailEl) emailEl.textContent = ` ${user.email}`;
        if (uidEl) uidEl.textContent = "";

        if (userInfoRate) {
          userInfoRate.innerText = `${getGreeting(user.displayName || "User")}!`;
          userInfoRate.style.display = "block";
        }

		if (!initialLoad) {
          showToast(`Welcome, ${user.displayName || 'User'}! Login Successful`, "success");
        }

        db.ref("users/" + user.uid).update({
            name: user.displayName || "",
            email: user.email || "",
            photo: user.photoURL || "",
            uid: user.uid,
            lastLogin: Date.now()
          }).catch(err => {
            console.error("User save failed:", err);
            if (window.showToast) window.showToast("User data save failed.", "error");
          });

        setupLikeButtons(user);

        if (playBtn) playBtn.style.display = "flex";
      } else {
        if (loginWidget) loginWidget.style.setProperty('display', 'inline-block', 'important');
        if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
        if (logoutBtn) logoutBtn.style.display = "none";

        if (emailEl) emailEl.textContent = "";
        if (uidEl) uidEl.textContent = "";
        if (userPhoto) userPhoto.src = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgLYXKas2Slg6XQSDnVv2sZp3WrBMgpRTTNdEEmBCO54XHW3kmftJKJMU-CrNBEwOn0CU1J-KwAeGuS-ETuCpXhZob0AYrl789Lrwu_T_CDJYJ2k1hOQ-ur_Ek-iEAIm5-0C-nMjY8DtWtfyZfRaOXJC8mdBvdunVCbObp9ra6rMrcSg7jGCf298UE13as/w150-h150-p-k-no-nu-rw-e90/organization-logo.png";
        if (greetMsg) greetMsg.textContent = "";

        if (userInfoRate) userInfoRate.style.display = "none";
        if (playBtn) playBtn.style.display = "none";

        document.querySelectorAll('.like-container-wrapper').forEach(wrapper => {
          wrapper.style.display = 'none';
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
          btn.classList.remove('liked');
          btn.style.display = 'none';
          delete btn.dataset.likeKey;
        });

		if (!initialLoad) { showToast("Logged out successfully.", "success"); }
      }

      document.querySelectorAll('[id^="post-rating-"]').forEach(el => {
        const postId = el.id.replace('post-rating-', '');
        initOrUpdateRating(postId, user);
      });
	initialLoad = false;
    });
  });
});
