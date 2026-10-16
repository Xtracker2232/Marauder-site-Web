// ============================================
// services/aiService.js — Marauder IA (Groq)
// ============================================
const Groq = require('groq-sdk');

let groq = null;

function getGroq() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY non configurée');
    }
    if (!groq) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }
    return groq;
}

const SYSTEM_EXTRACT = `Tu es un assistant d'extraction pour Marauder, plateforme OSINT française.

Analyse la question de l'enquêteur et extrais les critères de recherche.

Réponds UNIQUEMENT en JSON valide :
{
  "criteria": {
    "nom_famille": "...", "prenom": "...", "nom_naissance": "...",
    "email": "...", "telephone": "...", "adresse": "...",
    "code_postal": "...", "ville": "...", "ville_naissance": "...",
    "date_naissance": "YYYY-MM-DD", "annee_naissance": "...",
    "genre": "M" ou "F", "nir": "...", "iban": "...", "bic": "...",
    "adresse_ip": "...", "steam_id": "...", "discord_id": "...",
    "xbox_live_id": "...", "live_id": "...",
    "fivem_license": "...", "fivem_license2": "...",
    "vin_plaque": "...", "profession": "..."
  },
  "interpretation": "Résumé court en français"
}

RÈGLES :
- N'inclus QUE les champs mentionnés
- Ne devine JAMAIS
- Genre : homme/mec/masculin → "M", femme/fille/féminin → "F"

Exemples :
- "trouve Jean Dupont à Paris" → {"criteria":{"nom_famille":"Dupont","prenom":"Jean","ville":"Paris"},"interpretation":"Jean Dupont à Paris"}
- "un mec né en 1990" → {"criteria":{"genre":"M","annee_naissance":"1990"},"interpretation":"Homme né en 1990"}`;

const SYSTEM_RESPONSE = `Tu es Marauder, IA d'investigation OSINT française.
Tu parles à un enquêteur. Ton pro, direct.

Réponds en 2-3 phrases MAX, en français naturel.
- 0 résultat → propose d'élargir
- ≥ 1 résultat → annonce le nombre + mini-résumé
- N'invente JAMAIS d'infos
- Vouvoie l'utilisateur`;

async function extractCriteria(userQuery) {
    const client = getGroq();
    const chat = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYSTEM_EXTRACT },
            { role: 'user', content: userQuery }
        ]
    });
    try {
        return JSON.parse(chat.choices[0].message.content);
    } catch (e) {
        return { criteria: {}, interpretation: '' };
    }
}

async function formulateResponse(query, interpretation, results) {
    const client = getGroq();
    const chat = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.6,
        max_tokens: 250,
        messages: [
            { role: 'system', content: SYSTEM_RESPONSE },
            {
                role: 'user',
                content: `Question : "${query}"
Critères : ${interpretation}
Nombre de fiches : ${results.length}
Aperçu : ${JSON.stringify(results.slice(0, 3))}

Formule ta réponse.`
            }
        ]
    });
    return chat.choices[0].message.content.trim();
}

module.exports = { extractCriteria, formulateResponse };