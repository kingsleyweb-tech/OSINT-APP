import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User,
  updateProfile
} from 'firebase/auth';
import { auth } from './config';

export const registerUser = async (email: string, pass: string, name: string) => {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  if (res.user) {
    await updateProfile(res.user, { displayName: name });
  }
  return res.user;
};

export const loginUser = async (email: string, pass: string) => {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return res.user;
};

export const logoutUser = async () => {
  await firebaseSignOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const signIn = loginUser;
export const signUp = async (email: string, pass: string, name?: string) => registerUser(email, pass, name || '');
export const signOut = logoutUser;
