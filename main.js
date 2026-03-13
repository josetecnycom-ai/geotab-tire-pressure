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
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" }; 
        const bar = val / 100000;
        let weight = 1, color = "#20bf6b", msg = "";

        if (bar < 2.0 || bar > 3.0) { weight = 3; color = "#eb3b5a"; } 
        else if (bar < 2.2 || bar > 2.8) { weight = 2; color = "#f7b731"; }

        if (sideVal && sideVal > 0 && Math.abs((val - sideVal) / sideVal) > 0.05) {
            weight = 3; color = "#eb3b5a"; msg = "Posible desalineación o fuga lenta";
        }
        return { color, weight, msg };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const legendHtml = `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif; font-size: 13px; color: #2d3436; border-left: 4px solid #0984e3;">
                <strong style="display: block; margin-bottom: 10px; font-size: 14px;">Leyenda de Avisos y Alertas (Datos de última semana):</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #20bf6b; border-radius: 4px;"></div> Óptimo (2.2 - 2.8 Bar)</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f7b731; border-radius: 4px;"></div> Aviso Leve</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #eb3b5a; border-radius: 4px;"></div> Alerta Crítica</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; border: 2px solid #eb3b5a; background: #ffeaa7; border-radius: 4px;"></div> Desviación > 5%</div>
                </div>
            </div>
        `;

        let html = legendHtml + '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; padding-top: 5px;">';

        vehicles.forEach(v => {
            const hasCritical = v.maxWeight === 3;
            const fmt = (val) => val ? (val / 100000).toFixed(2) : '--';
            let alerts = [...new Set([v.status.FL.msg, v.status.RL.msg].filter(m => m))];
            
            const alertHtml = alerts.length > 0 
                ? `<div style="background: #ffeaa7; color: #eb3b5a; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 4px; margin-bottom: 15px; min-height: 28px;">⚠️ ${alerts.join('<br>')}</div>` 
                : `<div style="height: 40px;"></div>`; 

            const tireBaseStyle = "position: absolute; width: 42px; height: 50px; border-radius: 6px; border: 2px solid #2d3436; z-index: 2; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; text-shadow: 1px 1px 2px #000; box-sizing: border-box;";

            html += `
                <div style="background: white; border-radius: 12px; padding: 15px; width: 230px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); text-align: center; border: ${hasCritical ? '2px solid #eb3b5a' : '1px solid #d1d8e0'}">
                    <div style="font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"><strong>${v.name}</strong></div>
                    ${alertHtml}
                    <div style="position: relative; width: 140px; height: 180px; margin: 0 auto;">
                        <div style="position: absolute; top: 10px; left: 40px; width: 60px; height: 160px; background: #dfe6e9; border-radius: 20px 20px 10px 10px; border: 2px solid #b2bec3; z-index: 1;"></div>
                        <div style="${tireBaseStyle} top: 25px; left: 10px; background:${v.status.FL.color}">${fmt(v.pressures.FL)}</div>
                        <div style="${tireBaseStyle} top: 25px; right: 10px; background:${v.status.FR.color}">${fmt(v.pressures.FR)}</div>
                        <div style="${tireBaseStyle} bottom: 25px; left: 10px; background:${v.status.RL.color}">${fmt(v.pressures.RL)}</div>
                        <div style="${tireBaseStyle} bottom: 25px; right: 10px; background:${v.status.RR.color}">${fmt(v.pressures.RR)}</div>
                    </div>
                    <div style="font-size: 10px; color: #636e72; margin-top: 10px;">BAR</div>
                </div>`;
        });
        container.innerHTML = html + '</div>';
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Cargando flota completa...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                
                // SOLO 4 LLAMADAS: Una por cada tipo de rueda para TODA la flota
                const calls = Object.values(diagIds).map(id => ["Get", {
                    typeName: "StatusData",
                    search: { diagnosticSearch: { id: id }, fromDate: fromDate }
                }]);

                api.multiCall(calls, function (results) {
                    // Mapeamos los resultados por dispositivo para acceso rápido
                    const masterData = {};
                    devices.forEach(d => masterData[d.id] = { FL: null, FR: null, RL: null, RR: null });

                    // Procesamos cada uno de los 4 arrays de resultados
                    const keys = ['FL', 'FR', 'RL', 'RR'];
                    results.forEach((statusList, index) => {
                        const key = keys[index];
                        // Ordenamos por fecha descendente para tener el más nuevo primero
                        statusList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                        
                        statusList.forEach(log => {
                            const devId = log.device.id;
                            // Solo guardamos el primer dato que encontremos (el más reciente) por dispositivo
                            if (masterData[devId] && masterData[devId][key] === null) {
                                masterData[devId][key] = log.data;
                            }
                        });
                    });

                    const fleetData = devices.map(d => {
                        const p = masterData[d.id];
                        const s = {
                            FL: calculateStatus(p.FL, p.FR), FR: calculateStatus(p.FR, p.FL),
                            RL: calculateStatus(p.RL, p.RR), RR: calculateStatus(p.RR, p.RL)
                        };
                        return {
                            name: d.name, pressures: p, status: s,
                            maxWeight: Math.max(s.FL.weight, s.FR.weight, s.RL.weight, s.RR.weight)
                        };
                    });

                    renderFleet(fleetData);
                }, err => { container.innerHTML = "Error de cuota o datos: " + err; });
            });
        },
        blur: function () {}
    };
};