// Sidebar Navigation Widget
class SidebarWidget {
    constructor(activePage = '') {
        this.activePage = activePage;
        this.isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        
        // Initialize collapsed submenu state after render
        setTimeout(() => {
            this.initializeCollapsedSubmenuState();
        }, 100);
    }

    initializeCollapsedSubmenuState() {
        const sidebar = document.querySelector('.sidebar-nav');
        const sgkCollapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(7) .collapsed-submenu-icons'); // SGK submenu
        const faturaCollapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(5) .collapsed-submenu-icons'); // Fatura submenu
        const reportsCollapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(9) .collapsed-submenu-icons'); // Reports submenu
        
        if (sidebar?.classList.contains('collapsed')) {
            // Hide both collapsed submenu icons by default when sidebar is collapsed
            if (sgkCollapsedSubmenuIcons) {
                sgkCollapsedSubmenuIcons.style.display = 'none';
            }
            if (faturaCollapsedSubmenuIcons) {
                faturaCollapsedSubmenuIcons.style.display = 'none';
            }
            if (reportsCollapsedSubmenuIcons) {
                reportsCollapsedSubmenuIcons.style.display = 'none';
            }
        }
    }

    render() {
        return `
            <nav class="sidebar-nav ${this.isCollapsed ? 'collapsed' : ''}">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <h1 class="text-xl font-bold text-gray-900 sidebar-title">X-Ear CRM</h1>
                        </div>
                        <button onclick="window.toggleSidebar()" class="toggle-btn p-2 rounded hover:bg-gray-100 flex-shrink-0" aria-label="Toggle sidebar">
                            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                            </svg>
                        </button>
                    </div>
                    
                    <ul class="space-y-2">
                        ${this.renderNavItem('dashboard.html', 'Dashboard', this.getDashboardIcon(), 'dashboard')}
                        ${this.renderNavItem('patients.html', 'Hastalar', this.getPatientsIcon(), 'patients')}
                        ${this.renderNavItem('appointments.html', 'Randevular', this.getAppointmentsIcon(), 'appointments')}
                        ${this.renderNavItem('inventory.html', 'Envanter', this.getInventoryIcon(), 'inventory')}
                        ${this.renderNavItem('suppliers.html', 'Tedarikçiler', this.getSuppliersIcon(), 'suppliers')}
                        ${this.renderFaturaSubmenu()}
                        ${this.renderNavItem('cashflow.html', 'Kasa', this.getSalesIcon(), 'cashflow')}
                        ${this.renderNavItem('campaigns.html', 'Kampanyalar', this.getCampaignsIcon(), 'campaigns')}
                        ${this.renderSGKSubmenu()}
                        ${this.renderReportsSubmenu()}
                        ${this.renderNavItem('automation.html', 'Otomasyon', this.getAutomationIcon(), 'automation')}
                        ${this.renderNavItem('settings.html', 'Ayarlar', this.getSettingsIcon(), 'settings')}
                    </ul>
                </div>
            </nav>
        `;
    }

