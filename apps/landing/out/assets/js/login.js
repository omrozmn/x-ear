const api = require('../api');
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    const errorContainer = document.createElement('div');
    errorContainer.id = 'error-message';
    errorContainer.className = 'mb-4 text-red-500 text-sm text-center hidden';
    loginForm.insertBefore(errorContainer, loginForm.firstChild);

    function setLoading(loading) {
        if (loading) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Giriş Yapılıyor...';
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Giriş Yap';
        }
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 5000);
    }

    function clearError() {
        errorContainer.classList.add('hidden');
    }

    function validateForm() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username) {
            showError('Kullanıcı adı gerekli');
            usernameInput.focus();
            return false;
        }

        if (!password) {
            showError('Şifre gerekli');
            passwordInput.focus();
            return false;
        }

        return true;
    }

    async function handleLogin(username, password) {
        try {
            const response = await login(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem(window.STORAGE_KEYS?.ACCESS_TOKEN || 'xear_access_token', data.access_token);
                 window.location.href = 'dashboard.html';
            } else {
                showError(data.message || 'Giriş başarısız. Lütfen tekrar deneyin.');
            }
        } catch (error) {
            showError('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            clearError();

            if (!validateForm()) {
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            setLoading(true);

            try {
                await handleLogin(username, password);
            } finally {
                setLoading(false);
            }
        });

        usernameInput.addEventListener('input', clearError);
        passwordInput.addEventListener('input', clearError);
    }

    if (localStorage.getItem(window.STORAGE_KEYS?.ACCESS_TOKEN || 'xear_access_token')) {
        window.location.href = 'dashboard.html';
    }
});
