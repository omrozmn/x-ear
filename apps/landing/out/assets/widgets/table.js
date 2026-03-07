// Table Widget
class TableWidget {
    constructor(options = {}) {
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.searchable = options.searchable || false;
        this.filterable = options.filterable || false;
        this.paginated = options.paginated || false;
        this.itemsPerPage = options.itemsPerPage || 10;
        this.currentPage = 1;
        this.filteredData = [...this.data];
        this.onRowClick = options.onRowClick || null;
        this.actions = options.actions || [];
    }

    render() {
        return `
            <div class="table-widget">
                ${this.searchable ? this.renderSearch() : ''}
                ${this.filterable ? this.renderFilters() : ''}
                <div class="overflow-x-auto">
                    <table class="table">
                        ${this.renderHeader()}
                        ${this.renderBody()}
                    </table>
                </div>
                ${this.paginated ? this.renderPagination() : ''}
            </div>
        `;
    }

    renderSearch() {
        return `
            <div class="mb-4">
                <div class="relative">
                    <input type="text" placeholder="Ara..." class="form-input w-full" id="tableSearch">
                    <svg class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
        `;
    }

    renderFilters() {
        return `
            <div class="mb-4 flex space-x-4">
                <!-- Filters will be added based on column configuration -->
            </div>
        `;
    }

    renderHeader() {
        return `
            <thead>
                <tr>
                    ${this.columns.map(col => `
                        <th class="${col.className || ''}">
                            ${col.label}
                            ${col.sortable ? this.renderSortIcon(col.key) : ''}
                        </th>
                    `).join('')}
                    ${this.actions.length > 0 ? '<th>İşlemler</th>' : ''}
                </tr>
            </thead>
        `;
    }

    renderBody() {
        const displayData = this.paginated ? this.getPaginatedData() : this.filteredData;
        
        if (displayData.length === 0) {
            return `
                <tbody>
                    <tr>
                        <td colspan="${this.columns.length + (this.actions.length > 0 ? 1 : 0)}" class="text-center py-8 text-gray-500">
                            Veri bulunamadı
                        </td>
                    </tr>
                </tbody>
            `;
        }

        return `
            <tbody>
                ${displayData.map(row => this.renderRow(row)).join('')}
            </tbody>
        `;
    }

    renderRow(row) {
        const clickHandler = this.onRowClick ? `onclick="${this.onRowClick.name}('${row.id}')"` : '';
        const clickClass = this.onRowClick ? 'cursor-pointer hover:bg-gray-50' : '';
        
        return `
            <tr class="${clickClass}" ${clickHandler}>
                ${this.columns.map(col => `
                    <td class="${col.className || ''}">
                        ${this.renderCell(row, col)}
                    </td>
                `).join('')}
                ${this.actions.length > 0 ? this.renderActions(row) : ''}
            </tr>
        `;
    }

    renderCell(row, column) {
        const value = this.getNestedValue(row, column.key);
        
        if (column.render) {
            return column.render(value, row);
        }
        
        if (column.type === 'status') {
            return this.renderStatusBadge(value);
        }
        
        if (column.type === 'date') {
            return this.formatDate(value);
        }
        
        if (column.type === 'currency') {
            return this.formatCurrency(value);
        }
        
        return value || '-';
    }

    renderActions(row) {
        return `
            <td>
                <div class="flex space-x-2">
                    ${this.actions.map(action => `
                        <button class="${action.className || 'btn-sm'}" onclick="${action.handler}('${row.id}')" title="${action.title || ''}">
                            ${action.icon || action.label}
                        </button>
                    `).join('')}
                </div>
            </td>
        `;
    }

    renderStatusBadge(status) {
        const statusClasses = {
            'active': 'status-active',
            'pending': 'status-pending',
            'inactive': 'status-inactive',
            'completed': 'status-active',
            'cancelled': 'status-inactive'
        };
        
        const statusTexts = {
            'active': 'Aktif',
            'pending': 'Beklemede',
            'inactive': 'Pasif',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal'
        };
        
        const className = statusClasses[status] || 'status-pending';
        const text = statusTexts[status] || status;
        
        return `<span class="status-badge ${className}">${text}</span>`;
    }

    renderSortIcon(key) {
        return `
            <svg class="w-4 h-4 inline ml-1 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 12l5-5 5 5H5z"/>
            </svg>
        `;
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredData.length);
        
        return `
            <div class="flex items-center justify-between mt-4">
                <div class="text-sm text-gray-700">
                    ${startItem}-${endItem} arası gösteriliyor, toplam ${this.filteredData.length}
                </div>
                <div class="flex space-x-2">
                    ${this.currentPage > 1 ? `
                        <button class="btn-secondary" onclick="this.previousPage()">
                            Önceki
                        </button>
                    ` : ''}
                    ${this.currentPage < totalPages ? `
                        <button class="btn-secondary" onclick="this.nextPage()">
                            Sonraki
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getPaginatedData() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredData.slice(start, end);
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
    }

    formatCurrency(amount) {
        if (!amount) return '₺0';
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }

    // Public methods for interaction
    updateData(newData) {
        this.data = newData;
        this.filteredData = [...newData];
        this.currentPage = 1;
    }

    filter(filterFn) {
        this.filteredData = this.data.filter(filterFn);
        this.currentPage = 1;
    }

    search(query) {
        if (!query) {
            this.filteredData = [...this.data];
            return;
        }
        
        this.filteredData = this.data.filter(row => {
            return this.columns.some(col => {
                const value = this.getNestedValue(row, col.key);
                return value && value.toString().toLowerCase().includes(query.toLowerCase());
            });
        });
        this.currentPage = 1;
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableWidget;
} else {
    window.TableWidget = TableWidget;
}