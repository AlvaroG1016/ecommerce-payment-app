// src/components/ProductCard.js
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setSelectedProduct } from '../store/slices/productsSlice';
import { usePurchaseProgress } from '../hooks/useLocalStorage';
import CreditCardModal from './CreditCardModal';
import { formatPrice } from '../services/api';
import './ProductCard.css';

function ProductCard({ product }) {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { clearPaymentDataForNewProduct } = usePurchaseProgress();

  const handleBuyClick = () => {
    // Limpiar datos de pago si es un producto diferente
    clearPaymentDataForNewProduct(product.id);
    
    // Guardar el producto seleccionado en Redux
    dispatch(setSelectedProduct(product));
    
    // Abrir Modal de Credit Card (según PDF)
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Verificar si el producto está disponible
  const isAvailable = product.isActive && product.isAvailable && product.stock > 0;

  return (
    <>
      <div className="product-card">
        <div className="product-image">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              // Si la imagen falla, mostrar placeholder
              e.target.src = `https://via.placeholder.com/300x300/dee2e6/6c757d?text=${encodeURIComponent(product.name)}`;
            }}
          />
        </div>
        
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-description">{product.description}</p>
          
          <div className="product-details">
            <div className="product-price">
              {formatPrice(product.price)}
            </div>
            
            {product.baseFee && (
              <div className="base-fee">
                Fee base: {formatPrice(product.baseFee)}
              </div>
            )}
            
            <div className="product-stock">
              {isAvailable ? (
                <span className="in-stock">
                  📦 {product.stock} disponibles
                </span>
              ) : (
                <span className="out-of-stock">
                  ❌ {product.stock === 0 ? 'Agotado' : 'No disponible'}
                </span>
              )}
            </div>
          </div>
          
          <button 
            className={`buy-button ${!isAvailable ? 'disabled' : ''}`}
            onClick={handleBuyClick}
            disabled={!isAvailable}
          >
            {isAvailable ? '💳 Pagar con tarjeta' : 'No disponible'}
          </button>
        </div>
      </div>

      {/* Modal de Credit Card */}
      <CreditCardModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedProduct={product}
      />
    </>
  );
}

export default ProductCard;