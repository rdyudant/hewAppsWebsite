// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCb8MmxSouixR8IUfxMCMEp7ijl46Rn4Ak",
  authDomain: "hew-apps.firebaseapp.com",
  projectId: "hew-apps",
  storageBucket: "hew-apps.firebasestorage.app",
  messagingSenderId: "65409210693",
  appId: "1:65409210693:web:53b298a88df1d3cbdfc62c",
  measurementId: "G-5ZX1DDTVJN",
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Inisialisasi Firebase Messaging
const messaging = firebase.messaging();

// Tangani notifikasi background
messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Tampilkan notifikasi
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/hew_appicon2.png', // Ganti dengan path ikon Anda
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});