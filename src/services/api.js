// src/services/api.js - Actualizado para usar variables de entorno
class ApiService {
  constructor() {
    // Usar variable de entorno o fallback para desarrollo
    this.baseURL = process.env.REACT_APP_API_URL;

    console.log("🔧 API Service initialized with baseURL:", this.baseURL);
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log("🔄 API Request:", url, config);
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ API Response:", data);
      return data;
    } catch (error) {
      console.error("❌ API request failed:", error);
      throw error;
    }
  }

  // Obtener productos desde tu backend (ahora con paginación)
  async getProducts(options = {}) {
    const { limit = 6, offset = 0, availableOnly = true } = options;

    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      availableOnly: availableOnly.toString(),
    });

    const response = await this.request(`/products?${queryParams}`);
    // Tu backend devuelve { success, data: { products: [...], pagination: {...} } }
    return response;
  }

  // Obtener producto por ID
  async getProductById(productId) {
    const response = await this.request(`/products/${productId}`);
    // Tu backend devuelve { success, data: { product: {...} } }
    return response.data.product;
  }

  // Crear transacción (será útil más adelante)
  async createTransaction(transactionData) {
    return this.request("/transactions", {
      method: "POST",
      body: JSON.stringify(transactionData),
    });
  }

  // Actualizar stock de producto (después del pago)
  async updateProductStock(productId, newStock) {
    return this.request(`/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stock: newStock }),
    });
  }

  // Métodos adicionales para el flujo de compra

  // Crear cliente
  async createCustomer(customerData) {
    return this.request("/customers", {
      method: "POST",
      body: JSON.stringify(customerData),
    });
  }

  // Crear dirección de entrega
  async createDelivery(deliveryData) {
    return this.request("/deliveries", {
      method: "POST",
      body: JSON.stringify(deliveryData),
    });
  }

  async processPayment(productId, paymentData) {
    return this.request(`/payment/${productId}/process-payment`, {
      method: "POST",
      body: JSON.stringify(paymentData),
    });
  }

  // Obtener estado de transacción
  async getTransactionStatus(transactionId) {
    const response = await this.request(`/transactions/${transactionId}`);
    return response.data;
  }

  // Método helper para construir query strings
  buildQueryString(params) {
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    return new URLSearchParams(filteredParams).toString();
  }

  // Getter para obtener configuración de Wompi
  getWompiConfig() {
    return {
      publicKey:
        process.env.REACT_APP_WOMPI_PUBLIC_KEY ||
        "pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7",
      environment: process.env.REACT_APP_WOMPI_ENVIRONMENT || "sandbox",
      sandboxUrl: "https://api-sandbox.co.uat.wompi.dev/v1",
    };
  }

  // Verificar si está en modo desarrollo
  isDevelopment() {
    return process.env.NODE_ENV === "development";
  }

  // Verificar configuración
  isConfigured() {
    const hasApiUrl = !!this.baseURL;
    const hasWompiKey = !!process.env.REACT_APP_WOMPI_PUBLIC_KEY;

    if (!hasApiUrl) {
      console.warn("⚠️ REACT_APP_API_URL not configured");
    }

    if (!hasWompiKey) {
      console.warn("⚠️ REACT_APP_WOMPI_PUBLIC_KEY not configured");
    }

    return hasApiUrl && hasWompiKey;
  }
}

export const apiService = new ApiService();

// Función para formatear precios colombianos
export const formatPrice = (price) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
};

// Función helper para manejar errores de API
export const handleApiError = (error) => {
  console.error("🔥 API Error:", error);

  if (error.message.includes("404")) {
    return "Recurso no encontrado";
  }

  if (error.message.includes("500")) {
    return "Error interno del servidor";
  }

  if (
    error.message.includes("NetworkError") ||
    error.message.includes("Failed to fetch")
  ) {
    return "Error de conexión. Verifica tu internet y que el backend esté corriendo.";
  }

  return error.message || "Error desconocido";
};

// Función para validar respuesta de API
export const validateApiResponse = (response) => {
  if (!response || typeof response !== "object") {
    throw new Error("Respuesta de API inválida");
  }

  if (!response.success) {
    throw new Error(response.message || "La operación falló");
  }

  return true;
};

// Verificar configuración al importar
if (apiService.isDevelopment()) {
  console.log("🔧 API Service Configuration:");
  console.log("  - Base URL:", apiService.baseURL);
  console.log(
    "  - Wompi Key:",
    process.env.REACT_APP_WOMPI_PUBLIC_KEY ? "✅ Configured" : "❌ Missing"
  );
  console.log(
    "  - Environment:",
    process.env.REACT_APP_WOMPI_ENVIRONMENT || "sandbox"
  );
  console.log(
    "  - Fully configured:",
    apiService.isConfigured() ? "✅ Yes" : "❌ No"
  );
}
