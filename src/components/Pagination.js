// src/components/Pagination.js
import React from 'react';
import './Pagination.css';

function Pagination({ currentPage, totalPages, hasMore, onPageChange, loading }) {
  const handlePrevPage = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && !loading) {
      onPageChange(page);
    }
  };

  // Generar números de página a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null; // No mostrar paginación si solo hay una página
  }

  return (
    <div className="pagination-container">
      <div className="pagination">
        {/* Botón Anterior */}
        <button 
          className={`pagination-btn prev ${currentPage === 1 || loading ? 'disabled' : ''}`}
          onClick={handlePrevPage}
          disabled={currentPage === 1 || loading}
        >
          ← Anterior
        </button>

        {/* Números de página */}
        <div className="page-numbers">
          {/* Primera página si no está visible */}
          {getPageNumbers()[0] > 1 && (
            <>
              <button
                className="pagination-btn page-number"
                onClick={() => handlePageClick(1)}
                disabled={loading}
              >
                1
              </button>
              {getPageNumbers()[0] > 2 && (
                <span className="pagination-ellipsis">...</span>
              )}
            </>
          )}

          {/* Páginas visibles */}
          {getPageNumbers().map(page => (
            <button
              key={page}
              className={`pagination-btn page-number ${page === currentPage ? 'active' : ''}`}
              onClick={() => handlePageClick(page)}
              disabled={loading}
            >
              {page}
            </button>
          ))}

          {/* Última página si no está visible */}
          {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                <span className="pagination-ellipsis">...</span>
              )}
              <button
                className="pagination-btn page-number"
                onClick={() => handlePageClick(totalPages)}
                disabled={loading}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Botón Siguiente */}
        <button 
          className={`pagination-btn next ${currentPage === totalPages || loading ? 'disabled' : ''}`}
          onClick={handleNextPage}
          disabled={currentPage === totalPages || loading}
        >
          Siguiente →
        </button>
      </div>

      {/* Información de página */}
      <div className="pagination-info">
        <span>
          Página {currentPage} de {totalPages}
          {hasMore && ' (hay más productos disponibles)'}
        </span>
        {loading && (
          <span className="loading-indicator">
            🔄 Cargando...
          </span>
        )}
      </div>
    </div>
  );
}

export default Pagination;