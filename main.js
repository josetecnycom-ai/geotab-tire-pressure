/**
 * Geotab Add-In: Monitor de Presión de Neumáticos VTC
 * Especialista: Geotab & SDK Programming
 */

window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    function calculateStatus(val, sideVal) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, label: "N/A" };
        
        // Alerta por desviación del 5% entre neumáticos del mismo eje
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) {
            return { color: "#eb3b5a", weight: 3, alert: "DESALINEACIÓN" };
        }
        
        // Umbrales en kPa (200 kPa = 29 PSI | 310 kPa = 45 PSI)
        if (val < 200 || val > 310) return { color: "#eb3b5a", weight: 3, label: "CRÍTICO" };
        if (val < 225 || val > 285) return { color: "#f7b731", weight: 2, label: "AVISO" };
        
        return { color: "#20bf6b", weight: 1, label: "OK" };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // Ordenamos por gravedad (los críticos arriba)
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const hasCritical = v.maxWeight === 3;
            const borderStyle = hasCritical ? "border: 2px solid #eb3b5a;" : "border: 1px solid #d1d8e0;";
            
            return `
                <div class="vehicle-card" style="${borderStyle}">
                    <div class="card-header">
                        <strong>${v.name}</strong>
                        ${hasCritical ? '<div style="color:#eb3b5a; font-size:9px; font-weight:bold; margin-top:3px;">⚠️ REVISAR EJE</div>' : ''}
                    </div>
                    <div class="car-diagram">
                        <div class="tire-ui FL" style="top:15%; left:-18%; background:${v.status.FL.color}"></div>
                        <div class="tire-ui FR" style="top:15%; right:-18%; background:${v.status.FR.color}"></div>
                        <div class="tire-ui RL" style="bottom:15%; left:-18%; background:${v.status.RL.color}"></div>
                        <div class="tire-ui RR" style="bottom:15%; right:-18%; background:${v.status.RR.color}"></div>
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
            console.log("Add-In inicializado correctamente");
            callback();
        },

        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Analizando telemetría...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: d.id },
                            fromDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
                        },
                        resultsLimit: 30
                    }
                ]);

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const logs = results[index] || [];
                        
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
                    container.innerHTML = "Error MultiCall: " + err;
                });
            }, function(err) {
                container.innerHTML = "Error Device: " + err;
            });
        },

        blur: function (api, state) {
            // Limpieza opcional
        }
    };
};