    renderSGKSubmenu() {
        const isActive = this.activePage === 'sgk' || this.activePage === 'sgk-download' || this.activePage === 'uts-kayitlari';
        const isExpanded = isActive || localStorage.getItem('sgkSubmenuExpanded') === 'true';
        const activeClass = isActive ? ' active' : '';
        
        return `
            <li class="nav-item-with-submenu">
                <div class="nav-item${activeClass} submenu-header" onclick="window.handleSGKSubmenuClick(event)">
                    ${this.getSGKIcon()}
                    <span class="nav-text">SGK Raporları</span>
                    <svg class="submenu-arrow ${isExpanded ? 'expanded' : ''}" fill="currentColor" viewBox="0 0 20 20" onclick="event.stopPropagation(); window.toggleSGKSubmenu()">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <ul class="submenu ${isExpanded ? 'expanded' : ''}">
                    <li><a href="sgk.html" class="submenu-item${this.activePage === 'sgk' ? ' active' : ''}" title="Belge Yükle">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                        </svg>
                        <span class="nav-text">Belge Yükle</span>
                    </a></li>
                    <li><a href="sgk-download.html" class="submenu-item${this.activePage === 'sgk-download' ? ' active' : ''}" title="Belge İndir">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                        <span class="nav-text">Belge İndir</span>
                    </a></li>
                    <li><a href="uts-kayitlari.html" class="submenu-item${this.activePage === 'uts-kayitlari' ? ' active' : ''}" title="ÜTS Kayıtları">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                        <span class="nav-text">ÜTS Kayıtları</span>
                    </a></li>
                </ul>
                <!-- Collapsed submenu icons - only show when sidebar is collapsed -->
                <div class="collapsed-submenu-icons" style="display: none;">
                    <a href="sgk.html" class="collapsed-submenu-icon${this.activePage === 'sgk' ? ' active' : ''}" title="Belge Yükle">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                    <a href="sgk-download.html" class="collapsed-submenu-icon${this.activePage === 'sgk-download' ? ' active' : ''}" title="Belge İndir">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                    <a href="uts-kayitlari.html" class="collapsed-submenu-icon${this.activePage === 'uts-kayitlari' ? ' active' : ''}" title="ÜTS Kayıtları">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                    </a>
                </div>
            </li>
        `;
    }

    renderFaturaSubmenu() {
        const isActive = this.activePage === 'invoices' || this.activePage === 'new-invoice';
        const isExpanded = isActive || localStorage.getItem('faturaSubmenuExpanded') === 'true';
        const activeClass = isActive ? ' active' : '';
        
        return `
            <li class="nav-item-with-submenu">
                <div class="nav-item${activeClass} submenu-header" onclick="window.handleFaturaSubmenuClick(event)">
                    ${this.getFaturaIcon()}
                    <span class="nav-text">Faturalar</span>
                    <svg class="submenu-arrow ${isExpanded ? 'expanded' : ''}" fill="currentColor" viewBox="0 0 20 20" onclick="event.stopPropagation(); window.toggleFaturaSubmenu()">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <ul class="submenu ${isExpanded ? 'expanded' : ''}">
                    <li><a href="invoices.html" class="submenu-item${this.activePage === 'invoices' ? ' active' : ''}" title="Fatura Listesi">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                        <span class="nav-text">Fatura Listesi</span>
                    </a></li>
                    <li><a href="new-invoice.html" class="submenu-item${this.activePage === 'new-invoice' ? ' active' : ''}" title="Yeni Fatura">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                        </svg>
                        <span class="nav-text">Yeni Fatura</span>
                    </a></li>
                </ul>
                <!-- Collapsed submenu icons - only show when sidebar is collapsed -->
                <div class="collapsed-submenu-icons" style="display: none;">
                    <a href="invoices.html" class="collapsed-submenu-icon${this.activePage === 'invoices' ? ' active' : ''}" title="Fatura Listesi">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                    </a>
                    <a href="new-invoice.html" class="collapsed-submenu-icon${this.activePage === 'new-invoice' ? ' active' : ''}" title="Yeni Fatura">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                </div>
            </li>
        `;
    }

