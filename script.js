// Cubic Crypto - Main JavaScript
// Handles: Prices page, modals, search, filtering, pagination, support form, navigation

// ============================================
// CATEGORIES CONFIGURATION - EDIT HERE ONLY
// ============================================
const CATEGORIES = {
  1: 'Summer',
  2: 'Tools',
  3: 'Blocks',
  4: 'Decorations',
  5: 'Event Items',
  6: 'Seasonal'
};

// Helper function to get category name
function getCategoryName(categoryId) {
  return CATEGORIES[categoryId] || `Category ${categoryId}`;
}

// Helper function to get all categories as array
function getCategoriesArray() {
  return Object.entries(CATEGORIES).map(([id, name]) => ({
    id: parseInt(id),
    name: name
  }));
}

function sanitizePriceItems(items) {
  if (!Array.isArray(items)) return [];

  const validItems = [];
  let skippedItems = 0;

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      skippedItems++;
      return;
    }

    const itemName = typeof item['item-name'] === 'string' ? item['item-name'].trim() : '';
    if (!itemName) {
      skippedItems++;
      return;
    }

    const minPrice = Number.isFinite(Number(item['min-price'])) ? Number(item['min-price']) : 0;
    const maxPrice = Number.isFinite(Number(item['max-price'])) ? Number(item['max-price']) : minPrice;
    const category = Number.isFinite(Number(item.category)) ? Number(item.category) : null;
    const itemPng = typeof item['item-png'] === 'string' ? item['item-png'] : '';
    const status = typeof item.status === 'string' && item.status.trim() ? item.status.trim() : 'STABLE.png';

    validItems.push({
      ...item,
      'item-name': itemName,
      'item-png': itemPng,
      category,
      'min-price': minPrice,
      'max-price': maxPrice,
      status
    });
  });

  if (skippedItems > 0) {
    console.warn(`Skipped ${skippedItems} invalid price item${skippedItems !== 1 ? 's' : ''} while loading prices.json.`);
  }

  return validItems;
}

document.addEventListener('DOMContentLoaded', () => {
  
  /* ============================================
     MOBILE NAVIGATION TOGGLE
     ============================================ */
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !expanded);
      navToggle.classList.toggle('open');
      nav.classList.toggle('active');
    });
    
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('open');
        nav.classList.remove('active');
      });
    });
  }

  /* ============================================
     PRICES PAGE FUNCTIONALITY
     ============================================ */
  const priceSearch = document.getElementById('price-search');
  const priceClear = document.getElementById('price-clear');
  const priceGrid = document.getElementById('price-grid');
  const priceNoResults = document.getElementById('price-no-results');
  const itemCount = document.getElementById('item-count');
  const categoryCount = document.getElementById('category-count');
  const resetFiltersBtn = document.getElementById('reset-filters');
  
  const categoryFilter = document.getElementById('category-filter');
  const statusFilter = document.getElementById('status-filter');
  const sortFilter = document.getElementById('sort-filter');
  
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  const itemModal = document.getElementById('item-modal');
  const modalClose = document.getElementById('modal-close');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  
  let priceData = [];
  let filteredData = [];
  let currentPage = 1;
  const itemsPerPage = 24;
  
