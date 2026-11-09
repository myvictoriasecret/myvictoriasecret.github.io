// --- Sticky Notes & Bookmarks Systems ---

import { state, elements, showToast } from './state.js';
import { saveAnnotationsToDB } from './db.js';
import { syncToCloud } from './cloud.js';
import { renderCurrentPages, jumpToPage } from './reader.js';

export async function saveAnnotations() {
    if (!state.currentBookId) return;
    await saveAnnotationsToDB(state.currentBookId, {
        bookmarks: state.bookmarks,
        notes: state.notes
    });
    await syncToCloud();
}

// --- Sticky Notes ---
export function createStickyNote() {
    if (!state.currentBookId) {
        showToast('กรุณาเปิดหนังสือเพื่อแปะโพสต์อิท', 'warning');
        return;
    }

    const noteId = 'note_' + Date.now();
    const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNote = {
        id: noteId,
        page: state.currentPage,
        x: 20,
        y: 20,
        content: 'เขียนโน้ตที่นี่...',
        color: randomColor
    };

    state.notes.push(newNote);
    saveAnnotations();
    renderStickyNotesOverlay();
    updateNotesUI();
    showToast('แปะโพสต์อิทเรียบร้อยแล้ว');
}

export function renderStickyNotesOverlay() {
    elements.notesOverlayLeft.innerHTML = '';
    elements.notesOverlayRight.innerHTML = '';
    elements.notesOverlayLeft.style.pointerEvents = 'none';
    elements.notesOverlayRight.style.pointerEvents = 'none';

    const leftNotes = state.notes.filter(n => n.page === state.currentPage);
    leftNotes.forEach(note => {
        const noteEl = createNoteDOMElement(note);
        elements.notesOverlayLeft.appendChild(noteEl);
    });

    if (state.viewMode === 'double' && state.currentPage + 1 <= state.totalPages) {
        const rightNotes = state.notes.filter(n => n.page === state.currentPage + 1);
        rightNotes.forEach(note => {
            const noteEl = createNoteDOMElement(note);
            elements.notesOverlayRight.appendChild(noteEl);
        });
    }
}

function createNoteDOMElement(note) {
    const div = document.createElement('div');
    div.className = 'sticky-note absolute p-2 rounded-lg shadow-xl text-slate-800 text-xs flex flex-col pointer-events-auto border border-black/10';
    div.style.backgroundColor = note.color;
    div.style.left = `${note.x}%`;
    div.style.top = `${note.y}%`;
    div.style.width = '140px';
    div.style.minHeight = '110px';
    div.dataset.id = note.id;

    div.innerHTML = `
        <div class="note-header flex justify-between items-center mb-1 pb-1 border-b border-black/10 cursor-move">
            <span class="text-[10px] font-bold opacity-70">หน้า ${note.page}</span>
            <button class="btn-delete-note text-slate-600 hover:text-red-600 p-0.5 rounded transition">
                <i class="fa-solid fa-xmark text-xs"></i>
            </button>
        </div>
        <textarea class="note-body flex-1 bg-transparent resize-none focus:outline-none text-slate-800 text-xs leading-snug font-medium" placeholder="พิมพ์ข้อความ...">${note.content}</textarea>
    `;

    const textarea = div.querySelector('.note-body');
    textarea.addEventListener('input', (e) => {
        note.content = e.target.value;
        saveAnnotations();
        updateNotesUI();
    });

    const btnDelete = div.querySelector('.btn-delete-note');
    btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        state.notes = state.notes.filter(n => n.id !== note.id);
        saveAnnotations();
        renderStickyNotesOverlay();
        updateNotesUI();
        showToast('ลบโพสต์อิทแล้ว');
    });

    const header = div.querySelector('.note-header');
    header.addEventListener('mousedown', (e) => startNoteDrag(e, div, note));
    header.addEventListener('touchstart', (e) => startNoteDragTouch(e, div, note), { passive: false });

    return div;
}

