// Shared paginated-list behavior: renders a page of items at a time with
// numbered page buttons, prev/next, and swipe. Used for the account page's
// transaction history and the Dashboard's Personal/Business account lists.
export function createPaginatedList({ listEl, paginationEl, items, pageSize, renderItem, onEmpty }) {
  let currentItems = items;
  let currentPage = 1;

  function totalPages() {
    return Math.max(1, Math.ceil(currentItems.length / pageSize));
  }

  function renderPage(page) {
    currentPage = page;
    listEl.innerHTML = '';

    if (currentItems.length === 0) {
      if (onEmpty) onEmpty(listEl);
    } else {
      const start = (page - 1) * pageSize;
      for (const item of currentItems.slice(start, start + pageSize)) {
        listEl.appendChild(renderItem(item));
      }
    }

    renderPagination();
  }

  function renderPagination() {
    paginationEl.innerHTML = '';
    const pages = totalPages();
    if (pages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.className = 'page-nav';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
    paginationEl.appendChild(prevBtn);

    for (let i = 1; i <= pages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = String(i);
      pageBtn.className = 'page-number' + (i === currentPage ? ' active' : '');
      pageBtn.addEventListener('click', () => renderPage(i));
      paginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.className = 'page-nav';
    nextBtn.disabled = currentPage === pages;
    nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
    paginationEl.appendChild(nextBtn);
  }

  let touchStartX = 0;
  listEl.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });
  listEl.addEventListener('touchend', (event) => {
    const diff = touchStartX - event.changedTouches[0].screenX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && currentPage < totalPages()) {
      renderPage(currentPage + 1);
    } else if (diff < 0 && currentPage > 1) {
      renderPage(currentPage - 1);
    }
  });

  renderPage(1);

  return {
    setItems(newItems) {
      currentItems = newItems;
      renderPage(1);
    },
  };
}