// Populate category filter dropdown dynamically from CATEGORIES object
if (categoryFilter) {
  // Clear all existing options
  categoryFilter.innerHTML = '';
  
  // Add "All Items" option
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All Items';
  categoryFilter.appendChild(allOption);
  
  // Add categories from CATEGORIES object
  const categories = getCategoriesArray();
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    categoryFilter.appendChild(option);
  });
}
  
  // Load price data
  if (priceGrid) {
    loadPriceData();
  }
  
  async function loadPriceData() {
    try {
      const response = await fetch('prices.json');
      const data = await response.json();
      priceData = sanitizePriceItems(Array.isArray(data) ? data : [data]);
      filteredData = [...priceData];
      updateStats();
      applyFilters();
    } catch (error) {
      console.error('Error loading price data:', error);
      priceGrid.innerHTML = '<div class="no-results"><p>Failed to load price data. Please try again later.</p></div>';
    }
  }
  
  function updateStats() {
    if (itemCount) {
      itemCount.textContent = `${filteredData.length} item${filteredData.length !== 1 ? 's' : ''}`;
    }
    if (categoryCount) {
      const categories = new Set(
        filteredData
          .map(item => item.category)
          .filter(category => category !== null && category !== undefined)
      ).size;
      categoryCount.textContent = `${categories} categor${categories !== 1 ? 'ies' : 'y'}`;
    }
  }
  
  function applyFilters() {
    let results = [...priceData];
    
    // Search filter
    if (priceSearch && priceSearch.value.trim()) {
      const term = priceSearch.value.toLowerCase().trim();
      results = results.filter(item => 
        item['item-name'].toLowerCase().includes(term)
      );
    }
    
    // Category filter - uses category ID from prices.json
    if (categoryFilter && categoryFilter.value !== 'all') {
      const catValue = parseInt(categoryFilter.value);
      results = results.filter(item => item.category === catValue);
    }
    
    // Status filter
    if (statusFilter && statusFilter.value !== 'all') {
      const statusValue = statusFilter.value;
      results = results.filter(item => {
        const status = item.status?.replace('.png', '').toLowerCase() || 'stable';
        return status === statusValue;
      });
    }
    
    // Sort
    if (sortFilter) {
      const sortValue = sortFilter.value;
      results.sort((a, b) => {
        switch(sortValue) {
          case 'name-asc':
            return a['item-name'].localeCompare(b['item-name']);
          case 'name-desc':
            return b['item-name'].localeCompare(a['item-name']);
          case 'price-asc':
            return (a['min-price'] || 0) - (b['min-price'] || 0);
          case 'price-desc':
            return (b['max-price'] || 0) - (a['max-price'] || 0);
          default:
            return 0;
        }
      });
    }
    
    filteredData = results;
    updateStats();
    renderPage();
    
    if (priceNoResults) {
      priceNoResults.style.display = filteredData.length === 0 ? 'block' : 'none';
    }
    
    if (priceClear) {
      priceClear.style.display = priceSearch && priceSearch.value.length > 0 ? 'block' : 'none';
    }
  }
  
  function renderPage() {
    if (!priceGrid) return;
    
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredData.slice(startIndex, endIndex);
    
    priceGrid.innerHTML = '';
    
    pageItems.forEach(item => {
      const card = createPriceCard(item);
      priceGrid.appendChild(card);
    });
    
    updatePagination();
  }
  
  function createPriceCard(item) {
    const card = document.createElement('div');
    card.className = 'card item-card';
    card.dataset.item = item['item-name'];
    
    const minPrice = (item['min-price'] || 0).toLocaleString();
    const maxPrice = (item['max-price'] || 0).toLocaleString();
    
    const statusName = item.status?.replace('.png', '') || 'stable';
    const statusIcon = `assets/${item.status || 'stable.png'}`;
    
    card.innerHTML = `
      <div class="item-name">${item['item-name']}</div>
      <div class="item-price">${minPrice}c - ${maxPrice}c</div>
      <div class="item-status-indicator">
        <img src="${statusIcon}" alt="${statusName}">
        <span style="text-transform: capitalize;">${statusName}</span>
      </div>
      <div class="item-category-badge">${getCategoryName(item.category)}</div>
    `;
    
    card.addEventListener('click', () => showItemModal(item));
    
    return card;
  }
  
  function showItemModal(item) {
    if (!itemModal) return;
    
    document.getElementById('modal-item-name').textContent = item['item-name'];
    document.getElementById('modal-item-price').textContent = 
      `${(item['min-price'] || 0).toLocaleString()}c - ${(item['max-price'] || 0).toLocaleString()}c`;
    document.getElementById('modal-item-png').src = item['item-png'] || 'assets/default.png';
    document.getElementById('modal-item-png').alt = item['item-name'];
    
    document.getElementById('modal-status-icon').src = `assets/${item.status || 'stable.png'}`;
    
    document.getElementById('modal-category-text').textContent = getCategoryName(item.category);
    
    itemModal.showModal();
  }
  
  function updatePagination() {
    if (!prevPageBtn || !nextPageBtn || !pageInfo) return;
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  // Event listeners for prices page
  if (priceSearch) {
    priceSearch.addEventListener('input', () => {
      currentPage = 1;
      applyFilters();
    });
  }
  
  if (priceClear) {
    priceClear.addEventListener('click', () => {
      priceSearch.value = '';
      currentPage = 1;
      applyFilters();
      priceSearch.focus();
    });
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
    });
  }
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPage();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderPage();
        updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
  
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      if (priceSearch) priceSearch.value = '';
      if (categoryFilter) categoryFilter.value = 'all';
      if (statusFilter) statusFilter.value = 'all';
      if (sortFilter) sortFilter.value = 'name-asc';
      currentPage = 1;
      applyFilters();
    });
  }
  
  if (modalClose) {
    modalClose.addEventListener('click', () => itemModal.close());
  }
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => itemModal.close());
  }
  
  if (itemModal) {
    itemModal.addEventListener('click', (e) => {
      if (e.target === itemModal) itemModal.close();
    });
  }

  /* ============================================
     CRAFT PAGE FUNCTIONALITY
     ============================================ */
  const craftSearch = document.getElementById('craft-search');
  const craftClear = document.getElementById('craft-clear');
  const craftList = document.getElementById('craft-list');
  const craftNoResults = document.getElementById('craft-no-results');
  const recipeCount = document.getElementById('recipe-count');
  
  if (craftSearch && craftList) {
    let craftCards = [];
    
    const updateCraftCards = () => {
      craftCards = [...craftList.querySelectorAll('.recipe-card')];
    };
    
    updateCraftCards();
    
    const filterCraft = () => {
      const term = craftSearch.value.toLowerCase().trim();
      let matches = 0;
      
      craftCards.forEach(card => {
        const itemName = (card.dataset.item || card.textContent || '').toLowerCase();
        const show = itemName.includes(term);
        card.style.display = show ? '' : 'none';
        if (show) matches++;
      });
      
      if (craftNoResults) {
        craftNoResults.style.display = matches === 0 ? 'block' : 'none';
      }
      
      if (craftClear) {
        craftClear.style.display = term.length > 0 ? 'block' : 'none';
      }
      
      if (recipeCount) {
        recipeCount.textContent = `${matches} recipe${matches !== 1 ? 's' : ''}`;
      }
    };
    
    craftSearch.addEventListener('input', filterCraft);
    
    if (craftClear) {
      craftClear.addEventListener('click', () => {
        craftSearch.value = '';
        filterCraft();
        craftSearch.focus();
      });
    }
    
    if (recipeCount) {
      recipeCount.textContent = `${craftCards.length} recipe${craftCards.length !== 1 ? 's' : ''}`;
    }
  }

  /* ============================================
     SUPPORT FORM FUNCTIONALITY
     ============================================ */
  const GOOGLE_SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE';
  
  const supportForm = document.getElementById('support-form');
  const formStatus = document.getElementById('form-status');
  const successMessage = document.getElementById('success-message');
  const clearFormBtn = document.getElementById('clear-form');
  const submitAnotherBtn = document.getElementById('submit-another');
  const messageTextarea = document.getElementById('message');
  const charCountSpan = document.getElementById('char-count');
  const submitTicketBtn = document.getElementById('submit-ticket');
  
  if (messageTextarea && charCountSpan) {
    messageTextarea.addEventListener('input', () => {
      charCountSpan.textContent = messageTextarea.value.length;
    });
    
    // Set initial character count
    charCountSpan.textContent = messageTextarea.value.length;
  }
  
  if (clearFormBtn && supportForm) {
    clearFormBtn.addEventListener('click', () => {
      supportForm.reset();
      if (charCountSpan) charCountSpan.textContent = '0';
      if (formStatus) formStatus.innerHTML = '';
    });
  }
  
  if (submitAnotherBtn && supportForm && successMessage) {
    submitAnotherBtn.addEventListener('click', () => {
      successMessage.style.display = 'none';
      supportForm.style.display = 'block';
      supportForm.reset();
      if (charCountSpan) charCountSpan.textContent = '0';
      if (formStatus) formStatus.innerHTML = '';
    });
  }
  
  if (supportForm) {
    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get form elements
      const usernameInput = document.getElementById('username');
      const emailInput = document.getElementById('email');
      const issueTypeSelect = document.getElementById('issue-type');
      const prioritySelect = document.getElementById('priority');
      const messageInput = document.getElementById('message');
      
      // Validate required fields
      if (!usernameInput.value.trim()) {
        if (formStatus) formStatus.innerHTML = '<div class="error-message">Please enter your username.</div>';
        return;
      }
      
      if (!emailInput.value.trim()) {
        if (formStatus) formStatus.innerHTML = '<div class="error-message">Please enter your email address.</div>';
        return;
      }
      
      if (!issueTypeSelect.value) {
        if (formStatus) formStatus.innerHTML = '<div class="error-message">Please select an issue type.</div>';
        return;
      }
      
      if (!messageInput.value.trim() || messageInput.value.length < 20) {
        if (formStatus) formStatus.innerHTML = '<div class="error-message">Please enter a message (minimum 20 characters).</div>';
        return;
      }
      
      if (submitTicketBtn) {
        submitTicketBtn.disabled = true;
        submitTicketBtn.innerHTML = '<span>⏳</span> Submitting...';
      }
      
      if (formStatus) formStatus.innerHTML = '';
      
      const formData = {
        username: usernameInput.value.trim(),
        email: emailInput.value.trim(),
        issueType: issueTypeSelect.value,
        priority: prioritySelect.value || 'medium',
        message: messageInput.value.trim(),
        timestamp: new Date().toISOString()
      };
      
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        // Generate ticket ID for display
        const ticketId = 'CH-' + Math.floor(10000000 + Math.random() * 90000000);
        const ticketIdSpan = document.getElementById('ticket-id');
        if (ticketIdSpan) ticketIdSpan.textContent = ticketId;
        
        if (supportForm) supportForm.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';
        
      } catch (error) {
        console.error('Submission error:', error);
        if (formStatus) {
          formStatus.innerHTML = '<div class="error-message">Failed to submit ticket. Please check your connection and try again.</div>';
        }
      } finally {
        if (submitTicketBtn) {
          submitTicketBtn.disabled = false;
          submitTicketBtn.innerHTML = '<span>📤</span> Submit Ticket';
        }
      }
    });
  }

  /* ============================================
     KEYBOARD SHORTCUTS
     ============================================ */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && itemModal && itemModal.open) {
      itemModal.close();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = priceSearch || craftSearch;
      if (searchInput) searchInput.focus();
    }
  });

  /* ============================================
     ACTIVE NAVIGATION HIGHLIGHT
     ============================================ */
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav a');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href) && href !== 'index.html') {
      link.classList.add('active');
    } else if (href === 'index.html' && (currentPath === '/' || currentPath.endsWith('index.html'))) {
      link.classList.add('active');
    }
  });

  console.log('Cubic Crypto - Ready');
});
