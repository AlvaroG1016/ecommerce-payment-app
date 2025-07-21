// src/components/CreditCardModal.js - CON DEPARTAMENTOS Y CIUDADES
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setCurrentStep } from '../store/index';
import { colombiaLocationsService } from '../services/colombiaLocations';
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
    departmentId: '', // ✅ NUEVO: ID del departamento seleccionado
    postalCode: ''
  });
  
  const [errors, setErrors] = useState({});
  const [cardType, setCardType] = useState('');
  
  // ✅ NUEVO: Estados para departamentos y ciudades
  const [departments, setDepartments] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // ✅ NUEVO: Cargar departamentos cuando se abre el modal
useEffect(() => {
  if (isOpen && departments.length === 0) {
    loadDepartments();
  }
}, [isOpen, departments.length]); // ✅
  // ✅ NUEVO: Función para cargar departamentos
  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const departmentsList = await colombiaLocationsService.getDepartments();
      setDepartments(departmentsList);
      console.log('✅ Departamentos cargados:', departmentsList.length);
    } catch (error) {
      console.error('❌ Error cargando departamentos:', error);
      // En caso de error, usar fallback
      setDepartments(colombiaLocationsService.getFallbackDepartments());
    } finally {
      setLoadingDepartments(false);
    }
  };

  // ✅ NUEVO: Función para cargar ciudades por departamento
  const loadCitiesByDepartment = async (departmentId) => {
    if (!departmentId) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const citiesList = await colombiaLocationsService.getCitiesByDepartment(departmentId);
      setCities(citiesList);
      console.log(`✅ Ciudades cargadas para departamento ${departmentId}:`, citiesList.length);
    } catch (error) {
      console.error(`❌ Error cargando ciudades para departamento ${departmentId}:`, error);
      // En caso de error, usar fallback
      setCities(colombiaLocationsService.getFallbackCities(departmentId));
    } finally {
      setLoadingCities(false);
    }
  };

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
        
        // Si hay departamento guardado, cargar sus ciudades
        if (savedData.departmentId) {
          loadCitiesByDepartment(savedData.departmentId);
        }
      }
    }
  }, [isOpen,departments.length]);

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
    
    // ✅ NUEVO: Manejar cambio de departamento
    if (field === 'department') {
      const selectedDepartment = departments.find(dept => dept.id === parseInt(value));
      if (selectedDepartment) {
        setFormData(prev => ({ 
          ...prev, 
          department: selectedDepartment.name,
          departmentId: selectedDepartment.id,
          city: '', // Limpiar ciudad cuando cambia departamento
        }));
        
        // Cargar ciudades del nuevo departamento
        loadCitiesByDepartment(selectedDepartment.id);
        
        // Limpiar error si existe
        if (errors.department) {
          setErrors(prev => ({ ...prev, department: '' }));
        }
        return;
      }
    }
    
    // ✅ NUEVO: Manejar cambio de ciudad
    if (field === 'city') {
      const selectedCity = cities.find(city => city.id === parseInt(value));
      if (selectedCity) {
        setFormData(prev => ({ 
          ...prev, 
          city: selectedCity.name
        }));
        
        // Limpiar error si existe
        if (errors.city) {
          setErrors(prev => ({ ...prev, city: '' }));
        }
        return;
      }
    }
    
    // ✅ CORREGIDO: Formatear teléfono para Colombia +57 XXX XXX XXXX
    if (field === 'phone') {
      // Si el usuario está borrando todo, permitir campo vacío
      if (value === '' || value === '+' || value === '+5' || value === '+57' || value === '+57 ') {
        processedValue = '';
        setFormData(prev => ({ ...prev, [field]: processedValue }));
        return;
      }
      
      // Quitar todo excepto números
      let cleanNumber = value.replace(/\D/g, '');
      
      // Si empieza con 57, quitarlo (lo agregamos automáticamente)
      if (cleanNumber.startsWith('57') && cleanNumber.length > 2) {
        cleanNumber = cleanNumber.substring(2);
      }
      
      // Limitar a 10 dígitos (número celular colombiano)
      cleanNumber = cleanNumber.slice(0, 10);
      
      // Si no hay números, dejar vacío
      if (cleanNumber.length === 0) {
        processedValue = '';
      } else {
        // Formatear como +57 XXX XXX XXXX
        if (cleanNumber.length >= 3) {
          const part1 = cleanNumber.slice(0, 3);
          const part2 = cleanNumber.slice(3, 6);
          const part3 = cleanNumber.slice(6, 10);
          
          processedValue = `+57 ${part1}`;
          if (part2) processedValue += ` ${part2}`;
          if (part3) processedValue += ` ${part3}`;
        } else {
          processedValue = `+57 ${cleanNumber}`;
        }
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
    
    if (!formData.holderName || formData.holderName.trim().length < 5) {
      newErrors.holderName = 'Nombre del titular debe tener mínimo 5 caracteres';
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
    
    if (!formData.installments || formData.installments < 1) {
      newErrors.installments = 'Seleccione número de cuotas';
    }
    
    if (!formData.customerName || formData.customerName.trim().length < 5) {
      newErrors.customerName = 'Nombre completo debe tener mínimo 5 caracteres';
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    // ✅ MEJORADO: Validar teléfono más flexible
    if (!formData.phone) {
      newErrors.phone = 'Teléfono es requerido';
    } else if (!/^\+57 \d{3} \d{3} \d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Teléfono debe ser formato +57 XXX XXX XXXX';
    }
    
    // Validar datos de entrega
    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = 'Dirección debe tener mínimo 5 caracteres';
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

  // ✅ NUEVO: Función para limpiar el teléfono completamente
  const handlePhoneClear = () => {
    setFormData(prev => ({ ...prev, phone: '' }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
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
              placeholder="Nombre del titular (mínimo 5 caracteres)"
              value={formData.holderName}
              onChange={(e) => handleInputChange('holderName', e.target.value)}
              className={`form-input ${errors.holderName ? 'error' : ''}`}
              minLength={3}
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
              
              <div className="form-col">
                <select
                  value={formData.installments}
                  onChange={(e) => handleInputChange('installments', e.target.value)}
                  className={`form-input ${errors.installments ? 'error' : ''}`}
                >
                  <option value={1}>1 cuota (contado)</option>
                  <option value={3}>3 cuotas</option>
                  <option value={6}>6 cuotas</option>
                  <option value={9}>9 cuotas</option>
                  <option value={12}>12 cuotas</option>
                  <option value={18}>18 cuotas</option>
                  <option value={24}>24 cuotas</option>
                  <option value={36}>36 cuotas</option>
                </select>
                {errors.installments && <span className="error-text">{errors.installments}</span>}
              </div>
            </div>
          </div>

          {/* Sección Customer Data */}
          <div className="form-section">
            <h3>Datos del Cliente</h3>
            
            <input
              type="text"
              placeholder="Nombre completo (mínimo  5 caracteres)"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              className={`form-input ${errors.customerName ? 'error' : ''}`}
              minLength={5}
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
            
            {/* ✅ MEJORADO: Input de teléfono con botón de limpiar */}
            <div className="phone-input-container">
              <input
                type="tel"
                placeholder="Escriba su número (ej: 3001234567)"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`form-input ${errors.phone ? 'error' : ''}`}
              />
              {formData.phone && (
                <button 
                  type="button"
                  onClick={handlePhoneClear}
                  className="phone-clear-btn"
                  title="Limpiar teléfono"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="phone-help-text">
              Formato automático: +57 XXX XXX XXXX
            </div>
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          {/* Sección Delivery Info */}
          <div className="form-section">
            <h3>Información de Entrega</h3>
            
            <input
              type="text"
              placeholder="Dirección completa (mínimo 5 caracteres)"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className={`form-input ${errors.address ? 'error' : ''}`}
              minLength={5}
            />
            {errors.address && <span className="error-text">{errors.address}</span>}
            
            <div className="form-row">
              <div className="form-col">
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`form-input ${errors.department ? 'error' : ''}`}
                  disabled={loadingDepartments}
                >
                  <option value="">
                    {loadingDepartments ? 'Cargando departamentos...' : 'Seleccionar departamento'}
                  </option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department && <span className="error-text">{errors.department}</span>}
              </div>
              
              <div className="form-col">
                <select
                  value={cities.find(city => city.name === formData.city)?.id || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`form-input ${errors.city ? 'error' : ''}`}
                  disabled={loadingCities || !formData.departmentId}
                >
                  <option value="">
                    {!formData.departmentId 
                      ? 'Primero seleccione departamento'
                      : loadingCities 
                        ? 'Cargando ciudades...' 
                        : 'Seleccionar ciudad'
                    }
                  </option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.city && <span className="error-text">{errors.city}</span>}
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