const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

console.log('✅ Dashboard charge - VERSION SIMPLE');

// ============ TEST BOUTON ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM ready');
    
    // TEST SIMPLE
    const btn = document.getElementById('searchBtn');
    console.log('🔵 searchBtn:', btn);
    
    if (btn) {
        btn.onclick = function() {
            alert('✅ BOUTON SEARCH FONCTIONNE !');
        };
        console.log('✅ Bouton search attache');
    }
    
    // TEST LOGOUT
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        };
        console.log('✅ Logout attache');
    }
});