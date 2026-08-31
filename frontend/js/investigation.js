// ============================================
// INVESTIGATION MODULE - TOUT EST ICI
// ============================================
console.log('🔍 Investigation module chargé');

// ============ DONNEES ============
let investigationData = null;

// ============ COORDONNEES DES VILLES ============
const CITY_COORDS = {
    'paris': { cx: 300, cy: 190 },
    'lyon': { cx: 320, cy: 310 },
    'marseille': { cx: 340, cy: 420 },
    'toulouse': { cx: 260, cy: 380 },
    'bordeaux': { cx: 190, cy: 360 },
    'lille': { cx: 240, cy: 120 },
    'nice': { cx: 390, cy: 390 },
    'nantes': { cx: 170, cy: 280 },
    'strasbourg': { cx: 400, cy: 180 },
    'montpellier': { cx: 300, cy: 380 },
    'rennes': { cx: 160, cy: 230 },
    'grenoble': { cx: 350, cy: 330 },
    'toulon': { cx: 360, cy: 410 },
    'angers': { cx: 190, cy: 260 },
    'dijon': { cx: 350, cy: 240 },
    'le havre': { cx: 210, cy: 170 },
    'reims': { cx: 320, cy: 160 },
    'saint-etienne': { cx: 310, cy: 320 },
    'limoges': { cx: 220, cy: 310 },
    'clermont-ferrand': { cx: 270, cy: 290 },
    'amiens': { cx: 260, cy: 140 },
    'perpignan': { cx: 290, cy: 430 },
    'caen': { cx: 190, cy: 190 },
    'orleans': { cx: 270, cy: 230 },
    'metz': { cx: 370, cy: 170 },
    'besancon': { cx: 380, cy: 220 },
    'mulhouse': { cx: 410, cy: 210 },
    'valence': { cx: 330, cy: 340 },
    'nimes': { cx: 290, cy: 370 },
    'avignon': { cx: 310, cy: 400 },
    'poitiers': { cx: 210, cy: 290 },
    'la rochelle': { cx: 160, cy: 300 }
};

// ============ FORMAT PHONE ============
function formatPhoneInvestigation(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ============ OUVRIR INVESTIGATION ============
function openInvestigation(index) {
    const data = window._resultsData;
    if (!data || !data[index]) {
        if (typeof showToast === 'function') {
            showToast('Personne introuvable', 'error');
        }
        return;
    }

    investigationData = data[index];
    const person = investigationData;
    const overlay = document.getElementById('investigationOverlay');
    if (!overlay) return;

    // Nom
    const fullName = (person.prenom || '') + ' ' + (person.nom_famille || 'Inconnu');
    const nameEl = document.getElementById('investigationName');
    if (nameEl) nameEl.textContent = 'Investigation - ' + fullName;

    // Ville
    const ville = person.ville || person.ville_naissance || person.adresse?.split(',').pop()?.trim() || 'Localisation inconnue';
    const cityLabel = document.getElementById('investigationCityLabel');
    if (cityLabel) cityLabel.textContent = ville;

    // Point sur la carte
    const pin = document.getElementById('investigationMapPin');
    if (pin) {
        const cityKey = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let found = false;
        for (const [key, pos] of Object.entries(CITY_COORDS)) {
            if (cityKey.includes(key) || key.includes(cityKey)) {
                pin.setAttribute('cx', pos.cx);
                pin.setAttribute('cy', pos.cy);
                found = true;
                break;
            }
        }
        if (!found) {
            pin.setAttribute('cx', 300);
            pin.setAttribute('cy', 300);
        }
    }

    // Confiance
    const confidence = person._confidence || 0;
    const confEl = document.getElementById('investigationConfidence');
    if (confEl) {
        confEl.textContent = confidence + '%';
        confEl.className = 'investigation-confidence ' + (confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');
    }

    // Grille d'informations
    const grid = document.getElementById('investigationInfoGrid');
    if (grid) {
        let html = '';
        const importantKeys = ['nom_famille', 'prenom', 'nom_naissance', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance'];
        
        Object.entries(person)
            .filter(([key]) => !key.startsWith('_') && key !== 'famille')
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isImportant = importantKeys.includes(key);
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhoneInvestigation(value);
                html += `
                    <div class="investigation-info-item ${isImportant ? 'important' : ''}">
                        <span class="investigation-info-label">${label}</span>
                        <span class="investigation-info-value">${displayValue}</span>
                    </div>
                `;
            });

        if (person.famille && person.famille.length > 0) {
            html += `
                <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid #2a2a2a;padding-top:12px;margin-top:4px;">
                    <span class="investigation-info-label" style="color:#6b6b6b;font-weight:600;">Famille (${person.famille.length})</span>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                        ${person.famille.map(m => `
                            <span style="background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:6px;padding:4px 12px;font-size:13px;color:#a0a0a0;">
                                ${m.prenom || ''} ${m.nom_famille || ''} ${m.lien ? ' · ' + m.lien : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (person._sources && person._sources.length > 0) {
            html += `
                <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid #2a2a2a;padding-top:12px;margin-top:4px;">
                    <span class="investigation-info-label" style="color:#6b6b6b;font-weight:600;">Sources</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                        ${person._sources.map(s => `
                            <span style="font-size:11px;color:#6b6b6b;background:rgba(255,255,255,0.02);border:1px solid #2a2a2a;padding:2px 10px;border-radius:12px;">${s}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    }

    // Afficher l'overlay
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ============ FERMER INVESTIGATION ============
function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============ COPIER LES DONNEES ============
function copyInvestigationData() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
        return;
    }
    const person = investigationData;
    let text = '=== Marauder Investigation ===\n\n';
    
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_') && key !== 'famille')
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhoneInvestigation(value);
            text += label + ': ' + displayValue + '\n';
        });

    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille ===\n';
        person.famille.forEach(m => {
            text += (m.prenom || '') + ' ' + (m.nom_famille || '');
            if (m.lien) text += ' (' + m.lien + ')';
            text += '\n';
        });
    }

    if (person._sources) text += '\nSources: ' + person._sources.join(', ');
    text += '\n\n--- by Marauder ---';
    
    navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('Copie !', 'success');
    });
}

