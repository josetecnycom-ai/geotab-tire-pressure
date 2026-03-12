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
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" }; // Gris (sin datos)
        
        const bar = val / 100000; // Conversión de Pascales a Bar
        let weight = 1;
        let color = "#20bf6b"; // VERDE: Óptimo
        let msg = "";

        // 1. Alerta por Desviación (> 5% diferencia con la rueda opuesta)
        if (sideVal && sideVal > 0) {
            if (Math.abs((val - sideVal) / sideVal) > 0.05) {
                return { color: "#eb3b5a", weight: 3, msg: "Posible desalineación o fuga lenta" }; // ROJO
            }
        }

        // 2. Umbrales de Presión en Bar
        if (bar < 2.0 || bar > 3.0) {
            weight = 3; color = "#eb3b5a"; // ROJO: Alerta crítica
        } else if (bar < 2.2 || bar > 2.8) {
            weight = 2; color = "#f7b731"; // AMARILLO: Aviso leve
        }

        return { color, weight, msg };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // ORDENACIÓN: Primero los problemas más graves
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const hasCritical = v.maxWeight === 3;
            const fmt = (val) => val ? (val / 100000).toFixed(2) : '--'; // Muestra 2 decimales (ej: 2.45)

            // Recopilar mensajes de alerta (sin duplicar)
            let alerts = [];
            if (v.status.FL.msg) alerts.push("Eje Del: " + v.status.FL.msg);
            if (v.status.RL.msg) alerts.push("Eje Tras: " + v.status.RL.msg);
            alerts = [...new Set(alerts)];
            const alertHtml = alerts.length > 0 ? `<div class="alert-box">⚠️ ${alerts.join('<br>')}</div>` : '';

            return `
                <div class="vehicle-card" style="${hasCritical ? 'border:2px solid #eb3b5a' : 'border:1px solid #d1d8e0'}">
                    <div class="card-header"><strong>${v.name}</strong></div>
                    ${alertHtml}
                    
                    <div class="car-diagram">
                        <div class="tire-ui FL" style="background:${v.status.FL.color}">${fmt(v.pressures.FL)}</div>
                        <div class="tire-ui FR" style="background:${v.status.FR.color}">${fmt(v.pressures.FR)}</div>
                        <div class="tire-ui RL" style="background:${v.status.RL.color}">${fmt(v.pressures.RL)}</div>
                        <div class="tire-ui RR" style="background:${v.status.RR.color}">${fmt(v.pressures.RR)}</div>
                        <div class="car-body-shape"></div>
                    </div>

                    <div class="stats-box">UNIDAD: BAR</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `<div class="fleet-grid">${html}</div>`;
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Analizando presiones en Bar...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: { deviceSearch: { id: d.id }, fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                        resultsLimit: 100 
                    }
                ]);

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const logs = results[index] || [];
                        const getVal = (id) => {
                            const found = logs.filter(l => l.diagnostic && l.diagnostic.id === id)[0];
                            return found ? found.data : null;
                        };

                        const p = { FL: getVal(diagIds.FL), FR: getVal(diagIds.FR), RL: getVal(diagIds.RL), RR: getVal(diagIds.RR) };
                        const s = {
                            FL: calculateStatus(p.FL, p.FR),
                            FR: calculateStatus(p.FR, p.FL),
                            RL: calculateStatus(p.RL, p.RR),
                            RR: calculateStatus(p.RR, p.RL)
                        };

                        return {
                            name: device.name, pressures: p, status: s,
                            maxWeight: Math.max(s.FL.weight, s.FR.weight, s.RL.weight, s.RR.weight)
                        };
                    });
                    renderFleet(fleetData);
                }, function(err) { container.innerHTML = "Error: " + err; });
            });
        },
        blur: function () {}
    };
};