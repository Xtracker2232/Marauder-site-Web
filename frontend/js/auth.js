// ============ MOBILE MENU ============
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

if (mobileMenuBtn && sidebar && backdrop) {
    mobileMenuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    });
    
    backdrop.addEventListener('click', function() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    document.querySelectorAll('.sidebar-nav li').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// Ajuster la hauteur du graphe sur mobile
function resizeGrapheMobile() {
    const container = document.getElementById('grapheContainer');
    if (container && window.innerWidth <= 768) {
        container.style.height = '400px';
    } else if (container) {
        container.style.height = '600px';
    }
}

window.addEventListener('resize', resizeGrapheMobile);
resizeGrapheMobile();