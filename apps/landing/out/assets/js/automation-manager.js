/**
 * Automation Manager - Handles automation settings page functionality
 */

class AutomationManager {
    constructor() {
        this.currentRule = null;
        this.conditionCounter = 0;
        this.actionCounter = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStats();
        this.loadRulesTable();
        this.populateTriggerOptions();
        this.populateActionOptions();
    }

    bindEvents() {
        // Modal controls
        document.getElementById('create-rule-btn').addEventListener('click', () => this.openCreateRuleModal());
        document.getElementById('automation-logs-btn').addEventListener('click', () => this.openLogsModal());
        document.getElementById('close-rule-modal').addEventListener('click', () => this.closeRuleModal());
        document.getElementById('close-logs-modal').addEventListener('click', () => this.closeLogsModal());
        document.getElementById('cancel-rule-btn').addEventListener('click', () => this.closeRuleModal());

        // Form controls
        document.getElementById('rule-form').addEventListener('submit', (e) => this.handleRuleSubmit(e));
        document.getElementById('add-condition-btn').addEventListener('click', () => this.addCondition());
        document.getElementById('add-action-btn').addEventListener('click', () => this.addAction());

        // Search and filter
        document.getElementById('search-rules').addEventListener('input', (e) => this.filterRules(e.target.value));
        document.getElementById('filter-status').addEventListener('change', (e) => this.filterRulesByStatus(e.target.value));

        // Close modals on outside click
        document.getElementById('rule-modal').addEventListener('click', (e) => {
            if (e.target.id === 'rule-modal') this.closeRuleModal();
        });
        document.getElementById('logs-modal').addEventListener('click', (e) => {
            if (e.target.id === 'logs-modal') this.closeLogsModal();
        });
    }

    loadStats() {
        if (!window.automationEngine) {
            setTimeout(() => this.loadStats(), 1000);
            return;
        }

        const rules = window.automationEngine.getRules();
        const logs = window.automationEngine.getExecutionLogs();
        const smsLogs = window.automationEngine.getSMSLogs();

        // Active rules count
        const activeRules = rules.filter(rule => rule.active).length;
        document.getElementById('active-rules-count').textContent = activeRules;

        // Today's executions
        const today = new Date().toISOString().split('T')[0];
        const todayExecutions = logs.filter(log => log.timestamp.startsWith(today)).length;
        document.getElementById('today-executions-count').textContent = todayExecutions;

        // SMS sent today
        const todaySMS = smsLogs.filter(sms => sms.timestamp.startsWith(today)).length;
        document.getElementById('sms-sent-count').textContent = todaySMS;

        // Success rate
        const successfulExecutions = logs.filter(log => log.status === 'success').length;
        const successRate = logs.length > 0 ? Math.round((successfulExecutions / logs.length) * 100) : 0;
        document.getElementById('success-rate').textContent = `${successRate}%`;
    }

