/**
 * Lightweight hash based router.
 *
 * The project is a static HTML/CSS/JS app served without any build step or
 * server rewrite rules, so hash routing is used: it works from any path, over
 * file://, and keeps every existing asset reference untouched.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    var routes = [
        { name: 'home', pattern: /^\/?$/, keys: [] },
        { name: 'recipes', pattern: /^\/recipes\/?$/, keys: [] },
        { name: 'search', pattern: /^\/recipes\/search\/(.+)$/, keys: ['query'] },
        { name: 'category', pattern: /^\/recipes\/category\/([^/]+)$/, keys: ['category'] },
        { name: 'ingredient', pattern: /^\/recipes\/ingredient\/([^/]+)$/, keys: ['ingredient'] },
        { name: 'meal', pattern: /^\/recipe\/([^/]+)$/, keys: ['id'] },
        { name: 'categories', pattern: /^\/categories\/?$/, keys: [] },
        { name: 'about', pattern: /^\/about\/?$/, keys: [] },
        { name: 'notFound', pattern: /^\/.*$/, keys: [] }
    ];

    var listeners = [];
    var current = { path: '/', route: null, params: {} };

    function normalize(path) {
        var value = String(path || '/').replace(/^#/, '').split('?')[0];
        if (!value || value === '/') {
            return '/';
        }
        if (value.charAt(0) !== '/') {
            value = '/' + value;
        }
        return value.replace(/\/+$/, '') || '/';
    }

    function match(path) {
        for (var i = 0; i < routes.length; i += 1) {
            var route = routes[i];
            var result = route.pattern.exec(path);

            if (result) {
                var params = {};
                route.keys.forEach(function (key, index) {
                    try {
                        params[key] = decodeURIComponent(result[index + 1]);
                    } catch (error) {
                        params[key] = result[index + 1];
                    }
                });
                return { route: route, params: params };
            }
        }

        return { route: routes[routes.length - 1], params: {} };
    }

    function readPath() {
        return normalize(global.location.hash);
    }

    function handleChange() {
        var path = readPath();
        var matched = match(path);

        current = { path: path, route: matched.route, params: matched.params };
        listeners.forEach(function (listener) {
            listener(current);
        });
    }

    function go(path, options) {
        var target = normalize(path);

        if (readPath() === target) {
            handleChange();
            return;
        }

        if (options && options.replace) {
            global.location.replace('#' + target);
        } else {
            global.location.hash = target;
        }
    }

    function start() {
        global.addEventListener('hashchange', handleChange);
        handleChange();
    }

    function onChange(listener) {
        listeners.push(listener);
        return function () {
            listeners = listeners.filter(function (item) {
                return item !== listener;
            });
        };
    }

    RD.router = {
        routes: routes,
        go: go,
        start: start,
        onChange: onChange,
        match: match,
        normalize: normalize,
        get current() {
            return current;
        }
    };
})(window);
