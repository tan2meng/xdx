// Data and Background are loaded via script tags now


// DOM Elements
const toolsGrid = document.getElementById('tools-grid');
const gamesGrid = document.getElementById('games-grid');
const themeToggle = document.getElementById('toggle-theme');

// Render Function
function createCard(site) {
  const a = document.createElement('a');
  a.href = site.url;
  a.className = 'card-link';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  a.innerHTML = `
    <article class="card">
      <div class="card-title-wrapper">
        <h3 class="card-title">${site.name}</h3>
      </div>
      <p class="card-desc">${site.description}</p>
    </article>
  `;
  return a;
}

// Pagination State
const ITEMS_PER_PAGE = 4;
let toolsPage = 1;
let gamesPage = 1;

function renderSection(items, gridElement, paginationElement, currentPage, onPageChange) {
  // Clear existing content
  gridElement.innerHTML = '';
  paginationElement.innerHTML = '';

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  // Calculate slice indices
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = items.slice(start, end);

  // Render Cards
  pageItems.forEach(site => gridElement.appendChild(createCard(site)));

  // Render Pagination if needed
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        onPageChange(i);
      });
      paginationElement.appendChild(btn);
    }
  }
}

function renderCards() {
  const toolsPagination = document.getElementById('tools-pagination');
  const gamesPagination = document.getElementById('games-pagination');

  renderSection(tools, toolsGrid, toolsPagination, toolsPage, (newPage) => {
    toolsPage = newPage;
    renderCards(); // Re-render to update UI
  });

  renderSection(games, gamesGrid, gamesPagination, gamesPage, (newPage) => {
    gamesPage = newPage;
    renderCards(); // Re-render to update UI
  });
}

// Theme Logic
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');

  // Dispatch event for background canvas to listen to
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'light') {
    document.body.classList.remove('dark-mode');
  } else {
    // Default to dark mode or use saved dark preference
    document.body.classList.add('dark-mode');
  }
}

// Initializers
initTheme();
renderCards();

themeToggle.addEventListener('click', toggleTheme);

// Start Background
initBackground();