    loadRulesTable() {
        if (!window.automationEngine) {
            setTimeout(() => this.loadRulesTable(), 1000);
            return;
        }

        const rules = window.automationEngine.getRules();
        const logs = window.automationEngine.getExecutionLogs();
        const tbody = document.getElementById('rules-table-body');

        tbody.innerHTML = rules.map(rule => {
            const lastExecution = logs
                .filter(log => log.ruleId === rule.id)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            const lastExecutionText = lastExecution 
                ? Utils.formatDate(lastExecution.timestamp)
                : 'Hiç çalışmadı';

            const statusBadge = rule.active 
                ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Aktif</span>'
                : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pasif</span>';

            const triggerName = this.getTriggerDisplayName(rule.trigger);
            const actionsText = rule.actions.map(action => this.getActionDisplayName(action.type)).join(', ');

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${rule.name}</div>
                            <div class="text-sm text-gray-500">${rule.description || ''}</div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${triggerName}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900">${actionsText}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${lastExecutionText}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div class="flex items-center space-x-2">
                            <button onclick="automationManager.editRule('${rule.id}')" class="text-blue-600 hover:text-blue-900">
                                Düzenle
                            </button>
                            <button onclick="automationManager.toggleRule('${rule.id}')" class="text-${rule.active ? 'yellow' : 'green'}-600 hover:text-${rule.active ? 'yellow' : 'green'}-900">
                                ${rule.active ? 'Durdur' : 'Başlat'}
                            </button>
                            <button onclick="automationManager.deleteRule('${rule.id}')" class="text-red-600 hover:text-red-900">
                                Sil
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateTriggerOptions() {
        if (!window.automationEngine) {
            setTimeout(() => this.populateTriggerOptions(), 1000);
            return;
        }

        const triggers = window.automationEngine.getTriggers();
        const select = document.getElementById('rule-trigger');
        
        select.innerHTML = '<option value="">Tetikleyici seçin...</option>' +
            triggers.map(trigger => `<option value="${trigger.id}">${trigger.name}</option>`).join('');
    }

    populateActionOptions() {
        if (!window.automationEngine) {
            setTimeout(() => this.populateActionOptions(), 1000);
            return;
        }

        this.availableActions = window.automationEngine.getActions();
    }

    openCreateRuleModal() {
        this.currentRule = null;
        this.resetForm();
        document.getElementById('rule-modal-title').textContent = 'Yeni Otomasyon Kuralı';
        document.getElementById('rule-modal').classList.remove('hidden');
    }

    openEditRuleModal(rule) {
        this.currentRule = rule;
        this.populateForm(rule);
        document.getElementById('rule-modal-title').textContent = 'Otomasyon Kuralını Düzenle';
        document.getElementById('rule-modal').classList.remove('hidden');
    }

    closeRuleModal() {
        document.getElementById('rule-modal').classList.add('hidden');
        this.resetForm();
    }

    openLogsModal() {
        this.loadLogsTable();
        document.getElementById('logs-modal').classList.remove('hidden');
    }

    closeLogsModal() {
        document.getElementById('logs-modal').classList.add('hidden');
    }

    resetForm() {
        document.getElementById('rule-form').reset();
        document.getElementById('conditions-container').innerHTML = '';
        document.getElementById('actions-container').innerHTML = '';
        this.conditionCounter = 0;
        this.actionCounter = 0;
    }

    populateForm(rule) {
        document.getElementById('rule-name').value = rule.name;
        document.getElementById('rule-description').value = rule.description || '';
        document.getElementById('rule-trigger').value = rule.trigger;
        document.getElementById('rule-status').value = rule.active.toString();

        // Populate conditions
        document.getElementById('conditions-container').innerHTML = '';
        this.conditionCounter = 0;
        if (rule.conditions) {
            rule.conditions.forEach(condition => {
                this.addCondition(condition);
            });
        }

        // Populate actions
        document.getElementById('actions-container').innerHTML = '';
        this.actionCounter = 0;
        if (rule.actions) {
            rule.actions.forEach(action => {
                this.addAction(action);
            });
        }
    }

    addCondition(condition = null) {
        const conditionId = `condition-${this.conditionCounter++}`;
        const container = document.getElementById('conditions-container');
        
        const conditionDiv = document.createElement('div');
        conditionDiv.className = 'flex items-center space-x-3 p-4 border border-gray-200 rounded-lg';
        conditionDiv.innerHTML = `
            <div class="flex-1 grid grid-cols-3 gap-3">
                <input type="text" name="${conditionId}-field" placeholder="Alan adı" value="${condition?.field || ''}" 
                       class="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <select name="${conditionId}-operator" class="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="equals" ${condition?.operator === 'equals' ? 'selected' : ''}>Eşittir</option>
                    <option value="notEquals" ${condition?.operator === 'notEquals' ? 'selected' : ''}>Eşit değildir</option>
                    <option value="greaterThan" ${condition?.operator === 'greaterThan' ? 'selected' : ''}>Büyüktür</option>
                    <option value="greaterThanOrEqual" ${condition?.operator === 'greaterThanOrEqual' ? 'selected' : ''}>Büyük eşittir</option>
                    <option value="lessThan" ${condition?.operator === 'lessThan' ? 'selected' : ''}>Küçüktür</option>
                    <option value="lessThanOrEqual" ${condition?.operator === 'lessThanOrEqual' ? 'selected' : ''}>Küçük eşittir</option>
                    <option value="contains" ${condition?.operator === 'contains' ? 'selected' : ''}>İçerir</option>
                    <option value="notContains" ${condition?.operator === 'notContains' ? 'selected' : ''}>İçermez</option>
                </select>
                <input type="text" name="${conditionId}-value" placeholder="Değer" value="${condition?.value || ''}" 
                       class="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            <button type="button" onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        
        container.appendChild(conditionDiv);
    }

    addAction(action = null) {
        const actionId = `action-${this.actionCounter++}`;
        const container = document.getElementById('actions-container');
        
        const actionDiv = document.createElement('div');
        actionDiv.className = 'p-4 border border-gray-200 rounded-lg';
        
        const actionSelect = document.createElement('select');
        actionSelect.name = `${actionId}-type`;
        actionSelect.className = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3';
        actionSelect.innerHTML = '<option value="">Eylem seçin...</option>' +
            this.availableActions.map(act => 
                `<option value="${act.id}" ${action?.type === act.id ? 'selected' : ''}>${act.name}</option>`
            ).join('');
        
        const parametersDiv = document.createElement('div');
        parametersDiv.className = 'space-y-3';
        parametersDiv.id = `${actionId}-parameters`;
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'text-red-600 hover:text-red-800 text-sm font-medium';
        removeButton.textContent = 'Eylemi Kaldır';
        removeButton.onclick = () => actionDiv.remove();
        
        actionDiv.appendChild(actionSelect);
        actionDiv.appendChild(parametersDiv);
        actionDiv.appendChild(removeButton);
        
        // Handle action type change
        actionSelect.addEventListener('change', (e) => {
            this.updateActionParameters(actionId, e.target.value);
        });
        
        container.appendChild(actionDiv);
        
        // If editing existing action, populate parameters
        if (action) {
            this.updateActionParameters(actionId, action.type, action.parameters);
        }
    }

    updateActionParameters(actionId, actionType, existingParams = {}) {
        const parametersDiv = document.getElementById(`${actionId}-parameters`);
        parametersDiv.innerHTML = '';
        
        if (!actionType) return;
        
        const actionConfig = this.availableActions.find(a => a.id === actionType);
        if (!actionConfig) return;
        
        actionConfig.parameters.forEach(param => {
            const paramDiv = document.createElement('div');
            paramDiv.className = 'grid grid-cols-3 gap-3 items-center';
            
            const label = document.createElement('label');
            label.className = 'text-sm font-medium text-gray-700';
            label.textContent = this.getParameterDisplayName(param);
            
            let input;
            if (param === 'message' || param === 'body' || param === 'description') {
                input = document.createElement('textarea');
                input.rows = 3;
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }
            
            input.name = `${actionId}-${param}`;
            input.placeholder = this.getParameterPlaceholder(param);
            input.value = existingParams[param] || '';
            input.className = 'col-span-2 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
            
            paramDiv.appendChild(label);
            paramDiv.appendChild(input);
            parametersDiv.appendChild(paramDiv);
        });
    }

    handleRuleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const rule = {
            name: formData.get('name'),
            description: formData.get('description'),
            trigger: formData.get('trigger'),
            active: formData.get('active') === 'true',
            conditions: this.extractConditions(formData),
            actions: this.extractActions(formData)
        };
        
        if (this.currentRule) {
            rule.id = this.currentRule.id;
            window.automationEngine.updateRule(rule.id, rule);
            Utils.showToast('Otomasyon kuralı güncellendi', 'success');
        } else {
            window.automationEngine.addRule(rule);
            Utils.showToast('Yeni otomasyon kuralı oluşturuldu', 'success');
        }
        
        this.closeRuleModal();
        this.loadRulesTable();
        this.loadStats();
    }

    extractConditions(formData) {
        const conditions = [];
        const conditionFields = Array.from(formData.keys()).filter(key => key.includes('-field'));
        
        conditionFields.forEach(fieldKey => {
            const prefix = fieldKey.replace('-field', '');
            const field = formData.get(fieldKey);
            const operator = formData.get(`${prefix}-operator`);
            const value = formData.get(`${prefix}-value`);
            
            if (field && operator && value) {
                conditions.push({ field, operator, value });
            }
        });
        
        return conditions;
    }

    extractActions(formData) {
        const actions = [];
        const actionTypes = Array.from(formData.keys()).filter(key => key.includes('-type'));
        
        actionTypes.forEach(typeKey => {
            const prefix = typeKey.replace('-type', '');
            const type = formData.get(typeKey);
            
            if (type) {
                const parameters = {};
                const actionConfig = this.availableActions.find(a => a.id === type);
                
                if (actionConfig) {
                    actionConfig.parameters.forEach(param => {
                        const value = formData.get(`${prefix}-${param}`);
                        if (value) {
                            parameters[param] = value;
                        }
                    });
                }
                
                actions.push({ type, parameters });
            }
        });
        
        return actions;
    }

    editRule(ruleId) {
        const rule = window.automationEngine.getRule(ruleId);
        if (rule) {
            this.openEditRuleModal(rule);
        }
    }

    toggleRule(ruleId) {
        const rule = window.automationEngine.getRule(ruleId);
        if (rule) {
            window.automationEngine.updateRule(ruleId, { active: !rule.active });
            Utils.showToast(`Kural ${rule.active ? 'durduruldu' : 'başlatıldı'}`, 'success');
            this.loadRulesTable();
            this.loadStats();
        }
    }

    deleteRule(ruleId) {
        if (confirm('Bu kuralı silmek istediğinizden emin misiniz?')) {
            window.automationEngine.removeRule(ruleId);
            Utils.showToast('Kural silindi', 'success');
            this.loadRulesTable();
            this.loadStats();
        }
    }

    filterRules(searchTerm) {
        const rows = document.querySelectorAll('#rules-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }

    filterRulesByStatus(status) {
        const rows = document.querySelectorAll('#rules-table-body tr');
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const statusBadge = row.querySelector('.inline-flex');
                const isActive = statusBadge.textContent.trim() === 'Aktif';
                const matches = (status === 'active' && isActive) || (status === 'inactive' && !isActive);
                row.style.display = matches ? '' : 'none';
            }
        });
    }

    loadLogsTable() {
        const logs = window.automationEngine.getExecutionLogs();
        const tbody = document.getElementById('logs-table-body');
        
        tbody.innerHTML = logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100) // Show only last 100 logs
            .map(log => {
                const statusBadge = log.status === 'success'
                    ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Başarılı</span>'
                    : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Hata</span>';
                
                return `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Utils.formatDate(log.timestamp)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${log.ruleName}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${this.getEventDisplayName(log.eventType)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            ${statusBadge}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${log.executionTime}ms
                        </td>
                    </tr>
                `;
            }).join('');
    }

    // Helper methods for display names
    getTriggerDisplayName(triggerId) {
        const triggerNames = {
            'patient.created': 'Yeni Hasta Kaydı',
            'patient.birthday': 'Hasta Doğum Günü',
            'patient.followup.due': 'Takip Randevusu Zamanı',
            'appointment.reminder': 'Randevu Hatırlatması',
            'appointment.noshow': 'Randevuya Gelmeme',
            'device.trial.reminder': 'Cihaz Denemesi Hatırlatması',
            'device.trial.expired': 'Cihaz Denemesi Süresi Doldu',
            'inventory.low.inventory': 'Düşük Stok Uyarısı',
            'sgk.report.deadline': 'SGK Rapor Deadline'
        };
        return triggerNames[triggerId] || triggerId;
    }

    getActionDisplayName(actionId) {
        const actionNames = {
            'sms.send': 'SMS Gönder',
            'sms.send.bulk': 'Toplu SMS Gönder',
            'email.send': 'E-posta Gönder',
            'appointment.create': 'Randevu Oluştur',
            'appointment.reschedule': 'Randevu Yeniden Planla',
            'task.create': 'Görev Oluştur',
            'notification.create': 'Bildirim Oluştur',
            'data.update': 'Veri Güncelle',
            'workflow.start': 'İş Akışı Başlat'
        };
        return actionNames[actionId] || actionId;
    }

    getEventDisplayName(eventType) {
        return this.getTriggerDisplayName(eventType);
    }

    getParameterDisplayName(param) {
        const paramNames = {
            'recipient': 'Alıcı',
            'recipients': 'Alıcılar',
            'message': 'Mesaj',
            'template': 'Şablon',
            'subject': 'Konu',
            'body': 'İçerik',
            'patient': 'Hasta',
            'type': 'Tür',
            'date': 'Tarih',
            'clinician': 'Klinisyen',
            'appointment': 'Randevu',
            'newDate': 'Yeni Tarih',
            'assignee': 'Atanan',
            'title': 'Başlık',
            'description': 'Açıklama',
            'priority': 'Öncelik',
            'dueDate': 'Bitiş Tarihi',
            'entity': 'Varlık',
            'field': 'Alan',
            'value': 'Değer',
            'workflowId': 'İş Akışı ID',
            'context': 'Bağlam'
        };
        return paramNames[param] || param;
    }

    getParameterPlaceholder(param) {
        const placeholders = {
            'recipient': '{{patient.phone}}',
            'recipients': '{{patients.phone}}',
            'message': 'Merhaba {{patient.firstName}}, ...',
            'template': 'welcome_patient',
            'subject': 'Randevu Hatırlatması',
            'body': 'Randevu detayları...',
            'patient': '{{patient.id}}',
            'type': 'hearing_test',
            'date': '{{appointment.date}}',
            'clinician': '{{clinician.id}}',
            'appointment': '{{appointment.id}}',
            'newDate': '{{newDate}}',
            'assignee': 'staff_member_id',
            'title': 'Görev başlığı',
            'description': 'Görev açıklaması',
            'priority': 'high',
            'dueDate': '{{dueDate}}',
            'entity': 'patient',
            'field': 'status',
            'value': 'active',
            'workflowId': 'workflow_id',
            'context': '{{context}}'
        };
        return placeholders[param] || `${param} değeri`;
    }
}

// Initialize Automation Manager
let automationManager;
document.addEventListener('DOMContentLoaded', () => {
    automationManager = new AutomationManager();
});

// Export for global access
window.AutomationManager = AutomationManager;
window.automationManager = automationManager;