
import { IServerConfig, IUserSettings, IWatchHistoryItem, MediaType, IUIConfig, IUserProfile } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';

const GLOBAL_CONFIG_DOC = 'global_config';
const UI_CONFIG_DOC = 'ui_config';
const ROLES_DOC = 'system_roles'; 
const STATS_KEY = 'flixmax_local_stats';

// --- Authentication & Roles ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export const loginWithEmail = async (email: string, pass: string, remember: boolean = true) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    return await signInWithEmailAndPassword(auth, email, pass);
};

export const registerUser = async (email: string, pass: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    const rolesRef = doc(db, "system", ROLES_DOC);
    const rolesSnap = await getDoc(rolesRef);

    let role: 'admin' | 'user' = 'user';
    let subscription = { status: 'inactive', plan: 'monthly', expiresAt: 0 }; 

    if (!rolesSnap.exists()) {
        role = 'admin';
        await setDoc(rolesRef, {
            adminUid: user.uid,
            createdAt: new Date()
        });
        subscription = { status: 'active', plan: 'lifetime', expiresAt: 9999999999999 };
    }

    await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        uid: user.uid,
        settings: { 
            role: role,
            subscription: subscription
        }
    });

    await addDoc(collection(db, "users", user.uid, "profiles"), {
        name: "Perfil 1",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
        isKids: false
    });

    return user;
};

export const logoutUser = async () => {
    await signOut(auth);
};

export const checkIsAdmin = async (uid: string): Promise<boolean> => {
    try {
        const rolesRef = doc(db, "system", ROLES_DOC);
        const rolesSnap = await getDoc(rolesRef);
        
        if (rolesSnap.exists()) {
            return rolesSnap.data().adminUid === uid;
        }
        return false;
    } catch (e) {
        console.error("Error checking admin role", e);
        return false;
    }
};

const getUserId = (): string => {
    return auth.currentUser ? auth.currentUser.uid : "offline_user";
};

// --- USER MANAGEMENT (ADMIN) ---

export const getAllUsers = async () => {
    try {
        const usersCol = collection(db, "users");
        const snapshot = await getDocs(usersCol);
        const users: any[] = [];
        snapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (e) {
        console.error("Error fetching users", e);
        return [];
    }
};

export const updateUserSubscription = async (targetUid: string, action: 'approve' | 'renew' | 'block') => {
    try {
        const userRef = doc(db, "users", targetUid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return false;
        }
        
        const userData = userSnap.data();
        const currentSettings = userData.settings || {};
        const currentSub = currentSettings.subscription || {};

        let currentExpiresAt = 0;
        if (typeof currentSub.expiresAt === 'number') {
            currentExpiresAt = currentSub.expiresAt;
        } else if (currentSub.expiresAt) {
            currentExpiresAt = Number(currentSub.expiresAt);
        }

        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        let newExpiresAt = 0;
        let status = 'active';

        if (action === 'block') {
            status = 'inactive';
            newExpiresAt = now - 1000;
        } else if (action === 'approve') {
            newExpiresAt = now + thirtyDaysMs;
        } else if (action === 'renew') {
            if (currentExpiresAt > now) {
                newExpiresAt = currentExpiresAt + thirtyDaysMs;
            } else {
                newExpiresAt = now + thirtyDaysMs;
            }
        }

        const newSubscription = {
            status: status,
            plan: 'monthly',
            expiresAt: newExpiresAt,
            lastUpdated: now
        };

        await setDoc(userRef, {
            settings: {
                subscription: newSubscription
            }
        }, { merge: true });
        
        return true;
    } catch (e) {
        console.error("FATAL Error updating subscription", e);
        return false;
    }
};

export const renewSubscription = async (plan: 'monthly' | 'yearly') => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") throw new Error("No user");

        const now = new Date();
        const expiresAt = new Date();
        
        if (plan === 'monthly') expiresAt.setMonth(expiresAt.getMonth() + 1);
        else expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const docRef = doc(db, "users", uid);
        
        await setDoc(docRef, {
            settings: {
                subscription: {
                    status: 'active',
                    plan: plan,
                    expiresAt: expiresAt.getTime()
                }
            }
        }, { merge: true });

        return true;
    } catch (e) {
        console.error("Error renewing subscription", e);
        return false;
    }
};

