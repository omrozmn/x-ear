// Enhanced Header Widget with Notifications
class HeaderWidget {
    constructor(title = '', showUserInfo = true, showNotifications = true) {
        this.title = title;
        this.showUserInfo = showUserInfo;
        this.showNotifications = showNotifications;
        this.notifications = [];
        this.unreadCount = 0;

        // Initialize notifications
        this.loadNotifications();
    }

    render() {
        return `
            <header class="bg-white border-b border-gray-200 px-6 py-4 relative z-40">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4 flex-1">
                        <button class="lg:hidden sidebar-toggle p-2 rounded-lg hover:bg-gray-100" data-menu-toggle>
                            <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-900 w-full text-left">${this.title}</h1>
                    </div>

                    <div class="flex items-center space-x-4">
                        ${this.showNotifications ? this.renderNotifications() : ''}
                        ${this.showUserInfo ? this.renderUserInfo() : ''}
                    </div>
                </div>
            </header>
        `;
    }

    renderNotifications() {
        const hasUnread = this.unreadCount > 0;
        return `
            <div class="relative">
                <button id="notifications-btn" class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM15 7v5h5l-5-5zM4 12h9m-9 4h6"/>
                    </svg>
                    ${hasUnread ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>` : ''}
                </button>

                <!-- Notifications Dropdown -->
                <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div class="p-4 border-b border-gray-200">
                        <h3 class="text-lg font-semibold text-gray-900">Bildirimler</h3>
                        <p class="text-sm text-gray-600">Son aktiviteler ve güncellemeler</p>
                    </div>

                    <div class="max-h-96 overflow-y-auto">
                        ${this.notifications.length > 0 ? this.renderNotificationItems() : this.renderEmptyNotifications()}
                    </div>

                    <div class="p-4 border-t border-gray-200">
                        <button class="w-full text-center text-sm text-primary hover:text-blue-700 font-medium">
                            Tüm Bildirimleri Gör
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderNotificationItems() {
        return this.notifications.slice(0, 10).map(notification => `
            <div class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}" data-notification-id="${notification.id}">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                        <p class="text-sm text-gray-600">${notification.message}</p>
                        <p class="text-xs text-gray-500 mt-1">${this.formatTime(notification.createdAt)}</p>
                    </div>
                    ${!notification.read ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>' : ''}
                </div>
            </div>
        `).join('');
    }

    renderEmptyNotifications() {
        return `
            <div class="p-8 text-center">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM15 7v5h5l-5-5zM4 12h9m-9 4h6"/>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Bildirim yok</h3>
                <p class="mt-1 text-sm text-gray-500">Yeni bildirimler burada görünecek.</p>
            </div>
        `;
    }

    getNotificationIcon(type) {
        const iconClasses = "w-8 h-8 rounded-full flex items-center justify-center";

        switch (type) {
            case 'appointment':
                return `<div class="${iconClasses} bg-blue-100"><svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></div>`;
            case 'patient':
                return `<div class="${iconClasses} bg-green-100"><svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></div>`;
            case 'inventory':
                return `<div class="${iconClasses} bg-yellow-100"><svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></div>`;
            case 'system':
                return `<div class="${iconClasses} bg-red-100"><svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></div>`;
            default:
                return `<div class="${iconClasses} bg-gray-100"><svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg></div>`;
        }
    }

