import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  type Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './config';
import type { Investigation, InvestigationNote } from '../types/investigation';
import type { UserProfile } from '../types/user';

const INVESTIGATIONS_COLLECTION = 'investigations';
const USERS_COLLECTION = 'users';

/**
 * Strips JS `undefined` fields recursively so Firestore SDK does not reject documents.
 */
const cleanForFirestore = <T>(obj: T): T => {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
};

// User Profile Firestore functions
export const createUserProfileInDb = async (profile: UserProfile): Promise<void> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, profile.uid);
    const existing = await getDoc(docRef);
    if (!existing.exists()) {
      const cleaned = cleanForFirestore({
        ...profile,
        updatedAt: new Date().toISOString()
      });
      await setDoc(docRef, cleaned);
      console.log("Successfully created user profile in Firestore:", profile.uid);
    }
  } catch (error) {
    console.error("Error creating user profile in Firestore:", error);
    throw error;
  }
};

export const getUserProfileFromDb = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile from Firestore:", error);
    return null;
  }
};

export const updateUserProfileInDb = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const cleaned = cleanForFirestore({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleaned, { merge: true });
    console.log("Successfully updated user profile in Firestore:", uid);
  } catch (error) {
    console.error("Error updating user profile in Firestore:", error);
    throw error;
  }
};

// Investigation Firestore functions
export const saveInvestigationToDb = async (investigation: Investigation): Promise<void> => {
  try {
    const currentUid = auth.currentUser?.uid;
    const invToSave: Investigation = {
      ...investigation,
      createdBy: investigation.createdBy || currentUid || 'demo-user',
      updatedAt: new Date().toISOString()
    };
    const docRef = doc(db, INVESTIGATIONS_COLLECTION, invToSave.id);
    const cleaned = cleanForFirestore(invToSave);
    await setDoc(docRef, cleaned, { merge: true });
    console.log("Successfully saved investigation to Firestore:", invToSave.id);
  } catch (error) {
    console.error("Error saving investigation to Firestore:", error);
    throw error;
  }
};

export const getInvestigationFromDb = async (id: string): Promise<Investigation | null> => {
  try {
    const docRef = doc(db, INVESTIGATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Investigation;
    }
    return null;
  } catch (error) {
    console.error("Error getting investigation from Firestore:", error);
    return null;
  }
};

export const getUserInvestigationsFromDb = async (userId: string): Promise<Investigation[]> => {
  try {
    const q = query(
      collection(db, INVESTIGATIONS_COLLECTION),
      where('createdBy', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const list: Investigation[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Investigation);
    });
    // In-memory sort by createdAt descending to avoid composite index errors in Firestore
    list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return list;
  } catch (error) {
    console.error("Error fetching user investigations from Firestore:", error);
    return [];
  }
};

export const subscribeToUserInvestigations = (
  userId: string,
  onUpdate: (investigations: Investigation[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, INVESTIGATIONS_COLLECTION),
    where('createdBy', '==', userId)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      const list: Investigation[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Investigation);
      });
      // In-memory sort by createdAt descending
      list.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.error("Firestore realtime listener error:", err);
      if (onError) onError(err);
    }
  );
};

export const addNoteToInvestigationInDb = async (investigationId: string, note: InvestigationNote): Promise<void> => {
  try {
    const docRef = doc(db, INVESTIGATIONS_COLLECTION, investigationId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const inv = snap.data() as Investigation;
      const updatedNotes = [note, ...(inv.notes || [])];
      const cleanedNotes = cleanForFirestore(updatedNotes);
      await updateDoc(docRef, { notes: cleanedNotes, updatedAt: new Date().toISOString() });
    }
  } catch (error) {
    console.error("Error adding note to investigation in Firestore:", error);
    throw error;
  }
};

export const deleteInvestigationFromDb = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INVESTIGATIONS_COLLECTION, id));
    console.log("Successfully deleted investigation from Firestore:", id);
  } catch (error) {
    console.error("Error deleting investigation from Firestore:", error);
    throw error;
  }
};
