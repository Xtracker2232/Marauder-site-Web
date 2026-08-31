// ============================================
// PIVOT FAMILLE
// ============================================
async function enrichirAvecPivotFamille(results, token) {
    if (!results || results.length === 0) return results;
    
    const enrichedResults = [];
    
    for (const person of results) {
        const enriched = { ...person };
        const famille = [];
        const pivotDone = new Set();
        const maxFamille = 10;
        
        // PIVOT 1 : ADRESSE + CODE POSTAL
        if (person.adresse && person.code_postal && famille.length < maxFamille) {
            const pivotKey = `adresse_${person.adresse}_${person.code_postal}`;
            if (!pivotDone.has(pivotKey)) {
                pivotDone.add(pivotKey);
                try {
                    const pivotPayload = {
                        adresse: person.adresse,
                        code_postal: person.code_postal,
                        flexible: false,
                        per_page: 20
                    };
                    
                    const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': BRIX_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(pivotPayload)
                    });
                    
                    const pivotData = await pivotResponse.json();
                    const pivotResults = pivotData.data?.results || [];
                    
                    for (const pr of pivotResults) {
                        if (famille.length >= maxFamille) break;
                        if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                        
                        const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                        if (duplicate) continue;
                        
                        famille.push({
                            prenom: pr.prenom || '',
                            nom_famille: pr.nom_famille || '',
                            date_naissance: pr.date_naissance || '',
                            email: pr.email || '',
                            telephone: pr.telephone || '',
                            adresse: pr.adresse || '',
                            code_postal: pr.code_postal || '',
                            ville: pr.ville || '',
                            lien: 'Même adresse',
                            _sources: pr._sources || []
                        });
                    }
                } catch (error) {
                    console.warn('Pivot adresse échoué:', error.message);
                }
            }
        }
        
        // PIVOT 2 : TÉLÉPHONE
        if (person.telephone && famille.length < maxFamille) {
            const phoneClean = person.telephone.replace(/\D/g, '');
            if (phoneClean.length >= 8) {
                const pivotKey = `tel_${phoneClean}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            telephone: phoneClean,
                            flexible: false,
                            per_page: 15
                        };
                        
                        const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': BRIX_API_KEY,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(pivotPayload)
                        });
                        
                        const pivotData = await pivotResponse.json();
                        const pivotResults = pivotData.data?.results || [];
                        
                        for (const pr of pivotResults) {
                            if (famille.length >= maxFamille) break;
                            if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                            
                            const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                            if (duplicate) continue;
                            
                            famille.push({
                                prenom: pr.prenom || '',
                                nom_famille: pr.nom_famille || '',
                                date_naissance: pr.date_naissance || '',
                                email: pr.email || '',
                                telephone: pr.telephone || '',
                                adresse: pr.adresse || '',
                                code_postal: pr.code_postal || '',
                                ville: pr.ville || '',
                                lien: 'Téléphone partagé',
                                _sources: pr._sources || []
                            });
                        }
                    } catch (error) {
                        console.warn('Pivot téléphone échoué:', error.message);
                    }
                }
            }
        }
        
        // PIVOT 3 : EMAIL
        if (person.email && famille.length < maxFamille) {
            const pivotKey = `email_${person.email}`;
            if (!pivotDone.has(pivotKey)) {
                pivotDone.add(pivotKey);
                try {
                    const pivotPayload = {
                        email: person.email,
                        flexible: false,
                        per_page: 10
                    };
                    
                    const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': BRIX_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(pivotPayload)
                    });
                    
                    const pivotData = await pivotResponse.json();
                    const pivotResults = pivotData.data?.results || [];
                    
                    for (const pr of pivotResults) {
                        if (famille.length >= maxFamille) break;
                        if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                        
                        const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                        if (duplicate) continue;
                        
                        famille.push({
                            prenom: pr.prenom || '',
                            nom_famille: pr.nom_famille || '',
                            date_naissance: pr.date_naissance || '',
                            email: pr.email || '',
                            telephone: pr.telephone || '',
                            adresse: pr.adresse || '',
                            code_postal: pr.code_postal || '',
                            ville: pr.ville || '',