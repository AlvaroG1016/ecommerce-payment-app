import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const products = await apiService.getProducts();
      return products;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProductStock = createAsyncThunk(
  'products/updateStock',
  async ({ productId, newStock }, { rejectWithValue }) => {
    try {
      await apiService.updateProductStock(productId, newStock);
      return { productId, newStock };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedProduct: null,
  },
  reducers: {
    setSelectedProduct: (state, action) => {
      state.selectedProduct = action.payload;
    },
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Cargar productos
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Actualizar stock
      .addCase(updateProductStock.fulfilled, (state, action) => {
        const { productId, newStock } = action.payload;
        const product = state.items.find(item => item.id === productId);
        if (product) {
          product.stock = newStock;
        }
      });
  },
});

export const { setSelectedProduct, clearSelectedProduct } = productsSlice.actions;
export default productsSlice.reducer;