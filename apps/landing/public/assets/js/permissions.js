const userPermissions = {
    package: 'basic', // This will be fetched from the backend
    hasAccess: function(feature) {
        const packageFeatures = {
            basic: ['patients', 'appointments', 'reports'],
            professional: ['patients', 'appointments', 'reports', 'inventory', 'invoices', 'campaigns'],
            business: ['patients', 'appointments', 'reports', 'inventory', 'invoices', 'campaigns', 'automation', 'sgk', 'uts'],
            enterprise: ['patients', 'appointments', 'reports', 'inventory', 'invoices', 'campaigns', 'automation', 'sgk', 'uts', 'custom_integrations']
        };

        return packageFeatures[this.package] && packageFeatures[this.package].includes(feature);
    }
};

function updateUserPermissions(package) {
    userPermissions.package = package;
    document.dispatchEvent(new Event('permissionsChanged'));
}

// Example: Fetch user package from backend and update permissions
// Use Orval generated client instead of manual fetch
// if (window.usersGetMe) {
//     window.usersGetMe()
//         .then(data => updateUserPermissions(data.package))
//         .catch(error => console.error('Failed to fetch user package:', error));
// }