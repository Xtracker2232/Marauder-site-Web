const API_URL = window.location.origin;

// Toggle login/register
document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('errorMessage').style.display = 'none';
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/dashboard.html';
        } else {
            errorDiv.textContent = data.error || 'Erreur de connexion';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Erreur réseau';
        errorDiv.style.display = 'block';
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('errorMessage');

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            errorDiv.style.display = 'none';
            alert('Compte créé ! Vous pouvez maintenant vous connecter.');
            document.getElementById('showLogin').click();
        } else {
            errorDiv.textContent = data.error || 'Erreur d\'inscription';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Erreur réseau';
        errorDiv.style.display = 'block';
    }
});