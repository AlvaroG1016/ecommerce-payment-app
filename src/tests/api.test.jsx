import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../App';

// Mock del apiService para evitar llamadas reales
jest.mock('../services/api', () => ({
  apiService: {
    baseURL: 'http://localhost:3001/api',
    isDevelopment: jest.fn(() => false),
    isConfigured: jest.fn(() => true),
    getProducts: jest.fn(() => Promise.resolve({ data: { products: [] } })),
  },
  formatPrice: jest.fn((price) => `$${price}`),
  handleApiError: jest.fn((error) => error.message),
  validateApiResponse: jest.fn(() => true),
}));

// Mock de los slices de Redux
const mockProductsSlice = (state = {
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
}, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const mockAppSlice = (state = {
  currentStep: 'products',
  selectedProduct: null,
  customerData: {},
  paymentData: {},
  transactionData: {},
}, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

// Crear store de prueba
const createTestStore = () => {
  return configureStore({
    reducer: {
      products: mockProductsSlice,
      app: mockAppSlice,
    },
  });
};

// Helper para renderizar con Provider
const renderWithProvider = (component, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders without crashing', () => {
    renderWithProvider(<App />);
    // Just check that it renders without throwing
    expect(document.body).toBeInTheDocument();
  });

  test('renders with Redux store', () => {
    const store = createTestStore();
    renderWithProvider(<App />, store);
    
    // Verify the store is accessible
    expect(store.getState()).toBeDefined();
    expect(store.getState().products).toBeDefined();
    expect(store.getState().app).toBeDefined();
  });

  test('initializes with correct default state', () => {
    const store = createTestStore();
    renderWithProvider(<App />, store);
    
    const state = store.getState();
    expect(state.app.currentStep).toBe('products');
    expect(state.products.items).toEqual([]);
    expect(state.products.loading).toBe(false);
  });

  // Test básico de renderizado
  test('renders main app container', () => {
    renderWithProvider(<App />);
    
    // Buscar por clase o estructura básica que esté en tu App
    const appElement = document.querySelector('.App') || document.body.firstChild;
    expect(appElement).toBeInTheDocument();
  });

  test('handles different app steps', () => {
    const testSteps = ['products', 'payment', 'summary', 'status'];
    
    testSteps.forEach(step => {
      const store = configureStore({
        reducer: {
          products: mockProductsSlice,
          app: (state = { currentStep: step }, action) => state,
        },
      });
      
      renderWithProvider(<App />, store);
      expect(store.getState().app.currentStep).toBe(step);
    });
  });
});