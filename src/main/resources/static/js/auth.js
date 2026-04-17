document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    const errLogin = document.getElementById('login-error');
    const errRegister = document.getElementById('register-error');

    // Toggle forms
    showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        errLogin.classList.add('hidden');
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        errRegister.classList.add('hidden');
    });

    // Login Request
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errLogin.classList.add('hidden');
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            console.log("Login Response:", data);
            
            if (res.ok) {
                localStorage.removeItem("userName");
                localStorage.setItem("userName", data.name);
                window.location.href = '/dashboard.html';
            } else {
                errLogin.textContent = data.error || 'Login failed';
                errLogin.classList.remove('hidden');
            }
        } catch (error) {
            errLogin.textContent = 'Server error. Try again.';
            errLogin.classList.remove('hidden');
        }
    });

    // Register Request
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errRegister.classList.add('hidden');
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            console.log("Register Response:", data);
            
            if (res.ok) {
                // switch to login automatically
                localStorage.removeItem("userName");
                localStorage.setItem("userName", data.name);
                document.getElementById('login-email').value = email;
                showLogin.click();
                alert('Registration successful! Please login.');
            } else {
                errRegister.textContent = data.error || 'Registration failed';
                errRegister.classList.remove('hidden');
            }
        } catch (error) {
            errRegister.textContent = 'Server error. Try again.';
            errRegister.classList.remove('hidden');
        }
    });
});
