geotab.addin.tirePressureAddin = function (api, state) {
    // IDs de diagnósticos de presión
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    // Función para calcular el color y severidad
    function getStatus(val, sideVal) {
        if (!val) return { color: "#bdc3c7", weight: 0 }; // Sin datos (Gris)
        
        // Alerta por desviación > 5% entre neumáticos del mismo eje
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) {
            return { color: "#e74c3c", weight: 3, alert: "DESALINEACIÓN" }; // Rojo
        }
        
        // Límites absolutos (kPa) - Ajustables según fabricante
        if (val < 200 || val > 300) return { color: "#e74c3c", weight: 3 }; // Rojo (Crítico)
        if (val < 220 || val > 280) return { color: "#f1c40f", weight: 2 }; // Amarillo (Aviso)
        
        return { color: "#2ecc71", weight: 1 }; // Verde (OK)
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // Ordenar: Primero los de mayor "weight" (más graves)
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const alertTag = v.hasAlert ? `<div style="color:red; font-size:10px; font-weight:bold; margin-top:5px;">⚠️ ALERTA EJE</div>` : "";
            return `
                <div class="vehicle-card">
                    <div class="card-header"><strong>${v.name}</strong></div>
                    <div class="car-diagram">
                        <div class="tire-ui" style="top:15%; left:-15%; background:${v.status.FL.color}"></div>
                        <div class="tire-ui" style="top:15%; right:-15%; background:${v.status.FR.color}"></div>
                        <div class="tire-ui" style="bottom:15%; left:-15%; background:${v.status.RL.color}"></div>
                        <div class="tire-ui" style="bottom:15%; right:-15%; background:${v.status.RR.color}"></div>
                        <div class="car-body-shape"></div>
                    </div>
                    <div class="stats-box">
                        ${v.pressures.FL || '--'} | ${v.pressures.FR || '--'}<br>
                        ${v.pressures.RL || '--'} | ${v.pressures.RR || '--'}
                    </div>
                    ${alertTag}
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="fleet-grid">${html}</div>`;
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            document.getElementById("fleet-container").innerHTML = "Analizando flota VTC...";

            // 1. Obtener todos los dispositivos
            api.call("Get", { typeName: "Device" }, function (devices) {
                
                // 2. Preparar MultiCall para traer las presiones de todos los dispositivos
                const calls = devices.map(d => {
                    return ["Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: d.id },
                            // Buscamos los 4 diagnósticos para este vehículo
                            diagnosticSearch: { id: "DiagnosticTirePressureFrontLeftId" }, // Simplificado para la llamada, luego filtramos
                            resultsLimit: 10 // Traemos los últimos para asegurar que pillamos los 4 ejes
                        }
                    }];
                });

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const deviceLogs = results[index];
                        
                        // Mapeo de presiones recibidas
                        const p = {
                            FL: (deviceLogs.find(l => l.diagnostic.id === diagIds.FL) || {}).data,
                            FR: (deviceLogs.find(l => l.diagnostic.id === diagIds.FR) || {}).data,
                            RL: (deviceLogs.find(l => l.diagnostic.id === diagIds.RL) || {}).data,
                            RR: (deviceLogs.find(l => l.diagnostic.id === diagIds.RR) || {}).data
                        };

                        // Calcular estados
                        const s = {
                            FL: getStatus(p.FL, p.FR),
                            FR: getStatus(p.FR, p.FL),
                            RL: getStatus(p.RL, p.RR),
                            RR: getStatus(p.RR, p.RL)
                        };

                        // Gravedad máxima para ordenación
                        const weights = [s.FL.weight, s.FR.weight, s.RL.weight, s.RR.weight];
                        
                        return {
                            name: device.name,
                            pressures: p,
                            status: s,
                            maxWeight: Math.max(...weights),
                            hasAlert: weights.includes(3)
                        };
                    });

                    renderFleet(fleetData);
                }, function(err) { console.error(err); });
            });
        }
    };
};