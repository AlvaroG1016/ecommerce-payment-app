// src/components/BackdropSummary.js
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import { formatPrice } from '../services/api';
import './BackdropSummary.css';

function BackdropSummary({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const selectedProduct = useSelector(state => state.products.selectedProduct);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentStep, setPaymentStep] = useState(''); // Para mostrar en qué paso está

  // Cargar datos del formulario de pago desde localStorage
  useEffect(() => {
    const savedPaymentData = localStorage.getItem('payment_form_data');
    if (savedPaymentData) {
      try {
        setPaymentData(JSON.parse(savedPaymentData));
      } catch (error) {
        console.error('Error parsing payment data:', error);
        setPaymentData(null);
      }
    }
  }, []);

  // Calcular montos según el PDF
  const calculateAmounts = () => {
    if (!selectedProduct) return { productAmount: 0, baseFee: 0, deliveryFee: 0, total: 0 };

    const productAmount = selectedProduct.price;
    const baseFee = selectedProduct.baseFee || 2000; // Base fee siempre aplicada según PDF
    const deliveryFee = 5000; // Delivery fee según PDF
    const total = productAmount + baseFee + deliveryFee;

    return { productAmount, baseFee, deliveryFee, total };
  };

  const { productAmount, baseFee, deliveryFee, total } = calculateAmounts();

  // Función para crear transacción en el backend
  const createTransaction = async () => {
    try {
      const transactionData = {
        customer: {
          name: paymentData.customerName,
          email: paymentData.email,
          phone: paymentData.phone // Ya viene formateado como +57 XXX XXX XXXX
        },
        productId: selectedProduct.id,
        quantity: 1,
        payment: {
          method: "CREDIT_CARD",
          cardLastFour: paymentData.cardNumber.replace(/\s/g, '').slice(-4),
          cardBrand: getCardBrand(paymentData.cardNumber)
        },
        delivery: {
          address: paymentData.address,
          city: paymentData.city,
          postalCode: paymentData.postalCode || "110111",
          phone: paymentData.phone // También aquí usar el formato correcto
        }
      };

      console.log('📤 Enviando transacción al backend:', transactionData);

      const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Respuesta del backend para transacción:', result);
      
      // Verificar que la respuesta tenga la estructura esperada
      if (!result || !result.data || !result.data.transaction || !result.data.transaction.id) {
        console.error('❌ Estructura de respuesta inesperada:', result);
        throw new Error('La respuesta del servidor no contiene un ID de transacción válido');
      }

      const transactionId = result.data.transaction.id;
      console.log('✅ ID de transacción extraído:', transactionId);
      return transactionId;
    } catch (error) {
      console.error('❌ Error en createTransaction:', error);
      throw error;
    }
  };

  // Función para procesar el pago con Wompi
  const processPayment = async (transactionId) => {
    // Validar que el transactionId existe
    if (!transactionId) {
      throw new Error('ID de transacción no válido');
    }

    try {
      const paymentPayload = {
        cardNumber: String(paymentData.cardNumber).replace(/\s/g, ''), // String sin espacios
        cardCvc: String(paymentData.cvc), // String
        cardExpMonth: String(paymentData.expiryMonth).padStart(2, '0'), // String con formato 01-12
        cardExpYear: String(paymentData.expiryYear).slice(-2), // String con últimos 2 dígitos
        cardHolder: String(paymentData.holderName).trim().replace(/\s+/g, ' ') // String normalizado
      };

      console.log('📤 Enviando pago a Wompi para transacción:', transactionId);
      console.log('📤 Payload del pago:', {
        ...paymentPayload,
        cardNumber: '**** **** **** ' + paymentPayload.cardNumber.slice(-4), // Ocultar número en log
        cardCvc: '***'
      });

      const response = await fetch(`http://localhost:3001/api/payment/${transactionId}/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Respuesta de Wompi:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en processPayment:', error);
      throw error;
    }
  };

  // Función para consultar el estado del pago
  const checkPaymentStatus = async (transactionId) => {
    if (!transactionId) {
      throw new Error('ID de transacción no válido para consultar estado');
    }

    try {
      const response = await fetch(`http://localhost:3001/api/payment/${transactionId}/status`);
      
      if (!response.ok) {
        throw new Error(`Error consultando estado del pago: ${response.status}`);
      }

      const result = await response.json();
      console.log('🔍 Estado del pago consultado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en checkPaymentStatus:', error);
      throw error;
    }
  };

  // Función para hacer polling del estado del pago
  const pollPaymentStatus = async (transactionId) => {
    if (!transactionId) {
      throw new Error('ID de transacción no válido para hacer polling');
    }

    const maxAttempts = 30; // 30 intentos = 1 minuto aprox
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;
        
        try {
          console.log(`🔄 Consultando estado del pago... Intento ${attempts} para transacción ${transactionId}`);
          const statusResponse = await checkPaymentStatus(transactionId);
          
          // Verificar si el pago ya se procesó
          // El backend puede devolver diferentes formatos de status
          const transactionStatus = statusResponse.data?.transaction?.status || statusResponse.status;
          const paymentStatus = statusResponse.data?.paymentStatus?.currentStatus;
          const providerStatus = statusResponse.data?.paymentStatus?.providerInfo?.status;
          
          console.log('🔍 Estados encontrados:', {
            transactionStatus,
            paymentStatus,
            providerStatus
          });
          
          // Estados finales que indican que el pago ya se procesó
          const finalStates = ['APPROVED', 'DECLINED', 'COMPLETED', 'FAILED', 'REJECTED'];
          
          const isFinished = finalStates.includes(transactionStatus) || 
                           finalStates.includes(paymentStatus) || 
                           finalStates.includes(providerStatus);
          
          if (isFinished) {
            console.log('✅ Pago finalizado con estado:', { transactionStatus, paymentStatus, providerStatus });
            clearInterval(interval);
            resolve(statusResponse);
            return;
          }

          // Si llegamos al máximo de intentos
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error('Timeout esperando respuesta del pago'));
            return;
          }

        } catch (error) {
          console.error('Error en polling:', error);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(error);
          }
        }
      }, 2000); // Consultar cada 2 segundos
    });
  };

  // Detectar marca de tarjeta
  const getCardBrand = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleanNumber)) return 'VISA';
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'MASTERCARD';
    return 'UNKNOWN';
  };

  const handlePayment = async () => {
    if (!selectedProduct || !paymentData) {
      alert('Faltan datos para procesar el pago');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null); // Limpiar errores previos
    setCurrentTransactionId(null); // Limpiar ID previo

    try {
      // Paso 1: Crear transacción PENDING en tu backend
      setPaymentStep('Creando transacción...');
      console.log('🔄 Creando transacción PENDING...');
      
      const transactionId = await createTransaction();
      
      // Validar que se obtuvo un ID válido
      if (!transactionId) {
        throw new Error('No se pudo obtener un ID de transacción válido');
      }
      
      setCurrentTransactionId(transactionId);
      console.log('✅ Transacción creada con ID:', transactionId);

      // Paso 2: Procesar pago con Wompi
      setPaymentStep('Procesando con Wompi...');
      console.log('🔄 Procesando pago con Wompi para transacción:', transactionId);
      
      const paymentResponse = await processPayment(transactionId);
      console.log('✅ Pago enviado a Wompi:', paymentResponse);

      // Paso 3: Hacer polling para consultar el estado
      setPaymentStep('Verificando estado del pago...');
      console.log('🔄 Consultando estado del pago para transacción:', transactionId);
      
      const finalStatus = await pollPaymentStatus(transactionId);
      console.log('✅ Estado final del pago:', finalStatus);

      // Determinar el estado final para guardarlo
      const transactionStatus = finalStatus.data?.transaction?.status || finalStatus.status;
      const paymentStatus = finalStatus.data?.paymentStatus?.currentStatus;
      const providerStatus = finalStatus.data?.paymentStatus?.providerInfo?.status;
      
      // Usar el estado más específico disponible
      const finalState = transactionStatus || paymentStatus || providerStatus;

      // Guardar resultado en localStorage para el siguiente paso
      localStorage.setItem('payment_result', JSON.stringify({
        transactionId,
        status: finalState,
        finalResponse: finalStatus
      }));

      console.log('✅ Guardando resultado y avanzando al paso 4:', {
        transactionId,
        status: finalState
      });

      // Cerrar backdrop primero
      onClose();

      // Luego avanzar al paso 4 con un pequeño delay para asegurar que el backdrop se cierre
      setTimeout(() => {
        dispatch(setCurrentStep(4));
      }, 100);

    } catch (error) {
      console.error('❌ Error procesando pago:', error);
      
      // Mostrar error al usuario
      let errorMessage = 'Error procesando el pago';
      
      // Parsear errores específicos del backend
      if (error.message.includes('Invalid phone format')) {
        errorMessage = 'Formato de teléfono inválido. Use: +57 XXX XXX XXXX';
      } else if (error.message.includes('Month must be 01-12')) {
        errorMessage = 'Mes de expiración inválido. Use formato 01-12';
      } else if (error.message.includes('Failed to create customer')) {
        errorMessage = 'Error en los datos del cliente. Verifique la información.';
      } else if (error.message.includes('Invalid card')) {
        errorMessage = 'Datos de tarjeta inválidos. Verifique la información.';
      } else if (error.message.includes('Timeout')) {
        errorMessage = 'El pago está tardando más de lo normal. Consulte el estado más tarde.';
      } else if (error.message.includes('ID de transacción no válido')) {
        errorMessage = 'Error interno: No se pudo generar la transacción. Intente nuevamente.';
      } else if (typeof error.message === 'object') {
        // Si el error es un array (como el del mes)
        errorMessage = Array.isArray(error.message) ? error.message.join(', ') : JSON.stringify(error.message);
      } else {
        errorMessage = error.message || 'Error desconocido procesando el pago';
      }
      
      setPaymentError(errorMessage);
      
      // También guardar error para el paso 4 si es necesario
      localStorage.setItem('payment_result', JSON.stringify({
        transactionId: currentTransactionId,
        status: 'ERROR',
        error: errorMessage
      }));

    } finally {
      setIsProcessingPayment(false);
      setPaymentStep('');
    }
  };

  const goBack = () => {
    // Cerrar el backdrop primero
    onClose();
    // Ir al paso 2 que abrirá el modal automáticamente
    dispatch(setCurrentStep(2));
  };

  if (!isOpen || !selectedProduct) return null;

  return (
    <div className="backdrop-container" onClick={onClose}>
      <div className="backdrop-front-layer" onClick={(e) => e.stopPropagation()}>
        {/* Loading overlay durante el pago */}
        {isProcessingPayment && (
          <div className="payment-loading-overlay">
            <div className="payment-loading-content">
              <div className="payment-loading-spinner"></div>
              <div className="payment-loading-text">Procesando Pago</div>
              <div className="payment-loading-step">{paymentStep}</div>
              {currentTransactionId && (
                <div className="payment-loading-step" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  ID: {currentTransactionId}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="backdrop-header">
          <h2>📋 Resumen de Compra</h2>
          <button className="backdrop-close" onClick={onClose}>✕</button>
        </div>

        {/* Información del producto */}
        <div className="summary-section">
          <h3>Producto Seleccionado</h3>
          <div className="product-summary">
            <img 
              src={selectedProduct.imageUrl} 
              alt={selectedProduct.name}
              className="product-summary-image"
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/80x80/dee2e6/6c757d?text=${encodeURIComponent(selectedProduct.name)}`;
              }}
            />
            <div className="product-summary-info">
              <h4>{selectedProduct.name}</h4>
              <p>{selectedProduct.description}</p>
              <span className="product-summary-price">{formatPrice(selectedProduct.price)}</span>
            </div>
          </div>
        </div>

        {/* Información del cliente */}
        {paymentData && (
          <div className="summary-section">
            <h3>Datos de Entrega</h3>
            <div className="customer-info">
              <p><strong>Cliente:</strong> {paymentData.customerName}</p>
              <p><strong>Email:</strong> {paymentData.email}</p>
              <p><strong>Dirección:</strong> {paymentData.address}</p>
              <p><strong>Ciudad:</strong> {paymentData.city}, {paymentData.department}</p>
            </div>
          </div>
        )}

        {/* Desglose de costos según PDF */}
        <div className="summary-section">
          <h3>Desglose de Costos</h3>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span>Producto</span>
              <span>{formatPrice(productAmount)}</span>
            </div>
            <div className="cost-item">
              <span>Fee Base (siempre aplicada)</span>
              <span>{formatPrice(baseFee)}</span>
            </div>
            <div className="cost-item">
              <span>Fee de Entrega</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="cost-item cost-total">
              <span><strong>Total a Pagar</strong></span>
              <span><strong>{formatPrice(total)}</strong></span>
            </div>
          </div>
        </div>

        {/* Información de la tarjeta (sin datos sensibles) */}
        {paymentData && (
          <div className="summary-section">
            <h3>Método de Pago</h3>
            <div className="payment-method">
              <span>💳 **** **** **** {paymentData.cardNumber.slice(-4)}</span>
              <span>{paymentData.holderName}</span>
            </div>
          </div>
        )}

        {/* Mostrar error si existe */}
        {paymentError && (
          <div className="summary-section" style={{ 
            background: '#fed7d7', 
            borderLeft: '4px solid #e53e3e',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#c53030' }}>⚠️ Error en el Pago</h3>
            <p style={{ color: '#c53030', margin: 0, fontSize: '0.9rem' }}>
              {paymentError}
            </p>
            <button 
              onClick={() => setPaymentError(null)}
              style={{
                background: 'transparent',
                border: '1px solid #e53e3e',
                color: '#c53030',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginTop: '8px',
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Botones de acción */}
        <div className="backdrop-actions">
          <button 
            onClick={goBack} 
            className="btn-secondary"
            disabled={isProcessingPayment}
          >
            ← Modificar Datos
          </button>
          <button 
            onClick={handlePayment} 
            className="btn-primary payment-button"
            disabled={isProcessingPayment}
          >
            {isProcessingPayment ? (
              <>
                <span className="loading-spinner-small"></span>
                {paymentStep || 'Procesando...'}
              </>
            ) : (
              `💳 Pagar ${formatPrice(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackdropSummary;