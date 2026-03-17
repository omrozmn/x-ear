const api = require('../../api');
class AdminFeaturesModule {
    constructor(containerSelector){
        this.container = document.querySelector(containerSelector);
        if (!this.container) throw new Error('Container not found');
        this.apiBase = '/api';
        this.init();
    }

    async init(){
        if (window.authManager && typeof window.authManager.load === 'function'){
            await window.authManager.load();
        }
        if (!window.authManager || !window.authManager.can('admin-panel:access')){
            this.container.innerHTML = '<div class="p-6 text-sm text-gray-600">Yetkiniz yok veya oturum açılmadı.</div>';
            return;
        }
        this.render();
        this.bindEvents();
        await this.reloadFeatures();
    }

    render(){
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-semibold mb-4">Özellik Yönetimi</h2>
                <div id="featuresList" class="space-y-4"></div>
            </div>
        `;
    }

    bindEvents(){
        this.container.addEventListener('change', async (e) => {
            if (e.target.type === 'radio' && e.target.name.startsWith('mode_')){
                const k = e.target.name.replace('mode_', '');
                const mode = e.target.value;
                const planCheckboxes = this.container.querySelectorAll(`input[data-feature="${k}"][data-plan]`);
                const checkedPlans = Array.from(planCheckboxes).filter(cb => cb.checked).map(cb => cb.dataset.plan);
                await this.updateFeature(k, mode, checkedPlans);
            } else if (e.target.type === 'checkbox' && e.target.dataset.feature && e.target.dataset.plan){
                const k = e.target.dataset.feature;
                const modeRadio = this.container.querySelector(`input[name="mode_${k}"]:checked`);
                const mode = modeRadio ? modeRadio.value : 'hidden';
                const planCheckboxes = this.container.querySelectorAll(`input[data-feature="${k}"][data-plan]`);
                const checkedPlans = Array.from(planCheckboxes).filter(cb => cb.checked).map(cb => cb.dataset.plan);
                await this.updateFeature(k, mode, checkedPlans);
            }
        });
    }

    async updateFeature(k, mode, checkedPlans){
        try{
            const result = await api.updateAdminFeatures({ [k]: { mode, plans: checkedPlans } });
            if (!result.success) {
                console.error('Failed to update feature:', result.error);
                return;
            }
            console.log('Feature updated successfully');
        }catch(error){
            console.error('Error updating feature:', error);
        }
    }

    async reloadFeatures(){
        const list = this.container.querySelector('#featuresList');
        list.innerHTML = '<div class="text-sm text-gray-500">Loading...</div>';
        try{
            const featuresResult = await api.getAdminFeatures();
            if (!featuresResult.success) { 
                list.innerHTML = '<div class="text-sm text-red-500">Failed to load features</div>'; 
                return; 
            }
            const features = featuresResult.data || {};
            
            // Try fetch plans for selection from admin API
            let plans = [];
            try{
                const plansResult = await api.getAdminPlans();
                if (plansResult.success) { 
                    plans = plansResult.data || []; 
                }
            }catch(error){ 
                console.error('Error loading plans:', error);
                plans = []; 
            }
            
            const canToggle = (window.authManager && (window.authManager.can('settings.update') || window.authManager.can('features.toggle')));
            const entries = Object.keys(features).map(k => {
                const v = features[k] || { mode: 'hidden', plans: [] };
                const planChecks = (plans.map(p => `
                  <label class="inline-flex items-center mr-2"><input type=checkbox data-plan="${p.id}" data-feature="${k}" ${ (v.plans||[]).includes(p.id) ? 'checked' : '' } ${canToggle ? '' : 'disabled'} /> <span class="ml-2">${p.name}</span></label>
                `)).join('');
                return `
                  <div class="border rounded p-4">
                    <div class="font-medium mb-2">${k}</div>
                    <div class="mb-2">
                      <label class="inline-flex items-center mr-4">
                        <input type=radio name="mode_${k}" value="hidden" ${v.mode === 'hidden' ? 'checked' : ''} ${canToggle ? '' : 'disabled'} />
                        <span class="ml-2">Gizli</span>
                      </label>
                      <label class="inline-flex items-center mr-4">
                        <input type=radio name="mode_${k}" value="visible" ${v.mode === 'visible' ? 'checked' : ''} ${canToggle ? '' : 'disabled'} />
                        <span class="ml-2">Görünür</span>
                      </label>
                      <label class="inline-flex items-center">
                        <input type=radio name="mode_${k}" value="plan-based" ${v.mode === 'plan-based' ? 'checked' : ''} ${canToggle ? '' : 'disabled'} />
                        <span class="ml-2">Plan Bazlı</span>
                      </label>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">Planlar:</div>
                    <div class="flex flex-wrap">${planChecks}</div>
                  </div>
                `;
            }).join('');
            list.innerHTML = entries || '<div class="text-sm text-gray-500">Özellik bulunamadı</div>';
        }catch(error){
            console.error('Error loading features:', error);
            list.innerHTML = '<div class="text-sm text-red-500">Yükleme hatası</div>';
        }
    }
}

// Export
if (typeof window !== 'undefined') window.AdminFeaturesModule = AdminFeaturesModule;
if (typeof module !== 'undefined' && module.exports) module.exports = AdminFeaturesModule;
