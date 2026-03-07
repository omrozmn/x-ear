// Modal Widget - Use unique namespace to avoid conflicts
(function(global) {
    'use strict';
    
    // Check if XEarModalWidget already exists to prevent duplicate declarations
    if (global.XEarModalWidget) {
        console.log('XEarModalWidget already exists, skipping declaration');
        return;
    }
    
    // Set a flag to indicate we're defining the widget
    global._definingXEarModalWidget = true;
    
class XEarModalWidget {
    constructor(options = {}) {
        this.id = options.id || 'modal-' + Date.now();
        this.title = options.title || '';
        this.size = options.size || 'md'; // sm, md, lg, xl
        this.closable = options.closable !== false;
        this.backdrop = options.backdrop !== false;
        this.onClose = options.onClose || null;
        this.onSave = options.onSave || null;
        this.saveButtonText = options.saveButtonText || 'Kaydet';
        this.cancelButtonText = options.cancelButtonText || 'İptal';
        this.showFooter = options.showFooter !== false;
        this.customFooter = options.customFooter || null;
    }

    render(content = '') {
        const sizeClasses = {
            'sm': 'max-w-md',
            'md': 'max-w-lg',
            'lg': 'max-w-2xl',
            'xl': 'max-w-4xl'
        };

        return `
            <div id="${this.id}" class="modal-overlay hidden" ${this.backdrop ? 'onclick="this.closeOnBackdrop(event)"' : ''}>
                <div class="modal-container ${sizeClasses[this.size]}" onclick="event.stopPropagation()">
                    ${this.renderHeader()}
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${this.showFooter ? this.renderFooter() : ''}
                </div>
            </div>
        `;
    }

    renderHeader() {
        return `
            <div class="modal-header">
                <h3 class="text-lg font-semibold text-gray-900">${this.title}</h3>
                ${this.closable ? `
                    <button class="modal-close" onclick="${this.id}Widget.close()">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `;
    }

    renderFooter() {
        if (this.customFooter) {
            return `<div class="modal-footer">${this.customFooter}</div>`;
        }

        return `
            <div class="modal-footer">
                <button class="btn-secondary" onclick="${this.id}Widget.close()">
                    ${this.cancelButtonText}
                </button>
                ${this.onSave ? `
                    <button class="btn-primary" onclick="${this.id}Widget.save()">
                        ${this.saveButtonText}
                    </button>
                ` : ''}
            </div>
        `;
    }

    show() {
        const modal = document.getElementById(this.id);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('fade-in');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        const modal = document.getElementById(this.id);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('fade-in');
            document.body.style.overflow = '';
            
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    save() {
        if (this.onSave) {
            const result = this.onSave();
            // If onSave returns false, don't close the modal
            if (result !== false) {
                this.close();
            }
        }
    }

    closeOnBackdrop(event) {
        if (event.target === event.currentTarget && this.backdrop) {
            this.close();
        }
    }

    updateContent(content) {
        const modal = document.getElementById(this.id);
        if (modal) {
            const body = modal.querySelector('.modal-body');
            if (body) {
                body.innerHTML = content;
            }
        }
    }

    updateTitle(title) {
        this.title = title;
        const modal = document.getElementById(this.id);
        if (modal) {
            const titleElement = modal.querySelector('.modal-header h3');
            if (titleElement) {
                titleElement.textContent = title;
            }
        }
    }

    // Static method to create and show a simple alert modal
    static alert(title, message, options = {}) {
        const alertModal = new XEarModalWidget({
            id: 'alert-modal',
            title: title,
            size: options.size || 'sm',
            showFooter: true,
            customFooter: `
                <button class="btn-primary" onclick="alertModalWidget.close()">
                    ${options.buttonText || 'Tamam'}
                </button>
            `,
            ...options
        });

        const modalHtml = alertModal.render(`<p class="text-gray-700">${message}</p>`);
        
        // Remove existing alert modal if any
        const existing = document.getElementById('alert-modal');
        if (existing) {
            existing.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        window.alertModalWidget = alertModal;
        alertModal.show();
        
        return alertModal;
    }

    // Static method to create and show a confirmation modal
    static confirm(title, message, onConfirm, options = {}) {
        const confirmModal = new XEarModalWidget({
            id: 'confirm-modal',
            title: title,
            size: options.size || 'sm',
            showFooter: true,
            customFooter: `
                <button class="btn-secondary" onclick="confirmModalWidget.close()">
                    ${options.cancelText || 'İptal'}
                </button>
                <button class="btn-primary" onclick="confirmModalWidget.confirm()">
                    ${options.confirmText || 'Onayla'}
                </button>
            `,
            ...options
        });

        confirmModal.confirm = function() {
            if (onConfirm) {
                onConfirm();
            }
            this.close();
        };

        const modalHtml = confirmModal.render(`<p class="text-gray-700">${message}</p>`);
        
        // Remove existing confirm modal if any
        const existing = document.getElementById('confirm-modal');
        if (existing) {
            existing.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        window.confirmModalWidget = confirmModal;
        confirmModal.show();
        
        return confirmModal;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = XEarModalWidget;
}

// Make available globally with unique name only
global.XEarModalWidget = XEarModalWidget;

// Clear the definition flag
delete global._definingXEarModalWidget;

})(window); // Close IIFE and pass window object