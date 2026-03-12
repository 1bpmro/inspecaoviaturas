import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";

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

// Exportações de serviços
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exportações de utilitários (para facilitar o import nas páginas)
export { 
  collection, addDoc, doc, updateDoc, deleteDoc, 
  getDoc, getDocs, onSnapshot, query, where, 
  orderBy, serverTimestamp 
};
