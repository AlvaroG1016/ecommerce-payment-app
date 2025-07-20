import { configureStore, createSlice } from '@reduxjs/toolkit';
import productsReducer from './slices/productsSlice';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    currentStep: 1,
  },
  reducers: {
    setCurrentStep: (state, action) => {
      state.currentStep = action.payload;
    },
    nextStep: (state) => {
      if (state.currentStep < 5) {
        state.currentStep += 1;
      }
    },
    prevStep: (state) => {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
      }
    },
  },
});

export const { setCurrentStep, nextStep, prevStep } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
    products: productsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;