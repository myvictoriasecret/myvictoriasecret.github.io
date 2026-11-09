// --- IndexedDB Local Database Management ---

const DB_NAME = 'EBookStudioDB';
const DB_VERSION = 1;
let db = null;

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('books')) {
                database.createObjectStore('books', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('annotations')) {
                database.createObjectStore('annotations', { keyPath: 'bookId' });
            }
            if (!database.objectStoreNames.contains('users')) {
                database.createObjectStore('users', { keyPath: 'email' });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject('IndexedDB error: ' + e.target.errorCode);
    });
}

export async function saveUserToDB(userObj) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readwrite');
        tx.objectStore('users').put(userObj);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getUserFromDB(email) {
    if (!db) await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('users', 'readonly');
        const req = tx.objectStore('users').get(email);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

export async function saveBookToDB(bookObj) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put(bookObj);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAllBooksFromDB() {
    if (!db) await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('books', 'readonly');
        const req = tx.objectStore('books').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });
}

export async function deleteBookFromDB(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function saveAnnotationsToDB(bookId, data) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('annotations', 'readwrite');
        tx.objectStore('annotations').put({ bookId, ...data });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAnnotationsFromDB(bookId) {
    if (!db) await initDB();
    return new Promise((resolve) => {
        const tx = db.transaction('annotations', 'readonly');
        const req = tx.objectStore('annotations').get(bookId);
        req.onsuccess = () => resolve(req.result || { bookmarks: [], notes: [] });
        req.onerror = () => resolve({ bookmarks: [], notes: [] });
    });
}
