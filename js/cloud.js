// --- Cloud Synchronization (Firebase) ---

import { state, elements } from './state.js';

export async function syncToCloud() {
    if (!state.currentUser || !state.currentBookId) return;
    const fb = window.FirebaseServices;
    if (fb && fb.hasRealFirebase) {
        try {
            const docRef = fb.doc(fb.db, `users/${state.currentUser.uid}/annotations`, state.currentBookId);
            await fb.setDoc(docRef, {
                bookmarks: state.bookmarks,
                notes: state.notes,
                updatedAt: Date.now()
            });
        } catch (e) {
            console.warn("Cloud sync error:", e);
        }
    }
}

export async function syncFromCloud(onLoaded) {
    if (!state.currentUser || !state.currentBookId) return;
    const fb = window.FirebaseServices;
    if (fb && fb.hasRealFirebase) {
        try {
            const docRef = fb.doc(fb.db, `users/${state.currentUser.uid}/annotations`, state.currentBookId);
            const docSnap = await fb.getDoc(docRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                state.bookmarks = cloudData.bookmarks || state.bookmarks;
                state.notes = cloudData.notes || state.notes;
                if (onLoaded) onLoaded();
            }
        } catch (e) {
            console.warn("Cloud fetch error:", e);
        }
    }
}
