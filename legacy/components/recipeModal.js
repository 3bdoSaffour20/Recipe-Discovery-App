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

    /**
     * Incremented whenever the modal opens or closes so a lookup that resolves
     * after the user moved on cannot paint into a closed or reopened modal.
     */
    var openToken = 0;

    function close() {
        var refs = elements();
        openToken += 1;

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

    function showLoading() {
        var refs = elements();
        if (!refs.modal || !refs.content) {
            return;
        }

        refs.title.textContent = 'Loading recipe...';
        refs.content.innerHTML = RD.components.states.loading('Loading recipe...', 'Fetching the full ingredient list');
        refs.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * @param {string|Object} mealOrId Meal id, or an already loaded meal record.
     */
    async function open(mealOrId) {
        var id = mealOrId && typeof mealOrId === 'object'
            ? String(mealOrId.idMeal || '')
            : String(mealOrId || '');

        if (!id) {
            close();
            return;
        }

        if (mealOrId && typeof mealOrId === 'object') {
            RD.mealStore.set(mealOrId);
        }

        var token = openToken += 1;

        showLoading();

        // The store returns a full record, or fetches lookup.php when the
        // cached entry is only a filter.php summary. Without this the modal
        // rendered its "no ingredients / no instructions" states until the
        // user refreshed the page.
        try {
            var meal = await RD.mealStore.getDetails(id);

            if (token !== openToken) {
                return;
            }

            if (meal) {
                paint(meal);
            } else {
                close();
            }
        } catch (error) {
            if (token !== openToken) {
                return;
            }

            console.error('Error loading meal details:', error);

            var refs = elements();
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
