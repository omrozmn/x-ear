const api = require('../../api');
class AdminRolesModule {
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
        await this.reloadRoles();
    }

    render(){
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-semibold mb-4">Roller</h2>
                <div id="rolesList" class="mb-4"></div>
                <form id="createRoleForm" class="flex space-x-2">
                    <input id="roleName" class="border p-2 rounded flex-1" placeholder="Rol adı" />
                    <button class="btn btn-primary" type="submit">Oluştur</button>
                </form>
            </div>

            <div id="roleDetailModal" class="hidden fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                <div class="bg-white rounded shadow p-6 w-96">
                    <h3 class="font-semibold mb-2">Rol İzinleri</h3>
                    <div id="permList" class="mb-4 max-h-48 overflow-y-auto"></div>
                    <div class="mb-4"><input id="permToAdd" class="w-full border p-2 rounded" placeholder="İzin adı" /></div>
                    <div class="flex justify-end space-x-2"><button id="permClose" class="btn">Kapat</button><button id="permAdd" class="btn btn-primary">Ekle</button></div>
                </div>
            </div>
        `;
    }

    bindEvents(){
        this.container.querySelector('#createRoleForm').addEventListener('submit', async (e)=>{
            e.preventDefault();
            const name = this.container.querySelector('#roleName').value.trim();
            if (!name) return alert('Rol adı gerekli');
            try {
                const res = await api.createRole({name});
                if (res.ok) { 
                    await this.reloadRoles(); 
                    this.container.querySelector('#roleName').value=''; 
                } else { 
                    const body = await res.json().catch(()=>({})); 
                    alert(body.error || 'Başarısız'); 
                }
            } catch (error) {
                console.error('Error creating role:', error);
                alert('Rol oluşturulurken hata oluştu');
            }
        });

        this.container.addEventListener('click', (e)=>{
            const detailBtn = e.target.closest('[data-role-detail]');
            if (detailBtn){ this.openRoleDetail(detailBtn.dataset.roleDetail); }
        });

        const modal = this.container.querySelector('#roleDetailModal');
        modal.querySelector('#permClose').addEventListener('click', ()=> modal.classList.add('hidden'));
        modal.querySelector('#permAdd').addEventListener('click', async ()=>{
            const name = modal.querySelector('#permToAdd').value.trim();
            const roleId = modal.dataset.roleId;
            if (!name) return alert('İzin gerekli');
            
            try {
                // create permission first if missing
                let pRes = await api.createPermission({name});
                if (!pRes.ok && pRes.status !== 409){ 
                    const body = await pRes.json().catch(()=>({})); 
                    return alert(body.error || 'İzin oluşturulamadı'); 
                }
                
                // ensure permission exists and fetch id
                const perms = await api.getPermissions();
                const permsData = await perms.json();
                const p = (permsData.data || []).find(x => x.name === name);
                if (!p) return alert('İzin oluşturuldu ancak bulunamadı');
                
                // assign permission to role
                const assign = await api.assignRolePermission(roleId, {permission: name});
                if (assign.ok){ 
                    await this.loadRolePermissions(roleId); 
                    modal.querySelector('#permToAdd').value=''; 
                } else { 
                    const body = await assign.json().catch(()=>({})); 
                    alert(body.error || 'Atama başarısız'); 
                }
            } catch (error) {
                console.error('Error adding permission:', error);
                alert('İzin eklenirken hata oluştu');
            }
        });
    }

    async reloadRoles(){
        const list = this.container.querySelector('#rolesList');
        list.innerHTML = 'Yükleniyor...';
        try {
            const res = await api.getRoles();
            if (!res.ok) { list.innerHTML = 'Başarısız'; return; }
            const body = await res.json();
            const roles = body.data || [];
            list.innerHTML = roles.map(r=>`<div class="p-2 border-b flex items-center justify-between"><div>${r.name}</div><div><button data-role-detail="${r.id}" class="btn btn-sm">Detaylar</button></div></div>`).join('');
        } catch (error) {
            console.error('Error loading roles:', error);
            list.innerHTML = 'Yükleme hatası';
        }
    }

    async openRoleDetail(roleId){
        const modal = this.container.querySelector('#roleDetailModal');
        modal.dataset.roleId = roleId; modal.classList.remove('hidden');
        await this.loadRolePermissions(roleId);
    }

    async loadRolePermissions(roleId){
        const modal = this.container.querySelector('#roleDetailModal');
        const permList = modal.querySelector('#permList');
        permList.innerHTML = 'Yükleniyor...';
        
        try {
            // fetch roles list to get permissions
            const r = await api.getRoles();
            const rolesData = await r.json();
            const role = (rolesData.data || []).find(x => x.id === roleId);
            if (!role){ permList.innerHTML = 'Bulunamadı'; return; }
            
            permList.innerHTML = (role.permissions || []).map(p=>`<div class="flex items-center justify-between p-2 border-b"><div>${p.name}</div><div><button data-remove-perm="${roleId}:::${p.id}" class="btn btn-sm">Kaldır</button></div></div>`).join('');
            
            // bind remove
            permList.querySelectorAll('[data-remove-perm]').forEach(btn => btn.addEventListener('click', async (e)=>{
                const [rid, pid] = e.currentTarget.dataset.removePerm.split(':::');
                try {
                    const res = await api.removeRolePermission(roleId, pid);
                    if (res.ok) {
                        await this.loadRolePermissions(rid); 
                    } else { 
                        const body = await res.json().catch(()=>({})); 
                        alert(body.error || 'Başarısız'); 
                    }
                } catch (error) {
                    console.error('Error removing permission:', error);
                    alert('İzin kaldırılırken hata oluştu');
                }
            }));
        } catch (error) {
            console.error('Error loading role permissions:', error);
            permList.innerHTML = 'Yükleme hatası';
        }
    }
}

if (typeof window !== 'undefined') window.AdminRolesModule = AdminRolesModule;
if (typeof module !== 'undefined' && module.exports) module.exports = AdminRolesModule;