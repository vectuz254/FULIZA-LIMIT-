// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB0CwidiZ0qNupPRQkQInquJUwClLIizDw",
  authDomain: "topjobs-76cd5.firebaseapp.com",
  projectId: "topjobs-76cd5",
  storageBucket: "topjobs-76cd5.firebasestorage.app",
  messagingSenderId: "393878014015",
  appId: "1:393878014015:web:a6a554a79d2777108dd08a",
  measurementId: "G-WZQPG0X6W0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
