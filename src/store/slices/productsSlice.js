// src/store/slices/productsSlice.js - Actualizado para usar tu ApiService
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

// Thunk para obtener productos con paginación
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 6 } = {}, { rejectWithValue }) => {
    try {
      // Calcular offset basado en la página
      const offset = (page - 1) * limit;
      
      console.log(`🔍 Fetching products - Page: ${page}, Limit: ${limit}, Offset: ${offset}`);
      
      // Construir query params para tu backend
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        availableOnly: 'true' // Solo productos disponibles en el frontend
      });
      
      const response = await apiService.request(`/products?${queryParams}`);
      
      console.log('📦 Products response:', response);
      
      // Adaptar la respuesta de tu backend
      // Tu backend devuelve: { success, data: { products, pagination: { total, hasMore } } }
      return {
        products: response.data.products,
        total: response.data.pagination.total,
        hasMore: response.data.pagination.hasMore,
        page,
        limit,
        offset
      };
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      return rejectWithValue(error.message || 'Error al cargar productos');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    selectedProduct: null,
    loading: false,
    error: null,
    
    // Paginación
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
    itemsPerPage: 6,
    
    // Metadata adicional
    lastFetched: null,
    fetchingPage: null
  },
  reducers: {
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
      console.log('🎯 Product selected:', action.payload?.name);
    },
    
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
      console.log('🧹 Product selection cleared');
    },
    
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
      console.log(`📄 Current page set to: ${action.payload}`);
    },
    
    setItemsPerPage: (state, action) => {
      state.itemsPerPage = action.payload;
      // Recalcular páginas totales con el nuevo límite
      state.totalPages = state.totalItems > 0 ? Math.ceil(state.totalItems / action.payload) : 1;
      // Si la página actual ya no es válida, ir a la primera página
      if (state.currentPage > state.totalPages) {
        state.currentPage = 1;
      }
      console.log(`📊 Items per page set to: ${action.payload}, Total pages: ${state.totalPages}`);
    },
    
    updateProductStock: (state, action) => {
      const { productId, newStock } = action.payload;
      const product = state.items.find(p => p.id === productId);
      if (product) {
        product.stock = newStock;
        console.log(`📦 Stock updated for product ${productId}: ${newStock}`);
      }
    },
    
    clearProductsError: (state) => {
      state.error = null;
    },
    
    resetPagination: (state) => {
      state.currentPage = 1;
      state.totalPages = 1;
      state.totalItems = 0;
      state.hasMore = false;
      state.lastFetched = null;
      state.fetchingPage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchingPage = action.meta.arg?.page || 1;
        console.log(`⏳ Loading products for page ${state.fetchingPage}...`);
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        const { products, total, hasMore, page } = action.payload;
        
        state.loading = false;
        state.items = products || [];
        state.currentPage = page;
        state.totalItems = total || 0;
        state.totalPages = total > 0 ? Math.ceil(total / state.itemsPerPage) : 1;
        state.hasMore = hasMore || false;
        state.lastFetched = new Date().toISOString();
        state.fetchingPage = null;
        
        console.log(`✅ Products loaded successfully:`);
        console.log(`   - Page: ${page}`);
        console.log(`   - Products: ${products?.length || 0}`);
        console.log(`   - Total: ${total}`);
        console.log(`   - Total Pages: ${total > 0 ? Math.ceil(total / state.itemsPerPage) : 1}`);
        console.log(`   - Has more: ${hasMore}`);
        console.log(`   - Items per page: ${state.itemsPerPage}`);
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.fetchingPage = null;
        console.error(`❌ Failed to load products: ${action.payload}`);
      });
  }
});

export const {
  setSelectedProduct,
  clearSelectedProduct,
  setCurrentPage,
  setItemsPerPage,
  updateProductStock,
  clearProductsError,
  resetPagination
} = productsSlice.actions;

export default productsSlice.reducer;