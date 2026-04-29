document.addEventListener('DOMContentLoaded', function () {
  function waitForFirebase(callback, retry = 0) {
    if (window.appAuth) {
      callback();
      return;
    }

    if (retry > 50) {
      if (window.showToast) window.showToast("System not ready. Please refresh.", "error");
      return;
    }

    setTimeout(() => waitForFirebase(callback, retry + 1), 200);
  }

  waitForFirebase(function () {
    const auth = window.appAuth;
    const audioPlayer = new Audio();

    let isPlaying = false;
    let playQueue = [];
    let currentUser = null;
    let clickState = { count: 0, lastTarget: null, lastClickTime: 0, timer: null };
    let authReady = false;

    auth.onAuthStateChanged((user) => {
      currentUser = user;
      authReady = true;
      sessionStorage.setItem('fb-auth-pending', 'false');
    });

    function chordSoundEnabled() {
      return localStorage.getItem("user_pref_chordSound") === "true";
    }

    function clearActiveState() {
      document.querySelectorAll('.chord-svg.active-chord, .chord-svg.play-slow, .chord-svg.play-fast, .chord-svg.play-strum')
        .forEach(el => {
          el.classList.remove('active-chord', 'play-slow', 'play-fast', 'play-strum');
        });
    }

    function stopCurrentPlayback() {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.removeAttribute('src');
      isPlaying = false;
      playQueue = [];
      clearActiveState();
    }

    function getAudioDurationFallback(type) {
      if (type === 'fast') return 1400;
      if (type === 'strum') return 2200;
      return 1800;
    }

    function playNextFromQueue() {
      if (isPlaying || !playQueue.length) return;
      const next = playQueue.shift();
      playChord(next);
    }

    function playChord({ svg, audioSrc, feedbackClass, playType }) {
      if (!audioSrc || !svg) {
        if (window.showToast) window.showToast("Audio source missing!", "error");
        return;
      }

      if (!chordSoundEnabled()) {
        stopCurrentPlayback();
        if (window.showToast) window.showToast("Chord sound is disabled in your settings.", "info");
        return;
      }

      isPlaying = true;
      clearActiveState();

      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.src = audioSrc;

      const finishPlayback = () => {
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
        if (window.showToast) window.showToast("Playback failed. Try again.", "error");
        playNextFromQueue();
      };

      audioPlayer.play()
        .then(() => {
          svg.classList.add(feedbackClass, 'active-chord');

          setTimeout(() => {
            svg.classList.remove(feedbackClass, 'active-chord');
          }, Math.min(getAudioDurationFallback(playType), 1200));
        })
        .catch(() => {
          isPlaying = false;
          clearActiveState();
          if (window.showToast) window.showToast("Playback failed. Try again.", "error");
          playNextFromQueue();
        });
    }

    function preloadAudio(src) {
      return new Promise((resolve, reject) => {
        if (!src) {
          reject(new Error("missing-src"));
          return;
        }

        const testAudio = new Audio();
        let done = false;

        const cleanup = () => {
          testAudio.oncanplaythrough = null;
          testAudio.onerror = null;
        };

        testAudio.preload = "auto";
        testAudio.src = src;

        testAudio.oncanplaythrough = () => {
          if (done) return;
          done = true;
          cleanup();
          resolve(src);
        };

        testAudio.onerror = () => {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("audio-load-failed"));
        };

        testAudio.load();

        setTimeout(() => {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("audio-timeout"));
        }, 4000);
      });
    }

    document.addEventListener('click', function (e) {
      const chordCard = e.target.closest('.chord-card');
      if (!chordCard) return;

      const svg = chordCard.querySelector('.chord-svg');
      if (!svg) return;

      if (!authReady) return;

      if (!currentUser) {
        if (window.showToast) {
          window.showToast("Please <a href='javascript:void(0)' onclick='window.loginWithGoogle()' style='color:inherit;text-decoration:underline;font-weight:700;'>Login</a> to play chords", "error");
        }
        return;
      }

      if (!chordSoundEnabled()) {
        stopCurrentPlayback();
        if (window.showToast) window.showToast("Chord sound is disabled in your settings.", "info");
        return;
      }

      const now = Date.now();
      if (clickState.lastTarget !== chordCard || (now - clickState.lastClickTime) > 500) {
        clickState.count = 0;
      }

      clickState.count++;
      clickState.lastTarget = chordCard;
      clickState.lastClickTime = now;

      if (clickState.timer) clearTimeout(clickState.timer);

      clickState.timer = setTimeout(async () => {
        let audioSrc = '';
        let feedbackClass = '';
        let playType = 'slow';

        if (clickState.count >= 3) {
          audioSrc = chordCard.getAttribute('data-strum');
          feedbackClass = 'play-strum';
          playType = 'strum';
        } else if (clickState.count === 2) {
          audioSrc = chordCard.getAttribute('data-fast');
          feedbackClass = 'play-fast';
          playType = 'fast';
        } else {
          audioSrc = chordCard.getAttribute('data-slow');
          feedbackClass = 'play-slow';
          playType = 'slow';
        }

        clickState.count = 0;

        if (!audioSrc) {
          if (window.showToast) window.showToast("Audio source missing!", "error");
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
          if (window.showToast) window.showToast("Audio not available for this chord.", "error");
        }
      }, 300);
    });

    window.addEventListener('storage', function (e) {
      if (e.key === 'user_pref_chordSound') {
        if (e.newValue !== 'true') {
          stopCurrentPlayback();
        }
      }
    });
  });
});
