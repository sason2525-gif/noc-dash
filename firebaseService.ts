import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from "firebase/firestore";

/**
 * יש להחליף את YOUR_API_KEY וכו' בערכים האמיתיים שקיבלת מה-Firebase Console.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAfatOohOUJXSb1cNfIhhafOTM-6-60lTk",
  authDomain: "control-noc.firebaseapp.com",
  projectId: "control-noc",
  storageBucket: "control-noc.firebasestorage.app",
  messagingSenderId: "484408665691",
  appId: "1:484408665691:web:03a9ae99c566232e09417e",
  measurementId: "G-J79VRKMKE5"
};

// הגנה: אם המשתמש שכח להגדיר מפתחות, האפליקציה לא תקרוס בבנייה
const isConfigValid = firebaseConfig.apiKey !== "YOUR_API_KEY";

const app = isConfigValid ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;

export { db };

export const getShiftId = (date: string, type: string) => {
  return `${date.replace(/\//g, '-')}_${type.split(' ')[0]}`;
};

export const syncFaults = (shiftId: string, callback: (data: any[]) => void) => {
  if (!db) {
    console.warn("Firebase not configured. Sync disabled.");
    return () => {};
  }
  const q = query(
    collection(db, "faults"), 
    where("shiftId", "==", shiftId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    console.error("Firestore sync error:", error);
  });
};

export const syncPlanned = (shiftId: string, callback: (data: any[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, "planned"), where("shiftId", "==", shiftId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

export const dbAddFault = async (shiftId: string, fault: any) => {
  if (!db) return;
  await addDoc(collection(db, "faults"), { ...fault, shiftId, createdAt: Date.now() });
};

export const dbUpdateFault = async (id: string, updates: any) => {
  if (!db) return;
  await updateDoc(doc(db, "faults", id), updates);
};

export const dbDeleteFault = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "faults", id));
};

export const dbAddPlanned = async (shiftId: string, description: string) => {
  if (!db) return;
  await addDoc(collection(db, "planned"), { shiftId, description, createdAt: Date.now() });
};

export const dbDeletePlanned = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "planned", id));
};