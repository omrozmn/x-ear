const api = require('../../api');

class AdminAuditModule {
    constructor(containerSelector){
        this.container = document.querySelector(containerSelector);
        if (!this.container) throw new Error('Container not found');
        this.init();
    }

    async init(){
        if (window.authManager && typeof window.authManager.load === 'function') await window.authManager.load();
        if (!window.authManager || !window.authManager.is('admin')){
            this.container.innerHTML = '<div class="p-6 text-sm text-gray-600">Yönetici yetkisi gerekli.</div>';
            return;
        }
        this.render();
        this.bindEvents();
        await this.loadAudit();
    }

    render(){
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-semibold mb-4">Denetim Günlüğü</h2>
                <div class="mb-4">
                    <label class="text-sm mr-2">Varlık:</label>
                    <input id="auditEntityFilter" class="border p-1 rounded" placeholder="varlık_türü" />
                    <button id="auditFilterBtn" class="ml-2 btn btn-sm">Filtrele</button>
                </div>
                <div id="auditList" class="max-h-96 overflow-y-auto border rounded"></div>
            </div>
        `;
    }

    bindEvents(){
        this.container.querySelector('#auditFilterBtn').addEventListener('click', ()=>{
            this.loadAudit();
        });
    }

    async loadAudit(){
        const list = this.container.querySelector('#auditList');
        list.innerHTML = 'Yükleniyor...';
        const entity = this.container.querySelector('#auditEntityFilter').value.trim();
        
        try{
            const res = await api.getAuditLog(entity ? {entity_type: entity} : {});
            if (!res.ok){ 
                list.innerHTML = 'Yükleme başarısız'; 
                return; 
            }
            const body = await res.json();
            const items = body.data || [];
            list.innerHTML = items.map(i=>`<div class="p-2 border-b"><div class="text-sm font-medium">${i.action}</div><div class="text-xs text-gray-600">${i.entityType} ${i.entityId || ''} - ${i.userId || 'sistem'} - ${i.createdAt}</div><div class="text-xs text-gray-700 mt-1">${JSON.stringify(i.details)}</div></div>`).join('');
        } catch(error) { 
            console.error('Error loading audit log:', error);
            list.innerHTML = 'Hata oluştu'; 
        }
    }
}

if (typeof window !== 'undefined') window.AdminAuditModule = AdminAuditModule;
if (typeof module !== 'undefined' && module.exports) module.exports = AdminAuditModule;