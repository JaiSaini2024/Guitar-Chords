// js/auth.js
async function loginWithGoogle() {
    try {
        await window.appAuth.signInWithPopup(window.appProvider);
    } catch (e) {
        console.error("Login failed:", e);
    }
}

async function logoutGoogle() {
    try {
        await window.appAuth.signOut();
    } catch (e) {
        console.error("Logout failed:", e);
    }
}

// Global functions for HTML access
window.loginWithGoogle = loginWithGoogle;
window.logoutGoogle = logoutGoogle;
