/**
 * Add-in para el monitoreo de presión de neumáticos en flotas VTC
 * Especialista: Geotab & SDK Programming
 */
geotab.addin.tirePressureAddin = function (api, state) {
    
    // IDs de diagnóstico estándar de Geotab para presión de neumáticos
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    /**
     * Determina el estado de un neumático basado en presión absoluta y desviación lateral
     * @param {number} val - Presión actual
     * @param {number} sideVal - Presión del neumático del mismo eje
     * @returns {Object} Color y peso de gravedad
     */
    function calculateStatus(val, sideVal) {
        if (!val || val <= 0) return { color: "#bdc3c7", weight: 0, label: "Sin datos" }; // Gris
        
        // 1. Alerta por desviación crítica (Efecto "Tirón" o Desalineación)
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) {
            return { color: "#e74c3c", weight: 3, label: "DESALINEACIÓN" }; // Rojo
        }
        
        // 2. Umbrales estándar (Ajustar según modelo de vehículo VTC)
        // Valores en kPa (250 kPa ≈ 36 PSI)
        if (val < 200 || val > 310) return { color: "#e74c3c", weight: 3, label: "CRÍTICO" }; // Rojo
        if (val < 225 || val > 290) return { color: "#f1c40f", weight: 2, label: "AVISO" };   // Amarillo
        
        return { color: "#2ecc71", weight: 1, label: "OK" }; // Verde
    }

    /**
     * Renderiza la interfaz de la flota completa
     */
    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // Ordenamos: Los más graves (weight 3) arriba
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const hasCritical = v.maxWeight === 3;
            const cardStyle = hasCritical ? "border: 2px solid #e74c3c;" : "";
            
            return `
                <div class="vehicle-card" style="${cardStyle}">
                    <div class="card-header">
                        <strong>${v.name}</strong>
                        ${hasCritical ? '<br><span style="color:#e74c3c; font-size:9px;">⚠️ REVISIÓN URGENTE</span>' : ''}
                    </div>
                    <div class="car-diagram">
                        <div class="tire-ui" style="top:15%; left:-18%; background:${v.status.FL.color}" title="FL: ${v.pressures.FL} kPa"></div>
                        <div class="tire-ui" style="top:15%; right:-18%; background:${v.status.FR.color}" title="FR: ${v.pressures.FR} kPa"></div>
                        <div class="tire-ui" style="bottom:15%; left:-18%; background:${v.status.RL.color}" title="RL: ${v.pressures.RL} kPa"></div>
                        <div class="tire-ui" style="bottom:15%; right:-18%; background:${v.status.RR.color}" title="RR: ${v.pressures.RR} kPa"></div>
                        <div class="car-body-shape"></div>
                    </div>
                    <div class="stats-box">
                        <div>${v.pressures.FL || '--'} | ${v.pressures.FR || '--'}</div>
                        <div style="border-top:1px solid #eee; margin-top:2px; padding-top:2px;">
                            ${v.pressures.RL || '--'} | ${v.pressures.RR || '--'}
                        </div>
                        <small>Unidad: kPa</small>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="fleet-grid">${html}</div>`;
    }

    return {
        initialize: function (api, state, callback) {
            console.log("Iniciando Add-in de Neumáticos VTC...");
            callback();
        },

        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px;">Analizando telemetría de neumáticos...</div>';

            // 1. Obtener todos los vehículos de la base de datos
            api.call("Get", {
                typeName: "Device"
            }, function (devices) {
                
                // 2. Preparar MultiCall para obtener datos de presión de toda la flota
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: d.id },
                            fromDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Últimas 48h
                        },
                        resultsLimit: 50 // Traemos suficientes logs para encontrar los 4 neumáticos
                    }
                ]);

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const logs = results[index] || [];
                        
                        // Extraer el último valor de cada neumático
                        const getVal = (id) => {
                            const found = logs.filter(l => l.diagnostic.id === id)[0];
                            return found ? Math.round(found.data) : null;
                        };

                        const p = {
                            FL: getVal(diagIds.FL),
                            FR: getVal(diagIds.FR),
                            RL: getVal(diagIds.RL),
                            RR: getVal(diagIds.RR)
                        };

                        // Calcular estados y severidad
                        const s = {
                            FL: calculateStatus(p.FL, p.FR),
                            FR: calculateStatus(p.FR, p.FL),
                            RL: calculateStatus(p.RL, p.RR),
                            RR: calculateStatus(p.RR, p.RL)
                        };

                        const weights = [s.FL.weight, s.FR.weight, s.RL.weight, s.RR.weight];
                        
                        return {
                            name: device.name,
                            pressures: p,
                            status: s,
                            maxWeight: Math.max(...weights)
                        };
                    });

                    renderFleet(fleetData);

                }, function(err) {
                    container.innerHTML = "Error en MultiCall: " + err;
                });
            }, function(err) {
                container.innerHTML = "Error al obtener dispositivos: " + err;
            });
        },

        blur: function (api, state) {
            // Se ejecuta al salir del add-in
        }
    };
};