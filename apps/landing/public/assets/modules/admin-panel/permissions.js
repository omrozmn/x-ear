const api = require('../../api');
class AdminPermissionsModule {
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
        await this.reloadPermissions();
    }

    render(){
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-semibold mb-4">İzinler</h2>
                <div id="permsList" class="mb-4"></div>
                <form id="createPermForm" class="flex space-x-2">
                    <input id="permName" class="border p-2 rounded flex-1" placeholder="İzin adı" />
                    <button class="btn btn-primary" type="submit">Oluştur</button>
                </form>
            </div>
        `;
    }

    bindEvents(){
        this.container.querySelector('#createPermForm').addEventListener('submit', async (e)=>{
            e.preventDefault();
            const name = this.container.querySelector('#permName').value.trim();
            if (!name) return alert('İzin adı gerekli');
            
            try {
                const result = await api.createPermission({ name });
                if (result.success) { 
                    await this.reloadPermissions(); 
                    this.container.querySelector('#permName').value=''; 
                } else { 
                    alert(result.error || 'Başarısız'); 
                }
            } catch (error) {
                console.error('Error creating permission:', error);
                alert('Hata oluştu');
            }
        });
    }

    async reloadPermissions(){
        const list = this.container.querySelector('#permsList');
        list.innerHTML = 'Yükleniyor...';
        
        try {
            const result = await api.getPermissions();
            if (!result.success) { 
                list.innerHTML = 'Yükleme başarısız'; 
                return; 
            }
            const perms = result.data || [];
            list.innerHTML = perms.map(p=>`<div class="p-2 border-b">${p.name}</div>`).join('') || '<div class="text-gray-500">İzin bulunamadı</div>';
        } catch (error) {
            console.error('Error loading permissions:', error);
            list.innerHTML = 'Hata oluştu';
        }
    }
}

if (typeof window !== 'undefined') window.AdminPermissionsModule = AdminPermissionsModule;
if (typeof module !== 'undefined' && module.exports) module.exports = AdminPermissionsModule;