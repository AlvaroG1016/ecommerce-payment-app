// src/__tests__/components/CreditCardModal.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CreditCardModal from '../../components/CreditCardModal';
import { paymentHandler } from '../../services/paymentHandler';

jest.mock('../../services/paymentHandler');
jest.mock('../../services/colombiaLocations');

const mockStore = configureStore({
  reducer: {
    // Mock reducer
  }
});

describe('CreditCardModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    selectedProduct: {
      id: 1,
      name: 'Test Product',
      price: 50000
    }
  };

  test('should render modal when open', () => {
    render(
      <Provider store={mockStore}>
        <CreditCardModal {...mockProps} />
      </Provider>
    );

    expect(screen.getByText('💳 Información de Pago')).toBeInTheDocument();
  });

  test('should validate form fields', async () => {
    render(
      <Provider store={mockStore}>
        <CreditCardModal {...mockProps} />
      </Provider>
    );

    const submitButton = screen.getByText('💳 Procesar Pago');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Número de tarjeta inválido')).toBeInTheDocument();
    });
  });

  test('should process payment successfully', async () => {
    paymentHandler.processCompletePurchase.mockResolvedValueOnce({
      success: true,
      status: 'COMPLETED'
    });

    render(
      <Provider store={mockStore}>
        <CreditCardModal {...mockProps} />
      </Provider>
    );

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Número de tarjeta'), {
      target: { value: '4242424242424242' }
    });

    // Submit
    fireEvent.click(screen.getByText('💳 Procesar Pago'));

    await waitFor(() => {
      expect(paymentHandler.processCompletePurchase).toHaveBeenCalled();
    });
  });
});