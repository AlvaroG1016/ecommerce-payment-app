// src/components/CreditCardModal.js
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import './CreditCardModal.css';

// Utilidades para validación de tarjetas
const validateCreditCard = (number) => {
  const cleanNumber = number.replace(/\s/g, '');
  if (!/^\d+$/.test(cleanNumber)) return false;
  
  // Algoritmo de Luhn
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
};

const getCardType = (number) => {
  const cleanNumber = number.replace(/\s/g, '');
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) return 'mastercard';
  return '';
};

const formatCardNumber = (value) => {
  const cleanValue = value.replace(/\s/g, '');
  const match = cleanValue.match(/(\d{1,4})(\d{1,4})?(\d{1,4})?(\d{1,4})?/);
  
  if (!match) return '';
  
  return [match[1], match[2], match[3], match[4]]
    .filter(Boolean)
    .join(' ');
};

function CreditCardModal({ isOpen, onClose, selectedProduct }) {
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    // Credit Card Data
    cardNumber: '',
    holderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    
    // Customer Data
    customerName: '',
    email: '',
    phone: '',
    
    // Delivery Data
    address: '',
    city: '',
    department: '',
    postalCode: ''
  });
  
  const [errors, setErrors] = useState({});
  const [cardType, setCardType] = useState('');

  // Detectar tipo de tarjeta cuando cambia el número
  useEffect(() => {
    setCardType(getCardType(formData.cardNumber));
  }, [formData.cardNumber]);

  // Cargar datos guardados cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      const savedPaymentData = localStorage.getItem('payment_form_data');
      if (savedPaymentData) {
        const savedData = JSON.parse(savedPaymentData);
        console.log('🔄 Hidratando formulario con datos guardados:', savedData);
        setFormData(savedData);
      }
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    let processedValue = value;
    
    // Formatear número de tarjeta automáticamente
    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value);
      if (processedValue.replace(/\s/g, '').length > 16) return; // Máximo 16 dígitos
    }
    
    // Limitar CVC a 3-4 dígitos
    if (field === 'cvc') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }
    
    // Formatear teléfono para Colombia +57 XXX XXX XXXX
    if (field === 'phone') {
      // Quitar todo excepto números
      let cleanNumber = value.replace(/\D/g, '');
      
      // Si empieza con 57, añadir +
      if (cleanNumber.startsWith('57') && cleanNumber.length > 2) {
        cleanNumber = cleanNumber.substring(2); // Quitar el 57
      }
      
      // Limitar a 10 dígitos (número celular colombiano)
      cleanNumber = cleanNumber.slice(0, 10);
      
      // Formatear como +57 XXX XXX XXXX
      if (cleanNumber.length >= 3) {
        const part1 = cleanNumber.slice(0, 3);
        const part2 = cleanNumber.slice(3, 6);
        const part3 = cleanNumber.slice(6, 10);
        
        processedValue = `+57 ${part1}`;
        if (part2) processedValue += ` ${part2}`;
        if (part3) processedValue += ` ${part3}`;
      } else if (cleanNumber.length > 0) {
        processedValue = `+57 ${cleanNumber}`;
      } else {
        processedValue = '+57 ';
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Limpiar error cuando el usuario empiece a corregir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar tarjeta de crédito
    if (!formData.cardNumber || !validateCreditCard(formData.cardNumber)) {
      newErrors.cardNumber = 'Número de tarjeta inválido';
    }
    
    if (!formData.holderName || formData.holderName.trim().length < 2) {
      newErrors.holderName = 'Nombre del titular requerido';
    }
    
    if (!formData.expiryMonth || formData.expiryMonth < 1 || formData.expiryMonth > 12) {
      newErrors.expiryMonth = 'Mes inválido';
    }
    
    const currentYear = new Date().getFullYear();
    if (!formData.expiryYear || formData.expiryYear < currentYear) {
      newErrors.expiryYear = 'Año inválido';
    }
    
    if (!formData.cvc || formData.cvc.length < 3) {
      newErrors.cvc = 'CVC inválido';
    }
    
    // Validar datos del cliente
    if (!formData.customerName || formData.customerName.trim().length < 2) {
      newErrors.customerName = 'Nombre requerido';
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    // Validar teléfono formato +57 XXX XXX XXXX
    if (!formData.phone || !/^\+57 \d{3} \d{3} \d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Teléfono debe ser formato +57 XXX XXX XXXX';
    }
    
    // Validar datos de entrega
    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = 'Dirección requerida';
    }
    
    if (!formData.city || formData.city.trim().length < 2) {
      newErrors.city = 'Ciudad requerida';
    }
    
    if (!formData.department || formData.department.trim().length < 2) {
      newErrors.department = 'Departamento requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        // Guardar datos en localStorage de forma síncrona
        const dataToSave = JSON.stringify(formData);
        localStorage.setItem('payment_form_data', dataToSave);
        
        // Verificar que se guardó correctamente
        const verification = localStorage.getItem('payment_form_data');
        if (!verification) {
          throw new Error('Error guardando datos en localStorage');
        }
        
        console.log('✅ CreditCardModal: Datos guardados correctamente en localStorage');
        console.log('📋 CreditCardModal: Datos guardados:', formData);
        
        // Cerrar modal primero
        onClose();
        
        // Pequeño delay para asegurar que el modal se cierre completamente
        setTimeout(() => {
          // Ir al siguiente paso (Summary con Backdrop)
          dispatch(setCurrentStep(3));
        }, 100);
        
      } catch (error) {
        console.error('❌ CreditCardModal: Error guardando datos:', error);
        alert('Error guardando los datos. Por favor intente de nuevo.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Información de Pago</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="payment-form">
          {/* Sección Credit Card */}
          <div className="form-section">
            <h3>Datos de la Tarjeta</h3>
            
            <div className="card-input-container">
              <input
                type="text"
                placeholder="Número de tarjeta"
                value={formData.cardNumber}
                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                className={`form-input ${errors.cardNumber ? 'error' : ''}`}
              />
              {cardType && (
                <div className="card-logo">
                  {cardType === 'visa' ? (
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" />
                  ) : cardType === 'mastercard' ? (
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MasterCard" />
                  ) : null}
                </div>
              )}
            </div>
            {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
            
            <input
              type="text"
              placeholder="Nombre del titular"
              value={formData.holderName}
              onChange={(e) => handleInputChange('holderName', e.target.value)}
              className={`form-input ${errors.holderName ? 'error' : ''}`}
            />
            {errors.holderName && <span className="error-text">{errors.holderName}</span>}
            
            <div className="form-row">
              <div className="form-col">
                <select
                  value={formData.expiryMonth}
                  onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                  className={`form-input ${errors.expiryMonth ? 'error' : ''}`}
                >
                  <option value="">Mes</option>
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{String(i+1).padStart(2, '0')}</option>
                  ))}
                </select>
                {errors.expiryMonth && <span className="error-text">{errors.expiryMonth}</span>}
              </div>
              
              <div className="form-col">
                <select
                  value={formData.expiryYear}
                  onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                  className={`form-input ${errors.expiryYear ? 'error' : ''}`}
                >
                  <option value="">Año</option>
                  {Array.from({length: 10}, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return <option key={year} value={year}>{year}</option>
                  })}
                </select>
                {errors.expiryYear && <span className="error-text">{errors.expiryYear}</span>}
              </div>
              
              <div className="form-col">
                <input
                  type="text"
                  placeholder="CVC"
                  value={formData.cvc}
                  onChange={(e) => handleInputChange('cvc', e.target.value)}
                  className={`form-input ${errors.cvc ? 'error' : ''}`}
                  maxLength="4"
                />
                {errors.cvc && <span className="error-text">{errors.cvc}</span>}
              </div>
            </div>
          </div>

          {/* Sección Customer Data */}
          <div className="form-section">
            <h3>Datos del Cliente</h3>
            
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              className={`form-input ${errors.customerName ? 'error' : ''}`}
            />
            {errors.customerName && <span className="error-text">{errors.customerName}</span>}
            
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`form-input ${errors.email ? 'error' : ''}`}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
            
            <input
              type="tel"
              placeholder="+57 300 123 4567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`form-input ${errors.phone ? 'error' : ''}`}
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          {/* Sección Delivery Info */}
          <div className="form-section">
            <h3>Información de Entrega</h3>
            
            <input
              type="text"
              placeholder="Dirección completa"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={`form-input ${errors.address ? 'error' : ''}`}
            />
            {errors.address && <span className="error-text">{errors.address}</span>}
            
            <div className="form-row">
              <div className="form-col">
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`form-input ${errors.city ? 'error' : ''}`}
                />
                {errors.city && <span className="error-text">{errors.city}</span>}
              </div>
              
              <div className="form-col">
                <input
                  type="text"
                  placeholder="Departamento"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`form-input ${errors.department ? 'error' : ''}`}
                />
                {errors.department && <span className="error-text">{errors.department}</span>}
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Código postal (opcional)"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              className="form-input"
            />
          </div>

          {/* Botones */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Continuar al Resumen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreditCardModal;