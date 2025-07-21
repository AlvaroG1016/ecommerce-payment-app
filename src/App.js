// src/App.js - Actualizado con paginación
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentStep } from "./store/index";
import {
  fetchProducts,
  setCurrentPage,
  setItemsPerPage,
} from "./store/slices/productsSlice";
import ProductCard from "./components/ProductCard";
import Pagination from "./components/Pagination";
import ProductsFilters from "./components/ProductsFilters"; // Opcional
import BackdropSummary from "./components/BackdropSummary";
import PaymentStep from "./components/PaymentStep";
import FinalStatus from "./components/FinalStatus";
import { usePurchaseProgress } from "./hooks/useLocalStorage";
import "./App.css";
import config from './config';

function App() {
  const dispatch = useDispatch();
  const currentStep = useSelector((state) => state.app.currentStep);
  const {
    items: products,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    hasMore,
    itemsPerPage,
  } = useSelector((state) => state.products);
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );

  // Hook para persistencia
  const {
    progress,
    updateProgress,
    clearProgress,
    isProgressValid,
  } = usePurchaseProgress();

  // Estado para el Backdrop
  const [isBackdropOpen, setIsBackdropOpen] = useState(false);

  // Cargar productos al iniciar (solo una vez)
  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 6 }));
  }, [dispatch]);

  // Restaurar progreso solo al iniciar (solo una vez)
  useEffect(() => {
    if (isProgressValid && progress.currentStep > 1) {
      dispatch(setCurrentStep(progress.currentStep));
      console.log("🔄 Progreso restaurado:", progress);
    }
  }, [isProgressValid]);

  // Sincronizar step con localStorage solo cuando cambie currentStep
  useEffect(() => {
    updateProgress({ currentStep });
  }, [currentStep]);

  // Sincronizar producto seleccionado con localStorage
  useEffect(() => {
    if (selectedProduct) {
      updateProgress({ selectedProduct });
    }
  }, []);

  // Abrir Backdrop cuando llegamos al paso 3
  useEffect(() => {
    console.log("🔍 App: currentStep cambió a", currentStep);

    if (currentStep === 3) {
      console.log("📋 App: Abriendo backdrop (paso 3)");
      setIsBackdropOpen(true);
    } else {
      if (isBackdropOpen) {
        console.log("📋 App: Cerrando backdrop (paso no es 3)");
      }
      setIsBackdropOpen(false);
    }
  }, [currentStep, isBackdropOpen]);

  // Handler para cambio de página
  const handlePageChange = (newPage) => {
    console.log(`📄 Changing to page ${newPage}`);
    dispatch(setCurrentPage(newPage));
    dispatch(fetchProducts({ page: newPage, limit: itemsPerPage }));

    // Scroll suave hacia arriba cuando cambia la página
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Handler para cambio de items per page
  const handleItemsPerPageChange = (newLimit) => {
    console.log(`📊 Changing items per page to ${newLimit}`);

    // Actualizar el estado del límite primero
    dispatch(setItemsPerPage(newLimit));

    // Volver a la primera página y cargar productos
    dispatch(setCurrentPage(1));
    dispatch(fetchProducts({ page: 1, limit: newLimit }));

    // Scroll hacia arriba para mejor UX
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const prevStep = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1));
    }
  };

  const restartProcess = () => {
    clearProgress();
    dispatch(setCurrentStep(1));
    // Volver a la primera página de productos
    if (currentPage !== 1) {
      handlePageChange(1);
    }
  };

  const closeBackdrop = () => {
    console.log(
      "📋 App: closeBackdrop llamado, currentStep actual:",
      currentStep
    );
    setIsBackdropOpen(false);

    // Solo volver al paso 2 si estamos en el paso 3 (es decir, si el usuario cancela)
    // Si estamos en otro paso, significa que el backdrop se está cerrando porque el pago se completó
    if (currentStep === 3) {
      console.log("📋 App: Usuario canceló backdrop, volviendo al paso 2");
      dispatch(setCurrentStep(2));
    } else {
      console.log(
        "📋 App: Backdrop se cerró por finalización de pago, currentStep:",
        currentStep
      );
    }
  };

  const renderCurrentStep = () => {
    console.log("🔍 App: Renderizando paso", currentStep);

    if (loading && products.length === 0) {
      return (
        <div className="loading-spinner">
          <div>📦 Cargando productos...</div>
        </div>
      );
    }

    if (error && products.length === 0) {
      return (
        <div className="error-message">
          ❌ Error al cargar productos: {error}
          <br />
          <button
            onClick={() =>
              dispatch(fetchProducts({ page: 1, limit: itemsPerPage }))
            }
          >
            🔄 Reintentar
          </button>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="products-container">
            <div className="products-header">
              <h2>🛍️ Selecciona un producto</h2>
              <p className="step-description">
                Elige el producto que deseas comprar y procede con el pago
              </p>

              {/* Filtros de productos - ARRIBA */}
              {products.length > 0 && (
                <ProductsFilters
                  totalProducts={totalItems}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={loading}
                />
              )}
            </div>

            {/* Mostrar mensaje de progreso restaurado */}
            {isProgressValid && progress.currentStep > 1 && (
              <div className="progress-banner">
                💡 Progreso restaurado. Puedes continuar donde lo dejaste.
                <button onClick={restartProcess}>Empezar de nuevo</button>
              </div>
            )}

            {/* Grid de productos */}
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Paginación */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              loading={loading}
            />

            {/* Error en carga de página específica */}
            {error && products.length > 0 && (
              <div className="page-error">
                ⚠️ Error al cargar la página: {error}
                <button onClick={() => handlePageChange(currentPage)}>
                  🔄 Reintentar página actual
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return <PaymentStep />;

      case 3:
        // El Backdrop se maneja por separado
        return (
          <div className="step-content">
            <h2>📋 Resumen de compra</h2>
            <p>El resumen se muestra en el backdrop component...</p>
            <button onClick={prevStep}>← Volver</button>
          </div>
        );

      case 4:
        console.log("🎯 App: Renderizando FinalStatus (Paso 4)");
        return <FinalStatus />;

      case 5:
        return (
          <div className="step-content completion-step">
            <div className="completion-container">
              <div className="completion-icon">🎉</div>
              <h2>¡Proceso Completado!</h2>
              <p>Tu compra ha sido procesada exitosamente.</p>

              <div className="completion-actions">
                <button
                  onClick={() => {
                    clearProgress();
                    // Refrescar productos para mostrar stock actualizado
                    dispatch(fetchProducts({ page: 1, limit: itemsPerPage }));
                    dispatch(setCurrentStep(1));
                  }}
                  className="btn-primary completion-btn"
                >
                  🏪 Continuar Comprando
                </button>
              </div>

              <div className="completion-footer">
                <p>Gracias por tu compra. ¡Esperamos verte de nuevo!</p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="step-content">
            <h2>Paso {currentStep}</h2>
            <p>Este paso se implementará pronto...</p>
            <button onClick={prevStep}>← Volver</button>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🏪 {config.appName}</h1>

        {/* Breadcrumbs sutiles como tienda real */}
        <div className="breadcrumb-container">
          <span
            className={`breadcrumb-item ${
              currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""
            }`}
          >
            🛍️ Productos{" "}
            {currentStep === 1 &&
              totalPages > 1 &&
              `(${currentPage}/${totalPages})`}
          </span>
          <span className="breadcrumb-separator">›</span>
          <span
            className={`breadcrumb-item ${
              currentStep === 3 ? "active" : currentStep > 3 ? "completed" : ""
            }`}
          >
            📋 Resumen
          </span>
          <span className="breadcrumb-separator">›</span>
          <span
            className={`breadcrumb-item ${
              currentStep === 4 ? "active" : currentStep > 4 ? "completed" : ""
            }`}
          >
            ✅ Resultado
          </span>
        </div>
      </header>

    {  <main className="app-main">{renderCurrentStep()}</main>}

      {/* Backdrop Summary Component */}
      <BackdropSummary isOpen={isBackdropOpen} onClose={closeBackdrop} />
    </div>
  );
}

export default App;
