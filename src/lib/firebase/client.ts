import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRU_YtrDVWEF4TvckKadj4B9wa33ak3K4",
  authDomain: "biteme-portal-hub.firebaseapp.com",
  projectId: "biteme-portal-hub",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

function getApp() {
  if (!_app) {
    _app =
      getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

export function getClientAuth() {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getGoogleProvider() {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({ hd: "biteme.co.kr" });
  }
  return _googleProvider;
}