// ============ AJOUTER A UNE FICHE ============
function addInvestigationToFiche() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
        return;
    }
    if (typeof fichesData !== 'undefined' && fichesData.length === 0) {
        if (typeof showToast === 'function') showToast('Aucune fiche existante', 'warning');
        return;
    }
    
    const selectOptions = fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('');
    
    if (typeof showModal === 'function') {
        showModal('Ajouter a une fiche', `
            <div class="form-group"><label>Selectionner une fiche</label>
            <select id="ficheSelectInvestigation">${selectOptions}<option value="new">+ Creer une nouvelle fiche</option></select></div>
            <div id="newFicheNameContainerInvestigation" style="display:none;">
                <div class="form-group"><label>Nom de la nouvelle fiche</label><input type="text" id="newFicheNameInvestigation" placeholder="Nom de la fiche" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
            </div>
            <div style="font-size:12px;color:#6b6b6b;">Personne: ${investigationData.prenom || ''} ${investigationData.nom_famille || 'Inconnu'}</div>
        `, 'Ajouter', async function() {
            const select = document.getElementById('ficheSelectInvestigation');
            const ficheId = select.value;
            if (ficheId === 'new') {
                const nameInput = document.getElementById('newFicheNameInvestigation');
                const name = nameInput?.value?.trim();
                if (!name) {
                    if (typeof showToast === 'function') showToast('Veuillez donner un nom', 'warning');
                    return;
                }
                try {
                    const createResponse = await fetch(API_URL + '/api/fiches', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ name })
                    });
                    const createData = await createResponse.json();
                    if (createData.fiche) {
                        await addPersonToFiche(createData.fiche.id, investigationData);
                        if (typeof loadFiches === 'function') loadFiches();
                        if (typeof showToast === 'function') showToast('Personne ajoutee !', 'success');
                    }
                } catch (error) {
                    if (typeof showToast === 'function') showToast('Erreur', 'error');
                }
            } else {
                await addPersonToFiche(parseInt(ficheId), investigationData);
                if (typeof loadFiches === 'function') loadFiches();
                if (typeof showToast === 'function') showToast('Personne ajoutee !', 'success');
            }
        });
        
        document.getElementById('ficheSelectInvestigation')?.addEventListener('change', function() {
            const container = document.getElementById('newFicheNameContainerInvestigation');
            if (container) container.style.display = this.value === 'new' ? 'block' : 'none';
        });
    }
}

// ============ AJOUTER AU GRAPHE ============
function addInvestigationToGraphe() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
        return;
    }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(investigationData);
        closeInvestigation();
        document.querySelector('[data-page="graphe"]')?.click();
    } else {
        if (typeof showToast === 'function') showToast('Graphe en developpement', 'info');
    }
}

// ============ BOUTONS ============
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('investigationBack')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationClose')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationCopy')?.addEventListener('click', copyInvestigationData);
    document.getElementById('investigationGraphe')?.addEventListener('click', addInvestigationToGraphe);
    document.getElementById('investigationAddFiche')?.addEventListener('click', addInvestigationToFiche);
});

// ============ EXPOSER LA FONCTION GLOBALEMENT ============
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;

console.log('✅ Investigation module pret - Utilisez openInvestigation(index)');