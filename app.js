/**
 * Application controller. Connects the router to the page modules and keeps
 * the shared header / footer in sync with the current route.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    var TITLES = {
        home: 'Recipe Discovery App',
        recipes: 'Explore Recipes',
        search: 'Recipe Search',
        category: 'Category Recipes',
        ingredient: 'Ingredient Recipes',
        meal: 'Recipe Details',
        categories: 'Categories',
        about: 'About Recipe Discovery',
        notFound: 'Page Not Found'
    };

    /** Maps a route name to the page module that renders it. */
    var PAGE_FOR_ROUTE = {
        home: 'home',
        recipes: 'recipes',
        search: 'recipeResults',
        category: 'recipeResults',
        ingredient: 'recipeResults',
        meal: 'recipeDetails',
        categories: 'categories',
        about: 'about',
        notFound: 'notFound'
    };

    function pageRoot() {
        return document.getElementById('pageRoot');
    }

    function setDocumentTitle(routeName) {
        var base = 'Recipe Discovery';
        var title = TITLES[routeName] || base;

        document.title = routeName === 'home' ? title : title + ' | ' + base;
    }

    /** Marks the matching footer link (and nav link, if present) as active. */
    function updateActiveLinks(path) {
        var links = document.querySelectorAll('[data-nav]');

        Array.prototype.forEach.call(links, function (link) {
            var target = RD.router.normalize(link.getAttribute('data-nav'));
            var isActive = target === path ||
                (target === '/recipes' && path.indexOf('/recipes/') === 0) ||
                (target === '/recipe' && path.indexOf('/recipe/') === 0);

            link.classList.toggle('is-active', isActive);

            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    function syncHeaderSearch(path, params, routeName) {
        var headerInput = document.getElementById('searchInput');
        if (!headerInput) {
            return;
        }

        if (routeName === 'search') {
            headerInput.value = params.query || '';
        } else if (routeName !== 'home') {
            headerInput.value = '';
        }
    }

    function render(current) {
        var root = pageRoot();
        if (!root) {
            return;
        }

        var routeName = current.route ? current.route.name : 'home';
        var pageName = PAGE_FOR_ROUTE[routeName] || 'notFound';
        var page = RD.pages[pageName] || RD.pages.notFound;

        setDocumentTitle(routeName);
        updateActiveLinks(current.path);
        syncHeaderSearch(current.path, current.params, routeName);

        try {
            page.render(root, current.params, routeName, current);
        } catch (error) {
            console.error('Error rendering route "' + current.path + '":', error);
            root.innerHTML = RD.components.states.error(
                'Something went wrong on this page.',
                'Please go back home and try again.',
                'Back to Home'
            );

            var home = root.querySelector('a');
            if (home) {
                home.setAttribute('href', '#/');
            }
        }

        global.scrollTo({ top: 0, behavior: 'auto' });
    }

    function init() {
        RD.router.onChange(render);
        RD.router.start();
    }

    RD.app = { init: init, render: render };
})(window);
