console.log('Dashboard.js chargé');

const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

// ============ TOAST ============
function showToast(message, type = 'info', duration = 3000) {
    console.log('TOAST:', message, type);
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.error('Toast container non trouvé');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${message} <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ============ VERIFY TOKEN ============
async function verifyToken() {
    console.log('Vérification du token...');
    try {
        const response = await fetch(`${API_URL}/api/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        console.log('Utilisateur:', data.user.username);
        const display = document.getElementById('usernameDisplay');
        if (display) display.textContent = data.user.username;
    } catch (error) {
        console.error('Erreur verify:', error);
        window.location.href = '/login';
    }
}

// ============ SECTIONS TOGGLE ============
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function() {
        const body = this.nextElementSibling;
        const icon = this.querySelector('.toggle-icon');
        if (body) body.classList.toggle('open');
        if (icon) icon.classList.toggle('open');
    });
});

// ============ TABS ============
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
        const tabId = this.dataset.tab;
        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active');
    });
});

// ============ BOUTON RECHERCHE ============
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
    console.log('Bouton searchBtn trouvé');
    searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur searchBtn');
        showToast('Recherche en cours...', 'info');
    });
} else {
    console.error('searchBtn NON trouvé');
}

// ============ BOUTON RECHERCHE PRO ============
const searchBtnPro = document.getElementById('searchBtnPro');
if (searchBtnPro) {
    console.log('Bouton searchBtnPro trouvé');
    searchBtnPro.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur searchBtnPro');
        showToast('Recherche Pro en cours...', 'info');
    });
} else {
    console.error('searchBtnPro NON trouvé');
}

// ============ BOUTON EFFACER ============
const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
    console.log('Bouton clearBtn trouvé');
    clearBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur clearBtn');
        document.querySelectorAll('#tab-french input, #tab-french select').forEach(el => el.value = '');
        document.getElementById('searchResults').innerHTML = '';
        showToast('Formulaire efface', 'info');
    });
} else {
    console.error('clearBtn NON trouvé');
}

const clearBtnPro = document.getElementById('clearBtnPro');
if (clearBtnPro) {
    console.log('Bouton clearBtnPro trouvé');
    clearBtnPro.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur clearBtnPro');
        document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => el.value = '');
        document.getElementById('searchResults').innerHTML = '';
        showToast('Formulaire efface', 'info');
    });
} else {
    console.error('clearBtnPro NON trouvé');
}

// ============ BOUTON LOOKUP ============
const lookupBtn = document.getElementById('lookupBtn');
if (lookupBtn) {
    console.log('Bouton lookupBtn trouvé');
    lookupBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur lookupBtn');
        const value = document.getElementById('lookupValue').value.trim();
        if (!value) {
            showToast('Veuillez entrer une valeur', 'warning');
            return;
        }
        showToast('Lookup en cours...', 'info');
    });
} else {
    console.error('lookupBtn NON trouvé');
}

// ============ BOUTON CREER FICHE ============
const createFicheBtn = document.getElementById('createFicheBtn');
if (createFicheBtn) {
    console.log('Bouton createFicheBtn trouvé');
    createFicheBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur createFicheBtn');
        showToast('Création de fiche...', 'info');
    });
} else {
    console.error('createFicheBtn NON trouvé');
}

// ============ LOGOUT ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    console.log('Bouton logoutBtn trouvé');
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Click sur logoutBtn');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });
} else {
    console.error('logoutBtn NON trouvé');
}

// ============ NAVIGATION ============
document.querySelectorAll('.sidebar-nav li[data-page]').forEach(item => {
    item.addEventListener('click', function() {
        const page = this.dataset.page;
        console.log('Navigation vers:', page);
        
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        
        document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');
    });
});

// ============ SUPPORT TOGGLE ============
const supportToggle = document.getElementById('supportToggle');
if (supportToggle) {
    console.log('Support toggle trouvé');
    supportToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const submenu = document.getElementById('supportSubmenu');
        const arrow = this.querySelector('.support-arrow');
        if (submenu) {
            const isOpen = submenu.style.display === 'block';
            submenu.style.display = isOpen ? 'none' : 'block';
            if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    });
} else {
    console.error('supportToggle NON trouvé');
}

// ============ MOBILE MENU ============
const mobileBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

if (mobileBtn && sidebar && backdrop) {
    console.log('Menu mobile trouvé');
    mobileBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    });

    backdrop.addEventListener('click', function() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    });
} else {
    console.error('Menu mobile NON trouvé');
}

// ============ INIT ============
console.log('Initialisation...');
verifyToken();

// ============ PROFIL ============
async function loadProfile() {
    const container = document.getElementById('profileInfo');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.user) {
            container.innerHTML = `
                <div class="profile-card">
                    <div class="profile-row"><span class="label">Nom d'utilisateur</span><span class="value">${data.user.username}</span></div>
                    <div class="profile-row"><span class="label">Role</span><span class="value">${data.user.role}</span></div>
                    <div class="profile-row"><span class="label">Membre depuis</span><span class="value">${new Date(data.user.created_at).toLocaleDateString()}</span></div>
                    <div class="profile-row"><span class="label">Derniere connexion</span><span class="value">${data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Jamais'}</span></div>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

loadProfile();

console.log('Dashboard.js terminé');