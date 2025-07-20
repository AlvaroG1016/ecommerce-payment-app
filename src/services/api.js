class ApiService {
  constructor() {
    // Para desarrollo usamos localhost, para producción será tu API Gateway
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log('🔄 API Request:', url, config);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Obtener productos desde tu backend
  async getProducts() {
    const response = await this.request('/products');
    // Tu backend devuelve { success, data: { products: [...] } }
    return response.data.products;
  }

  // Crear transacción (será útil más adelante)
  async createTransaction(transactionData) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Actualizar stock de producto (después del pago)
  async updateProductStock(productId, newStock) {
    return this.request(`/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: newStock }),
    });
  }
}

export const apiService = new ApiService();

// Función para formatear precios colombianos
export const formatPrice = (price) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price);
};