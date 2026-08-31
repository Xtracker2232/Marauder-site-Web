// ============================================
// INVESTIGATION MODULE - VERSION TEST
// ============================================
console.log('🔍 Investigation module chargé - TEST');

// ============ GENERER LA CARTE ============
function generateFranceMap() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="100%" height="100%">
        <rect width="600" height="700" fill="#151515" rx="8" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <polygon points="300,80 480,180 520,350 420,500 180,500 80,350 120,180" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="rgba(255,255,255,0.03)"/>
        <circle id="investigationMapPin" cx="300" cy="190" r="14" fill="none" stroke="#ffffff" stroke-width="2.5"/>
        <circle id="investigationMapPinDot" cx="300" cy="190" r="5" fill="#ffffff"/>
        <circle cx="300" cy="190" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <text x="300" y="240" fill="rgba(255,255,255,0.1)" font-size="14" font-family="Arial" text-anchor="middle">France</text>
    </svg>
    `;
}

// ============ INITIALISER LA CARTE ============
function initFranceMap() {
    console.log('🔄 Initialisation de la carte...');
    const container = document.getElementById('investigationMapContainer');
    if (container) {
        container.innerHTML = generateFranceMap();
        console.log('✅ Carte France initialisee avec succes');
    } else {
        console.error('❌ Conteneur investigationMapContainer non trouve');
    }
}

// ============ OPEN INVESTIGATION ============
function openInvestigation(index) {
    console.log('🔍 openInvestigation appelé avec index:', index);
    const data = window._resultsData;
    if (!data || !data[index]) {
        alert('Personne introuvable');
        return;
    }
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Initialiser la carte si elle n'est pas encore chargée
        initFranceMap();
    } else {
        alert('Overlay non trouvé');
    }
}

// ============ CLOSE INVESTIGATION ============
function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============ EXPOSER ============
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM chargé, initialisation de la carte...');
    initFranceMap();
});

console.log('✅ Investigation module TEST pret');