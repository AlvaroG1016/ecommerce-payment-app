import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProductCard from './ProductCard';
import cartSlice from '../../redux/slices/cartSlice';

// Mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      cart: cartSlice,
    },
    preloadedState: {
      cart: { items: [], total: 0 },
      ...initialState,
    },
  });
};

// Helper para renderizar con store
const renderWithProvider = (component, initialState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
  };
};

describe('ProductCard Component', () => {
  const mockProduct = {
    id: 1,
    name: 'iPhone 14',
    description: 'Latest iPhone model',
    price: 2500000,
    stock: 10,
    imageUrl: 'https://example.com/iphone14.jpg',
    baseFee: 250000,
    isActive: true,
  };

  it('should render product information correctly', () => {
    renderWithProvider(<ProductCard product={mockProduct} />);

    expect(screen.getByText('iPhone 14')).toBeInTheDocument();
    expect(screen.getByText('Latest iPhone model')).toBeInTheDocument();
    expect(screen.getByText('$2,500,000')).toBeInTheDocument();
    expect(screen.getByText('Stock: 10')).toBeInTheDocument();
  });

  it('should display product image with correct alt text', () => {
    renderWithProvider(<ProductCard product={mockProduct} />);

    const image = screen.getByAltText('iPhone 14');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/iphone14.jpg');
  });

  it('should show "Add to Cart" button when product is available', () => {
    renderWithProvider(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addButton).toBeInTheDocument();
    expect(addButton).not.toBeDisabled();
  });

  it('should disable "Add to Cart" button when product is out of stock', () => {
    const outOfStockProduct = { ...mockProduct, stock: 0 };
    renderWithProvider(<ProductCard product={outOfStockProduct} />);

    const addButton = screen.getByRole('button', { name: /out of stock/i });
    expect(addButton).toBeDisabled();
  });

  it('should dispatch addToCart action when button is clicked', () => {
    const { store } = renderWithProvider(<ProductCard product={mockProduct} />);
    const addButton = screen.getByRole('button', { name: /add to cart/i });

    fireEvent.click(addButton);

    const state = store.getState();
    expect(state.cart.items).toHaveLength(1);
    expect(state.cart.items[0].id).toBe(mockProduct.id);
  });

  it('should not render inactive products', () => {
    const inactiveProduct = { ...mockProduct, isActive: false };
    const { container } = renderWithProvider(<ProductCard product={inactiveProduct} />);

    expect(container.firstChild).toBeNull();
  });

  it('should format price correctly for Colombian pesos', () => {
    renderWithProvider(<ProductCard product={mockProduct} />);

    // Verificar formato de moneda colombiana
    expect(screen.getByText(/\$2,500,000/)).toBeInTheDocument();
  });

  it('should handle missing image gracefully', () => {
    const productWithoutImage = { ...mockProduct, imageUrl: null };
    renderWithProvider(<ProductCard product={productWithoutImage} />);

    const image = screen.getByAltText('iPhone 14');
    expect(image).toHaveAttribute('src', '/images/placeholder.jpg');
  });

  it('should show stock warning when stock is low', () => {
    const lowStockProduct = { ...mockProduct, stock: 2 };
    renderWithProvider(<ProductCard product={lowStockProduct} />);

    expect(screen.getByText(/only 2 left/i)).toBeInTheDocument();
    expect(screen.getByText(/only 2 left/i)).toHaveClass('stock-warning');
  });
});