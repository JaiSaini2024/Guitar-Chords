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
