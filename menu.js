// menu.js
document.addEventListener('DOMContentLoaded', () => {
    initMenuLateral();
});

function initMenuLateral() {
    const iconMenu = document.querySelector('.icon-cuadros');
    const overlay = document.querySelector('.menu-overlay');
    const btnCerrar = document.querySelector('.menu-header .btn-cerrar');
    const itemsMenu = document.querySelectorAll('.menu-item');

    if (!iconMenu || !overlay) return;

    // Abrir menú
    iconMenu.addEventListener('click', () => {
        overlay.style.display = 'block';
    });

    // Cerrar menú
    if (btnCerrar) {
        btnCerrar.addEventListener('click', () => {
            overlay.style.display = 'none';
        });
    }

    // Navegación
    if (itemsMenu.length >= 7) {
        itemsMenu[0].addEventListener('click', () => window.location.href = 'index.html');
        itemsMenu[1].addEventListener('click', () => window.location.href = 'calculadora.html');
        itemsMenu[2].addEventListener('click', () => window.location.href = 'consejos.html');
        itemsMenu[3].addEventListener('click', () => window.location.href = 'cuenta.html');
        itemsMenu[4].addEventListener('click', () => window.location.href = 'ayuda.html');
        itemsMenu[5].addEventListener('click', () => window.location.href = 'contactanos.html');
        itemsMenu[6].addEventListener('click', () => window.location.href = 'registro.html');
    }
}
