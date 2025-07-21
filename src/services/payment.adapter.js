
export const PaymentStatus = {
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  DECLINED: 'DECLINED',
  ERROR: 'ERROR',
  VOIDED: 'VOIDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

export class PaymentServiceAdapter {
  constructor(paymentProvider) {
    this.paymentProvider = paymentProvider;
  }

  async processPayment(request) {
    try {
      console.log('🔄 PaymentAdapter: Starting payment process...');
      console.log('💰 Amount to process:', request.amount, 'COP');

      const cardValidation = this.validateTestCard(request.cardNumber);
      console.log('💳 Card validation:', cardValidation);

      const result = await this.paymentProvider.processPaymentWithNewCard({
        amount_in_cents: this.paymentProvider.convertToCents(request.amount),
        currency: request.currency,
        customer_email: request.customerEmail,
        reference: this.generateReference(request.transactionId),
        cardData: {
          number: request.cardNumber,
          cvc: request.cardCvc,
          exp_month: request.cardExpMonth,
          exp_year: request.cardExpYear,
          card_holder: request.cardHolder,
        },
        installments: request.installments,
      });

      const mappedResult = this.mapProviderResponseToDomain(result, result.data.reference);
      return mappedResult;

    } catch (error) {
      console.error('❌ PaymentAdapter: Payment processing failed:', error);

      let errorMessage = 'Payment processing error';
      let errorStatus = PaymentStatus.ERROR; // asegúrate de importar PaymentStatus

      if (error.response && error.response.data) {
        const errorData = error.response.data;
        console.error('❌ Provider error details:', JSON.stringify(errorData, null, 2));
        if (errorData.error) {
          errorMessage = errorData.error.reason || errorData.error.messages_key || 'Provider error';
          if (errorMessage.includes('declined') || errorMessage.includes('insufficient')) {
            errorStatus = PaymentStatus.DECLINED;
          }
        }
      }

      return {
        success: false,
        providerTransactionId: '',
        reference: this.generateReference(request.transactionId),
        status: errorStatus,
        message: errorMessage,
        processedAt: new Date(),
      };
    }
  }

  validateTestCard(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');

    const testCards = {
      '4242424242424242': 'APPROVED', // VISA que siempre aprueba
      '4000000000000002': 'DECLINED', // VISA que siempre rechaza
      '5555555555554444': 'APPROVED', // MASTERCARD que siempre aprueba
      '2223003122003222': 'DECLINED', // MASTERCARD que siempre rechaza
    };

    if (testCards[cleanNumber]) {
      return {
        isTestCard: true,
        expectedResult: testCards[cleanNumber],
      };
    }

    return {
      isTestCard: false,
      expectedResult: 'UNKNOWN',
    };
  }

  async getPaymentStatus(providerTransactionId) {
    try {
      console.log('🔍 PaymentAdapter: Checking payment status for:', providerTransactionId);

      const providerResponse = await this.paymentProvider.getTransactionStatus(providerTransactionId);

      console.log('📥 PaymentAdapter: Status response:', {
        status: providerResponse.data.status,
        id: providerResponse.data.id,
      });

      return this.mapProviderResponseToDomain(providerResponse, providerResponse.data.reference);

    } catch (error) {
      console.error('❌ PaymentAdapter: Failed to get payment status:', error);

      return {
        success: false,
        providerTransactionId,
        reference: '',
        status: PaymentStatus.ERROR,
        message: `Failed to get payment status: ${error.message}`,
        processedAt: new Date(),
      };
    }
  }

  async getAcceptanceTokenInfo() {
    try {
      const merchantInfo = await this.paymentProvider.getAcceptanceToken();

      return {
        acceptanceToken: merchantInfo.data.presigned_acceptance.acceptance_token,
        personalDataToken: merchantInfo.data.presigned_personal_data_auth.acceptance_token,
        termsAndConditionsUrl: merchantInfo.data.presigned_acceptance.permalink,
        privacyPolicyUrl: merchantInfo.data.presigned_personal_data_auth.permalink,
      };
    } catch (error) {
      console.error('❌ Failed to get acceptance token info:', error.message);
      throw error;
    }
  }

  generateReference(transactionId) {
    return this.paymentProvider.generateReference(transactionId);
  }

  mapProviderResponseToDomain(providerResponse, reference) {
    const data = providerResponse.data;

    console.log('🔄 Mapping provider response to domain:', {
      originalStatus: data.status,
      hasId: !!data.id,
      hasMessage: !!data.status_message,
    });

    let success = false;
    let status;
    let message = data.status_message || 'No message provided';

    switch (data.status) {
      case 'APPROVED':
        success = true;
        status = PaymentStatus.APPROVED;
        message = message || 'Payment approved successfully';
        break;
      case 'PENDING':
        success = false;
        status = PaymentStatus.PENDING;
        message = message || 'Payment is being processed';
        break;
      case 'DECLINED':
        success = false;
        status = PaymentStatus.DECLINED;
        message = message || 'Payment was declined';
        break;
      case 'ERROR':
        success = false;
        status = PaymentStatus.ERROR;
        message = message || 'Payment processing error';
        break;
      case 'VOIDED':
        success = false;
        status = PaymentStatus.VOIDED;
        message = message || 'Payment was cancelled';
        break;
      case 'FAILED':
        success = false;
        status = PaymentStatus.FAILED;
        message = message || 'Payment failed';
        break;
      case 'CANCELLED':
        success = false;
        status = PaymentStatus.CANCELLED;
        message = message || 'Payment was cancelled';
        break;
      default:
        console.warn('⚠️ Unknown payment status received:', data.status);
        success = false;
        status = PaymentStatus.ERROR;
        message = `Unknown payment status: ${data.status}`;
    }

    const result = {
      success,
      providerTransactionId: data.id || '',
      reference: data.reference || reference,
      status,
      message,
      processedAt: new Date(data.created_at || Date.now()),
      amount: data.amount_in_cents ? data.amount_in_cents / 100 : undefined,
      currency: data.currency,
    };

    console.log('✅ Mapped result:', {
      success: result.success,
      status: result.status,
      hasProviderId: !!result.providerTransactionId,
    });

    return result;
  }
}
