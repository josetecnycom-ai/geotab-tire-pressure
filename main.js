/**
 * Estructura oficial del Add-In de Geotab
 */
geotab.addin.tirePressureAddin = function (api, state) {
    
    // Variables globales del Add-In
    const diagnostics = {
        "DiagnosticTirePressureFrontLeftId": "front-left",
        "DiagnosticTirePressureFrontRightId": "front-right",
        "DiagnosticTirePressureRearLeftId": "rear-left",
        "DiagnosticTirePressureRearRightId": "rear-right"
    };

    // Función para consultar la plataforma
    function fetchTirePressures(deviceId) {
        Object.keys(diagnostics).forEach(diagId => {
            api.call("Get", {
                typeName: "StatusData",
                search: {
                    deviceSearch: { id: deviceId },
                    diagnosticSearch: { id: diagId },
                    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Últimos 7 días
                },
                resultsLimit: 1 // Solo el registro más reciente
            }, function (result) {
                const elementId = diagnostics[diagId];
                const displayEl = document.querySelector(`#${elementId} .val`);
                const boxEl = document.getElementById(elementId);

                if (result && result.length > 0) {
                    const value = result[0].data; // Valor en kPa
                    displayEl.textContent = value.toFixed(1) + " kPa";
                    
                    // Lógica básica de colores (Ejemplo: asumiendo 250 kPa como ideal)
                    boxEl.className = "tire"; // reset
                    if (value < 200 || value > 300) {
                        boxEl.classList.add("critical");
                    } else if (value < 220 || value > 280) {
                        boxEl.classList.add("warning");
                    } else {
                        boxEl.classList.add("ok");
                    }
                } else {
                    displayEl.textContent = "Sin datos";
                    boxEl.className = "tire";
                }
            }, function (error) {
                console.error("Error consultando la API de Geotab:", error);
            });
        });
    }

    return {
        /**
         * Se ejecuta la primera vez que se carga el Add-In.
         */
        initialize: function (api, state, callback) {
            // Todo listo para arrancar
            callback();
        },

        /**
         * Se ejecuta cada vez que el usuario hace clic en el Add-In en el menú.
         */
        focus: function (api, state) {
            // Comprobamos si hay un vehículo seleccionado en el estado global de Geotab
            if (state.device && state.device.id) {
                fetchTirePressures(state.device.id);
            } else {
                alert("Por favor, selecciona un vehículo específico desde el mapa o la lista de vehículos para ver la presión de sus neumáticos.");
            }
        },

        /**
         * Se ejecuta cuando el usuario se va a otra página de MyGeotab.
         */
        blur: function (api, state) {
            // Aquí puedes limpiar intervalos de tiempo si haces refresco automático
        }
    };
};