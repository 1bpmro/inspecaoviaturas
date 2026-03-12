import { initializeApp } from "firebase/app";
import { getFirestore, serverTimestamp, collection, addDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDuFFlCVg8pAF6h2bv3XMTamOMaQMe0zx4",
  authDomain: "inspecaoviaturas.firebaseapp.com",
  projectId: "inspecaoviaturas",
  storageBucket: "inspecaoviaturas.firebasestorage.app",
  messagingSenderId: "56156144976",
  appId: "1:56156144976:web:6fad46f40ee3d7909d5855",
  measurementId: "G-2VNSCZN9JP"
};

// Inicialização
const app = initializeApp(firebaseConfig);

// Instâncias dos serviços
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp, collection, addDoc, updateDoc, ref, uploadString, getDownloadURL };
