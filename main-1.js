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
