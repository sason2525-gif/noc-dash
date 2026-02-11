import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from "firebase/firestore";

/**
 * הגדרות Firebase - יש להעתיק מה-Firebase Console שלכם
 * Project Settings > General > Your Apps
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

// מחולל מזהה משמרת (תאריך_סוג)
export const getShiftId = (date: string, type: string) => {
  return `${date.replace(/\//g, '-')}_${type.split(' ')[0]}`;
};

// האזנה לתקלות בזמן אמת
export const syncFaults = (shiftId: string, callback: (data: any[]) => void) => {
  const q = query(
    collection(db, "faults"), 
    where("shiftId", "==", shiftId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

// האזנה לעבודות יזומות
export const syncPlanned = (shiftId: string, callback: (data: any[]) => void) => {
  const q = query(collection(db, "planned"), where("shiftId", "==", shiftId));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};

// פונקציות כתיבה ועדכון
export const dbAddFault = async (shiftId: string, fault: any) => {
  await addDoc(collection(db, "faults"), { ...fault, shiftId, createdAt: Date.now() });
};

export const dbUpdateFault = async (id: string, updates: any) => {
  await updateDoc(doc(db, "faults", id), updates);
};

export const dbDeleteFault = async (id: string) => {
  await deleteDoc(doc(db, "faults", id));
};

export const dbAddPlanned = async (shiftId: string, description: string) => {
  await addDoc(collection(db, "planned"), { shiftId, description, createdAt: Date.now() });
};

export const dbDeletePlanned = async (id: string) => {
  await deleteDoc(doc(db, "planned", id));
};

export const dbUpdateShift = async (id: string, data: any) => {
  await setDoc(doc(db, "shifts", id), data, { merge: true });
};