window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    
    // IDs exactos que usa tu base de datos
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    function calculateStatus(val, sideVal) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0 };
        
        // Desviación del 5% entre lados del mismo eje
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) {
            return { color: "#eb3b5a", weight: 3 }; 
        }
        
        // Umbrales en kPa (Convertimos de Pa a kPa para la lógica)
        const kpa = val / 1000;
        if (kpa < 200 || kpa > 310) return { color: "#eb3b5a", weight: 3 }; 
        if (kpa < 225 || kpa > 285) return { color: "#f7b731", weight: 2 };
        
        return { color: "#20bf6b", weight: 1 };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const html = vehicles.map(v => {
            const hasCritical = v.maxWeight === 3;
            // Función auxiliar para mostrar kPa o --
            const fmt = (val) => val ? (val / 1000).toFixed(1) : '--';

            return `
                <div class="vehicle-card" style="${hasCritical ? 'border:2px solid #eb3b5a' : 'border:1px solid #d1d8e0'}">
                    <div class="card-header"><strong>${v.name}</strong></div>
                    <div class="car-diagram">
                        <div class="tire-ui FL" style="background:${v.status.FL.color}"></div>
                        <div class="tire-ui FR" style="background:${v.status.FR.color}"></div>
                        <div class="tire-ui RL" style="background:${v.status.RL.color}"></div>
                        <div class="tire-ui RR" style="background:${v.status.RR.color}"></div>
                        <div class="car-body-shape"></div>
                    </div>
                    <div class="stats-box">
                        <div class="stats-row">${fmt(v.pressures.FL)} | ${fmt(v.pressures.FR)}</div>
                        <div class="stats-row" style="border-top: 1px solid #f1f2f6;">${fmt(v.pressures.RL)} | ${fmt(v.pressures.RR)}</div>
                        <div style="font-size: 8px; color: #a5b1c2; margin-top: 4px;">UNIDAD: kPa (de Pa originales)</div>
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = `<div class="fleet-grid">${html}</div>`;
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Buscando presiones en Pascales...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: {
                            deviceSearch: { id: d.id },
                            // Buscamos los últimos 7 días por si algún coche no ha reportado hoy
                            fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                        },
                        resultsLimit: 100 
                    }
                ]);

                api.multiCall(calls, function (results) {
                    const fleetData = devices.map((device, index) => {
                        const logs = results[index] || [];
                        
                        const getVal = (id) => {
                            // Buscamos el registro más reciente para este ID específico
                            const found = logs.filter(l => l.diagnostic && l.diagnostic.id === id)[0];
                            return found ? found.data : null;
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

                        return {
                            name: device.name,
                            pressures: p,
                            status: s,
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