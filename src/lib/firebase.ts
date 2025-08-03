// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "dogerocket-hevih",
  "appId": "1:940065957794:web:8aa67d05c7e73072be34fb",
  "storageBucket": "dogerocket-hevih.firebasestorage.app",
  "apiKey": "AIzaSyDtve8VolGrE191Uc0pzw0v3HB7_gmmxlk",
  "authDomain": "dogerocket-hevih.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "940065957794"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
