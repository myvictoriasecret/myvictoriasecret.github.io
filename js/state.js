// --- Shared Application State & DOM Element Cache ---

export const state = {
    pdfDoc: null,
    currentBookId: null,
    currentPage: 1,
    totalPages: 0,
    viewMode: 'double', // 'single' or 'double'
    scale: 1.0,
    bookmarks: [],
    notes: [],
    currentUser: null,
    isDraggingNote: false,
    activeNoteElement: null,
    dragOffset: { x: 0, y: 0 }
};

export let elements = {};

export function initElements(map) {
    elements = map;
}

// --- Toast Notification ---
export function showToast(message, type = 'success') {
    const toast = elements.toast;
    const toastMsg = elements.toastMessage;
    const toastIcon = elements.toastIcon;

    toastMsg.textContent = message;
    if (type === 'error') {
        toastIcon.className = 'fa-solid fa-circle-xmark text-rose-400 text-lg';
    } else if (type === 'warning') {
        toastIcon.className = 'fa-solid fa-triangle-exclamation text-amber-400 text-lg';
    } else {
        toastIcon.className = 'fa-solid fa-circle-check text-emerald-400 text-lg';
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
