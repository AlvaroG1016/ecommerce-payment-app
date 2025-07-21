import { configureStore } from '@reduxjs/toolkit';

// Importar después del mock
import productsSlice, {
  fetchProducts,
  setSelectedProduct,
  clearSelectedProduct,
  setCurrentPage,
  setItemsPerPage,
  updateProductStock,
  clearProductsError,
  resetPagination,
} from '../store/slices/productsSlice';

import { apiService } from '../services/api';

// Mock del apiService ANTES de importar el slice
jest.mock('../services/api', () => ({
  apiService: {
    request: jest.fn(),
  },
}));

describe('productsSlice', () => {
  let store;

  const initialState = {
    items: [],
    selectedProduct: null,
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
    itemsPerPage: 6,
    lastFetched: null,
    fetchingPage: null,
  };

  const mockProducts = [
    {
      id: 1,
      name: 'iPhone 14',
      price: 2500000,
      stock: 10,
      description: 'Latest iPhone',
    },
    {
      id: 2,
      name: 'Samsung Galaxy S23',
      price: 2200000,
      stock: 15,
      description: 'Latest Samsung',
    },
  ];

  beforeEach(() => {
    store = configureStore({
      reducer: {
        products: productsSlice,
      },
    });
    jest.clearAllMocks();
    // Mock console methods to avoid spam
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      const state = store.getState().products;
      expect(state).toEqual(initialState);
    });
  });

  describe('setSelectedProduct', () => {
    it('should set the selected product', () => {
      const product = mockProducts[0];
      
      store.dispatch(setSelectedProduct(product));
      
      const state = store.getState().products;
      expect(state.selectedProduct).toEqual(product);
    });

    it('should handle null product', () => {
      store.dispatch(setSelectedProduct(null));
      
      const state = store.getState().products;
      expect(state.selectedProduct).toBeNull();
    });
  });

  describe('clearSelectedProduct', () => {
    it('should clear the selected product', () => {
      // First set a product
      store.dispatch(setSelectedProduct(mockProducts[0]));
      
      // Then clear it
      store.dispatch(clearSelectedProduct());
      
      const state = store.getState().products;
      expect(state.selectedProduct).toBeNull();
    });
  });

  describe('setCurrentPage', () => {
    it('should set the current page', () => {
      const page = 3;
      
      store.dispatch(setCurrentPage(page));
      
      const state = store.getState().products;
      expect(state.currentPage).toBe(page);
    });
  });

  describe('updateProductStock', () => {
    it('should update stock for existing product', async () => {
      // First set some products
      const mockResponse = {
        data: {
          products: mockProducts,
          pagination: {
            total: 2,
            hasMore: false,
          },
        },
      };
      
      apiService.request.mockResolvedValue(mockResponse);
      await store.dispatch(fetchProducts());
      
      // Update stock
      store.dispatch(updateProductStock({ productId: 1, newStock: 5 }));
      
      const state = store.getState().products;
      const updatedProduct = state.items.find(p => p.id === 1);
      expect(updatedProduct.stock).toBe(5);
    });

    it('should not update stock for non-existing product', () => {
      store.dispatch(updateProductStock({ productId: 999, newStock: 5 }));
      
      const state = store.getState().products;
      expect(state.items).toEqual([]);
    });
  });

  describe('clearProductsError', () => {
    it('should clear the error state', async () => {
      // First set an error
      apiService.request.mockRejectedValue(new Error('Network error'));
      await store.dispatch(fetchProducts());
      
      // Clear the error
      store.dispatch(clearProductsError());
      
      const state = store.getState().products;
      expect(state.error).toBeNull();
    });
  });

  describe('resetPagination', () => {
    it('should reset all pagination state', () => {
      // First set some pagination state
      store.dispatch(setCurrentPage(3));
      
      // Reset pagination
      store.dispatch(resetPagination());
      
      const state = store.getState().products;
      expect(state.currentPage).toBe(1);
      expect(state.totalPages).toBe(1);
      expect(state.totalItems).toBe(0);
      expect(state.hasMore).toBe(false);
      expect(state.lastFetched).toBeNull();
      expect(state.fetchingPage).toBeNull();
    });
  });

  describe('fetchProducts async thunk', () => {
    describe('successful requests', () => {
      it('should fetch products with default parameters', async () => {
        const mockResponse = {
          data: {
            products: mockProducts,
            pagination: {
              total: 20,
              hasMore: true,
            },
          },
        };
        
        apiService.request.mockResolvedValue(mockResponse);

        await store.dispatch(fetchProducts());
        
        expect(apiService.request).toHaveBeenCalledWith(
          '/products?limit=6&offset=0&availableOnly=true'
        );
        
        const state = store.getState().products;
        expect(state.loading).toBe(false);
        expect(state.items).toEqual(mockProducts);
        expect(state.currentPage).toBe(1);
        expect(state.totalItems).toBe(20);
        expect(state.hasMore).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should fetch products with custom pagination', async () => {
        const mockResponse = {
          data: {
            products: mockProducts,
            pagination: {
              total: 15,
              hasMore: false,
            },
          },
        };
        
        apiService.request.mockResolvedValue(mockResponse);

        await store.dispatch(fetchProducts({ page: 2, limit: 10 }));
        
        expect(apiService.request).toHaveBeenCalledWith(
          '/products?limit=10&offset=10&availableOnly=true'
        );
        
        const state = store.getState().products;
        expect(state.currentPage).toBe(2);
        expect(state.totalItems).toBe(15);
        expect(state.hasMore).toBe(false);
      });

      it('should handle empty products response', async () => {
        const mockResponse = {
          data: {
            products: [],
            pagination: {
              total: 0,
              hasMore: false,
            },
          },
        };
        
        apiService.request.mockResolvedValue(mockResponse);

        await store.dispatch(fetchProducts());
        
        const state = store.getState().products;
        expect(state.items).toEqual([]);
        expect(state.totalItems).toBe(0);
        expect(state.hasMore).toBe(false);
      });
    });

    describe('loading states', () => {
      it('should set loading state during request', () => {
        apiService.request.mockImplementation(() => new Promise(() => {})); // Never resolves
        
        store.dispatch(fetchProducts({ page: 2 }));
        
        const state = store.getState().products;
        expect(state.loading).toBe(true);
        expect(state.fetchingPage).toBe(2);
        expect(state.error).toBeNull();
      });

      it('should clear loading state on success', async () => {
        const mockResponse = {
          data: {
            products: mockProducts,
            pagination: { total: 10, hasMore: false },
          },
        };
        
        apiService.request.mockResolvedValue(mockResponse);

        await store.dispatch(fetchProducts());
        
        const state = store.getState().products;
        expect(state.loading).toBe(false);
        expect(state.fetchingPage).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should handle API errors', async () => {
        const errorMessage = 'Network error';
        apiService.request.mockRejectedValue(new Error(errorMessage));

        await store.dispatch(fetchProducts());
        
        const state = store.getState().products;
        expect(state.loading).toBe(false);
        expect(state.error).toBe(errorMessage);
        expect(state.fetchingPage).toBeNull();
      });

      it('should handle errors without message', async () => {
        apiService.request.mockRejectedValue({});

        await store.dispatch(fetchProducts());
        
        const state = store.getState().products;
        expect(state.error).toBe('Error al cargar productos');
      });
    });
  });

  describe('setItemsPerPage with calculations', () => {
    it('should set items per page and recalculate total pages', async () => {
      // First set some total items
      const mockResponse = {
        data: {
          products: mockProducts,
          pagination: {
            total: 20,
            hasMore: true,
          },
        },
      };
      
      apiService.request.mockResolvedValue(mockResponse);
      await store.dispatch(fetchProducts());
      
      // Now change items per page
      store.dispatch(setItemsPerPage(10));
      
      const state = store.getState().products;
      expect(state.itemsPerPage).toBe(10);
      expect(state.totalPages).toBe(2); // 20 items / 10 per page = 2 pages
    });

    it('should reset current page if it exceeds total pages', async () => {
      // Set high page number
      store.dispatch(setCurrentPage(5));
      
      // Set some data
      const mockResponse = {
        data: {
          products: mockProducts,
          pagination: {
            total: 10,
            hasMore: false,
          },
        },
      };
      
      apiService.request.mockResolvedValue(mockResponse);
      await store.dispatch(fetchProducts());
      
      // Change items per page to make current page invalid
      store.dispatch(setItemsPerPage(20));
      
      const state = store.getState().products;
      expect(state.currentPage).toBe(1); // Should reset to 1
      expect(state.totalPages).toBe(1); // 10 items / 20 per page = 1 page
    });
  });
});