    renderReportsSubmenu() {
        const isActive = this.activePage === 'reports' || this.activePage === 'activity-logs';
        const isExpanded = isActive || localStorage.getItem('reportsSubmenuExpanded') === 'true';
        const activeClass = isActive ? ' active' : '';
        
        return `
            <li class="nav-item-with-submenu">
                <div class="nav-item${activeClass} submenu-header" onclick="window.handleReportsSubmenuClick(event)">
                    ${this.getReportsIcon()}
                    <span class="nav-text">Raporlar</span>
                    <svg class="submenu-arrow ${isExpanded ? 'expanded' : ''}" fill="currentColor" viewBox="0 0 20 20" onclick="event.stopPropagation(); window.toggleReportsSubmenu()">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <ul class="submenu ${isExpanded ? 'expanded' : ''}">
                    <li><a href="reports.html" class="submenu-item${this.activePage === 'reports' ? ' active' : ''}" title="Genel Raporlar">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                        <span class="nav-text">Genel Raporlar</span>
                    </a></li>
                    <li><a href="activity-logs.html" class="submenu-item${this.activePage === 'activity-logs' ? ' active' : ''}" title="Aktivite Logları">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
                        </svg>
                        <span class="nav-text">Aktivite Logları</span>
                    </a></li>
                </ul>
                <!-- Collapsed submenu icons - only show when sidebar is collapsed -->
                <div class="collapsed-submenu-icons" style="display: none;">
                    <a href="reports.html" class="collapsed-submenu-icon${this.activePage === 'reports' ? ' active' : ''}" title="Genel Raporlar">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                        </svg>
                    </a>
                    <a href="activity-logs.html" class="collapsed-submenu-icon${this.activePage === 'activity-logs' ? ' active' : ''}" title="Aktivite Logları">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
                        </svg>
                    </a>
                </div>
            </li>
        `;
    }

    renderNavItem(href, text, icon, pageKey) {
        const isActive = this.activePage === pageKey;
        const activeClass = isActive ? ' active' : '';
        return `
            <li><a href="${href}" class="nav-item${activeClass}" title="${text}">
                ${icon}
                <span class="nav-text">${text}</span>
            </a></li>
        `;
    }

    getDashboardIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
        `;
    }

    getPatientsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
        `;
    }

    getAppointmentsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getFaturaIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getInventoryIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getSuppliersIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
        `;
    }

    getSalesIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
            </svg>
        `;
    }

    getCampaignsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
        `;
    }

    getReportsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
            </svg>
        `;
    }

    getActivityLogsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getSGKIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getAutomationIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
            </svg>
        `;
    }

    getSettingsIcon() {
        return `
            <svg fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
            </svg>
        `;
    }
}

// Global sidebar toggle function
window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar-nav');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar) {
        // Toggle collapsed class on the sidebar
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        // Persist state to localStorage
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        // If an initial collapsed class was added to the document to avoid FOUC,
        // remove it once the user explicitly toggles the sidebar so subsequent
        // layout updates use the normal runtime classes and inline styles.
        if (document.documentElement.classList.contains('sidebar-initial-collapsed')) {
            document.documentElement.classList.remove('sidebar-initial-collapsed');
        }

        // Update main content classes and inline margin to preserve previous behavior
        if (mainContent) {
            if (isCollapsed) {
                mainContent.classList.add('sidebar-collapsed');
                mainContent.classList.remove('sidebar-expanded');
                mainContent.style.marginLeft = '80px';
            } else {
                mainContent.classList.remove('sidebar-collapsed');
                mainContent.classList.add('sidebar-expanded');
                mainContent.style.marginLeft = '240px';
            }
        }
        
        // Handle patient details page sidebar coordination
        if (typeof handleMainSidebarToggle === 'function') {
            handleMainSidebarToggle();
        }
    }
};

// Global SGK submenu toggle function
window.toggleSGKSubmenu = function() {
    const sidebar = document.querySelector('.sidebar-nav');
    const submenu = document.querySelector('.nav-item-with-submenu:nth-child(7) .submenu'); // 7th nav item (SGK)
    const arrow = document.querySelector('.nav-item-with-submenu:nth-child(7) .submenu-arrow');
    const collapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(7) .collapsed-submenu-icons');
    
    // Check if sidebar is collapsed
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // When collapsed, show/hide the collapsed submenu icons
        if (collapsedSubmenuIcons) {
            const isVisible = collapsedSubmenuIcons.style.display === 'flex';
            collapsedSubmenuIcons.style.display = isVisible ? 'none' : 'flex';
            localStorage.setItem('sgkSubmenuExpandedCollapsed', !isVisible ? 'true' : 'false');
        }
    } else {
        // Normal submenu toggle behavior when not collapsed
        if (submenu && arrow) {
            const isExpanded = submenu.classList.contains('expanded');
            
            if (isExpanded) {
                submenu.classList.remove('expanded');
                arrow.classList.remove('expanded');
                localStorage.setItem('sgkSubmenuExpanded', 'false');
            } else {
                submenu.classList.add('expanded');
                arrow.classList.add('expanded');
                localStorage.setItem('sgkSubmenuExpanded', 'true');
            }
        }
    }
};

// Global Fatura submenu toggle function
window.toggleFaturaSubmenu = function() {
    const sidebar = document.querySelector('.sidebar-nav');
    const submenu = document.querySelector('.nav-item-with-submenu:nth-child(5) .submenu'); // 5th nav item (Faturalar)
    const arrow = document.querySelector('.nav-item-with-submenu:nth-child(5) .submenu-arrow');
    const collapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(5) .collapsed-submenu-icons');
    
    // Check if sidebar is collapsed
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // When collapsed, show/hide the collapsed submenu icons
        if (collapsedSubmenuIcons) {
            const isVisible = collapsedSubmenuIcons.style.display === 'flex';
            collapsedSubmenuIcons.style.display = isVisible ? 'none' : 'flex';
            localStorage.setItem('faturaSubmenuExpandedCollapsed', !isVisible ? 'true' : 'false');
        }
    } else {
        // Normal submenu toggle behavior when not collapsed
        if (submenu && arrow) {
            const isExpanded = submenu.classList.contains('expanded');
            
            if (isExpanded) {
                submenu.classList.remove('expanded');
                arrow.classList.remove('expanded');
                localStorage.setItem('faturaSubmenuExpanded', 'false');
            } else {
                submenu.classList.add('expanded');
                arrow.classList.add('expanded');
                localStorage.setItem('faturaSubmenuExpanded', 'true');
            }
        }
    }
};

// New handler functions for main menu clicks with subitems
window.handleFaturaSubmenuClick = function(event) {
    // If clicking on the arrow, let it handle toggle only
    if (event.target.closest('.submenu-arrow')) {
        return;
    }
    
    // Check if sidebar is collapsed
    const sidebar = document.querySelector('.sidebar-nav');
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // In collapsed mode, just navigate to first subitem
        window.location.href = 'invoices.html';
    } else {
        // In expanded mode, navigate to first subitem (Fatura Listesi)
        window.location.href = 'invoices.html';
    }
};

window.handleSGKSubmenuClick = function(event) {
    // If clicking on the arrow, let it handle toggle only
    if (event.target.closest('.submenu-arrow')) {
        return;
    }
    
    // Check if sidebar is collapsed
    const sidebar = document.querySelector('.sidebar-nav');
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // In collapsed mode, just navigate to first subitem
        window.location.href = 'sgk.html';
    } else {
        // In expanded mode, navigate to first subitem (Belge Yükle)
        window.location.href = 'sgk.html';
    }
};

// Global Reports submenu toggle function
window.toggleReportsSubmenu = function() {
    const sidebar = document.querySelector('.sidebar-nav');
    const submenu = document.querySelector('.nav-item-with-submenu:nth-child(9) .submenu'); // 9th nav item (Raporlar)
    const arrow = document.querySelector('.nav-item-with-submenu:nth-child(9) .submenu-arrow');
    const collapsedSubmenuIcons = document.querySelector('.nav-item-with-submenu:nth-child(9) .collapsed-submenu-icons');
    
    // Check if sidebar is collapsed
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // When collapsed, show/hide the collapsed submenu icons
        if (collapsedSubmenuIcons) {
            const isVisible = collapsedSubmenuIcons.style.display === 'flex';
            collapsedSubmenuIcons.style.display = isVisible ? 'none' : 'flex';
            localStorage.setItem('reportsSubmenuExpandedCollapsed', !isVisible ? 'true' : 'false');
        }
    } else {
        // Normal submenu toggle behavior when not collapsed
        if (submenu && arrow) {
            const isExpanded = submenu.classList.contains('expanded');
            
            if (isExpanded) {
                submenu.classList.remove('expanded');
                arrow.classList.remove('expanded');
                localStorage.setItem('reportsSubmenuExpanded', 'false');
            } else {
                submenu.classList.add('expanded');
                arrow.classList.add('expanded');
                localStorage.setItem('reportsSubmenuExpanded', 'true');
            }
        }
    }
};

window.handleReportsSubmenuClick = function(event) {
    // If clicking on the arrow, let it handle toggle only
    if (event.target.closest('.submenu-arrow')) {
        return;
    }
    
    // Check if sidebar is collapsed
    const sidebar = document.querySelector('.sidebar-nav');
    const isCollapsed = sidebar?.classList.contains('collapsed');
    
    if (isCollapsed) {
        // In collapsed mode, just navigate to first subitem
        window.location.href = 'reports.html';
    } else {
        // In expanded mode, navigate to first subitem (Genel Raporlar)
        window.location.href = 'reports.html';
    }
};

// Add CSS for submenu
const submenuCSS = `
<style>
.nav-item-with-submenu .submenu-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.submenu-arrow {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
    flex-shrink: 0;
    margin-left: auto;
}

