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


