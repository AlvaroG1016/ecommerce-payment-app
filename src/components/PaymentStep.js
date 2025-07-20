// src/components/PaymentStep.js
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import CreditCardModal from './CreditCardModal';
import { formatPrice } from '../services/api';
import './PaymentStep.css'; // Vamos a crear este archivo CSS

function PaymentStep() {
  const dispatch = useDispatch();
  const selectedProduct = useSelector(state => state.products.selectedProduct);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasPaymentData, setHasPaymentData] = useState(false);

  // Verificar si hay datos de pago guardados
  useEffect(() => {
    const checkPaymentData = () => {
      const savedPaymentData = localStorage.getItem('payment_form_data');
      setHasPaymentData(!!savedPaymentData);
    };

    checkPaymentData();
    
    // Verificar periódicamente por si se actualizan los datos
    const interval = setInterval(checkPaymentData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Abrir modal automáticamente solo si venimos desde productos (no desde backdrop)
  useEffect(() => {
    const savedPaymentData = localStorage.getItem('payment_form_data');
    
    if (!savedPaymentData && selectedProduct) {
      // Si no hay datos guardados y hay producto, abrir modal para llenar
      setIsModalOpen(true);
    }
    // Si hay datos guardados, NO abrir automáticamente (usuario puede elegir)
  }, [selectedProduct]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    
    // Si no hay datos guardados y cierran el modal, volver a productos
    if (!hasPaymentData) {
      dispatch(setCurrentStep(1));
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  if (!selectedProduct) {
    return (
      <div className="step-content">
        <h2>💳 Información de pago</h2>
        <p>No hay producto seleccionado</p>
        <button onClick={() => dispatch(setCurrentStep(1))}>
          ← Ir a productos
        </button>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h2>💳 Información de pago</h2>
      
      <div className="product-summary">
        <h4 className="product-summary-title">
          📦 {selectedProduct.name}
        </h4>
        <p className="product-summary-description">
          {selectedProduct.description}
        </p>
        <div className="product-summary-details">
          <span className="product-summary-price">
            {formatPrice(selectedProduct.price)}
          </span>
          <span className="product-summary-stock">
            Stock: {selectedProduct.stock}
          </span>
        </div>
      </div>

      <div className="payment-actions">
        <p className="payment-status">
          {hasPaymentData ? 
            'Datos de pago guardados. Puedes modificarlos o continuar al resumen.' :
            'Completa la información de pago y entrega.'
          }
        </p>
        
        <div className="payment-buttons">
          <button 
            onClick={() => dispatch(setCurrentStep(1))}
            className="btn-secondary"
          >
            ← Cambiar producto
          </button>
          
          <button 
            onClick={handleOpenModal}
            className="btn-primary"
          >
            {hasPaymentData ? 
              '✏️ Modificar datos' : 
              '💳 Llenar datos'
            }
          </button>
          
          {hasPaymentData && (
            <button 
              onClick={() => dispatch(setCurrentStep(3))}
              className="btn-success"
            >
              Ir al resumen →
            </button>
          )}
        </div>
      </div>

      {/* Modal de Credit Card */}
      <CreditCardModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedProduct={selectedProduct}
      />
    </div>
  );
}

export default PaymentStep;