// ============ TEXTE TYPÉ ANIMÉ ============
const phrases = [
    'La plateforme CSINT pour les enquêteurs',
    '11 milliards d\'informations indexées',
    'Recherche en moins de 30 ms',
    '20+ critères de recherche disponibles',
    'Arbre familial automatique',
    'Bot Discord intégré'
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typedElement = document.getElementById('typed-text');

function typeEffect() {
    const currentPhrase = phrases[phraseIndex];
    
    if (isDeleting) {
        typedElement.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typedElement.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
    }
    
    let speed = isDeleting ? 50 : 80;
    
    if (!isDeleting && charIndex === currentPhrase.length) {
        speed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 500;
    }
    
    setTimeout(typeEffect, speed);
}

// Démarrer l'animation
setTimeout(typeEffect, 500);

// ============ BOUTON DISCORD ============
document.getElementById('discordBtn').addEventListener('click', function(e) {
    e.preventDefault();
    // À remplacer par ton vrai lien Discord
    const discordLink = 'https://discord.gg/ton-invite';
    window.open(discordLink, '_blank');
});

// ============ EFFET AU SCROLL POUR LES CARTES ============
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .how-card, .criteria-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// ============ MENU MOBILE HOME ============
const homeMenuBtn = document.getElementById('homeMobileMenuBtn');
const homeNavLinks = document.getElementById('homeNavLinks');

if (homeMenuBtn && homeNavLinks) {
    homeMenuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    
    homeMenuBtn.addEventListener('click', function() {
        homeNavLinks.classList.toggle('open');
    });
    
    window.addEventListener('resize', function() {
        homeMenuBtn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        if (window.innerWidth > 768) {
            homeNavLinks.classList.remove('open');
        }
    });
}