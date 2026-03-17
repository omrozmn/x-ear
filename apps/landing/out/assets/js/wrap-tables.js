// Wrap important tables in an overflow container to enable horizontal scroll on small screens.
(function(){
  function wrapTable(table) {
    if (!table || !table.parentElement) return;
    if (table.parentElement.classList.contains('table-responsive') || table.parentElement.classList.contains('overflow-x-auto')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'overflow-x-auto table-responsive';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  }

  function wrapSelectors(selectors) {
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(wrapTable);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Default important selectors (IDs of main tables)
    const selectors = ['#invoicesTable', '#invoiceItemsTable', '#suppliersTable', '#productsTable', '.min-w-full'];
    wrapSelectors(selectors);
  });
})();
