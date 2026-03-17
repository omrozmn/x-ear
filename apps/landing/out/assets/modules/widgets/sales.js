// Sales Widget
class SalesWidget {
    constructor(container) {
        this.container = container;
        this.sales = [];
    }

    // Initialize the widget
    async init() {
        this.loadSales();
        this.render();
        this.attachEventListeners();
    }

    // Load sales data
    loadSales() {
        // Get sales from DataManager
        if (window.DataManager && window.DataManager.getSales) {
            this.sales = window.DataManager.getSales();
        } else {
            // Fallback sample data
            this.sales = [
                {
                    id: 1,
                    patientId: 1,
                    patientName: 'Ahmet Yılmaz',
                    date: '2024-01-10',
                    amount: 1500,
                    paymentMethod: 'Nakit',
                    status: 'completed',
                    items: ['Cihaz', 'Kulaklık']
                },
                {
                    id: 2,
                    patientId: 2,
                    patientName: 'Ayşe Kaya',
                    date: '2024-01-12',
                    amount: 2200,
                    paymentMethod: 'Kredi Kartı',
                    status: 'pending',
                    items: ['Cihaz', 'Batery', 'Şarj Aleti']
                }
            ];
        }
    }

    // Render the sales widget
    render() {
        const totalSales = this.sales.reduce((sum, sale) => sum + sale.amount, 0);
        const completedSales = this.sales.filter(sale => sale.status === 'completed').length;

        this.container.innerHTML = `
            <div class="sales-widget">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Satışlar</h3>
                    <button id="new-sale-btn" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
                        <i class="fas fa-plus mr-2"></i>Yeni Satış
                    </button>
                </div>

                <div class="sales-summary grid grid-cols-2 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${this.sales.length}</div>
                        <div class="text-sm text-blue-800">Toplam Satış</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${completedSales}</div>
                        <div class="text-sm text-green-800">Tamamlanan</div>
                    </div>
                </div>

                <div class="sales-list space-y-3">
                    ${this.sales.map(sale => this.renderSale(sale)).join('')}
                </div>

                ${this.sales.length === 0 ? `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-shopping-cart text-4xl mb-4"></i>
                        <p>Henüz satış bulunmuyor</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Render a single sale
    renderSale(sale) {
        const statusClasses = {
            'completed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'cancelled': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'completed': 'Tamamlandı',
            'pending': 'Bekliyor',
            'cancelled': 'İptal Edildi'
        };

        return `
            <div class="sale-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-medium text-gray-900">${sale.patientName}</h4>
                        <p class="text-sm text-gray-600">${sale.items.join(', ')}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${statusClasses[sale.status] || 'bg-gray-100 text-gray-800'}">
                        ${statusText[sale.status] || 'Bilinmiyor'}
                    </span>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <div class="flex items-center">
                        <i class="fas fa-calendar mr-2"></i>
                        <span>${this.formatDate(sale.date)}</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-credit-card mr-2"></i>
                        <span>${sale.paymentMethod}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center">
                    <div class="text-lg font-semibold text-green-600">
                        ₺${sale.amount.toLocaleString('tr-TR')}
                    </div>
                    <div class="flex space-x-2">
                        <button class="view-sale-btn text-blue-600 hover:text-blue-800 text-sm" data-id="${sale.id}">
                            <i class="fas fa-eye mr-1"></i>Görüntüle
                        </button>
                        <button class="edit-sale-btn text-gray-600 hover:text-gray-800 text-sm" data-id="${sale.id}">
                            <i class="fas fa-edit mr-1"></i>Düzenle
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Attach event listeners
    attachEventListeners() {
        // New sale button
        const newBtn = this.container.querySelector('#new-sale-btn');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showNewSaleForm());
        }

        // View buttons
        this.container.querySelectorAll('.view-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.viewSale(id);
            });
        });

        // Edit buttons
        this.container.querySelectorAll('.edit-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editSale(id);
            });
        });
    }

    // Show new sale form
    showNewSaleForm() {
        // This would typically show a modal or form
        alert('Yeni satış oluşturma özelliği yakında eklenecek');
    }

    // View sale details
    viewSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (sale) {
            alert(`Satış Detayları:\nMüşteri: ${sale.patientName}\nTarih: ${sale.date}\nTutar: ₺${sale.amount}\nÖdeme: ${sale.paymentMethod}\nÜrünler: ${sale.items.join(', ')}`);
        }
    }

    // Edit sale
    editSale(id) {
        const sale = this.sales.find(s => s.id === id);
        if (sale) {
            alert(`Satış düzenleme: ${sale.patientName} - ₺${sale.amount}`);
        }
    }

    // Refresh sales
    refresh() {
        this.loadSales();
        this.render();
        this.attachEventListeners();
    }
}

// Export for module loading
