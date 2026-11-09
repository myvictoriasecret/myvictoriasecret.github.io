// --- PDF Loading, Rendering & Navigation ---

import { state, elements, showToast } from './state.js';
import { saveBookToDB, getAnnotationsFromDB } from './db.js';
import { syncFromCloud } from './cloud.js';
import { updateBookmarksUI, updateNotesUI, renderStickyNotesOverlay } from './annotations.js';
import { loadLibraryUI } from './ui.js';

export async function loadPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const bookId = 'book_' + Date.now();
    const bookObj = {
        id: bookId,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        date: new Date().toLocaleDateString('th-TH'),
        data: arrayBuffer
    };

    await saveBookToDB(bookObj);
    showToast('อัปโหลดหนังสือเรียบร้อยแล้ว');
    try {
        await openBook(bookObj);
    } catch (err) {
        console.error('Failed to open uploaded book:', err);
        showToast('เกิดข้อผิดพลาดในการเปิดไฟล์ PDF', 'error');
    }
    loadLibraryUI();
}

export async function openBook(bookObj) {
    showToast('กำลังโหลดหนังสือ...');
    const loadingTask = pdfjsLib.getDocument({ data: bookObj.data });
    state.pdfDoc = await loadingTask.promise;
    state.currentBookId = bookObj.id;
    state.totalPages = state.pdfDoc.numPages;
    state.currentPage = 1;

    // Load annotations from local DB
    const savedAnnotations = await getAnnotationsFromDB(bookObj.id);
    state.bookmarks = savedAnnotations.bookmarks || [];
    state.notes = savedAnnotations.notes || [];

    // UI Updates
    elements.currentDocName.textContent = bookObj.name;
    elements.textPageCount.textContent = state.totalPages;
    elements.emptyState.classList.add('hidden');
    elements.bookWrapper.classList.remove('hidden');
    elements.readerControls.classList.remove('hidden');
    elements.floatingNav.classList.remove('hidden');
    elements.floatingNav.classList.add('flex');

    updateBookmarksUI();
    updateNotesUI();
    renderCurrentPages();

    // Fetch annotations from Cloud if logged in
    await syncFromCloud(() => {
        updateBookmarksUI();
        updateNotesUI();
        renderStickyNotesOverlay();
    });
}

// --- Render PDF Pages ---
export async function renderCurrentPages() {
    if (!state.pdfDoc) return;

    if (state.currentPage > state.totalPages) state.currentPage = state.totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    elements.inputPageNum.value = state.currentPage;

    const containerWidth = elements.readerContainer.clientWidth - 64;
    const isDouble = state.viewMode === 'double' && state.currentPage < state.totalPages;

    const firstPage = await state.pdfDoc.getPage(state.currentPage);
    const viewport = firstPage.getViewport({ scale: 1.0 });

    let targetWidth = isDouble ? viewport.width * 2 : viewport.width;
    let calculatedScale = Math.min((containerWidth / targetWidth), 1.4);
    calculatedScale = Math.max(calculatedScale, 0.6);
    state.scale = calculatedScale;

    if (state.viewMode === 'single') {
        elements.pageRightContainer.classList.add('hidden');
        elements.bookSpine.classList.add('hidden');
        elements.pageLeftContainer.classList.remove('hidden');
        elements.pageLeftContainer.className = "relative bg-white rounded-lg transition-all duration-300 book-shadow-single";

        await renderPageOnCanvas(state.currentPage, elements.canvasLeft);
        elements.mobilePageIndicator.textContent = `${state.currentPage} / ${state.totalPages}`;
    } else {
        elements.pageLeftContainer.classList.remove('hidden');
        elements.pageLeftContainer.className = "relative bg-white rounded-l-lg transition-all duration-300 book-shadow-left";

        await renderPageOnCanvas(state.currentPage, elements.canvasLeft);

        if (state.currentPage + 1 <= state.totalPages) {
            elements.pageRightContainer.classList.remove('hidden');
            elements.pageRightContainer.className = "relative bg-white rounded-r-lg transition-all duration-300 book-shadow-right";
            elements.bookSpine.classList.remove('hidden');

            await renderPageOnCanvas(state.currentPage + 1, elements.canvasRight);
            elements.mobilePageIndicator.textContent = `${state.currentPage}-${state.currentPage + 1} / ${state.totalPages}`;
        } else {
            elements.pageRightContainer.classList.add('hidden');
            elements.bookSpine.classList.add('hidden');
            elements.pageLeftContainer.className = "relative bg-white rounded-lg transition-all duration-300 book-shadow-single";
            elements.mobilePageIndicator.textContent = `${state.currentPage} / ${state.totalPages}`;
        }
    }

    elements.btnPrevPage.disabled = state.currentPage <= 1;
    elements.btnPrevMobile.disabled = state.currentPage <= 1;

    const isAtEnd = state.viewMode === 'single' ? state.currentPage >= state.totalPages : state.currentPage + 1 >= state.totalPages;
    elements.btnNextPage.disabled = isAtEnd;
    elements.btnNextMobile.disabled = isAtEnd;

    renderStickyNotesOverlay();
}

async function renderPageOnCanvas(pageNum, canvas) {
    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    await page.render(renderContext).promise;
}

// --- Navigation Actions ---
export function goToPreviousPage() {
    const step = state.viewMode === 'double' ? 2 : 1;
    if (state.currentPage - step >= 1) {
        state.currentPage -= step;
    } else {
        state.currentPage = 1;
    }
    renderCurrentPages();
}

export function goToNextPage() {
    const step = state.viewMode === 'double' ? 2 : 1;
    if (state.currentPage + step <= state.totalPages) {
        state.currentPage += step;
        renderCurrentPages();
    } else if (state.viewMode === 'double' && state.currentPage + 1 === state.totalPages) {
        state.currentPage = state.totalPages;
        renderCurrentPages();
    }
}

export function jumpToPage(pageNum) {
    state.currentPage = pageNum;
    renderCurrentPages();
}

export function setViewMode(mode) {
    state.viewMode = mode;
    if (mode === 'single') {
        elements.btnViewSingle.className = 'px-2.5 py-1 text-xs rounded-md font-medium bg-indigo-600 text-white shadow transition';
        elements.btnViewDouble.className = 'px-2.5 py-1 text-xs rounded-md font-medium text-slate-400 hover:text-white transition';
    } else {
        elements.btnViewDouble.className = 'px-2.5 py-1 text-xs rounded-md font-medium bg-indigo-600 text-white shadow transition';
        elements.btnViewSingle.className = 'px-2.5 py-1 text-xs rounded-md font-medium text-slate-400 hover:text-white transition';
    }
    renderCurrentPages();
}
