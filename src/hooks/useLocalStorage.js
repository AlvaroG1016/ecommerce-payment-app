import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  // Obtener valor del localStorage al inicializar
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Función para actualizar el estado y localStorage
  const setValue = useCallback((value) => {
    try {
      // Permitir que value sea una función (como useState)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// Hook específico para persistir el estado de la compra
export function usePurchaseProgress() {
  const [progress, setProgress] = useLocalStorage('purchase_progress', {
    currentStep: 1,
    selectedProductId: null,
    paymentData: null,
    timestamp: null,
  });

  const updateProgress = useCallback((newData) => {
    setProgress(prev => ({
      ...prev,
      ...newData,
      timestamp: new Date().toISOString(),
    }));
  }, [setProgress]);

  const clearProgress = useCallback(() => {
    setProgress({
      currentStep: 1,
      selectedProductId: null,
      paymentData: null,
      timestamp: null,
    });
    // También limpiar los datos de pago del localStorage
    localStorage.removeItem('payment_form_data');
    localStorage.removeItem('payment_result');
    console.log('🧹 Progreso y datos de pago limpiados');
  }, [setProgress]);

  // Limpiar datos de pago cuando cambia de producto
  const clearPaymentDataForNewProduct = useCallback((newProductId) => {
    const currentProductId = progress.selectedProductId;
    
    if (currentProductId && currentProductId !== newProductId) {
      console.log('🔄 Producto diferente detectado, limpiando datos de pago');
      localStorage.removeItem('payment_form_data');
      
      // Actualizar progreso con nuevo producto
      setProgress({
        currentStep: 1,
        selectedProductId: newProductId,
        paymentData: null,
        timestamp: new Date().toISOString(),
      });
    }
  }, [progress.selectedProductId, setProgress]);

  // Verificar si el progreso es válido (no muy antiguo)
  const isProgressValid = useCallback(() => {
    if (!progress.timestamp) return false;
    const timestamp = new Date(progress.timestamp);
    const now = new Date();
    const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
    return hoursDiff < 24; // Válido por 24 horas
  }, [progress.timestamp]);

  return {
    progress,
    updateProgress,
    clearProgress,
    clearPaymentDataForNewProduct,
    isProgressValid: isProgressValid(),
  };
}