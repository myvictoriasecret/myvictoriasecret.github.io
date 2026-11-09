// --- Application Bootstrap & Event Wiring ---

import { state, elements, initElements, showToast } from './state.js';
import { initDB } from './db.js';
import { loadLibraryUI, generateAndLoadSamplePdf } from './ui.js';
import { loadPdfFile, goToPreviousPage, goToNextPage, jumpToPage, setViewMode } from './reader.js';
import { createStickyNote, addBookmark, setupAnnotationDragListeners } from './annotations.js';
import { renderCurrentPages } from './reader.js';
import { handleLogin, handleRegister, handleLogout, initAuthState } from './auth.js';

// --- Event Listeners Setup ---
function setupEventListeners(elements) {
    // Auth Modal Controls
    elements.btnAuthModal.addEventListener('click', () => {
        elements.authModal.classList.remove('hidden');
    });
    elements.btnCloseAuthModal.addEventListener('click', () => {
        elements.authModal.classList.add('hidden');
    });

    // Auth Actions
    elements.btnDoLogin.addEventListener('click', handleLogin);
    elements.btnDoRegister.addEventListener('click', handleRegister);
    elements.btnDoLogout.addEventListener('click', handleLogout);

    // Sidebar Toggle
    elements.toggleSidebarBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('-translate-x-full');
    });

    // Sidebar Tabs
    const tabs = [
        { btn: elements.tabBtnLibrary, panel: elements.panelLibrary },
        { btn: elements.tabBtnBookmarks, panel: elements.panelBookmarks },
        { btn: elements.tabBtnNotes, panel: elements.panelNotes }
    ];

    tabs.forEach(({ btn, panel }) => {
        btn.addEventListener('click', () => {
            tabs.forEach(t => {
                t.btn.className = 'flex-1 py-3 hover:text-white flex items-center justify-center space-x-1';
                t.panel.classList.add('hidden');
            });
            btn.className = 'flex-1 py-3 text-indigo-400 border-b-2 border-indigo-500 font-semibold flex items-center justify-center space-x-1 bg-slate-800';
            panel.classList.remove('hidden');
        });
    });

    // Navigation Events
    elements.btnPrevPage.addEventListener('click', goToPreviousPage);
    elements.btnNextPage.addEventListener('click', goToNextPage);
    elements.btnPrevMobile.addEventListener('click', goToPreviousPage);
    elements.btnNextMobile.addEventListener('click', goToNextPage);

    elements.inputPageNum.addEventListener('change', (e) => {
        let page = parseInt(e.target.value);
        if (isNaN(page)) page = 1;
        page = Math.max(1, Math.min(page, state.totalPages));
        jumpToPage(page);
    });

    // View Mode Toggles
    elements.btnViewSingle.addEventListener('click', () => setViewMode('single'));
    elements.btnViewDouble.addEventListener('click', () => setViewMode('double'));

    // Sticky Note & Bookmark Actions
    elements.btnAddNote.addEventListener('click', createStickyNote);
    elements.btnAddBookmark.addEventListener('click', addBookmark);

    // PDF Upload Handler
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            loadPdfFile(file);
        } else if (file) {
            showToast('กรุณาเลือกไฟล์ PDF เท่านั้น', 'error');
        }
    };

    elements.pdfUploadInput.addEventListener('change', handleFileUpload);
    elements.pdfUploadInputEmpty.addEventListener('change', handleFileUpload);

    // Sample PDF button
    elements.btnLoadSample.addEventListener('click', generateAndLoadSamplePdf);

    // Dragging events for Sticky Notes
    setupAnnotationDragListeners();
}

// Initialize App on DOM Load
window.addEventListener('DOMContentLoaded', async () => {
    initElements({
        readerContainer: document.getElementById('reader-container'),
        currentDocName: document.getElementById('current-doc-name'),
        inputPageNum: document.getElementById('input-page-num'),
        textPageCount: document.getElementById('text-page-count'),
        btnPrevPage: document.getElementById('btn-prev-page'),
        btnNextPage: document.getElementById('btn-next-page'),
        btnPrevMobile: document.getElementById('btn-prev-mobile'),
        btnNextMobile: document.getElementById('btn-next-mobile'),
        mobilePageIndicator: document.getElementById('mobile-page-indicator'),
        floatingNav: document.getElementById('floating-nav'),
        btnViewSingle: document.getElementById('btn-view-single'),
        btnViewDouble: document.getElementById('btn-view-double'),
        btnAddNote: document.getElementById('btn-add-note'),
        btnAddBookmark: document.getElementById('btn-add-bookmark'),
        pdfUploadInput: document.getElementById('pdf-upload-input'),
        pdfUploadInputEmpty: document.getElementById('pdf-upload-input-empty'),
        btnLoadSample: document.getElementById('btn-load-sample'),
        sidebar: document.getElementById('sidebar'),
        toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
        tabBtnLibrary: document.getElementById('tab-btn-library'),
        tabBtnBookmarks: document.getElementById('tab-btn-bookmarks'),
        tabBtnNotes: document.getElementById('tab-btn-notes'),
        panelLibrary: document.getElementById('panel-library'),
        panelBookmarks: document.getElementById('panel-bookmarks'),
        panelNotes: document.getElementById('panel-notes'),
        libraryList: document.getElementById('library-list'),
        libraryCount: document.getElementById('library-count'),
        bookmarksList: document.getElementById('bookmarks-list'),
        notesList: document.getElementById('notes-list'),
        emptyState: document.getElementById('empty-state'),
        bookWrapper: document.getElementById('book-wrapper'),
        readerControls: document.getElementById('reader-controls'),
        pageLeftContainer: document.getElementById('page-container-left'),
        pageRightContainer: document.getElementById('page-container-right'),
        canvasLeft: document.getElementById('canvas-left'),
        canvasRight: document.getElementById('canvas-right'),
        bookSpine: document.getElementById('book-spine'),
        notesOverlayLeft: document.getElementById('notes-overlay-left'),
        notesOverlayRight: document.getElementById('notes-overlay-right'),
        cloudStatusBadge: document.getElementById('cloud-status-badge'),
        btnAuthModal: document.getElementById('btn-auth-modal'),
        authModal: document.getElementById('auth-modal'),
        btnCloseAuthModal: document.getElementById('btn-close-auth-modal'),
        userDisplayName: document.getElementById('user-display-name'),
        authEmail: document.getElementById('auth-email'),
        authPassword: document.getElementById('auth-password'),
        btnDoLogin: document.getElementById('btn-do-login'),
        btnDoRegister: document.getElementById('btn-do-register'),
        btnDoLogout: document.getElementById('btn-do-logout'),
        loggedOutView: document.getElementById('logged-out-view'),
        loggedInView: document.getElementById('logged-in-view'),
        loggedUserEmail: document.getElementById('logged-user-email'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message'),
        toastIcon: document.getElementById('toast-icon')
    });

    await initDB();
    setupEventListeners(elements);
    loadLibraryUI();

    window.addEventListener('resize', () => {
        if (state.pdfDoc) renderCurrentPages();
    });
});


