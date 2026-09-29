/**
 * Quick-view recipe modal. Keeps the original behaviour (card click opens the
 * modal) but resolves meals through the shared store / details endpoint.
 */
(function (global) {
    'use strict';

    var RD = global.RD = global.RD || {};
    var escapeHtml = RD.utils.escapeHtml;

    function elements() {
        return {
            modal: document.getElementById('recipeModal'),
            title: document.getElementById('modalTitle'),
            content: document.getElementById('modalContent')
        };
    }

    function close() {
        var refs = elements();
        if (!refs.modal) {
            return;
        }
        refs.modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    function isOpen() {
        var refs = elements();
        return Boolean(refs.modal && !refs.modal.classList.contains('hidden'));
    }

    function paint(meal) {
        var refs = elements();
        if (!refs.modal) {
            return;
        }

        refs.title.textContent = meal.strMeal || 'Recipe';
        refs.content.innerHTML = RD.components.recipeDetail.render(meal);
        refs.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * @param {string|Object} mealOrId Meal id, or an already loaded meal record.
     */
    async function open(mealOrId) {
        if (typeof mealOrId === 'object' && mealOrId !== null) {
            RD.mealStore.set(mealOrId);
            paint(mealOrId);
            return;
        }

        var id = String(mealOrId || '');
        var cached = RD.mealStore.get(id);

        if (cached) {
            paint(cached);
            return;
        }

        var refs = elements();
        if (refs.modal && refs.content) {
            refs.title.textContent = 'Loading recipe...';
            refs.content.innerHTML = RD.components.states.loading('Loading recipe...', 'Fetching the full ingredient list');
            refs.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        try {
            var meal = await RD.api.getMealDetails(id);
            if (meal) {
                RD.mealStore.set(meal);
                paint(meal);
            } else {
                close();
            }
        } catch (error) {
            console.error('Error loading meal details:', error);

            if (refs.content) {
                refs.content.innerHTML = RD.components.states.error(
                    'Unable to load this recipe.',
                    'Please try again in a moment.',
                    'Close',
                    null
                );

                var closeButton = refs.content.querySelector('[data-retry]');
                if (closeButton) {
                    closeButton.addEventListener('click', close);
                }
            }
        }
    }

    function init() {
        var refs = elements();
        if (!refs.modal) {
            return;
        }

        refs.modal.addEventListener('click', function (event) {
            if (event.target === refs.modal) {
                close();
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isOpen()) {
                close();
            }
        });
    }

    RD.openRecipeModal = open;
    RD.closeModal = close;

    RD.components = RD.components || {};
    RD.components.recipeModal = { open: open, close: close, isOpen: isOpen, init: init, paint: paint };
})(window);