// --- PROFILES MANAGEMENT ---

export const getUserProfiles = async (): Promise<IUserProfile[]> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") return [];

        const profilesCol = collection(db, "users", uid, "profiles");
        const snapshot = await getDocs(profilesCol);
        
        const profiles: IUserProfile[] = [];
        snapshot.forEach(doc => {
            profiles.push({ id: doc.id, ...doc.data() } as IUserProfile);
        });
        
        return profiles;
    } catch (e) {
        return [];
    }
};

export const addUserProfile = async (name: string, avatarUrl: string, isKids: boolean = false): Promise<IUserProfile | null> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") return null;

        const newProfile = { name, avatarUrl, isKids };
        const docRef = await addDoc(collection(db, "users", uid, "profiles"), newProfile);
        
        return { id: docRef.id, ...newProfile };
    } catch (e) {
        return null;
    }
};

export const deleteUserProfile = async (profileId: string) => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") return;
        await deleteDoc(doc(db, "users", uid, "profiles", profileId));
    } catch (e) {
        console.error(e);
    }
};

// --- GLOBAL SERVER CONFIG (Admin Only) ---

export const saveServerConfig = async (config: IServerConfig) => {
  try {
      await setDoc(doc(db, "system", GLOBAL_CONFIG_DOC), {
          ...config,
          updatedAt: new Date()
      }, { merge: true });
      return true;
  } catch (e) {
      throw e;
  }
};

export const getServerConfig = async (): Promise<IServerConfig | null> => {
  try {
      const docRef = doc(db, "system", GLOBAL_CONFIG_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
          return docSnap.data() as IServerConfig;
      }
      return null;
  } catch (e) {
      return null;
  }
};

export const saveUIConfig = async (config: IUIConfig) => {
    try {
        await setDoc(doc(db, "system", UI_CONFIG_DOC), {
            ...config,
            updatedAt: new Date()
        }, { merge: true });
        return true;
    } catch (e) {
        throw e;
    }
};

export const getUIConfig = async (): Promise<IUIConfig | null> => {
    try {
        const docRef = doc(db, "system", UI_CONFIG_DOC);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as IUIConfig;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const saveUserSettings = async (settings: IUserSettings) => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") return;

        await setDoc(doc(db, "users", uid), {
            settings: settings,
            updatedAt: new Date()
        }, { merge: true });
    } catch (e) {
        console.error(e);
    }
};

export const getUserSettings = async (): Promise<IUserSettings | null> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user") return null;

        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.settings as IUserSettings;
        }
        return null;
    } catch (e) {
        return null;
    }
};

// --- HELPER: Manual Object Sanitization ---
const sanitizeItem = (item: any): any => {
    if (!item) return null;
    // Strictly pick primitive fields. Do NOT iterate or copy unknown props.
    return {
        stream_id: String(item.stream_id || item.series_id || item.id || "0"),
        name: String(item.name || item.title || "Unknown"),
        stream_icon: String(item.stream_icon || item.cover || ""),
        cover: String(item.cover || item.stream_icon || ""),
        backdrop_path: Array.isArray(item.backdrop_path) ? item.backdrop_path : [],
        container_extension: String(item.container_extension || "mp4"),
        category_id: String(item.category_id || ""),
        rating_5based: item.rating_5based || null,
        stream_type: String(item.stream_type || ""),
        num: item.num || 0,
        series_id: item.series_id || null,
        added: String(item.added || "")
    };
};

// --- History / Continue Watching (PROFILE SCOPED) ---

