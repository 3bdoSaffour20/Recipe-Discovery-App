/**
 * Application entry point.
 * Preserves the original dark mode handling and wires the router up.
 */
(function () {
    'use strict';

    // Dark mode detection and handling
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (event) {
        if (event.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });

    // Header search form -> #/recipes/search/<query>
    var searchForm = document.getElementById('searchForm');
    var searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', function (event) {
            event.preventDefault();

            var query = searchInput.value.trim();
            if (!query) {
                searchInput.focus();
                return;
            }

            window.RD.router.go('/recipes/search/' + encodeURIComponent(query));
        });
    }

    window.RD.components.recipeModal.init();
    window.RD.app.init();
})();
