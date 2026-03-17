class PatientTabsComponent {
    constructor(activeTab) {
        this.activeTab = activeTab;
        this.tabs = [
            { id: 'general', name: 'Genel' },
            { id: 'devices', name: 'Cihazlar' },
            { id: 'sales', name: 'Satışlar' },
            { id: 'sgk', name: 'SGK' },
            { id: 'documents', name: 'Belgeler' },
            { id: 'timeline', name: 'Zaman Çizelgesi' }
        ];
    }

    render() {
        const tabsHtml = this.tabs.map(tab => `
            <a id="tab-${tab.id}" data-tab="${tab.id}" class="flex flex-col items-center justify-center border-b-[3px] ${this.activeTab === tab.id ? 'border-b-blue-500 text-blue-600 bg-blue-50' : 'border-b-transparent text-gray-600 hover:text-blue-500 hover:bg-gray-50'} pb-[13px] pt-4 px-4 cursor-pointer transition-all duration-200 rounded-t-lg" onclick="window.handleTabClick('${tab.id}')">
                <p class="text-sm font-bold leading-normal tracking-[0.015em]">${tab.name}</p>
            </a>
        `).join('');

        return `
            <div class="pb-3 bg-white">
                <div class="flex border-b border-gray-200 px-4 gap-2">
                    ${tabsHtml}
                </div>
            </div>
        `;
    }
}