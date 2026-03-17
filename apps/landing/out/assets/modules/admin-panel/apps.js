import api from '../../api/index.js';

class AdminAppsModule {
    constructor(containerSelector){
        this.container = document.querySelector(containerSelector);
        if (!this.container) throw new Error('Container not found');
        this.init();
    }

    async init(){
        // wait for auth manager to load
        if (window.authManager && typeof window.authManager.load === 'function'){
            await window.authManager.load();
        }
        if (!window.authManager || !window.authManager.can('admin-panel:access')){
            this.container.innerHTML = '<div class="p-6 text-sm text-gray-600">Yetkiniz yok veya oturum açılmadı.</div>';
            return;
        }
        this.render();
        this.bindEvents();
        await this.reloadApps();
    }

    render(){
        this.container.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-semibold">Apps</h2>
                    <div>
                        <button id="manageFeaturesBtn" class="btn btn-outline btn-sm" style="display:none">Manage Features</button>
                    </div>
                </div>
                <div id="appsList" class="mb-4"></div>
                <form id="createAppForm" class="flex space-x-2">
                    <input id="appName" class="border p-2 rounded flex-1" placeholder="App name" />
                    <input id="appSlug" class="border p-2 rounded w-48" placeholder="slug" />
                    <button class="btn btn-primary" type="submit">Create</button>
                </form>
            </div>

            <!-- assign modal -->
            <div id="assignModal" class="hidden fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div class="bg-white rounded shadow p-6 w-96">
                    <h3 class="font-semibold mb-2">Assign Role</h3>
                    <div class="mb-2"><label class="block text-sm">Kullanıcı Ara (isim / e-posta)</label><input id="assignUserSearch" class="w-full border p-2 rounded" placeholder="Ara ve seç" /><div id="assignUserResults" class="mt-2 text-sm text-gray-600 max-h-32 overflow-y-auto"></div><input type="hidden" id="assignUserId" /></div>
                    <div class="mb-4"><label class="block text-sm">Role</label><select id="assignRoleSelect" class="w-full border p-2 rounded"></select></div>
                    <div class="flex justify-end space-x-2"><button id="assignCancel" class="btn">Cancel</button><button id="assignConfirm" class="btn btn-primary">Assign</button></div>
                </div>
            </div>
        `;
    }

    bindEvents(){
        const form = this.container.querySelector('#createAppForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = this.container.querySelector('#appName').value.trim();
            const slug = this.container.querySelector('#appSlug').value.trim();
            if (!name || !slug) return alert('name and slug required');
            try {
                await api.createApp({name, slug});
                await this.reloadApps(); 
                this.container.querySelector('#appName').value=''; 
                this.container.querySelector('#appSlug').value='';
            } catch (error) {
                console.error('Error creating app:', error);
                alert('Uygulama oluşturulurken hata oluştu');
            }
        });

        this.container.addEventListener('click', (e)=>{
            const assignBtn = e.target.closest('[data-assign-app]');
            if (assignBtn){
                const appId = assignBtn.dataset.assignApp;
                this.openAssignModal(appId);
            }
        });

        const modal = this.container.querySelector('#assignModal');
        modal.querySelector('#assignCancel').addEventListener('click', ()=> modal.classList.add('hidden'));
        modal.querySelector('#assignConfirm').addEventListener('click', async ()=>{
            const userId = modal.querySelector('#assignUserId').value.trim();
            const role = modal.querySelector('#assignRoleSelect').value;
            const appId = modal.dataset.appId;
            if (!userId || !role) return alert('userId and role required');
            try {
                await api.assignAppRole(appId, {userId, role});
                modal.classList.add('hidden'); 
                alert('Rol atandı');
            } catch (error) {
                console.error('Error assigning role:', error);
                alert('Rol atanırken hata oluştu');
            }
        });

        // debounce helper
        function debounce(fn, wait){ let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn.apply(this,args), wait); } }

        // user search behaviour
        const searchInput = this.container.querySelector('#assignUserSearch');
        const resultsBox = this.container.querySelector('#assignUserResults');
        if (searchInput){
            const doSearch = debounce(async ()=>{
                const q = searchInput.value.trim();
                resultsBox.innerHTML = '';
                if (!q) return;
                try{
                    const users = await api.searchUsers({query: q});
                    const userList = users.data || [];
                    resultsBox.innerHTML = userList.slice(0,10).map(u=>`<div class="p-1 hover:bg-gray-100 cursor-pointer" data-user-id="${u.id}" data-user-label="${u.fullName || u.username} ">${u.fullName || u.username} <span class="text-xs text-gray-400">${u.email || ''}</span></div>`).join('');
                    resultsBox.querySelectorAll('[data-user-id]').forEach(el=> el.addEventListener('click', ()=>{
                        const uid = el.dataset.userId; const label = el.dataset.userLabel;
                        modal.querySelector('#assignUserId').value = uid;
                        searchInput.value = label;
                        resultsBox.innerHTML = '';
                    }));
                }catch(e){ console.error('user search error', e); }
            }, 300);
            searchInput.addEventListener('input', doSearch);
        }

        // load roles into select when modal opens
        const origOpen = this.openAssignModal.bind(this);
        this.openAssignModal = async (appId) => { modal.querySelector('#assignUserSearch').value = ''; modal.querySelector('#assignUserId').value = ''; modal.querySelector('#assignUserResults').innerHTML=''; await this._ensureRolesLoaded(modal); origOpen(appId); };
    }

    async _ensureRolesLoaded(modal){
        const select = modal.querySelector('#assignRoleSelect');
        if (select && select.options.length > 0) return;
        try{
            const roles = await api.getRoles();
            const roleList = roles.data || [];
            select.innerHTML = roleList.map(r=>`<option value="${r.name}">${r.name}</option>`).join('');
        }catch(e){ console.error('failed load roles', e); }
    }

    async reloadApps(){
        const list = this.container.querySelector('#appsList');
        list.innerHTML = '<div class="text-sm text-gray-500">Yükleniyor...</div>';
        try {
            const result = await api.getApps();
            const apps = result.data || [];
            if (apps.length === 0) { 
                list.innerHTML = '<div class="text-sm text-gray-500">Uygulama bulunamadı</div>'; 
                return; 
            }
            list.innerHTML = apps.map(a => `
                <div class="p-3 border-b flex items-center justify-between">
                    <div>
                        <div class="font-medium">${a.name} <span class="text-xs text-gray-500">(${a.slug})</span></div>
                        <div class="text-xs text-gray-500">Sahip: ${a.ownerUserId || '—'}</div>
                    </div>
                    <div>
                        <button data-assign-app="${a.id}" class="btn btn-sm">Rol Ata</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading apps:', error);
            list.innerHTML = '<div class="text-sm text-red-500">Uygulamalar yüklenirken hata oluştu</div>';
        }
    }

    openAssignModal(appId){
        const modal = this.container.querySelector('#assignModal');
        modal.dataset.appId = appId;
        modal.classList.remove('hidden');
    }

    // show Manage Features button when user has permission
    _showManageFeaturesButton(){
        try{
            const btn = this.container.querySelector('#manageFeaturesBtn');
            if (!btn) return;
            const canToggle = (window.authManager && (window.authManager.can('settings.update') || window.authManager.can('features.toggle')));
            if (canToggle) { btn.style.display = ''; btn.addEventListener('click', ()=> { location.hash = '#features'; }); }
            else { btn.style.display = 'none'; }
        }catch(e){ console.error('manage features btn error', e); }
    }
}

// UMD-ish export
if (typeof window !== 'undefined') window.AdminAppsModule = AdminAppsModule;
if (typeof module !== 'undefined' && module.exports) module.exports = AdminAppsModule;