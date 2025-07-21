import { renderHook, act } from '@testing-library/react';
import { useLocalStorage, usePurchaseProgress } from '../hooks/useLocalStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with value from localStorage if exists', () => {
      const testKey = 'testKey';
      const testValue = { name: 'John', age: 30 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testValue));

      const { result } = renderHook(() => useLocalStorage(testKey, null));

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(testKey);
      expect(result.current[0]).toEqual(testValue);
    });

    it('should initialize with initialValue if localStorage is empty', () => {
      const testKey = 'testKey';
      const initialValue = { name: 'Default' };
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      expect(result.current[0]).toEqual(initialValue);
    });

    it('should handle JSON parsing errors gracefully', () => {
      const testKey = 'testKey';
      const initialValue = { default: true };
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      expect(result.current[0]).toEqual(initialValue);
      expect(console.error).toHaveBeenCalledWith(
        `Error reading localStorage key "${testKey}":`,
        expect.any(Error)
      );
    });

    it('should handle localStorage access errors', () => {
      const testKey = 'testKey';
      const initialValue = 'default';
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      expect(result.current[0]).toEqual(initialValue);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setValue function', () => {
    it('should update state and localStorage with new value', () => {
      const testKey = 'testKey';
      const initialValue = 'initial';
      const newValue = 'updated';
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialValue));

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toBe(newValue);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(newValue)
      );
    });

    it('should handle function values (like useState)', () => {
      const testKey = 'testKey';
      const initialValue = 5;
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialValue));

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      act(() => {
        result.current[1](prevValue => prevValue + 10);
      });

      expect(result.current[0]).toBe(15);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        testKey,
        JSON.stringify(15)
      );
    });

    it('should handle localStorage write errors', () => {
      const testKey = 'testKey';
      const initialValue = 'initial';
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialValue));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage write failed');
      });

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      act(() => {
        result.current[1]('newValue');
      });

      expect(console.error).toHaveBeenCalledWith(
        `Error setting localStorage key "${testKey}":`,
        expect.any(Error)
      );
    });

    it('should handle complex objects', () => {
      const testKey = 'testKey';
      const initialValue = { users: [], count: 0 };
      const newValue = { users: ['John', 'Jane'], count: 2 };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialValue));

      const { result } = renderHook(() => useLocalStorage(testKey, initialValue));

      act(() => {
        result.current[1](newValue);
      });

      expect(result.current[0]).toEqual(newValue);
    });

    it('should work with different data types', () => {
      const testCases = [
        ['string', 'test'],
        ['number', 42],
        ['boolean', true],
        ['array', [1, 2, 3]],
        ['object', { key: 'value' }],
        ['null', null],
      ];

      testCases.forEach(([type, value]) => {
        const testKey = `test_${type}`;
        mockLocalStorage.getItem.mockReturnValue(null);

        const { result } = renderHook(() => useLocalStorage(testKey, value));

        act(() => {
          result.current[1](value);
        });

        expect(result.current[0]).toEqual(value);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          testKey,
          JSON.stringify(value)
        );
      });
    });
  });
});

