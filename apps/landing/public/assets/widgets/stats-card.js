// Stats Card Widget
class StatsCardWidget {
    constructor(options = {}) {
        this.title = options.title || '';
        this.value = options.value || '0';
        this.icon = options.icon || '';
        this.color = options.color || 'blue'; // blue, green, yellow, red, purple
        this.trend = options.trend || null; // { value: '+12%', direction: 'up' }
        this.subtitle = options.subtitle || '';
        this.clickable = options.clickable || false;
        this.onClick = options.onClick || null;
        this.loading = options.loading || false;
    }

    render() {
        const colorClasses = this.getColorClasses();
        const clickableClass = this.clickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : '';
        const clickHandler = this.onClick ? `onclick="${this.onClick}"` : '';

        return `
            <div class="card p-6 ${clickableClass}" ${clickHandler}>
                ${this.loading ? this.renderLoading() : this.renderContent(colorClasses)}
            </div>
        `;
    }

    renderContent(colorClasses) {
        return `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-600">${this.title}</p>
                    <p class="text-3xl font-bold text-gray-900 mt-1">${this.value}</p>
                    ${this.subtitle ? `<p class="text-sm text-gray-500 mt-1">${this.subtitle}</p>` : ''}
                    ${this.trend ? this.renderTrend() : ''}
                </div>
                ${this.icon ? `
                    <div class="p-3 ${colorClasses.bg} rounded-lg ml-4">
                        ${this.icon}
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderLoading() {
        return `
            <div class="animate-pulse">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div class="w-12 h-12 bg-gray-200 rounded-lg ml-4"></div>
                </div>
            </div>
        `;
    }

    renderTrend() {
        const trendColor = this.trend.direction === 'up' ? 'text-green-600' : 
                          this.trend.direction === 'down' ? 'text-red-600' : 'text-gray-600';
        
        const trendIcon = this.trend.direction === 'up' ? `
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
        ` : this.trend.direction === 'down' ? `
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
        ` : '';

        return `
            <div class="flex items-center mt-2">
                <span class="text-sm ${trendColor} flex items-center">
                    ${trendIcon}
                    <span class="ml-1">${this.trend.value}</span>
                </span>
                ${this.trend.period ? `<span class="text-sm text-gray-500 ml-2">${this.trend.period}</span>` : ''}
            </div>
        `;
    }

    getColorClasses() {
        const colorMap = {
            blue: {
                bg: 'bg-blue-100',
                icon: 'text-blue-600'
            },
            green: {
                bg: 'bg-green-100',
                icon: 'text-green-600'
            },
            yellow: {
                bg: 'bg-yellow-100',
                icon: 'text-yellow-600'
            },
            red: {
                bg: 'bg-red-100',
                icon: 'text-red-600'
            },
            purple: {
                bg: 'bg-purple-100',
                icon: 'text-purple-600'
            },
            gray: {
                bg: 'bg-gray-100',
                icon: 'text-gray-600'
            }
        };

        return colorMap[this.color] || colorMap.blue;
    }

    // Update methods
    updateValue(newValue) {
        this.value = newValue;
    }

    updateTrend(newTrend) {
        this.trend = newTrend;
    }

    setLoading(loading) {
        this.loading = loading;
    }

    // Static method to create common stat cards
    static createPatientStats() {
        return [
            new StatsCardWidget({
                title: 'Toplam Hasta',
                value: '0',
                color: 'blue',
                icon: `<svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Aktif Hasta',
                value: '0',
                color: 'green',
                icon: `<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Bekleyen',
                value: '0',
                color: 'yellow',
                icon: `<svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Bu Ay Yeni',
                value: '0',
                color: 'purple',
                icon: `<svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>`
            })
        ];
    }

    static createInventoryStats() {
        return [
            new StatsCardWidget({
                title: 'Toplam Ürün',
                value: '0',
                color: 'blue',
                icon: `<svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Düşük Stok',
                value: '0',
                color: 'red',
                icon: `<svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>`
            }),
            new StatsCardWidget({
                title: 'Toplam Değer',
                value: '₺0',
                color: 'green',
                icon: `<svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5a1 1 0 10-2 0v.092z" clip-rule="evenodd"/>
                </svg>`
            })
        ];
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCardWidget;
} else {
    window.StatsCardWidget = StatsCardWidget;
}