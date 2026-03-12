import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuFFlCVg8pAF6h2bv3XMTamOMaQMe0zx4",
  authDomain: "inspecaoviaturas.firebaseapp.com",
  projectId: "inspecaoviaturas",
  storageBucket: "inspecaoviaturas.firebasestorage.app",
  messagingSenderId: "56156144976",
  appId: "1:56156144976:web:6fad46f40ee3d7909d5855",
  measurementId: "G-2VNSCZN9JP"
};

const app = initializeApp(firebaseConfig);

// Exportamos apenas o necessário do Firestore
export const db = getFirestore(app);
export { collection, addDoc, serverTimestamp };
