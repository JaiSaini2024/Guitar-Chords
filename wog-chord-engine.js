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
        const barre = detectBarreFromShape(shape);
        if (barre) score += 5;

        
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
    if (!shape || typeof shape !== 'string') {
        return null;
    }

    shape = shape.trim().toLowerCase();

    if (shape.length !== 6 || /^x+$/.test(shape)) {
        return null;
    }

    const fretCounts = {};
    const positions = shape.split('');

    // Count frets
    positions.forEach(f => {
        if (f !== 'x' && f !== '0') {
            fretCounts[f] = (fretCounts[f] || 0) + 1;
        }
    });

    // Find strongest barre (>=3 strings)
    let bestFret = null;
    let maxCount = 0;

    for (const [fret, count] of Object.entries(fretCounts)) {
        if (count >= 3 && count > maxCount) {
            maxCount = count;
            bestFret = fret;
        }
    }

    if (!bestFret) return null;

    // ✅ EXTRA: continuous check (real guitar logic)
    let continuous = 0;
    let maxContinuous = 0;

    for (const f of positions) {
        if (f === bestFret) {
            continuous++;
            maxContinuous = Math.max(maxContinuous, continuous);
        } else {
            continuous = 0;
        }
    }

    // Agar continuous 3 strings nahi hai → fake barre reject
    if (maxContinuous < 3) return null;

    return bestFret; // string (important for comparison)
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