    renderUserInfo() {
        return `
            <div class="relative flex items-center space-x-3 border-l border-gray-200 pl-4">
                <!-- Dark Mode Toggle Button -->
                <button id="dark-mode-toggle" class="p-2 rounded-lg hover:bg-gray-100 mr-2" title="Karanlık/Aydınlık Mod">
                    <svg class="w-5 h-5 dark-mode-sun text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path>
                    </svg>
                    <svg class="w-5 h-5 dark-mode-moon text-gray-600 hidden" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                    </svg>
                </button>
                
                <button id="profile-btn" class="flex items-center p-2 rounded-lg hover:bg-gray-100" aria-haspopup="true" aria-expanded="false">
                    <img id="userAvatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%232563EB'/%3E%3Ctext x='16' y='21' text-anchor='middle' fill='white' font-family='Arial' font-size='14' font-weight='bold'%3EA%3C/text%3E%3C/svg%3E" alt="User" class="w-8 h-8 rounded-full">
                    <div class="hidden md:block text-left ml-2">
                        <span id="currentUser" class="text-sm font-medium text-gray-700">Admin User</span>
                        <p class="text-xs text-gray-500">Yönetici</p>
                    </div>
                    <svg class="w-4 h-4 text-gray-600 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>

                <!-- Profile Dropdown -->
                <div id="profile-dropdown" role="menu" aria-orientation="vertical" aria-labelledby="profile-btn" class="hidden absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 origin-top-right py-1 divide-y divide-gray-100">
                    <div class="py-1">
                        <a href="settings.html#profile" id="profileLink" role="menuitem" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Profilim</a>
                        <a href="settings.html" id="settingsLink" role="menuitem" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Ayarlar</a>
                    </div>
                    <div class="py-1">
                        <button id="logoutBtn" role="menuitem" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Oturumu Kapat</button>
                    </div>
                </div>
            </div>
        `;
    }

