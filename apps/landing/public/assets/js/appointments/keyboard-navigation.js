// Keyboard Navigation Module
class KeyboardNavigation {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    handleKeyDown(e) {
        // Ctrl/Cmd + F for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-appointments');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals/search
        if (e.key === 'Escape') {
            if (window.appointmentModal) {
                window.appointmentModal.closeModal();
            }
            if (window.searchFilter) {
                window.searchFilter.hideSearchResults();
            }
        }
        
        // Arrow keys for navigation
        if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (window.calendarManager.currentView === 'month') {
                window.calendarManager.previousMonth();
            } else if (window.calendarManager.currentView === 'week') {
                window.calendarManager.previousWeek();
            } else if (window.calendarManager.currentView === 'day') {
                window.calendarManager.previousDay();
            }
        }
        
        if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (window.calendarManager.currentView === 'month') {
                window.calendarManager.nextMonth();
            } else if (window.calendarManager.currentView === 'week') {
                window.calendarManager.nextWeek();
            } else if (window.calendarManager.currentView === 'day') {
                window.calendarManager.nextDay();
            }
        }
        
        // T for today
        if (e.key === 't' || e.key === 'T') {
            if (!e.target.matches('input, textarea')) {
                e.preventDefault();
                const todayBtn = document.getElementById('today-btn');
                if (todayBtn) {
                    todayBtn.click();
                }
            }
        }
        
        // Number keys for view switching
        if (e.key >= '1' && e.key <= '4' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            const views = ['month', 'week', 'day', 'list'];
            const viewIndex = parseInt(e.key) - 1;
            if (views[viewIndex] && window.calendarManager) {
                window.calendarManager.switchView(views[viewIndex]);
            }
        }

        // N for new appointment
        if (e.key === 'n' || e.key === 'N') {
            if (!e.target.matches('input, textarea') && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (window.appointmentModal) {
                    window.appointmentModal.openModal();
                }
            }
        }

        // Enter to submit forms
        if (e.key === 'Enter' && e.target.matches('input[type="text"], input[type="date"], input[type="time"], select')) {
            const form = e.target.closest('form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !e.shiftKey) {
                    e.preventDefault();
                    submitBtn.click();
                }
            }
        }
    }
}

// Export for global use
window.KeyboardNavigation = KeyboardNavigation;