export const saveWatchProgress = async (item: IWatchHistoryItem, profileId: string) => {
  try {
    const uid = getUserId();
    if (uid === "offline_user" || !profileId) return;

    const safeStreamData = sanitizeItem(item.streamData);

    const historyRef = doc(db, "users", uid, "profiles", profileId, "history", String(item.id));
    await setDoc(historyRef, {
        id: String(item.id),
        type: String(item.type),
        title: String(item.title),
        icon: String(item.icon),
        progress: Number(item.progress),
        duration: Number(item.duration),
        lastWatched: Date.now(),
        streamData: safeStreamData
    });
  } catch (e) {
    console.error("Failed to save history", e);
  }
};

export const getWatchHistory = async (profileId: string): Promise<IWatchHistoryItem[]> => {
  try {
    const uid = getUserId();
    if (uid === "offline_user" || !profileId) return [];

    const historyCol = collection(db, "users", uid, "profiles", profileId, "history");
    const q = query(historyCol);
    const querySnapshot = await getDocs(q);
    
    const history: IWatchHistoryItem[] = [];
    querySnapshot.forEach((doc) => {
        history.push(doc.data() as IWatchHistoryItem);
    });
    
    return history.sort((a, b) => b.lastWatched - a.lastWatched);
  } catch (e) {
    return [];
  }
};

export const getResumeTime = async (id: string, type: MediaType, profileId: string): Promise<number> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user" || !profileId) return 0;

        const docRef = doc(db, "users", uid, "profiles", profileId, "history", String(id));
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data().progress;
        }
        return 0;
    } catch (e) {
        return 0;
    }
};

// --- Favorites (PROFILE SCOPED) ---

export const toggleFavorite = async (item: any, type: MediaType, profileId: string): Promise<boolean> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user" || !profileId) return false;

        const id = String(item.stream_id || item.series_id);
        const favRef = doc(db, "users", uid, "profiles", profileId, "favorites", id);
        
        const docSnap = await getDoc(favRef);
        
        if (docSnap.exists()) {
            await deleteDoc(favRef);
            return false;
        } else {
            const safeItem = sanitizeItem(item);

            await setDoc(favRef, {
                ...safeItem,
                mediaType: type,
                addedAt: Date.now()
            });
            return true;
        }
    } catch (e) {
        console.error("Error toggling favorite", e);
        return false;
    }
};

export const getFavorites = async (profileId: string): Promise<any[]> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user" || !profileId) return [];

        const favCol = collection(db, "users", uid, "profiles", profileId, "favorites");
        const querySnapshot = await getDocs(favCol);
        
        const favs: any[] = [];
        querySnapshot.forEach((doc) => {
            favs.push(doc.data());
        });
        return favs.sort((a, b) => b.addedAt - a.addedAt);
    } catch (e) {
        return [];
    }
}

export const isFavorite = async (id: number | string, type: MediaType, profileId: string): Promise<boolean> => {
    try {
        const uid = getUserId();
        if (uid === "offline_user" || !profileId) return false;

        const favRef = doc(db, "users", uid, "profiles", profileId, "favorites", String(id));
        const docSnap = await getDoc(favRef);
        return docSnap.exists();
    } catch (e) {
        return false;
    }
}

// --- Stats (Local) ---
export const trackView = (id: string | number, title: string, type: 'live' | 'movie' | 'series') => {
  try {
    const rawStats = localStorage.getItem(STATS_KEY);
    const currentStats = rawStats ? JSON.parse(rawStats) : {};
    
    // Ensure inputs are strings/primitives to prevent serialization errors
    const safeId = String(id);
    const safeTitle = String(title || "Unknown Title"); // Enforce string
    const key = `${type}_${safeId}`;
    
    if (!currentStats[key]) {
      currentStats[key] = { id: safeId, title: safeTitle, type, count: 0 };
    }
    currentStats[key].count += 1;
    
    localStorage.setItem(STATS_KEY, JSON.stringify(currentStats));
  } catch (error) {
    console.warn("Error tracking view:", error);
  }
};
