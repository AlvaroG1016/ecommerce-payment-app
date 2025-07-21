// services/wompi.service.js
import CryptoJS from 'crypto-js';

class WompiService {
  constructor() {
    // Estas variables deben estar en tu .env del frontend
    this.privateKey = process.env.REACT_APP_WOMPI_PRIVATE_KEY;
    this.publicKey = process.env.REACT_APP_WOMPI_PUBLIC_KEY;
    this.integrityKey = process.env.REACT_APP_WOMPI_INTEGRITY_KEY;
    this.sandboxUrl = process.env.REACT_APP_WOMPI_SANDBOX_URL || 'https://sandbox.wompi.co/v1';
    
    console.log('🔑 WompiService initialized:', {
      publicKey: this.publicKey?.substring(0, 20) + '...',
      sandboxUrl: this.sandboxUrl
    });
  }

  /**
   * Generar firma de integridad según documentación de Wompi
   * reference + amount_in_cents + currency + integrity_key
   */
  generateIntegritySignature(data) {
    try {
      const concatenatedString = `${data.reference}${data.amount_in_cents}${data.currency}${this.integrityKey}`;
      
      // Usar crypto-js para SHA256 en el frontend
      const signature = CryptoJS.SHA256(concatenatedString).toString(CryptoJS.enc.Hex);
      
      console.log('🔐 Signature generated for:', {
        reference: data.reference,
        amount: data.amount_in_cents,
        currency: data.currency
      });
      
      return signature;
    } catch (error) {
      console.error('❌ Failed to generate integrity signature:', error.message);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * Obtener token de aceptación del merchant
   */
  async getAcceptanceToken() {
    try {
      console.log('🎫 Getting acceptance token from merchant info...');
      console.log('🔑 Using public key:', this.publicKey?.substring(0, 20) + '...');
      
      // Validar que la public key tenga el formato correcto
      if (!this.publicKey || !this.publicKey.startsWith('pub_')) {
        throw new Error('Invalid public key format. Must start with "pub_"');
      }
      
      const response = await fetch(`${this.sandboxUrl}/merchants/${this.publicKey}`, {
        method: 'GET',
        headers: {
          // NO usar Authorization header para merchant info - solo la public key en la URL
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to get acceptance token:', errorData);
        console.error('❌ Status:', response.status);
        console.error('❌ Public key used:', this.publicKey?.substring(0, 30) + '...');
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('🏪 Acceptance token retrieved successfully');
      
      return data;
    } catch (error) {
      console.error('❌ Failed to get acceptance token:', error);
      throw new Error(`Acceptance token retrieval failed: ${error.message}`);
    }
  }

  /**
   * Crear token de tarjeta
   */
  async createCardToken(cardData) {
    try {
      console.log('💳 Creating card token...');
      console.log('🔑 Using public key for token:', this.publicKey?.substring(0, 20) + '...');
      
      // Validar que la public key tenga el formato correcto
      if (!this.publicKey || !this.publicKey.startsWith('pub_')) {
        throw new Error('Invalid public key format for token creation. Must start with "pub_"');
      }
      
      const payload = {
        number: cardData.number.replace(/\s/g, ''),
        cvc: cardData.cvc,
        exp_month: cardData.exp_month.padStart(2, '0'),
        exp_year: cardData.exp_year,
        card_holder: cardData.card_holder.trim(),
      };

      console.log('📤 Token payload:', {
        number: '**** **** **** ' + payload.number.slice(-4),
        cvc: '***',
        exp_month: payload.exp_month,
        exp_year: payload.exp_year,
        card_holder: payload.card_holder
      });

      const response = await fetch(`${this.sandboxUrl}/tokens/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.publicKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to create card token:', errorData);
        console.error('❌ Status:', response.status);
        console.error('❌ Public key used:', this.publicKey?.substring(0, 30) + '...');
        throw new Error(`Token creation failed: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('✅ Card token created successfully:', data.data?.id || 'No ID in response');
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create card token:', error);
      throw error;
    }
  }

  /**
   * Procesar pago en Wompi
   */
  async processPayment(paymentData) {
    try {
      console.log('💰 Processing payment with Wompi...');

      if (!paymentData.acceptance_token) {
        throw new Error('acceptance_token is required');
      }

      if (!paymentData.signature) {
        throw new Error('signature is required');
      }

      const response = await fetch(`${this.sandboxUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.privateKey}`,
          
        },
        body: JSON.stringify(paymentData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Payment processing failed:', data);
        
        // Retornar respuesta de error estructurada
        return {
          data: {
            id: '',
            status: 'ERROR',
            reference: paymentData.reference,
            amount_in_cents: paymentData.amount_in_cents,
            currency: paymentData.currency,
            payment_method_type: 'CARD',
            status_message: data.error?.reason || JSON.stringify(data),
            created_at: new Date().toISOString(),
          },
        };
      }

      console.log('✅ Payment processed successfully');
      return data;
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de transacción
   */
  async getTransactionStatus(transactionId) {
    try {
      console.log('🔍 Getting transaction status for:', transactionId);
      
      const response = await fetch(`${this.sandboxUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.privateKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get transaction status: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('✅ Transaction status retrieved');
      
      return data;
    } catch (error) {
      console.error('❌ Failed to get transaction status:', error);
      throw error;
    }
  }

  /**
   * Proceso completo: crear token y procesar pago
   */
  async processPaymentWithNewCard(paymentData) {
    try {
      console.log('🔄 Starting complete payment process...');
      
      // 1. Obtener token de aceptación
      const merchantInfo = await this.getAcceptanceToken();
      console.log('✅ Step 1: Merchant info retrieved');
      
      // 2. Crear token de tarjeta
      const cardToken = await this.createCardToken(paymentData.cardData);
      console.log('✅ Step 2: Card token created');
      
      // 3. Generar firma de integridad
      const signature = this.generateIntegritySignature({
        reference: paymentData.reference,
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
      });
      console.log('✅ Step 3: Integrity signature generated');
      
      // 4. Preparar request de pago
      const paymentRequest = {
        amount_in_cents: paymentData.amount_in_cents,
        currency: paymentData.currency,
        customer_email: paymentData.customer_email,
        reference: paymentData.reference,
        acceptance_token: merchantInfo.data.presigned_acceptance.acceptance_token,
        accept_personal_auth: merchantInfo.data.presigned_personal_data_auth.acceptance_token,
        signature: signature,
        payment_method: {
          type: 'CARD',
          installments: paymentData.installments || 1,
          token: cardToken.data.id,
        },
      };
      
      // 5. Procesar pago
      const result = await this.processPayment(paymentRequest);
      console.log('✅ Step 4: Payment processed');
      
      return result;
    } catch (error) {
      console.error('❌ Complete payment process failed:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  convertToCents(amountInPesos) {
    return Math.round(amountInPesos * 100);
  }

  generateReference(transactionId) {
    const timestamp = Date.now();
    return `TXN-${transactionId}-${timestamp}`;
  }

  isValidTestCard(cardNumber) {
    const testCards = [
      '4242424242424242', // VISA que siempre aprueba
      '4000000000000002', // VISA que siempre rechaza
      '5555555555554444', // MASTERCARD que siempre aprueba
      '2223003122003222', // MASTERCARD que siempre rechaza
    ];
    const cleanNumber = cardNumber.replace(/\s/g, '');
    return testCards.includes(cleanNumber);
  }

  getTestCards() {
    return {
      visa_approved: '4242424242424242',
      visa_declined: '4000000000000002',
      mastercard_approved: '5555555555554444',
      mastercard_declined: '2223003122003222',
    };
  }
}

export default new WompiService();