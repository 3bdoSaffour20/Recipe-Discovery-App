/**
 * TheMealDB API service layer.
 * All network access for the app goes through this file.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};

    var API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';

    function buildUrl(path, params) {
        var pairs = [];

        Object.keys(params || {}).forEach(function (key) {
            var value = params[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                pairs.push(key + '=' + encodeURIComponent(String(value).trim()));
            }
        });

        return API_BASE_URL + path + (pairs.length ? '?' + pairs.join('&') : '');
    }

    /**
     * TheMealDB occasionally resets connections under rapid requests, so
     * network level failures are retried with a short backoff.
     */
    async function fetchWithRetry(url, attempts) {
        var max = attempts || 3;
        var lastError = null;

        for (var attempt = 0; attempt < max; attempt += 1) {
            try {
                return await fetch(url);
            } catch (error) {
                lastError = error;

                if (attempt < max - 1) {
                    console.warn('Retrying TheMealDB request after a network error (' + (attempt + 1) + '/' + max + '):', url);
                    await new Promise(function (resolve) {
                        setTimeout(resolve, 400 * (attempt + 1));
                    });
                }
            }
        }

        throw lastError;
    }

    async function request(path, params) {
        var url = buildUrl(path, params);
        var response = await fetchWithRetry(url);

        if (!response.ok) {
            throw new Error('TheMealDB request to "' + path + '" failed with status ' + response.status);
        }

        var data = await response.json();
        return data || {};
    }

    function toArray(list) {
        return Array.isArray(list) ? list : [];
    }

    var mealDbApi = {
        BASE_URL: API_BASE_URL,

        /** GET categories.php - full category list with thumbnails and descriptions. */
        getCategories: async function () {
            var data = await request('categories.php');
            return toArray(data.categories);
        },

        /** GET search.php?s=query - full meal records matching a free-text query. */
        searchMeals: async function (query) {
            var data = await request('search.php', { s: query });
            return toArray(data.meals);
        },

        /** GET filter.php?c=category - meals belonging to a category. */
        getMealsByCategory: async function (category) {
            var data = await request('filter.php', { c: category });
            return toArray(data.meals);
        },

        /** GET filter.php?i=ingredient - meals whose main ingredient matches (built dynamically). */
        getMealsByIngredient: async function (ingredient) {
            var data = await request('filter.php', { i: ingredient });
            return toArray(data.meals);
        },

        /** GET lookup.php?i=id - the full record for a single meal. */
        getMealDetails: async function (id) {
            var data = await request('lookup.php', { i: id });
            var meals = toArray(data.meals);
            return meals.length ? meals[0] : null;
        },

        /** GET latest.php - most recently added meals. */
        getLatestMeals: async function () {
            var data = await request('latest.php');
            return toArray(data.meals);
        },

        /**
         * Default listing for the Recipes page.
         * TheMealDB returns a Patreon placeholder object instead of a list on
         * latest.php for anonymous callers, so this validates the payload and
         * falls back to a broad alphabetical search (search.php?f=) which
         * returns full meal records including category and area.
         */
        getFeaturedMeals: async function (limit) {
            var letters = ['a', 'b', 'c', 'd'];
            var max = limit || 24;

            try {
                var latest = await this.getLatestMeals();
                if (latest.length && latest[0].strMealThumb) {
                    return latest.slice(0, max);
                }
            } catch (error) {
                console.warn('latest.php unavailable, falling back to search.php?f=', error);
            }

            var batches = await Promise.all(letters.map(async function (letter) {
                try {
                    var data = await request('search.php', { f: letter });
                    return toArray(data.meals);
                } catch (error) {
                    console.warn('Could not load meals starting with "' + letter + '":', error);
                    return [];
                }
            })).then(function (lists) {
                // One failed letter should not blank the whole page.
                if (lists.every(function (list) { return list.length === 0; })) {
                    throw new Error('No featured meals could be loaded from TheMealDB.');
                }
                return lists;
            });

            // Interleave the batches so the grid shows a mix of cuisines.
            var seen = {};
            var mixed = [];

            for (var index = 0; index < 60 && mixed.length < max; index += 1) {
                for (var batch = 0; batch < batches.length; batch += 1) {
                    var meal = batches[batch][index];
                    if (meal && meal.idMeal && !seen[meal.idMeal]) {
                        seen[meal.idMeal] = true;
                        mixed.push(meal);
                    }
                }
            }

            return mixed.slice(0, max);
        },

        /** GET list.php?i=list - every known ingredient name, used for the ingredient filter. */
        listIngredients: async function () {
            var data = await request('list.php', { i: 'list' });
            return toArray(data.meals).map(function (entry) {
                return entry.strIngredient;
            }).filter(Boolean);
        }
    };

    RD.api = mealDbApi;
})(window);
