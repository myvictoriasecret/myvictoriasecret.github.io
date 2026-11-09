// --- Library UI & Demo Sample Generator ---

import { state, elements, showToast } from './state.js';
import { getAllBooksFromDB, saveBookToDB, deleteBookFromDB } from './db.js';
import { openBook } from './reader.js';

export async function loadLibraryUI() {
    const books = await getAllBooksFromDB();
    elements.libraryCount.textContent = books.length;
    elements.libraryList.innerHTML = '';

    if (books.length === 0) {
        elements.libraryList.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">ไม่มีหนังสือในคลัง</div>`;
        return;
    }

    books.forEach(book => {
        const card = renderLibraryCard(book, book.id === state.currentBookId);
        elements.libraryList.appendChild(card);
    });
}

// Build one library card element (with its event listeners attached)
function renderLibraryCard(book, isSelected) {
    const div = document.createElement('div');
    div.className = `p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
        isSelected
        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
        : 'bg-slate-700/30 border-slate-700 hover:bg-slate-700/60 text-slate-300'
    }`;

    div.innerHTML = `
        <div class="flex items-center space-x-3 overflow-hidden">
            <div class="w-8 h-10 rounded bg-slate-800 border border-slate-600 flex items-center justify-center text-indigo-400 shrink-0">
                <i class="fa-solid fa-file-pdf"></i>
            </div>
            <div class="truncate">
                <h4 class="text-xs font-semibold text-slate-100 truncate"></h4>
                <span class="text-[10px] text-slate-400 block"></span>
            </div>
        </div>
        <button class="btn-del-book p-1.5 text-slate-500 hover:text-rose-400 transition shrink-0" title="ลบหนังสือ">
            <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
    `;

    // Fill text via textContent to avoid HTML injection from book metadata
    const nameEl = div.querySelector('h4');
    const metaEl = div.querySelector('span');
    nameEl.textContent = book.name;
    metaEl.textContent = `${book.size} • ${book.date}`;

    div.addEventListener('click', async () => {
        try {
            await openBook(book);
            loadLibraryUI();
        } catch (err) {
            console.error('Failed to open book:', err);
            showToast('เกิดข้อผิดพลาดในการเปิดหนังสือ', 'error');
        }
        if (window.innerWidth < 768) {
            elements.sidebar.classList.add('-translate-x-full');
        }
    });

    div.querySelector('.btn-del-book').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`ต้องการลบ \"${book.name}\" ออกจากคลังหรือไม่?`)) return;
        try {
            await deleteBookFromDB(book.id);
        } catch (err) {
            console.error('Failed to delete book:', err);
            showToast('เกิดข้อผิดพลาดในการลบหนังสือ', 'error');
            return;
        }
        if (state.currentBookId === book.id) {
            // Gracefully reset reader state instead of a hard page reload
            state.pdfDoc = null;
            state.currentBookId = null;
            state.currentPage = 1;
            state.totalPages = 0;
            state.bookmarks = [];
            state.notes = [];
            elements.bookWrapper.classList.add('hidden');
            elements.readerControls.classList.add('hidden');
            elements.floatingNav.classList.add('hidden');
            elements.floatingNav.classList.remove('flex');
            elements.emptyState.classList.remove('hidden');
            elements.currentDocName.textContent = 'ไม่ได้เลือกหนังสือ';
            loadLibraryUI();
            showToast('ลบหนังสือสำเร็จ');
        } else {
            loadLibraryUI();
            showToast('ลบหนังสือสำเร็จ');
        }
    });

    return div;
}

// --- Demo Sample PDF Generator ---
export async function generateAndLoadSamplePdf() {
    const samplePdfBase64 = "JVBERi0xLjQKJSDi48PjCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9QYWdlcyAvQ291bnQgMiAvS2lkcyBbMyAwIFIgNCAwIFJdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDU5NSA4NDJdIC9SZXNvdXJjZXMgPDwvRm9udCA8PC9GMSA1IDAgUj4+Pj4gL0NvbnRlbnRzIDYgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDU5NSA4NDJdIC9SZXNvdXJjZXMgPDwvRm9udCA8PC9GMSA1IDAgUj4+Pj4gL0NvbnRlbnRzIDcgMCBSPj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2E+PgplbmRvYmoKNiAwIG9iago8PC9MZW5ndGggNTY+PnN0cmVhbQpCVAovRjEgMjQgVGYKIDEwMCA3MDAgVGQgCihFLUJvb2sgU3R1ZGlvIC0gUGFnZSAxKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjcgMCBvYmoKPDwvTGVuZ3RoIDU2Pj5zdHJlYW0KQlQKL0YxIDI0IFRmCiAxMDAgNzAwIFRkIAooRS1Cb29rIFN0dWRpbyAtIFBhZ2UgMikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwDYTY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTMwIDAwMDAwIG4gCjAwMDAwMDAyNDUgMDAwMDAgbiAKMDAwMDAwMDM2MCAwMDAwMCBuIAowMDAwMDAwNDMxIDAwMDAwIG4gCjAwMDAwMDA1MzggMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDggL1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNjQ1CiUlRU9G";

    const binaryString = atob(samplePdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const bookObj = {
        id: 'sample_book',
        name: 'หนังสือตัวอย่าง (Sample E-Book).pdf',
        size: '0.01 MB',
        date: new Date().toLocaleDateString('th-TH'),
        data: bytes.buffer
    };

    await saveBookToDB(bookObj);
    try {
        await openBook(bookObj);
    } catch (err) {
        console.error('Failed to open sample book:', err);
        showToast('เกิดข้อผิดพลาดในการเปิดหนังสือตัวอย่าง', 'error');
    }
    loadLibraryUI();
}