function startNoteDrag(e, element, note) {
    state.isDraggingNote = true;
    state.activeNoteElement = { element, note };
    const rect = element.getBoundingClientRect();
    state.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function startNoteDragTouch(e, element, note) {
    if (e.touches.length === 1) {
        state.isDraggingNote = true;
        state.activeNoteElement = { element, note };
        const rect = element.getBoundingClientRect();
        state.dragOffset = {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
}

function handleNoteDrag(e) {
    if (!state.isDraggingNote || !state.activeNoteElement) return;
    const { element, note } = state.activeNoteElement;
    const parentContainer = element.parentElement;
    const parentRect = parentContainer.getBoundingClientRect();

    let x = e.clientX - parentRect.left - state.dragOffset.x;
    let y = e.clientY - parentRect.top - state.dragOffset.y;

    let xPercent = (x / parentRect.width) * 100;
    let yPercent = (y / parentRect.height) * 100;

    xPercent = Math.max(0, Math.min(xPercent, 70));
    yPercent = Math.max(0, Math.min(yPercent, 80));

    element.style.left = `${xPercent}%`;
    element.style.top = `${yPercent}%`;

    note.x = xPercent;
    note.y = yPercent;
}

function handleNoteDragTouch(e) {
    if (!state.isDraggingNote || !state.activeNoteElement) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleNoteDrag({ clientX: touch.clientX, clientY: touch.clientY });
}

function endNoteDrag() {
    if (state.isDraggingNote) {
        state.isDraggingNote = false;
        state.activeNoteElement = null;
        saveAnnotations();
    }
}

export function setupAnnotationDragListeners() {
    document.addEventListener('mousemove', handleNoteDrag);
    document.addEventListener('mouseup', endNoteDrag);
    document.addEventListener('touchmove', handleNoteDragTouch, { passive: false });
    document.addEventListener('touchend', endNoteDrag);
}

// --- Bookmarks ---
export function addBookmark() {
    if (!state.currentBookId) {
        showToast('กรุณาเปิดหนังสือเพื่อคั่นหน้า', 'warning');
        return;
    }

    const pageToBookmark = state.currentPage;
    const exists = state.bookmarks.some(b => b.page === pageToBookmark);

    if (exists) {
        showToast(`หน้านี้ (${pageToBookmark}) ถูกคั่นไว้แล้ว`, 'warning');
        return;
    }

    const bookmark = {
        id: 'bm_' + Date.now(),
        page: pageToBookmark,
        title: `ที่คั่นหน้า ${pageToBookmark}`,
        date: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    state.bookmarks.push(bookmark);
    state.bookmarks.sort((a, b) => a.page - b.page);
    saveAnnotations();
    updateBookmarksUI();
    showToast(`คั่นหน้า ${pageToBookmark} เรียบร้อยแล้ว`);
}

export function updateBookmarksUI() {
    elements.bookmarksList.innerHTML = '';
    if (state.bookmarks.length === 0) {
        elements.bookmarksList.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">ยังไม่มีที่คั่นหนังสือ</div>`;
        return;
    }

    state.bookmarks.forEach(bm => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-2.5 rounded-lg bg-slate-700/40 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition cursor-pointer group';

        div.addEventListener('click', () => {
            jumpToPage(bm.page);
            showToast(`ไปที่หน้า ${bm.page}`);

            if (window.innerWidth < 768) {
                elements.sidebar.classList.add('-translate-x-full');
            }
        });

        div.innerHTML = `
            <div class="flex items-center space-x-2.5">
                <i class="fa-solid fa-bookmark text-rose-400 text-xs"></i>
                <div>
                    <span class="text-xs font-semibold text-slate-200 block"></span>
                    <span class="text-[10px] text-slate-400"></span>
                </div>
            </div>
            <button class="btn-del-bm p-1 text-slate-500 hover:text-rose-400 transition rounded" title="ลบที่คั่น">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
        `;

        div.querySelector('span.block').textContent = bm.title;
        div.querySelector('span.text-\\[10px\\]').textContent = `เวลา ${bm.date}`;

        div.querySelector('.btn-del-bm').addEventListener('click', (e) => {
            e.stopPropagation();
            state.bookmarks = state.bookmarks.filter(b => b.id !== bm.id);
            saveAnnotations();
            updateBookmarksUI();
            showToast('ลบที่คั่นหนังสือแล้ว');
        });

        elements.bookmarksList.appendChild(div);
    });
}

export function updateNotesUI() {
    elements.notesList.innerHTML = '';
    if (state.notes.length === 0) {
        elements.notesList.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">ยังไม่มีโพสต์อิทในเล่มนี้</div>`;
        return;
    }

    state.notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'p-2.5 rounded-lg bg-slate-700/40 border border-slate-700 hover:bg-slate-700 transition cursor-pointer space-y-1';
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded text-slate-800" style="background-color: ${note.color}"></span>
                <button class="btn-del-note-list p-0.5 text-slate-500 hover:text-rose-400 transition" title="ลบโน้ต">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
            <p class="text-xs text-slate-300 truncate"></p>
        `;

        const pageBadge = div.querySelector('span');
        pageBadge.textContent = `หน้า ${note.page}`;
        const preview = div.querySelector('p');
        preview.textContent = note.content || 'ไม่มีข้อความ';

        div.addEventListener('click', () => {
            jumpToPage(note.page);
            if (window.innerWidth < 768) {
                elements.sidebar.classList.add('-translate-x-full');
            }
        });

        div.querySelector('.btn-del-note-list').addEventListener('click', (e) => {
            e.stopPropagation();
            state.notes = state.notes.filter(n => n.id !== note.id);
            saveAnnotations();
            renderStickyNotesOverlay();
            updateNotesUI();
            showToast('ลบโพสต์อิทแล้ว');
        });

        elements.notesList.appendChild(div);
    });
}
