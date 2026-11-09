// --- User Sessions & Auth UI ---

import { state, elements, showToast } from './state.js';
import { getUserFromDB, saveUserToDB } from './db.js';

export function setUserSession(user) {
    state.currentUser = user;
    const displayName = user.email ? user.email.split('@')[0] : 'บัญชีของคุณ';
    elements.userDisplayName.textContent = displayName;
    elements.cloudStatusBadge.textContent = user.isCloud ? 'ซิงก์ Cloud' : 'บัญชี Local (ฟรี)';
    elements.cloudStatusBadge.className = 'bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30';
    elements.loggedOutView.classList.add('hidden');
    elements.loggedInView.classList.remove('hidden');
    elements.loggedUserEmail.textContent = user.email;
}

export function clearUserSession() {
    state.currentUser = null;
    localStorage.removeItem('ebook_session_user');
    elements.userDisplayName.textContent = 'เข้าสู่ระบบ / สมัคร';
    elements.cloudStatusBadge.textContent = 'โหมดทดลองใช้';
    elements.cloudStatusBadge.className = 'bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30';
    elements.loggedOutView.classList.remove('hidden');
    elements.loggedInView.classList.add('hidden');
}

export async function handleLogin() {
    const email = elements.authEmail.value.trim().toLowerCase();
    const password = elements.authPassword.value.trim();
    if (!email || !password) {
        showToast('กรุณากรอกอีเมลและรหัสผ่าน', 'warning');
        return;
    }

    const fb = window.FirebaseServices;
    if (fb.hasRealFirebase) {
        try {
            await fb.signInWithEmailAndPassword(fb.auth, email, password);
            showToast('เข้าสู่ระบบสำเร็จ');
            elements.authModal.classList.add('hidden');
            return;
        } catch (err) {
            console.warn("Cloud login fallback to local", err);
        }
    }

    // Local Account Fallback
    const localUser = await getUserFromDB(email);
    if (!localUser || localUser.password !== password) {
        showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
        return;
    }

    const sessionUser = { uid: localUser.uid, email: localUser.email, isCloud: false };
    localStorage.setItem('ebook_session_user', JSON.stringify(sessionUser));
    setUserSession(sessionUser);
    showToast('เข้าสู่ระบบสำเร็จ (Local Account)');
    elements.authModal.classList.add('hidden');
}

export async function handleRegister() {
    const email = elements.authEmail.value.trim().toLowerCase();
    const password = elements.authPassword.value.trim();
    if (!email || !password) {
        showToast('กรุณากรอกอีเมลและรหัสผ่าน', 'warning');
        return;
    }

    if (password.length < 6) {
        showToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
        return;
    }

    const fb = window.FirebaseServices;
    if (fb.hasRealFirebase) {
        try {
            await fb.createUserWithEmailAndPassword(fb.auth, email, password);
            showToast('สมัครสมาชิกบน Cloud สำเร็จ');
            elements.authModal.classList.add('hidden');
            return;
        } catch (err) {
            console.warn("Cloud register fallback to local:", err);
        }
    }

    // Local Account Registration
    const existingUser = await getUserFromDB(email);
    if (existingUser) {
        showToast('อีเมลนี้ถูกใช้งานแล้ว กรุณาล็อกอิน', 'warning');
        return;
    }

    const newUser = {
        email: email,
        password: password,
        uid: 'usr_' + Date.now()
    };

    await saveUserToDB(newUser);
    const sessionUser = { uid: newUser.uid, email: newUser.email, isCloud: false };
    localStorage.setItem('ebook_session_user', JSON.stringify(sessionUser));
    setUserSession(sessionUser);
    showToast('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!');
    elements.authModal.classList.add('hidden');
}

export async function handleLogout() {
    const fb = window.FirebaseServices;
    if (fb.hasRealFirebase) {
        try {
            await fb.signOut(fb.auth);
        } catch (e) {}
    }
    clearUserSession();
    showToast('ออกจากระบบแล้ว');
    elements.authModal.classList.add('hidden');
}

// Listen for Firebase / Local Auth Initialization
export function initAuthState() {
    const fb = window.FirebaseServices;

    // Check if active local session exists
    const savedLocalUser = localStorage.getItem('ebook_session_user');

    if (fb.hasRealFirebase) {
        const { auth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } = fb;
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            signInWithCustomToken(auth, __initial_auth_token).catch(console.error);
        } else {
            signInAnonymously(auth).catch(console.error);
        }

        onAuthStateChanged(auth, async (user) => {
            if (user && !user.isAnonymous) {
                setUserSession({ uid: user.uid, email: user.email, isCloud: true });
            } else if (savedLocalUser) {
                setUserSession(JSON.parse(savedLocalUser));
            } else {
                clearUserSession();
            }
        });
    } else {
        if (savedLocalUser) {
            setUserSession(JSON.parse(savedLocalUser));
        } else {
            clearUserSession();
        }
    }
}
