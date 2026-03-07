// Auth Manager for development
const authManager = {
    getCurrentUser: function() {
        // Return a mock user for development
        return {
            username: 'Admin User',
            id: 1,
            role: 'admin'
        };
    },
    
    logout: function() {
        // Mock logout - just redirect to login
        if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
            // In development, just stay on the page or redirect to login
            // window.location.href = 'login.html';
            console.log('Logout clicked - staying on page for development');
        }
    }
};

// Make it globally available
window.authManager = authManager;

document.addEventListener('DOMContentLoaded', function () {
    // Temporarily disabled authentication for development
    /*
    const token = localStorage.getItem('token');
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/');
    const isRegisterPage = window.location.pathname.endsWith('register.html');

    if (!token && !isLoginPage && !isRegisterPage) {
        window.location.href = '/login.html';
        return;
    }

    if (token && (isLoginPage || isRegisterPage)) {
        window.location.href = '/dashboard.html';
        return;
    }
    */

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            authManager.logout();
        });
    }
});