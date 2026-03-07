// Widget Loader - Centralized widget management
class WidgetLoader {
    constructor() {
        this.widgets = new Map();
        this.loadedScripts = new Set();
    }

    // Load widget scripts dynamically
    async loadWidget(widgetName) {
        if (this.loadedScripts.has(widgetName)) {
            return;
        }

        // Check if widget class already exists globally
        const widgetClassName = widgetName.charAt(0).toUpperCase() + widgetName.slice(1) + 'Widget';
        const xearWidgetClassName = 'XEar' + widgetClassName;

        // Check if the widget or its XEar variant already exists
        if (window[widgetClassName] || window[xearWidgetClassName] || window['_defining' + xearWidgetClassName]) {
            console.log(`Widget ${widgetName} already loaded, skipping`);
            this.loadedScripts.add(widgetName);
            return;
        }

        try {
            const script = document.createElement('script');
            script.src = `assets/widgets/${widgetName}.js?v=${Date.now()}`;
            script.async = true;

            return new Promise((resolve, reject) => {
                script.onload = () => {
                    console.log(`✅ Widget ${widgetName} loaded successfully`);
                    this.loadedScripts.add(widgetName);
                    resolve();
                };
                script.onerror = (error) => {
                    console.error(`❌ Failed to load widget ${widgetName}:`, error);
                    reject(error);
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error(`❌ Error loading widget ${widgetName}:`, error);
            throw error;
        }
    }

    // Load multiple widgets
    async loadWidgets(widgetNames) {
        const promises = widgetNames.map(name => this.loadWidget(name));
        await Promise.all(promises);
    }

    // Register a widget instance
    registerWidget(id, widget) {
        this.widgets.set(id, widget);
        // Make it globally accessible
        window[id + 'Widget'] = widget;
    }

    // Get a registered widget
    getWidget(id) {
        return this.widgets.get(id);
    }

    // Remove a widget
    removeWidget(id) {
        const widget = this.widgets.get(id);
        if (widget && widget.destroy) {
            widget.destroy();
        }
        this.widgets.delete(id);
        delete window[id + 'Widget'];
    }

    // Initialize common widgets for a page
    async initPageWidgets(pageName) {
        const commonWidgets = ['sidebar', 'header'];

        const pageSpecificWidgets = {
            'patients': ['table', 'stats-card'],
            'inventory': ['table', 'stats-card'],
            'campaigns': ['stats-card'],
            'dashboard': ['stats-card'],
            'appointments': [],
            'patient-details': [],
            'settings': []
        };

        const widgetsToLoad = [
            ...commonWidgets,
            ...(pageSpecificWidgets[pageName] || [])
        ];

        await this.loadWidgets(widgetsToLoad);
    }

    // Render sidebar for any page
    renderSidebar(activePage) {
        const sidebar = new SidebarWidget(activePage);
        this.registerWidget('sidebar', sidebar);
        return sidebar.render();
    }

    // Render header for any page
    renderHeader(title, showUserInfo = true) {
        const header = new HeaderWidget(title, showUserInfo);
        this.registerWidget('header', header);
        return header.render();
    }

    // Create and render a table
    createTable(containerId, options) {
        const table = new TableWidget(options);
        this.registerWidget(containerId, table);

        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = table.render();
            this.bindTableEvents(containerId, table);
        }

        return table;
    }

    // Bind table events
    bindTableEvents(containerId, table) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Search functionality
        const searchInput = container.querySelector('#tableSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                table.search(e.target.value);
                container.innerHTML = table.render();
                this.bindTableEvents(containerId, table);
            });
        }
    }

    // Create and render stats cards
    renderStatsCards(containerId, cards) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const cardsHtml = cards.map(card => card.render()).join('');
        container.innerHTML = cardsHtml;
    }

    // Create a modal
    async createModal(options) {
        // Ensure modal widget is loaded first
        await this.loadWidget('modal');

        const modal = new XEarModalWidget(options);
        this.registerWidget(options.id, modal);

        // Add modal HTML to body if not exists
        if (!document.getElementById(options.id)) {
            document.body.insertAdjacentHTML('beforeend', modal.render());
        }

        return modal;
    }

    // Utility method to inject widgets into page structure
    injectPageStructure(activePage, pageTitle, mainContent) {
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${pageTitle} - X-Ear CRM</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link rel="stylesheet" href="../assets/style.css">
                <script>
                    tailwind.config = {
                        theme: {
                            extend: {
                                colors: {
                                    primary: '#2563EB',
                                    'light-gray': '#F9FAFB'
                                }
                            }
                        }
                    }
                </script>
                <script>
                    // Apply a body/document-level class as early as possible so CSS can
                    // position main content correctly before the first paint when
                    // the sidebar was collapsed previously.
                    (function(){
                        try {
                            if (typeof localStorage !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true') {
                                document.documentElement.classList.add('sidebar-initial-collapsed');
                            }
                        } catch (e) {
                            // ignore access errors (e.g., in private browsers)
                        }
                    })();
                </script>
            </head>
            <body class="bg-light-gray">
                ${this.renderSidebar(activePage)}

                <main class="main-content">
                    ${this.renderHeader(pageTitle)}
                    ${mainContent}
                </main>

                <!-- Widget Scripts -->
                <script src="../assets/widgets/widget-loader.js"></script>
                <script>
                    // Use existing global widget loader instance
                    window.widgetLoader.initPageWidgets('${activePage}');
                </script>
            </body>
            </html>
        `;
    }

    // Clean up all widgets
    cleanup() {
        for (const [id, widget] of this.widgets) {
            if (widget.destroy) {
                widget.destroy();
            }
        }
        this.widgets.clear();
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.WidgetLoader = WidgetLoader;
    window.widgetLoader = new WidgetLoader();
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WidgetLoader;
}