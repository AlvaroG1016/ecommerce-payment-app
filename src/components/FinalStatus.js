// src/components/FinalStatus.js
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import { updateProductStock, fetchProducts } from '../store/slices/productsSlice';
import { formatPrice } from '../services/api';
import './FinalStatus.css';

function FinalStatus() {
  const dispatch = useDispatch();
  const selectedProduct = useSelector(state => state.products.selectedProduct);
  
  const [paymentResult, setPaymentResult] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [stockUpdated, setStockUpdated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos al montar el componente
  useEffect(() => {
    console.log('🔍 FinalStatus: Componente montado, cargando datos...');
    
    const loadData = () => {
      // Cargar resultado del pago
      const savedPaymentResult = localStorage.getItem('payment_result');
      console.log('🔍 FinalStatus: payment_result en localStorage:', savedPaymentResult);
      
      if (savedPaymentResult) {
        try {
          const parsedResult = JSON.parse(savedPaymentResult);
          console.log('✅ FinalStatus: Resultado del pago cargado:', parsedResult);
          setPaymentResult(parsedResult);
        } catch (error) {
          console.error('❌ FinalStatus: Error parsing payment result:', error);
        }
      } else {
        console.warn('⚠️ FinalStatus: No se encontró payment_result en localStorage');
      }

      // Cargar datos del cliente
      const savedCustomerData = localStorage.getItem('payment_form_data');
      console.log('🔍 FinalStatus: payment_form_data en localStorage:', savedCustomerData ? 'Encontrado' : 'No encontrado');
      
      if (savedCustomerData) {
        try {
          const parsedCustomerData = JSON.parse(savedCustomerData);
          console.log('✅ FinalStatus: Datos del cliente cargados');
          setCustomerData(parsedCustomerData);
        } catch (error) {
          console.error('❌ FinalStatus: Error parsing customer data:', error);
        }
      }
      
      setIsLoading(false);
    };

    // Cargar datos inmediatamente, pero también dar un momento para que se guarden
    loadData();
    
    // Si no hay datos, intentar de nuevo después de un momento
    const timeout = setTimeout(() => {
      if (!paymentResult) {
        console.log('🔄 FinalStatus: Reintentando cargar datos...');
        loadData();
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  // Actualizar stock si el pago fue exitoso
  useEffect(() => {
    const shouldUpdateStock = paymentResult && 
                             selectedProduct && 
                             (paymentResult.status === 'COMPLETED' || 
                              paymentResult.status === 'APPROVED') &&
                             !stockUpdated;

    if (shouldUpdateStock) {
      updateStock();
    }
  }, [paymentResult, selectedProduct, stockUpdated, updateStock]);

  const updateStock = async () => {
    if (!selectedProduct || isUpdatingStock) return;

    setIsUpdatingStock(true);
    try {
      const newStock = Math.max(0, selectedProduct.stock - 1);
      await dispatch(updateProductStock({ 
        productId: selectedProduct.id, 
        newStock 
      })).unwrap();
      
      setStockUpdated(true);
      console.log('✅ Stock actualizado:', { productId: selectedProduct.id, newStock });
    } catch (error) {
      console.error('❌ Error actualizando stock:', error);
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const getStatusInfo = () => {
    if (!paymentResult) {
      return {
        icon: '❓',
        title: 'Estado Desconocido',
        message: 'No se pudo determinar el estado del pago',
        type: 'unknown',
        showDetails: false
      };
    }

    const status = paymentResult.status;
    
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return {
          icon: '✅',
          title: '¡Pago Exitoso!',
          message: 'Tu pago ha sido procesado exitosamente',
          type: 'success',
          showDetails: true
        };
      
      case 'DECLINED':
      case 'FAILED':
      case 'REJECTED':
        return {
          icon: '❌',
          title: 'Pago Rechazado',
          message: 'Tu pago no pudo ser procesado',
          type: 'error',
          showDetails: true
        };
      
      case 'PENDING':
        return {
          icon: '⏳',
          title: 'Pago Pendiente',
          message: 'Tu pago está siendo procesado',
          type: 'pending',
          showDetails: true
        };
      
      case 'ERROR':
        return {
          icon: '⚠️',
          title: 'Error en el Proceso',
          message: paymentResult.error || 'Ocurrió un error durante el proceso',
          type: 'error',
          showDetails: false
        };
      
      default:
        return {
          icon: '❓',
          title: 'Estado Desconocido',
          message: `Estado: ${status}`,
          type: 'unknown',
          showDetails: true
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isSuccessful = statusInfo.type === 'success';

  // Mostrar loading mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="final-status-container">
        <div className="final-status-content">
          <div className="status-header">
            <div className="status-icon">⏳</div>
            <h2 className="status-title">Cargando resultado...</h2>
            <p className="status-message">Obteniendo información del pago</p>
          </div>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    // Si fue exitoso, actualizar productos y ir al paso 5
    if (isSuccessful) {
      dispatch(fetchProducts()); // Refrescar productos con stock actualizado
      dispatch(setCurrentStep(5));
    } else {
      // Si falló, volver al paso 2 para intentar de nuevo
      dispatch(setCurrentStep(2));
    }
  };

  const handleStartOver = () => {
    // Limpiar todos los datos y volver al inicio
    localStorage.removeItem('payment_result');
    localStorage.removeItem('payment_form_data');
    localStorage.removeItem('purchase_progress');
    dispatch(setCurrentStep(1));
  };

  return (
    <div className="final-status-container">
      <div className="final-status-content">
        
        {/* Header con estado del pago */}
        <div className={`status-header ${statusInfo.type}`}>
          <div className="status-icon">{statusInfo.icon}</div>
          <h2 className="status-title">{statusInfo.title}</h2>
          <p className="status-message">{statusInfo.message}</p>
        </div>

        {/* Detalles de la transacción */}
        {statusInfo.showDetails && paymentResult && (
          <div className="transaction-details">
            <h3>📋 Detalles de la Transacción</h3>
            
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">ID de Transacción:</span>
                <span className="detail-value">#{paymentResult.transactionId}</span>
              </div>
              
              {paymentResult.finalResponse?.data?.transaction?.providerTransactionId && (
                <div className="detail-item">
                  <span className="detail-label">ID Wompi:</span>
                  <span className="detail-value">
                    {paymentResult.finalResponse.data.transaction.providerTransactionId}
                  </span>
                </div>
              )}
              
              {paymentResult.finalResponse?.data?.transaction?.totalAmount && (
                <div className="detail-item">
                  <span className="detail-label">Monto Total:</span>
                  <span className="detail-value">
                    {formatPrice(paymentResult.finalResponse.data.transaction.totalAmount)}
                  </span>
                </div>
              )}

              {paymentResult.finalResponse?.data?.transaction?.completedAt && (
                <div className="detail-item">
                  <span className="detail-label">Fecha:</span>
                  <span className="detail-value">
                    {new Date(paymentResult.finalResponse.data.transaction.completedAt)
                      .toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información del producto */}
        {selectedProduct && (
          <div className="product-info">
            <h3>📦 Producto</h3>
            <div className="product-summary">
              <img 
                src={selectedProduct.imageUrl} 
                alt={selectedProduct.name}
                className="product-image"
                onError={(e) => {
                  // Solo cambiar una vez para evitar bucle
                  if (!e.target.dataset.errorHandled) {
                    e.target.dataset.errorHandled = 'true';
                    const svgPlaceholder = `data:image/svg+xml;base64,${btoa(`
                      <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                        <rect width="100%" height="100%" fill="#e9ecef"/>
                        <text x="40" y="50" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#6c757d">📦</text>
                      </svg>
                    `)}`;
                    e.target.src = svgPlaceholder;
                  }
                }}
              />
              <div className="product-info-text">
                <h4>{selectedProduct.name}</h4>
                <p>{selectedProduct.description}</p>
                <span className="product-price">{formatPrice(selectedProduct.price)}</span>
                
                {/* Mostrar actualización de stock */}
                {isSuccessful && (
                  <div className="stock-update">
                    {isUpdatingStock ? (
                      <span className="stock-updating">🔄 Actualizando stock...</span>
                    ) : stockUpdated ? (
                      <span className="stock-updated">✅ Stock actualizado</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Información de entrega (solo si el pago fue exitoso) */}
        {isSuccessful && customerData && (
          <div className="delivery-info">
            <h3>🚚 Información de Entrega</h3>
            <div className="delivery-details">
              <p><strong>Nombre:</strong> {customerData.customerName}</p>
              <p><strong>Email:</strong> {customerData.email}</p>
              <p><strong>Dirección:</strong> {customerData.address}</p>
              <p><strong>Ciudad:</strong> {customerData.city}, {customerData.department}</p>
              <p><strong>Teléfono:</strong> {customerData.phone}</p>
            </div>
            
            <div className="delivery-timeline">
              <div className="timeline-item active">
                <span className="timeline-icon">✅</span>
                <span>Pago confirmado</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-icon">📦</span>
                <span>Preparando envío (1-2 días)</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-icon">🚚</span>
                <span>En camino (3-5 días)</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-icon">🏠</span>
                <span>Entregado</span>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje específico según el tipo de resultado */}
        <div className="next-steps">
          {isSuccessful ? (
            <div className="success-message">
              <h3>🎉 ¡Felicitaciones!</h3>
              <p>
                Tu pedido ha sido confirmado. Recibirás un email de confirmación 
                con los detalles de tu compra y el seguimiento del envío.
              </p>
            </div>
          ) : statusInfo.type === 'error' || statusInfo.type === 'unknown' ? (
            <div className="error-message">
              <h3>😔 ¿Qué pasó?</h3>
              <p>
                No pudimos procesar tu pago. Puedes intentar nuevamente 
                o usar un método de pago diferente.
              </p>
            </div>
          ) : statusInfo.type === 'pending' ? (
            <div className="pending-message">
              <h3>⏳ Tu pago está en proceso</h3>
              <p>
                Estamos verificando tu pago. Te notificaremos por email 
                cuando esté confirmado.
              </p>
            </div>
          ) : null}
        </div>

        {/* Botones de acción */}
        <div className="action-buttons">
          <button 
            onClick={handleStartOver}
            className="btn-secondary"
          >
            🏪 Volver a la tienda
          </button>
          
          <button 
            onClick={handleContinue}
            className={`btn-primary ${statusInfo.type}`}
          >
            {isSuccessful ? (
              '🎉 Finalizar compra'
            ) : statusInfo.type === 'pending' ? (
              '⏳ Entendido'
            ) : (
              '🔄 Intentar de nuevo'
            )}
          </button>
        </div>

        {/* Footer con información adicional */}
        <div className="final-status-footer">
          <p>
            ¿Necesitas ayuda? Contáctanos en <strong>soporte@mitienda.com</strong>
          </p>
          {paymentResult?.transactionId && (
            <p>
              <small>
                Referencia: #{paymentResult.transactionId} - 
                Conserva este número para futuras consultas
              </small>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinalStatus;