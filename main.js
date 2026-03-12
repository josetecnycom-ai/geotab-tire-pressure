/**
 * Geotab Add-In: Monitor de Presión de Neumáticos VTC
 * Versión: 1.1.0 (Optimized with MultiCall & Axis Deviation)
 */

// 1. Inicialización de seguridad para el namespace de Geotab
window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    
    // Configuración de IDs de Diagnóstico
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    /**
     * Lógica de Negocio: Cálculo de estados y alertas
     */
    function calculateStatus(val, sideVal) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, label: "N/A" }; // Gris (Sin datos)
        
        // Alerta por desviación del 5% entre neumáticos del mismo eje
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) {
            return { color: "#eb3b5a", weight: 3, alert: "DESALINEACIÓN" }; // Rojo fuerte
        }
        
        // Umbrales absolutos en kPa (Ajustar según flota)
        if (val < 200 || val > 310) return { color: "#eb3b5a", weight: 3, label: "CRÍTICO" }; // Rojo
        if (val < 225 || val > 285) return { color: "#f7b731", weight: 2, label: "AVISO" };   // Amarillo
        
        return { color: "#20bf6b", weight: 1, label: "OK" }; // Verde
    }

    /**
     * Genera el HTML de la cuadrícula de vehículos
     */
    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // ORDENACIÓN: Los vehículos con mayor gravedad (weight) aparecen primero
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const hasCritical = v.maxWeight === 3;
            const borderStyle = hasCritical ? "border: 2px solid #eb3b5a;" : "border: 1px solid #d1d8e0;";
            
            return `
                <div class="vehicle-card" style="${borderStyle}">
                    <div class="card-header">
                        <strong style="font-size: 13px;">${v.name}</strong>
                        ${hasCritical ? '<div style="color:#eb3b5a; font-size:9px; font-weight:bold; margin-top:3px;">⚠️ REVISAR EJE</div>' : ''}
                    </div>
                    
                    <div class="car-diagram">
                        <div class="tire-ui FL" style="background:${v.status.FL.color}" title="Del. Izq: ${v.pressures.FL} kPa"></div>
                        <div class="tire-ui FR" style="background:${v.status.FR.color}" title="Del. Der: ${v.pressures.FR} kPa"></div>
                        <div class="tire-ui RL" style="background:${v.status.RL.color}" title="Tras. Izq: ${v.pressures.RL} kPa"></div>
                        <div class="tire-ui RR" style="background:${v.status.RR.color}" title="Tras. Der: ${v.pressures.RR} kPa"></div>
                        <div class="car-body-shape"></div>
                    </div>

                    <div class="stats-box">
                        <div class="stats-row">${v.pressures.FL || '--'} | ${v.pressures.FR || '--'}</div>
                        <div class="stats-row" style="border-top: 1px solid #f1f2f6;">${v.pressures.RL || '--'} | ${v.pressures.RR || '--'}</div>
                        <div style="font-size: 8px; color: #a5b1c2; margin-top: 4px;">UNIDAD: kPa</div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="fleet-grid">${html}</div>`;
    }

    return {
        initialize: function (api, state, callback) {
            console.log("Add-In Neumáticos VTC: Inicializado correctamente.");
            callback();
        },

        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Analizando telemetría de toda la flota...</div>';

            // 1. Obtenemos todos los dispositivos
            api.call("Get", {
                typeName: "Device"
            }, function (devices) {
                
                // 2. MultiCall: Pedimos los datos de presión de todos los coches en UNA sola petición
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: d.id },
                            fromDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Últimas 48 horas
                        },
                        resultsLimit: 30 // Suficientes logs para capturar los 4 neumáticos
                    }
                ]);

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const logs = results[index] || [];
                        
                        // Buscador de último valor por diagnóstico
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

                        // Calculamos el semáforo para cada rueda
                        const s = {
                            FL: calculateStatus(p.FL, p.FR),
                            FR: calculateStatus(p.FR, p.FL),
                            RL: calculateStatus(p.RL, p.RR),
                            RR: calculateStatus(p.RR, p.RL)
                        };

                        // Determinamos la gravedad máxima para ordenar la lista
                        const weights = [s.FL.weight, s.FR.weight, s.RL.weight, s.RR.weight];
                        
                        return {
                            name: device.name,
                            pressures: p,
                            status: s,
                            maxWeight: Math.max(...weights)
                        };
                    });

                    // Dibujar la interfaz final
                    renderFleet(fleetData);

                }, function(err) {
                    container.innerHTML = '<div class="error">Error en la comunicación MultiCall: ' + err + '</div>';
                });
            }, function(err) {
                container.innerHTML = '<div class="error">Error al obtener lista de vehículos: ' + err + '</div>';