describe('usePurchaseProgress Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock Date for consistent testing
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T10:00:00.000Z');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default progress values', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => usePurchaseProgress());

      expect(result.current.progress).toEqual({
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: null,
      });
    });

    it('should initialize with stored progress values', () => {
      const storedProgress = {
        currentStep: 2,
        selectedProductId: 'prod_123',
        paymentData: { cardType: 'VISA' },
        timestamp: '2024-01-01T09:00:00.000Z',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      expect(result.current.progress).toEqual(storedProgress);
    });
  });

  describe('updateProgress', () => {
    it('should update progress with new data and timestamp', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.updateProgress({ currentStep: 2, selectedProductId: 'prod_456' });
      });

      expect(result.current.progress).toEqual({
        currentStep: 2,
        selectedProductId: 'prod_456',
        paymentData: null,
        timestamp: '2024-01-01T10:00:00.000Z',
      });
    });

    it('should merge new data with existing progress', () => {
      const initialProgress = {
        currentStep: 1,
        selectedProductId: 'prod_123',
        paymentData: null,
        timestamp: '2024-01-01T09:00:00.000Z',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.updateProgress({ paymentData: { cardType: 'MASTERCARD' } });
      });

      expect(result.current.progress).toEqual({
        currentStep: 1,
        selectedProductId: 'prod_123',
        paymentData: { cardType: 'MASTERCARD' },
        timestamp: '2024-01-01T10:00:00.000Z',
      });
    });
  });

  describe('clearProgress', () => {
    it('should reset progress to default values and clear payment data', () => {
      const initialProgress = {
        currentStep: 3,
        selectedProductId: 'prod_123',
        paymentData: { cardType: 'VISA' },
        timestamp: '2024-01-01T09:00:00.000Z',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.clearProgress();
      });

      expect(result.current.progress).toEqual({
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: null,
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('payment_form_data');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('payment_result');
      expect(console.log).toHaveBeenCalledWith('🧹 Progreso y datos de pago limpiados');
    });
  });

  describe('clearPaymentDataForNewProduct', () => {
    it('should clear payment data when switching to different product', () => {
      const initialProgress = {
        currentStep: 2,
        selectedProductId: 'prod_123',
        paymentData: { cardType: 'VISA' },
        timestamp: '2024-01-01T09:00:00.000Z',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.clearPaymentDataForNewProduct('prod_456');
      });

      expect(console.log).toHaveBeenCalledWith(
        '🔄 Producto diferente detectado, limpiando datos de pago'
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('payment_form_data');
      
      expect(result.current.progress).toEqual({
        currentStep: 1,
        selectedProductId: 'prod_456',
        paymentData: null,
        timestamp: '2024-01-01T10:00:00.000Z',
      });
    });

    it('should not clear data when same product is selected', () => {
      const initialProgress = {
        currentStep: 2,
        selectedProductId: 'prod_123',
        paymentData: { cardType: 'VISA' },
        timestamp: '2024-01-01T09:00:00.000Z',
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.clearPaymentDataForNewProduct('prod_123');
      });

      // Should not change progress or remove data
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(result.current.progress).toEqual(initialProgress);
    });

    it('should handle case when no current product is selected', () => {
      const initialProgress = {
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: null,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      act(() => {
        result.current.clearPaymentDataForNewProduct('prod_123');
      });

      // Should not remove data since no current product
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(result.current.progress).toEqual(initialProgress);
    });
  });

  describe('isProgressValid', () => {
    it('should return false when no timestamp exists', () => {
      const initialProgress = {
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: null,
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      expect(result.current.isProgressValid).toBe(false);
    });

    it('should be a boolean value', () => {
      const initialProgress = {
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: new Date().toISOString(),
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialProgress));

      const { result } = renderHook(() => usePurchaseProgress());

      expect(typeof result.current.isProgressValid).toBe('boolean');
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency across all operations', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => usePurchaseProgress());

      // Start with default state
      expect(result.current.progress.currentStep).toBe(1);
      expect(result.current.isProgressValid).toBe(false);

      // Update progress
      act(() => {
        result.current.updateProgress({
          currentStep: 2,
          selectedProductId: 'prod_123',
          paymentData: { cardType: 'VISA' }
        });
      });

      // Check updated state
      expect(result.current.progress.currentStep).toBe(2);
      expect(result.current.progress.selectedProductId).toBe('prod_123');

      // Switch product
      act(() => {
        result.current.clearPaymentDataForNewProduct('prod_456');
      });

      expect(result.current.progress.selectedProductId).toBe('prod_456');
      expect(result.current.progress.paymentData).toBeNull();

      // Clear all progress
      act(() => {
        result.current.clearProgress();
      });

      expect(result.current.progress).toEqual({
        currentStep: 1,
        selectedProductId: null,
        paymentData: null,
        timestamp: null,
      });
    });
  });
});