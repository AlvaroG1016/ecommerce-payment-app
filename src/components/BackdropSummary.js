import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCurrentStep } from "../store/index";
import { formatPrice } from "../services/api";
import "./BackdropSummary.css";
import { apiService } from "../services/api";
import paymentAdapter from "../services/payment.adapter";

function BackdropSummary({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const selectedProduct = useSelector(
    (state) => state.products.selectedProduct
  );
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentStep, setPaymentStep] = useState("");

  useEffect(() => {
    const loadPaymentData = () => {
      const savedPaymentData = localStorage.getItem("payment_form_data");
      console.log(
        "🔍 BackdropSummary: Intentando cargar payment_form_data:",
        savedPaymentData ? "Encontrado" : "No encontrado"
      );

      if (savedPaymentData) {
        try {
          const parsedData = JSON.parse(savedPaymentData);
          console.log(
            "✅ BackdropSummary: Datos de pago cargados:",
            parsedData
          );
          setPaymentData(parsedData);
        } catch (error) {
          console.error(
            "❌ BackdropSummary: Error parsing payment data:",
            error
          );
          setPaymentData(null);
        }
      } else {
        console.warn(
          "⚠️ BackdropSummary: payment_form_data no encontrado en localStorage"
        );
      }
    };

    loadPaymentData();

    const retryTimeout = setTimeout(() => {
      if (!paymentData) {
        console.log("🔄 BackdropSummary: Reintentando cargar datos...");
        loadPaymentData();
      }
    }, 200);

    const handleStorageChange = (e) => {
      if (e.key === "payment_form_data" && e.newValue) {
        console.log(
          "🔄 BackdropSummary: localStorage cambió, recargando datos..."
        );
        loadPaymentData();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearTimeout(retryTimeout);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isOpen]);

  const calculateAmounts = () => {
    if (!selectedProduct)
      return { productAmount: 0, baseFee: 0, deliveryFee: 0, total: 0 };

    const productAmount = selectedProduct.price;
    const baseFee = selectedProduct.baseFee || 2000;
    const deliveryFee = 5000;

    const subtotal = productAmount + baseFee + deliveryFee;

    const iva  = Math.round((productAmount) * 0.19);



    const total = subtotal + iva;

    return { productAmount, baseFee, deliveryFee, subtotal, iva, total };
  };

  const { productAmount, baseFee, deliveryFee, subtotal, iva, total } = calculateAmounts();

  // Esta función ahora solo crea la transacción en tu backend, sin llamar a Wompi
  const createTransaction = async () => {
    try {
      const transactionData = {
        customer: {
          name: paymentData.customerName,
          email: paymentData.email,
          phone: paymentData.phone,
        },
        productId: selectedProduct.id,
        quantity: 1,
        payment: {
          method: "CREDIT_CARD",
          cardLastFour: paymentData.cardNumber.replace(/\s/g, "").slice(-4),
          cardBrand: getCardBrand(paymentData.cardNumber),
        },
        delivery: {
          address: paymentData.address,
          city: paymentData.city,
          postalCode: paymentData.postalCode || "110111",
          phone: paymentData.phone,
        },
      };

      console.log("📤 Enviando transacción al backend:", transactionData);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/transactions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transactionData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `HTTP Error: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("✅ Respuesta del backend para transacción:", result);

      if (
        !result ||
        !result.data ||
        !result.data.transaction ||
        !result.data.transaction.id
      ) {
        console.error("❌ Estructura de respuesta inesperada:", result);
        throw new Error(
          "La respuesta del servidor no contiene un ID de transacción válido"
        );
      }

      const transactionId = result.data.transaction.id;
      console.log("✅ ID de transacción extraído:", transactionId);
      return transactionId;
    } catch (error) {
      console.error("❌ Error en createTransaction:", error);
      throw error;
    }
  };

  // Nueva función que procesa el pago directamente con el proveedor externo desde el frontend
  const processPaymentWithExternalProvider = async (transactionId) => {
    if (!transactionId) {
      throw new Error("ID de transacción no válido");
    }

    try {
      const rawMonth = paymentData.expiryMonth || paymentData.cardExpMonth;
      const month = String(rawMonth).padStart(2, "0");

      const rawYear = paymentData.expiryYear || paymentData.cardExpYear;
      const year =
        String(rawYear).length === 4
          ? String(rawYear).slice(-2)
          : String(rawYear).padStart(2, "0");

      const monthNum = parseInt(month);
      if (monthNum < 1 || monthNum > 12) {
        throw new Error(`Mes inválido: ${month}. Debe estar entre 01-12`);
      }

      const yearNum = parseInt(year);
      if (yearNum < 25 || yearNum > 99) {
        throw new Error(`Año inválido: ${year}. Debe estar entre 25-99`);
      }

      // Preparar request para el adapter del proveedor externo
      const paymentRequest = {
        transactionId: transactionId,
        amount: total,
        currency: "COP",
        customerEmail: paymentData.email,
        cardNumber: String(paymentData.cardNumber),
        cardCvc: String(paymentData.cvc || paymentData.cardCvc),
        cardExpMonth: month,
        cardExpYear: year,
        cardHolder: String(paymentData.holderName || paymentData.cardHolder),
        installments: parseInt(paymentData.installments) || 1,
      };

      console.log("📤 Procesando pago con proveedor externo directamente desde frontend:", {
        cardNumber: "**** **** **** " + paymentRequest.cardNumber.slice(-4),
        cardCvc: "***",
        cardExpMonth: paymentRequest.cardExpMonth,
        cardExpYear: paymentRequest.cardExpYear,
        cardHolder: paymentRequest.cardHolder,
        amount: paymentRequest.amount,
        transactionId: transactionId
      });

      // Procesar pago con proveedor externo desde el frontend
      const result = await paymentAdapter.processPayment(paymentRequest);
      
      console.log("✅ Respuesta del proveedor externo (frontend):", result);

      // Actualizar la transacción en el backend con el resultado
      await updateTransactionWithPaymentResult(transactionId, result);

      return result;
    } catch (error) {
      console.error("❌ Error en processPaymentWithExternalProvider:", error);
      throw error;
    }
  };

  // Función para actualizar el backend usando el endpoint CORRECTO
  const updateTransactionWithPaymentResult = async (transactionId, paymentResult) => {
    try {
      console.log("📤 Actualizando transacción en backend con resultado del proveedor externo...");
      
      const updateData = {
        providerTransactionId: paymentResult.providerTransactionId,
        providerStatus: paymentResult.status,
        providerMessage: paymentResult.message,
        providerReference: paymentResult.reference,
        providerProcessedAt: paymentResult.processedAt.toISOString(),
        amountInCents: paymentResult.amount ? Math.round(paymentResult.amount * 100) : undefined,
        currency: paymentResult.currency || 'COP',
      };

      console.log("📤 Payload a enviar:", updateData);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/payment/${transactionId}/update-with-provider-result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      console.log("📥 Respuesta del servidor:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: 'No se pudo parsear la respuesta de error' 
        }));
        console.warn("⚠️ No se pudo actualizar la transacción en el backend:", errorData);
        // No lanzamos error aquí porque el pago ya se procesó con el proveedor
      } else {
        const result = await response.json();
        console.log("✅ Transacción actualizada en backend (incluye stock automáticamente):", result);
        
        // Log adicional si el stock se actualizó
        if (result.data?.stockUpdated) {
          console.log("📦 Stock del producto actualizado automáticamente");
        }
      }
    } catch (error) {
      console.warn("⚠️ Error actualizando backend (pago ya procesado):", error);
      // No lanzamos error porque el pago con el proveedor externo ya se completó
    }
  };

  // Función para consultar el estado directamente desde el proveedor externo (sandbox)
  const checkPaymentStatusFromProvider = async (providerTransactionId) => {
    if (!providerTransactionId) {
      throw new Error("ID de transacción del proveedor no válido");
    }

    try {
      console.log("🔍 Consultando estado directamente desde proveedor externo:", providerTransactionId);
      
      // Usar el servicio externo para consultar el estado directamente
      const providerResponse = await paymentAdapter.getPaymentStatus(providerTransactionId);
      
      console.log("📥 Estado desde proveedor externo:", providerResponse);
      return providerResponse;
    } catch (error) {
      console.error("❌ Error consultando estado desde proveedor:", error);
      throw error;
    }
  };

  const pollPaymentStatusFromProvider = async (providerTransactionId) => {
    if (!providerTransactionId) {
      throw new Error("ID de transacción del proveedor no válido para hacer polling");
    }

    const maxAttempts = 15; // Reducimos intentos porque consultamos directo al proveedor
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;

        try {
          console.log(
            `🔄 Consultando estado del proveedor... Intento ${attempts} para transacción ${providerTransactionId}`
          );
          
          const statusResponse = await checkPaymentStatusFromProvider(providerTransactionId);

          console.log("🔍 Estado del proveedor:", {
            status: statusResponse.status,
            success: statusResponse.success,
          });

          const finalStates = [
            "APPROVED",
            "DECLINED", 
            "ERROR",
            "VOIDED",
            "FAILED",
            "CANCELLED"
          ];

          const isFinished = finalStates.includes(statusResponse.status);

          if (isFinished) {
            console.log("✅ Estado final obtenido del proveedor:", statusResponse.status);
            clearInterval(interval);
            resolve(statusResponse);
            return;
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error("Timeout esperando respuesta del proveedor de pagos"));
            return;
          }
        } catch (error) {
          console.error("Error en polling del proveedor:", error);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(error);
          }
        }
      }, 3000); // Cada 3 segundos
    });
  };

  const getCardBrand = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (/^4/.test(cleanNumber)) return "VISA";
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber))
      return "MASTERCARD";
    return "UNKNOWN";
  };

  const handlePayment = async () => {
    if (!selectedProduct || !paymentData) {
      alert("Faltan datos para procesar el pago");
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    setCurrentTransactionId(null);

    try {
      setPaymentStep("Creando transacción...");
      console.log("🔄 Creando transacción PENDING...");

      const transactionId = await createTransaction();

      if (!transactionId) {
        throw new Error("No se pudo obtener un ID de transacción válido");
      }

      setCurrentTransactionId(transactionId);
      console.log("✅ Transacción creada con ID:", transactionId);

      setPaymentStep("Procesando con proveedor externo...");
      console.log(
        "🔄 Procesando pago con proveedor externo para transacción:",
        transactionId
      );

      // Procesar pago directamente con el proveedor externo desde el frontend
      const paymentResponse = await processPaymentWithExternalProvider(transactionId);
      console.log("✅ Pago enviado al proveedor externo:", paymentResponse);

      setPaymentStep("Verificando estado del pago...");
      console.log(
        "🔄 Consultando estado del pago directamente desde proveedor...",
        paymentResponse.providerTransactionId
      );

      // FLUJO CORRECTO: Consultar estado desde el proveedor hasta que NO sea PENDING
      const finalProviderStatus = await pollPaymentStatusFromProvider(paymentResponse.providerTransactionId);
      console.log("✅ Estado final desde proveedor:", finalProviderStatus);

      setPaymentStep("Actualizando backend...");
      console.log("🔄 Actualizando backend con resultado final...");

      // AHORA SÍ: Actualizar el backend con el resultado final
      await updateTransactionWithPaymentResult(transactionId, finalProviderStatus);

      // Guardar resultado final
      localStorage.setItem(
        "payment_result",
        JSON.stringify({
          transactionId,
          status: finalProviderStatus.status,
          finalResponse: finalProviderStatus,
          providerResult: finalProviderStatus,
        })
      );

      onClose();
      setTimeout(() => {
        dispatch(setCurrentStep(4));
      }, 100);

    } catch (error) {
      console.error("❌ Error procesando pago:", error);

      let errorMessage = "Error procesando el pago";

      if (error.message.includes("Invalid phone format")) {
        errorMessage = "Formato de teléfono inválido. Use: +57 XXX XXX XXXX";
      } else if (error.message.includes("Month must be 01-12")) {
        errorMessage = "Mes de expiración inválido. Use formato 01-12";
      } else if (error.message.includes("Failed to create customer")) {
        errorMessage =
          "Error en los datos del cliente. Verifique la información.";
      } else if (error.message.includes("Invalid card")) {
        errorMessage = "Datos de tarjeta inválidos. Verifique la información.";
      } else if (error.message.includes("Timeout")) {
        errorMessage =
          "El pago está tardando más de lo normal. Consulte el estado más tarde.";
      } else if (error.message.includes("ID de transacción no válido")) {
        errorMessage =
          "Error interno: No se pudo generar la transacción. Intente nuevamente.";
      } else if (typeof error.message === "object") {
        errorMessage = Array.isArray(error.message)
          ? error.message.join(", ")
          : JSON.stringify(error.message);
      } else {
        errorMessage = error.message || "Error desconocido procesando el pago";
      }

      setPaymentError(errorMessage);

      localStorage.setItem(
        "payment_result",
        JSON.stringify({
          transactionId: currentTransactionId,
          status: "ERROR",
          error: errorMessage,
        })
      );
    } finally {
      setIsProcessingPayment(false);
      setPaymentStep("");
    }
  };

  const goBack = () => {
    onClose();
    dispatch(setCurrentStep(2));
  };

  if (!isOpen || !selectedProduct) return null;

  return (
    <div className="backdrop-container" onClick={onClose}>
      <div
        className="backdrop-front-layer"
        onClick={(e) => e.stopPropagation()}
      >
        {isProcessingPayment && (
          <div className="payment-loading-overlay">
            <div className="payment-loading-content">
              <div className="payment-loading-spinner"></div>
              <div className="payment-loading-text">Procesando Pago</div>
              <div className="payment-loading-step">{paymentStep}</div>
              {currentTransactionId && (
                <div
                  className="payment-loading-step"
                  style={{ fontSize: "0.8rem", opacity: 0.7 }}
                >
                  ID: {currentTransactionId}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="backdrop-header">
          <h2>📋 Resumen de Compra</h2>
          <button className="backdrop-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="summary-section">
          <h3>Producto Seleccionado</h3>
          <div className="product-summary">
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="product-summary-image"
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/80x80/dee2e6/6c757d?text=${encodeURIComponent(
                  selectedProduct.name
                )}`;
              }}
            />
            <div className="product-summary-info">
              <h4>{selectedProduct.name}</h4>
              <p>{selectedProduct.description}</p>
              <span className="product-summary-price">
                {formatPrice(selectedProduct.price)}
              </span>
            </div>
          </div>
        </div>

        {paymentData ? (
          <div className="summary-section">
            <h3>Datos de Entrega</h3>
            <div className="customer-info">
              <p>
                <strong>Cliente:</strong> {paymentData.customerName}
              </p>
              <p>
                <strong>Email:</strong> {paymentData.email}
              </p>
              <p>
                <strong>Dirección:</strong> {paymentData.address}
              </p>
              <p>
                <strong>Ciudad:</strong> {paymentData.city},{" "}
                {paymentData.department}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="summary-section"
            style={{
              background: "#fff3cd",
              borderLeft: "4px solid #ffc107",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ color: "#856404" }}>⚠️ Datos de Entrega</h3>
            <p style={{ color: "#856404", margin: 0, fontSize: "0.9rem" }}>
              Cargando datos del cliente...
            </p>
          </div>
        )}

        <div className="summary-section">
          <h3>Desglose de Costos</h3>
          <div className="cost-breakdown">
            <div className="cost-item">
              <span>Producto</span>
              <span>{formatPrice(productAmount)}</span>
            </div>
            <div className="cost-item cost-subtotal" > 
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            <div className="cost-item cost-tax">
              <span>IVA (19%)</span>
              <span>{formatPrice(iva)}</span>
            </div>

            <div className="cost-item">
              <span>Fee Base (siempre aplicada)</span>
              <span>{formatPrice(baseFee)}</span>
            </div>

            <div className="cost-item">
              <span>Fee de Entrega</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="cost-item cost-total">
              <span>
                <strong>Total a Pagar</strong>
              </span>
              <span>
                <strong>{formatPrice(total)}</strong>
              </span>
            </div>
          </div>
        </div>

        {paymentData ? (
          <div className="summary-section">
            <h3>Método de Pago</h3>
            <div className="payment-method">
              <div className="payment-card-info">
                <span>
                  💳 **** **** **** {paymentData.cardNumber.slice(-4)}
                </span>
                <br />
                <span>{paymentData.holderName}</span>
              </div>
              <div className="payment-installments">
                <span className="installments-label">Plan de pago:</span>
                <span className="installments-value">
                  {paymentData.installments === 1 ||
                  paymentData.installments === "1"
                    ? "💰 Pago de contado"
                    : `💳 ${paymentData.installments} cuotas de ${formatPrice(
                        total / parseInt(paymentData.installments || 1)
                      )}`}
                </span>
              </div>
              {paymentData.installments > 1 && (
                <div className="installments-total">
                  <span className="installments-total-label">
                    Total con cuotas:
                  </span>
                  <span className="installments-total-value">
                    {formatPrice(total)} (sin intereses adicionales)
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="summary-section"
            style={{
              background: "#fff3cd",
              borderLeft: "4px solid #ffc107",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ color: "#856404" }}>⚠️ Método de Pago</h3>
            <p style={{ color: "#856404", margin: 0, fontSize: "0.9rem" }}>
              Cargando información de la tarjeta...
            </p>
          </div>
        )}

        {paymentError && (
          <div
            className="summary-section"
            style={{
              background: "#fed7d7",
              borderLeft: "4px solid #e53e3e",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ color: "#c53030" }}>⚠️ Error en el Pago</h3>
            <p style={{ color: "#c53030", margin: 0, fontSize: "0.9rem" }}>
              {paymentError}
            </p>
            <button
              onClick={() => setPaymentError(null)}
              style={{
                background: "transparent",
                border: "1px solid #e53e3e",
                color: "#c53030",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.8rem",
                marginTop: "8px",
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="backdrop-actions">
          <button
            onClick={goBack}
            className="btn-secondary"
            disabled={isProcessingPayment}
          >
            ← Modificar Datos
          </button>
          <button
            onClick={handlePayment}
            className="btn-primary payment-button"
            disabled={isProcessingPayment || !paymentData}
          >
            {isProcessingPayment ? (
              <>
                <span className="loading-spinner-small"></span>
                {paymentStep || "Procesando..."}
              </>
            ) : !paymentData ? (
              "⏳ Cargando datos..."
            ) : (
              `💳 Pagar ${formatPrice(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BackdropSummary;