.submenu-arrow.expanded {
    transform: rotate(90deg);
}

.submenu {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    margin-left: 1rem;
    margin-top: 0.25rem;
}

.submenu.expanded {
    max-height: 200px;
}

.submenu-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: #6b7280;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
    font-size: 0.875rem;
}

.submenu-item:hover {
    background-color: #f3f4f6;
    color: #374151;
}

.submenu-item.active {
    background-color: #dbeafe;
    color: #1d4ed8;
}

.submenu-item svg {
    width: 16px;
    height: 16px;
    margin-right: 0.75rem;
    flex-shrink: 0;
}

/* Collapsed sidebar submenu styling */
.collapsed-submenu-icons {
    display: none;
    flex-direction: column;
    position: absolute;
    left: 80px;
    top: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    padding: 0.5rem;
    gap: 0.25rem;
    z-index: 1000;
    min-width: 48px;
}

.collapsed-submenu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: #6b7280;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
    text-decoration: none;
}

.collapsed-submenu-icon:hover {
    background-color: #f3f4f6;
    color: #374151;
}

.collapsed-submenu-icon.active {
    background-color: #dbeafe;
    color: #1d4ed8;
}

.collapsed-submenu-icon svg {
    width: 20px;
    height: 20px;
}

.sidebar-nav.collapsed .submenu {
    display: none;
}

.sidebar-nav.collapsed .submenu-arrow {
    display: none;
}

.sidebar-nav.collapsed .nav-item-with-submenu {
    position: relative;
}

/* Show collapsed submenu icons when sidebar is collapsed and expanded */
.sidebar-nav.collapsed .collapsed-submenu-icons {
    display: none !important;
}

/* Hide collapsed icons when sidebar is not collapsed */
.sidebar-nav:not(.collapsed) .collapsed-submenu-icons {
    display: none !important;
}
</style>
`;

// Inject CSS when DOM is ready
if (typeof document !== 'undefined') {
    // Check if DOM is already ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectSubmenuCSS);
    } else {
        injectSubmenuCSS();
    }
}

function injectSubmenuCSS() {
    if (!document.querySelector('#submenu-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'submenu-styles';
        styleElement.innerHTML = submenuCSS;
        document.head.appendChild(styleElement);
    }
}

// Make the widget available for module import
// Export for use in other files
window.SidebarWidget = SidebarWidget;

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('sidebar-container');
            if (container && !container.hasAttribute('data-sidebar-initialized')) {
                container.setAttribute('data-sidebar-initialized', 'true');
                new SidebarWidget();
            }
        });
    } else {
        const container = document.getElementById('sidebar-container');
        if (container && !container.hasAttribute('data-sidebar-initialized')) {
            container.setAttribute('data-sidebar-initialized', 'true');
            new SidebarWidget();
        }
    }
}