// src/config/index.js
const config = {
  // App básica
  appName: process.env.REACT_APP_NAME ,
  
  // API
  apiUrl: process.env.REACT_APP_API_URL,
  
  wompi: {
    publicKey: process.env.REACT_APP_WOMPI_PUBLIC_KEY ,
    environment: process.env.REACT_APP_WOMPI_ENVIRONMENT 
  },
  
  pagination: {
    defaultItemsPerPage: parseInt(process.env.REACT_APP_DEFAULT_PRODUCTS_PER_PAGE) || 6,
    maxItemsPerPage: parseInt(process.env.REACT_APP_MAX_PRODUCTS_PER_PAGE) || 18
  },
  
  delivery: {
    baseFee: parseInt(process.env.REACT_APP_BASE_DELIVERY_FEE) || 5000,
    sameDayFee: parseInt(process.env.REACT_APP_SAME_DAY_DELIVERY_FEE) || 15000,
    expressFee: parseInt(process.env.REACT_APP_EXPRESS_DELIVERY_FEE) || 10000
  },
  
  isDevelopment: process.env.NODE_ENV === 'development',
  enableDebug: process.env.REACT_APP_ENABLE_DEBUG === 'true' || process.env.NODE_ENV === 'development'
};

if (config.isDevelopment) {
  console.log('🔧 App Configuration:', {
    appName: config.appName,
    apiUrl: config.apiUrl,
    wompiEnv: config.wompi.environment,
    wompiKeyConfigured: !!config.wompi.publicKey,
    enableDebug: config.enableDebug
  });
}

export default config;