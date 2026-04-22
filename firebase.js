// firebase.js

window.appReady = new Promise((resolve) => {

  document.addEventListener('DOMContentLoaded', function () {

    const firebaseConfig = {
    apiKey: "AIzaSyAz3iD45chxwHfGcAnfmx7V3jWYLfcXZOU",
    authDomain: "rating-c371c.firebaseapp.com",
    databaseURL: "https://rating-c371c-default-rtdb.firebaseio.com",
    projectId: "rating-c371c",
    storageBucket: "rating-c371c.appspot.com",
    messagingSenderId: "214609855829",
    appId: "1:214609855829:web:05a8e678bb209087c1dbdc"
    };

    if (typeof firebase === "undefined") {
      console.error("Firebase not loaded");
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    window.appAuth = firebase.auth();
    window.appDb = firebase.database();
    window.appProvider = new firebase.auth.GoogleAuthProvider();

    console.log("✅ Firebase Ready");

    resolve(); // 🔥 IMPORTANT
  });

});
