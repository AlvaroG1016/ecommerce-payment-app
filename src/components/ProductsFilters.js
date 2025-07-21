// src/components/ProductsFilters.js
import React from 'react';
import './ProductsFilters.css';

function ProductsFilters({ 
  totalProducts, 
  currentPage, 
  totalPages, 
  itemsPerPage,
  onItemsPerPageChange,
  loading 
}) {
  const handleItemsPerPageChange = (e) => {
    const newLimit = parseInt(e.target.value);
    if (!loading) {
      onItemsPerPageChange(newLimit);
    }
  };

  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts);

  return (
    <div className="products-filters">
      <div className="filters-left">
        <div className="products-summary">
          <span className="total-count">
            📊 {totalProducts} productos encontrados
          </span>
          {totalProducts > 0 && (
            <span className="showing-range">
              Mostrando {startItem}-{endItem} de {totalProducts}
            </span>
          )}
        </div>
      </div>
      
      <div className="filters-right">
        <div className="items-per-page">
          <label htmlFor="itemsPerPage">Ver:</label>
          <select 
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="items-select"
            disabled={loading}
          >
            <option value={3}>3 productos</option>
            <option value={6}>6 productos</option>
            <option value={9}>9 productos</option>
            <option value={12}>12 productos</option>
            <option value={15}>15 productos</option>
            <option value={18}>18 productos</option>
          </select>
        </div>
        
        {totalPages > 1 && (
          <div className="page-info">
            <span>
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsFilters;