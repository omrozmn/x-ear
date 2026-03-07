function switchTab(tabName) {
    const tabs = ['general', 'profile', 'users', 'branches', 'integrations', 'etiket', 'subscription'];
    tabs.forEach(tab => {
        document.getElementById(tab + 'Tab').classList.remove('active');
        document.getElementById(tab + 'TabBtn').classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    document.getElementById(tabName + 'TabBtn').classList.add('active');
}

// Profile tab helpers
function loadProfileData() {
    const user = (window.authManager && typeof window.authManager.getCurrentUser === 'function') ? window.authManager.getCurrentUser() : null;
    if (user) {
        const nameEl = document.getElementById('profileName');
        const emailEl = document.getElementById('profileEmail');
        const phoneEl = document.getElementById('profilePhone');
        if (nameEl) nameEl.value = user.username || '';
        if (emailEl) emailEl.value = user.email || '';
        if (phoneEl) phoneEl.value = user.phone || '';
    }
}

function resetProfileForm() {
    const form = document.getElementById('profileForm');
    if (form) form.reset();
    loadProfileData();
}

function saveProfile() {
    const name = document.getElementById('profileName')?.value || '';
    const email = document.getElementById('profileEmail')?.value || '';
    const phone = document.getElementById('profilePhone')?.value || '';
    const newPassword = document.getElementById('profileNewPassword')?.value || '';

    // For now, mock-save: call backend API if exists, otherwise update mock authManager
    if (window.authManager && typeof window.authManager.getCurrentUser === 'function') {
        // In a real app, POST to /api/users/me or similar
        alert('Profil bilgileriniz kaydedildi (mock).');
        // If authManager stores current user in localStorage, update it
        try {
            const current = window.authManager.getCurrentUser() || {};
            current.username = name;
            current.email = email;
            current.phone = phone;
            // Persist to localStorage for mock flows
            localStorage.setItem('currentUser', JSON.stringify(current));
        } catch (e) { console.warn(e); }
    } else {
        alert('Profil kaydı için backend bağlantısı yok. (mock)');
    }
}

let subscription;
let usage;
let addons;

function loadSubscriptionData() {
    // Mock data - replace with actual API call
    subscription = {
        plan: 'Altın',
        daysRemaining: 250,
    };

    usage = {
        patientRecordCount: 750,
        maxPatientRecords: 1000,
        eFaturaKontor: 120,
        smsKredi: 450,
        sgkIntegration: true,
        utsIntegration: false,
    };

    addons = [
        { id: 'sgk', name: 'SGK Entegrasyonu', enabled: true },
        { id: 'uts', name: 'ÜTS Entegrasyonu', enabled: false },
    ];

    const subscriptionDetails = document.getElementById('subscription-details');
    if (subscriptionDetails) {
        subscriptionDetails.innerHTML = `
            <div class="space-y-4">
                <div>
                    <p class="text-sm font-medium text-gray-500">Mevcut Paket</p>
                    <p class="text-2xl font-bold text-gray-900">${subscription.plan}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-500">Kalan Gün</p>
                    <p class="text-2xl font-bold text-gray-900">${subscription.daysRemaining}</p>
                </div>
            </div>
        `;
    }


    const usageDetails = document.getElementById('usage-details');
    if (usageDetails) {
        usageDetails.innerHTML = `
            <div>
                <p class="text-sm font-medium text-gray-500">Hasta Kayıtları</p>
                <p class="text-lg font-semibold text-gray-900">${usage.patientRecordCount} / ${usage.maxPatientRecords}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">E-Fatura Kontör</p>
                <p class="text-lg font-semibold text-gray-900">${usage.eFaturaKontor}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">SMS Kredisi</p>
                <p class="text-lg font-semibold text-gray-900">${usage.smsKredi}</p>
            </div>
        `;
    }

    const addonsContainer = document.getElementById('addons-container');
    if (addonsContainer) {
        addonsContainer.innerHTML = addons.map(addon => `
            <div class="flex items-center justify-between">
                <div>
                    <label class="text-sm font-medium text-gray-700">${addon.name}</label>
                </div>
                <label class="switch">
                    <input type="checkbox" ${addon.enabled ? 'checked' : ''} onchange="toggleAddon('${addon.id}', this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        `).join('');
    }
}

function openChangePackageModal() {
    document.getElementById('changePackageModal').classList.remove('hidden');
}

function closeChangePackageModal() {
    document.getElementById('changePackageModal').classList.add('hidden');
}

function openBuyKontorModal() {
    document.getElementById('buyKontorModal').classList.remove('hidden');
}

function closeBuyKontorModal() {
    document.getElementById('buyKontorModal').classList.add('hidden');
}

function toggleAddon(addonId, enabled) {
    const addon = addons.find(a => a.id === addonId);
    if (addon) {
        addon.enabled = enabled;
    }
    loadSubscriptionData();
}

function changePackage(packageName) {
    // Mock data update - replace with actual API call
    subscription.plan = packageName;
    alert(`${packageName} paketine geçiş yapıldı.`);
    closeChangePackageModal();
    loadSubscriptionData();
}

function buyKontor() {
    const amount = document.querySelector('#buyKontorModal input[type="number"]').value;
    if (amount > 0) {
        alert(`${amount} kontör satın alınıyor...`);
        // Add API call to buy kontor
        closeBuyKontorModal();
    } else {
        alert('Lütfen geçerli bir miktar girin.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptionData();
    // Populate profile fields and honor URL hash
    loadProfileData();
    // If coming from header link with #profile, open profile tab
    if (window.location && window.location.hash === '#profile') {
        switchTab('profile');
        // Scroll to top to show tab content
        window.scrollTo(0, 0);
    }
});