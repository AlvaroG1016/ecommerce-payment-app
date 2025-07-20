// src/components/PaymentStep.js
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import CreditCardModal from './CreditCardModal';
import { formatPrice } from '../services/api';

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
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
          📦 {selectedProduct.name}
        </h4>
        <p style={{ margin: '0 0 8px 0', color: '#7f8c8d', fontSize: '0.9rem' }}>
          {selectedProduct.description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#27ae60' }}>
            {formatPrice(selectedProduct.price)}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
            Stock: {selectedProduct.stock}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          {hasPaymentData ? 
            'Datos de pago guardados. Puedes modificarlos o continuar al resumen.' :
            'Completa la información de pago y entrega.'
          }
        </p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => dispatch(setCurrentStep(1))}
            style={{ 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              minWidth: '140px'
            }}
          >
            ← Cambiar producto
          </button>
          
          <button 
            onClick={handleOpenModal}
            style={{ 
              padding: '10px 16px', 
              fontSize: '0.9rem',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              minWidth: '160px'
            }}
          >
            {hasPaymentData ? 
              '✏️ Modificar datos' : 
              '💳 Llenar datos'
            }
          </button>
          
          {hasPaymentData && (
            <button 
              onClick={() => dispatch(setCurrentStep(3))}
              style={{ 
                padding: '10px 16px', 
                fontSize: '0.9rem',
                background: '#38a169',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                minWidth: '140px'
              }}
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