    loadNotifications() {
        // Load notifications from localStorage or API
        try {
            const stored = localStorage.getItem('notifications');
            if (stored) {
                this.notifications = JSON.parse(stored);
                this.unreadCount = this.notifications.filter(n => !n.read).length;
            } else {
                // Load sample notifications
                this.notifications = this.getSampleNotifications();
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                localStorage.setItem('notifications', JSON.stringify(this.notifications));
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.notifications = [];
            this.unreadCount = 0;
        }
    }

    getSampleNotifications() {
        return [
            {
                id: '1',
                type: 'appointment',
                title: 'Yeni Randevu',
                message: 'Ahmet Yılmaz için yarın saat 10:00\'da randevu oluşturuldu.',
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
                read: false
            },
            {
                id: '2',
                type: 'patient',
                title: 'Hasta Kaydı',
                message: 'Yeni hasta Ayşe Kaya sisteme eklendi.',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                read: false
            },
            {
                id: '3',
                type: 'inventory',
                title: 'Stok Uyarısı',
                message: 'İşitme cihazı stoğu kritik seviyede (5 adet kaldı).',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
                read: true
            },
            {
                id: '4',
                type: 'system',
                title: 'Sistem Güncellemesi',
                message: 'X-Ear CRM sistemi güncellendi. Yeni özellikler eklendi.',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
                read: true
            }
        ];
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Şimdi';
        if (diffMins < 60) return `${diffMins} dakika önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;

        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Method to add new notification
    addNotification(notification) {
        notification.id = Date.now().toString();
        notification.createdAt = new Date().toISOString();
        notification.read = false;

        this.notifications.unshift(notification);
        this.unreadCount++;

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Save to localStorage
        localStorage.setItem('notifications', JSON.stringify(this.notifications));

        // Update UI if rendered
        this.updateNotificationUI();
    }

    // Method to mark notification as read
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
            this.updateNotificationUI();
        }
    }

    // Method to update notification UI
    updateNotificationUI() {
        const notificationBtn = document.getElementById('notifications-btn');
        const badge = notificationBtn?.querySelector('span');

        if (this.unreadCount > 0) {
            if (badge) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            } else {
                const newBadge = document.createElement('span');
                newBadge.className = 'absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center';
                newBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                notificationBtn.appendChild(newBadge);
            }
        } else if (badge) {
            badge.remove();
        }

        // Update dropdown content if visible
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            const notificationList = dropdown.querySelector('.max-h-96');
            if (notificationList) {
                notificationList.innerHTML = this.notifications.length > 0 ? this.renderNotificationItems() : this.renderEmptyNotifications();
            }
        }
    }

    // Initialize event listeners
    initialize() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            // İlk yüklemede dark mode durumunu kontrol et ve görünümü güncelle
            this.updateDarkModeToggle();
            
            // Toggle butonuna tıklama olayını ekle
            darkModeToggle.addEventListener('click', () => {
                if (window.DarkMode && typeof window.DarkMode.toggleDarkMode === 'function') {
                    window.DarkMode.toggleDarkMode();
                    this.updateDarkModeToggle();
                }
            });
            
            // Dark mode değişikliklerini dinle
            document.addEventListener('darkModeChanged', () => {
                this.updateDarkModeToggle();
            });
        }
        
        // Notification dropdown toggle
        const notificationBtn = document.getElementById('notifications-btn');
        const dropdown = document.getElementById('notifications-dropdown');

        if (notificationBtn && dropdown) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!notificationBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });

            // Handle notification clicks
            dropdown.addEventListener('click', (e) => {
                const notificationItem = e.target.closest('[data-notification-id]');
                if (notificationItem) {
                    const notificationId = notificationItem.dataset.notificationId;
                    this.markAsRead(notificationId);
                }
            });
        }

        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                if (window.toggleSidebar) {
                    window.toggleSidebar();
                }
            });
        }

        // Profile dropdown toggle & logout handling
        const profileBtn = document.getElementById('profile-btn');
        const profileDropdown = document.getElementById('profile-dropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const expanded = profileBtn.getAttribute('aria-expanded') === 'true';
                profileBtn.setAttribute('aria-expanded', String(!expanded));
                // Toggle dropdown and ensure it opens downward
                profileDropdown.classList.toggle('hidden');
                if (!profileDropdown.classList.contains('hidden')) {
                    // Force dropdown to be positioned under the button (use top-full + mt-2)
                    profileDropdown.classList.remove('translate-y-0');
                }
            });

            // Close profile dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                    profileBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Call the global auth manager if available
                if (window.authManager && typeof window.authManager.logout === 'function') {
                    window.authManager.logout();
                    // close dropdown after logout action trigger
                    try { profileDropdown.classList.add('hidden'); profileBtn.setAttribute('aria-expanded', 'false'); } catch(e){}
                } else {
                    // Fallback: redirect to login page
                    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                        window.location.href = '/login.html';
                    }
                }
            });
        }

        // Ensure clicking profile/settings links closes dropdown (and navigates)
        const profileLink = document.getElementById('profileLink');
        const settingsLink = document.getElementById('settingsLink');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                try { profileDropdown.classList.add('hidden'); profileBtn.setAttribute('aria-expanded', 'false'); } catch(e){}
                // If we're already on settings page, prevent full navigation and switch tab in-place
                try {
                    const path = window.location.pathname || '';
                    if (path.endsWith('/settings.html') || path.endsWith('/settings') || path.indexOf('settings.html') !== -1) {
                        e.preventDefault();
                        if (window.switchTab) {
                            window.switchTab('profile');
                            // Update hash without reloading
                            history.replaceState(null, '', '#profile');
                        }
                    }
                } catch (err) { /* ignore */ }
            });
         }
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                try { profileDropdown.classList.add('hidden'); profileBtn.setAttribute('aria-expanded', 'false'); } catch(e){}
            });
        }
    }

    // Dark mode toggle butonunun görünümünü günceller
    updateDarkModeToggle() {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (!darkModeToggle) return;
        
        const isDarkMode = window.DarkMode && typeof window.DarkMode.isDarkMode === 'function' 
            ? window.DarkMode.isDarkMode() 
            : document.documentElement.classList.contains('dark-mode');
        
        const sunIcon = darkModeToggle.querySelector('.dark-mode-sun');
        const moonIcon = darkModeToggle.querySelector('.dark-mode-moon');
        
        if (isDarkMode) {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }
    
    // Backwards compatibility: many legacy pages call attachEventListeners()
    // Provide a compatibility alias that calls initialize().
    attachEventListeners() {
        return this.initialize();
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeaderWidget;
} else {
    window.HeaderWidget = HeaderWidget;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('header-container');
            if (container && !container.hasAttribute('data-header-initialized')) {
                container.setAttribute('data-header-initialized', 'true');
                new HeaderWidget();
            }
        });
    } else {
        const container = document.getElementById('header-container');
        if (container && !container.hasAttribute('data-header-initialized')) {
            container.setAttribute('data-header-initialized', 'true');
            new HeaderWidget();
        }
    }
}