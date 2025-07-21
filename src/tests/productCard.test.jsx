import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProductCard from '../components/ProductCard';
import { setSelectedProduct } from '../store/slices/productsSlice';

// Mock de los módulos externos
jest.mock('../hooks/useLocalStorage', () => ({
  usePurchaseProgress: jest.fn(() => ({
    clearPaymentDataForNewProduct: jest.fn(),
  })),
}));

jest.mock('../components/CreditCardModal', () => {
  return function MockCreditCardModal({ isOpen, onClose, selectedProduct }) {
    return isOpen ? (
      <div data-testid="credit-card-modal">
        <div>Modal for: {selectedProduct?.name}</div>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null;
  };
});

jest.mock('../services/api', () => ({
  formatPrice: jest.fn((price) => `$${price.toLocaleString()}`),
}));

jest.mock('../components/ProductCard.css', () => ({}));

import { usePurchaseProgress } from '../hooks/useLocalStorage';
import { formatPrice } from '../services/api';

// Mock del reducer para Redux
const mockProductsReducer = (state = {}, action) => {
  switch (action.type) {
    case 'products/setSelectedProduct':
      return { ...state, selectedProduct: action.payload };
    default:
      return state;
  }
};

describe('ProductCard', () => {
  let store;
  let mockClearPaymentData;

  const mockProduct = {
    id: 1,
    name: 'iPhone 14',
    description: 'Latest iPhone model with advanced features',
    price: 2500000,
    baseFee: 250000,
    stock: 10,
    imageUrl: 'https://example.com/iphone14.jpg',
    isActive: true,
    isAvailable: true,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        products: mockProductsReducer,
      },
    });

    mockClearPaymentData = jest.fn();
    usePurchaseProgress.mockReturnValue({
      clearPaymentDataForNewProduct: mockClearPaymentData,
    });

    formatPrice.mockImplementation((price) => `$${price.toLocaleString()}`);

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  const renderProductCard = (product = mockProduct) => {
    return render(
      <Provider store={store}>
        <ProductCard product={product} />
      </Provider>
    );
  };

  describe('Product Information Display', () => {
    it('should render product information correctly', () => {
      renderProductCard();

      expect(screen.getByText('iPhone 14')).toBeInTheDocument();
      expect(screen.getByText('Latest iPhone model with advanced features')).toBeInTheDocument();
      expect(screen.getByText('$2,500,000')).toBeInTheDocument();
      expect(screen.getByText('Fee base: $250,000')).toBeInTheDocument();
    });

    it('should display product image with correct attributes', () => {
      renderProductCard();

      const image = screen.getByAltText('iPhone 14');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/iphone14.jpg');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('should not display base fee when not provided', () => {
      const productWithoutBaseFee = { ...mockProduct, baseFee: null };
      renderProductCard(productWithoutBaseFee);

      expect(screen.queryByText(/Fee base:/)).not.toBeInTheDocument();
    });

    it('should display stock information for available product', () => {
      renderProductCard();

      expect(screen.getByText('📦 10 disponibles')).toBeInTheDocument();
      expect(screen.getByText('📦 10 disponibles')).toHaveClass('in-stock');
    });
  });

  describe('Product Availability States', () => {
    it('should show available state for active product with stock', () => {
      renderProductCard();

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      expect(buyButton).toBeInTheDocument();
      expect(buyButton).not.toBeDisabled();
      expect(buyButton).not.toHaveClass('disabled');
    });

    it('should show out of stock when stock is zero', () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      renderProductCard(outOfStockProduct);

      expect(screen.getByText('❌ Agotado')).toBeInTheDocument();
      expect(screen.getByText('❌ Agotado')).toHaveClass('out-of-stock');
      
      const buyButton = screen.getByRole('button', { name: /no disponible/i });
      expect(buyButton).toBeDisabled();
      expect(buyButton).toHaveClass('disabled');
    });

    it('should show unavailable when product is not active', () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      renderProductCard(inactiveProduct);

      expect(screen.getByText('❌ No disponible')).toBeInTheDocument();
      
      const buyButton = screen.getByRole('button', { name: /no disponible/i });
      expect(buyButton).toBeDisabled();
    });

    it('should show unavailable when product is not available', () => {
      const unavailableProduct = { ...mockProduct, isAvailable: false };
      renderProductCard(unavailableProduct);

      expect(screen.getByText('❌ No disponible')).toBeInTheDocument();
      
      const buyButton = screen.getByRole('button', { name: /no disponible/i });
      expect(buyButton).toBeDisabled();
    });

    it('should handle product with positive stock but not available', () => {
      const unavailableProduct = {
        ...mockProduct,
        isActive: false,
        stock: 5,
      };
      renderProductCard(unavailableProduct);

      expect(screen.getByText('❌ No disponible')).toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('should handle image load event', () => {
      renderProductCard();

      const image = screen.getByAltText('iPhone 14');
      
      // Mock the style property
      Object.defineProperty(image, 'style', {
        value: { display: '' },
        writable: true,
      });

      fireEvent.load(image);

      expect(image.style.display).toBe('block');
    });

    it('should handle image error on first attempt', () => {
      renderProductCard();

      const image = screen.getByAltText('iPhone 14');
      
      // Mock the style property
      Object.defineProperty(image, 'style', {
        value: { display: 'block' },
        writable: true,
      });

      fireEvent.error(image);

      expect(image.style.display).toBe('none');
    });

    it('should not handle image error on subsequent attempts', () => {
      renderProductCard();

      const image = screen.getByAltText('iPhone 14');
      
      // Mock the style property
      Object.defineProperty(image, 'style', {
        value: { display: 'block' },
        writable: true,
      });

      // First error - should hide image
      fireEvent.error(image);
      expect(image.style.display).toBe('none');

      // Reset display for second error test
      image.style.display = 'block';

      // Second error - should not change display
      fireEvent.error(image);
      expect(image.style.display).toBe('block');
    });

    it('should apply error class when image fails to load', () => {
  renderProductCard();

  const image = screen.getByAltText('iPhone 14');
  const imageContainer = image.closest('.product-image');

  expect(imageContainer).not.toHaveClass('image-error');

  // Mock style property
  Object.defineProperty(image, 'style', {
    value: { display: 'block' },
    writable: true,
  });

  fireEvent.error(image);

  // Después del error, la imagen se oculta pero el contenedor sí tiene la clase
  expect(imageContainer).toHaveClass('image-error');
  // La imagen ya no es visible después del error
  expect(image.style.display).toBe('none');
});
  });

  describe('Buy Button Functionality', () => {
    it('should handle buy click for available product', () => {
      renderProductCard();

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      // Should clear payment data
      expect(mockClearPaymentData).toHaveBeenCalledWith(mockProduct.id);

      // Should dispatch Redux action
      const state = store.getState();
      expect(state.products.selectedProduct).toEqual(mockProduct);

      // Should open modal
      expect(screen.getByTestId('credit-card-modal')).toBeInTheDocument();
      expect(screen.getByText('Modal for: iPhone 14')).toBeInTheDocument();
    });

    it('should not handle click for unavailable product', () => {
      const unavailableProduct = { ...mockProduct, stock: 0 };
      renderProductCard(unavailableProduct);

      const buyButton = screen.getByRole('button', { name: /no disponible/i });
      
      // Button should be disabled, so click won't work
      expect(buyButton).toBeDisabled();

      fireEvent.click(buyButton);

      // Should not clear payment data
      expect(mockClearPaymentData).not.toHaveBeenCalled();

      // Should not open modal
      expect(screen.queryByTestId('credit-card-modal')).not.toBeInTheDocument();
    });
  });

  describe('Modal Functionality', () => {
    it('should open modal when buy button is clicked', () => {
      renderProductCard();

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      expect(screen.getByTestId('credit-card-modal')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      renderProductCard();

      // Open modal
      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      expect(screen.getByTestId('credit-card-modal')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('credit-card-modal')).not.toBeInTheDocument();
      });
    });

    it('should pass correct props to modal', () => {
      renderProductCard();

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      expect(screen.getByText('Modal for: iPhone 14')).toBeInTheDocument();
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch setSelectedProduct action', () => {
      const initialState = store.getState();
      expect(initialState.products.selectedProduct).toBeUndefined();

      renderProductCard();

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      const finalState = store.getState();
      expect(finalState.products.selectedProduct).toEqual(mockProduct);
    });

    it('should work with different product data', () => {
      const differentProduct = {
        ...mockProduct,
        id: 2,
        name: 'Samsung Galaxy',
        price: 2000000,
      };

      renderProductCard(differentProduct);

      const buyButton = screen.getByRole('button', { name: /pagar con tarjeta/i });
      fireEvent.click(buyButton);

      expect(mockClearPaymentData).toHaveBeenCalledWith(2);

      const state = store.getState();
      expect(state.products.selectedProduct.name).toBe('Samsung Galaxy');
    });
  });

  describe('Price Formatting', () => {
    it('should call formatPrice with correct values', () => {
      renderProductCard();

      expect(formatPrice).toHaveBeenCalledWith(2500000);
      expect(formatPrice).toHaveBeenCalledWith(250000);
    });

    it('should handle products with different prices', () => {
      const expensiveProduct = {
        ...mockProduct,
        price: 5000000,
        baseFee: 500000,
      };

      renderProductCard(expensiveProduct);

      expect(formatPrice).toHaveBeenCalledWith(5000000);
      expect(formatPrice).toHaveBeenCalledWith(500000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle product without image URL', () => {
      const productWithoutImage = { ...mockProduct, imageUrl: '' };
      renderProductCard(productWithoutImage);

      const image = screen.getByAltText('iPhone 14');
      // When imageUrl is empty, the src attribute might not be set or be empty
      expect(image).toBeInTheDocument();
      // Check that either src is empty string or the attribute doesn't exist
      const srcAttribute = image.getAttribute('src');
      expect(srcAttribute === '' || srcAttribute === null).toBe(true);
    });

    it('should handle product with very long description', () => {
      const longDescription = 'A'.repeat(200);
      const productWithLongDesc = { ...mockProduct, description: longDescription };
      renderProductCard(productWithLongDesc);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle product with zero base fee', () => {
      const productWithZeroFee = { ...mockProduct, baseFee: 0 };
      renderProductCard(productWithZeroFee);

      // When baseFee is 0, the component should still render it
      // But the condition in the component checks if (product.baseFee), which is falsy for 0
      // So it won't render the fee base section
      expect(screen.queryByText(/Fee base:/)).not.toBeInTheDocument();
    });

    it('should display base fee when it has a positive value', () => {
      const productWithBaseFee = { ...mockProduct, baseFee: 100000 };
      renderProductCard(productWithBaseFee);

      expect(screen.getByText('Fee base: $100,000')).toBeInTheDocument();
    });

    it('should handle missing product properties gracefully', () => {
      const incompleteProduct = {
        id: 1,
        name: 'Test Product',
        price: 100000,
        stock: 5,
        isActive: true,
        isAvailable: true,
        // Missing description, imageUrl, baseFee
      };

      expect(() => renderProductCard(incompleteProduct)).not.toThrow();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS classes', () => {
      renderProductCard();

      expect(document.querySelector('.product-card')).toBeInTheDocument();
      expect(document.querySelector('.product-image')).toBeInTheDocument();
      expect(document.querySelector('.product-info')).toBeInTheDocument();
      expect(document.querySelector('.product-name')).toBeInTheDocument();
      expect(document.querySelector('.buy-button')).toBeInTheDocument();
    });

    it('should apply disabled class to button when product unavailable', () => {
      const unavailableProduct = { ...mockProduct, stock: 0 };
      renderProductCard(unavailableProduct);

      const buyButton = screen.getByRole('button');
      expect(buyButton).toHaveClass('disabled');
    });
  });
});