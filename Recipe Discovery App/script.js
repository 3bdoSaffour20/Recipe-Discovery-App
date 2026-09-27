// Dark mode detection and handling
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});

// State management
let currentState = 'welcome';

// DOM elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const welcomeSection = document.getElementById('welcomeSection');
const loadingState = document.getElementById('loadingState');
const resultsSection = document.getElementById('resultsSection');
const noResults = document.getElementById('noResults');
const errorState = document.getElementById('errorState');
const recipeContainer = document.getElementById('recipeContainer');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const recipeModal = document.getElementById('recipeModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');

// Show different states
function showState(state) {
    const states = {
        welcome: welcomeSection,
        loading: loadingState,
        results: resultsSection,
        noResults: noResults,
        error: errorState
    };
    
    Object.values(states).forEach(el => el.classList.add('hidden'));
    if (states[state]) {
        states[state].classList.remove('hidden');
        if (state === 'results') {
            states[state].classList.add('fade-in');
        }
    }
    currentState = state;
}

function showWelcome() {
    showState('welcome');
    searchInput.value = '';
}

// Fetch recipes from API
async function fetchRecipes(query) {
    showState('loading');
    
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.meals && data.meals.length > 0) {
            displayRecipes(data.meals, query);
        } else {
            showState('noResults');
        }
    } catch (error) {
        console.error('Error fetching recipes:', error);
        showState('error');
    }
}

// Display recipes
function displayRecipes(meals, query) {
    resultsTitle.textContent = `Results for "${query}"`;
    resultsCount.textContent = `${meals.length} recipe${meals.length === 1 ? '' : 's'} found`;
    
    recipeContainer.innerHTML = meals.map(meal => createRecipeCard(meal)).join('');
    showState('results');
}

// Create recipe card HTML
function createRecipeCard(meal) {
    return `
        <div class="recipe-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer" onclick="openRecipeModal('${meal.idMeal}', ${JSON.stringify(meal).replace(/"/g, '&quot;')})">
            <div class="relative">
                <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-full h-64 object-cover">
                <div class="absolute top-4 left-4">
                    <span class="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-medium">
                        ${meal.strArea}
                    </span>
                </div>
                <div class="absolute top-4 right-4">
                    <span class="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                        ${meal.strCategory}
                    </span>
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold mb-3 line-clamp-2">${meal.strMeal}</h3>
                <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    ${meal.strInstructions.substring(0, 120)}...
                </p>
                <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                        ${meal.strArea} Cuisine
                    </span>
                    <button class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        View Recipe
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get ingredients list
function getIngredients(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
            ingredients.push({
                ingredient: ingredient.trim(),
                measure: measure ? measure.trim() : ''
            });
        }
    }
    return ingredients;
}

// Open recipe modal
function openRecipeModal(mealId, mealData) {
    modalTitle.textContent = mealData.strMeal;
    
    const ingredients = getIngredients(mealData);
    const instructions = mealData.strInstructions.replace(/\r\n/g, '\n').split('\n').filter(line => line.trim());
    
    modalContent.innerHTML = `
        <div class="grid md:grid-cols-2 gap-8">
            <div>
                <img src="${mealData.strMealThumb}" alt="${mealData.strMeal}" class="w-full rounded-xl shadow-lg mb-6">
                <div class="flex flex-wrap gap-2 mb-6">
                    <span class="bg-primary text-white px-3 py-1 rounded-full text-sm">${mealData.strCategory}</span>
                    <span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm">${mealData.strArea}</span>
                    ${mealData.strTags ? mealData.strTags.split(',').map(tag => 
                        `<span class="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm">${tag.trim()}</span>`
                    ).join('') : ''}
                </div>
                ${mealData.strYoutube ? `
                    <a href="${mealData.strYoutube}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        Watch Video
                    </a>
                ` : ''}
            </div>
            <div>
                <h4 class="text-2xl font-bold mb-4">Ingredients</h4>
                <ul class="space-y-2 mb-8">
                    ${ingredients.map(item => `
                        <li class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span class="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>
                            <span class="font-medium text-primary">${item.measure}</span>
                            <span>${item.ingredient}</span>
                        </li>
                    `).join('')}
                </ul>
                
                <h4 class="text-2xl font-bold mb-4">Instructions</h4>
                <div class="space-y-4">
                    ${instructions.map((instruction, index) => `
                        <div class="flex gap-4">
                            <span class="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                                ${index + 1}
                            </span>
                            <p class="text-gray-700 dark:text-gray-300 leading-relaxed">${instruction}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    recipeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    recipeModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Event listeners
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        fetchRecipes(query);
    }
});

// Recipe suggestions
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.recipe-suggestion').forEach(button => {
        button.addEventListener('click', () => {
            const query = button.dataset.query;
            searchInput.value = query;
            fetchRecipes(query);
        });
    });
});

// Close modal on outside click
recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal) {
        closeModal();
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !recipeModal.classList.contains('hidden')) {
        closeModal();
    }
});