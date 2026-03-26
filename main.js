window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    const PRESIONES = {
        "turismo":   { minC: 2.0, minO: 2.2, maxO: 2.8, maxC: 3.0 },
        "furgoneta": { minC: 2.8, minO: 3.2, maxO: 3.8, maxC: 4.2 }
    };

    function calculateStatus(val, sideVal, profileName) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" }; 
        const bar = val / 100000;
        let weight = 1, color = "#20bf6b", msg = "";

        const p = PRESIONES[profileName] || PRESIONES["turismo"];

        if (bar < p.minC || bar > p.maxC) { weight = 3; color = "#eb3b5a"; } 
        else if (bar < p.minO || bar > p.maxO) { weight = 2; color = "#f7b731"; }

        if (sideVal && sideVal > 0 && Math.abs((val - sideVal) / sideVal) > 0.05) {
            weight = 3; color = "#eb3b5a"; msg = "Posible desalineación o fuga lenta";
        }
        return { color, weight, msg };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const pt = PRESIONES["turismo"];
        const pf = PRESIONES["furgoneta"];

        const legendHtml = `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif; font-size: 13px; color: #2d3436; border-left: 4px solid #0984e3;">
                <strong style="display: block; margin-bottom: 10px; font-size: 14px;">Leyenda de Avisos y Alertas (Datos de última semana):</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #20bf6b; border-radius: 4px;"></div> Óptimo</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f7b731; border-radius: 4px;"></div> Aviso Leve</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #eb3b5a; border-radius: 4px;"></div> Alerta Crítica</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; border: 2px solid #eb3b5a; background: #ffeaa7; border-radius: 4px;"></div> Desviación en el eje > 5%</div>
                </div>
                <div style="font-size: 11px; color: #636e72; background: #f4f7f6; padding: 8px; border-radius: 4px; line-height: 1.6;">
                    <strong>Valores de Perfiles (Bar):</strong><br>
                    🚗 <strong>Turismo:</strong> Óptimo (${pt.minO} a ${pt.maxO}) | Aviso (${pt.minC} a ${pt.minO} / ${pt.maxO} a ${pt.maxC}) | Crítico (<${pt.minC} o >${pt.maxC})<br>
                    🚐 <strong>Furgoneta:</strong> Óptimo (${pf.minO} a ${pf.maxO}) | Aviso (${pf.minC} a ${pf.minO} / ${pf.maxO} a ${pf.maxC}) | Crítico (<${pf.minC} o >${pf.maxC})
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
                        <div style="position: absolute; top: 0; left: 0; width: 140px; height: 180px; z-index: 1;">
                            <svg viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg">
                                <path d="M 42 25 Q 42 10, 70 10 Q 98 10, 98 25 L 102 145 Q 102 170, 70 170 Q 38 170, 38 145 Z" fill="rgba(0,0,0,0.1)" transform="translate(2, 4)"/>
                                <path d="M 40 25 Q 40 10, 70 10 Q 100 10, 100 25 L 100 145 Q 100 170, 70 170 Q 40 170, 40 145 Z" fill="#f4f7f6" stroke="#ced6e0" stroke-width="2"/>
                                <path d="M 46 45 Q 70 35, 94 45 L 88 65 Q 70 60, 52 65 Z" fill="#576574"/>
                                <path d="M 48 130 Q 70 125, 92 130 L 88 145 Q 70 150, 52 145 Z" fill="#576574"/>
                                <path d="M 52 65 L 48 130" stroke="#ced6e0" stroke-width="1.5" fill="none"/>
                                <path d="M 88 65 L 92 130" stroke="#ced6e0" stroke-width="1.5" fill="none"/>
                                <path d="M 40 55 Q 35 55, 35 60 L 35 65 Q 40 65, 40 60 Z" fill="#f4f7f6" stroke="#ced6e0" stroke-width="1"/>
                                <path d="M 100 55 Q 105 55, 105 60 L 105 65 Q 100 65, 100 60 Z" fill="#f4f7f6" stroke="#ced6e0" stroke-width="1"/>
                            </svg>
                        </div>
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
            container.innerHTML = '<div style="padding:20px; text-align:center;">Cargando flota y configurando perfiles...</div>';

            api.multiCall([
                ["Get", { typeName: "Group" }],
                ["Get", { typeName: "Device" }]
            ], function (results) {
                const groupsList = results[0];
                const devices = results[1];

                const groupMap = {};
                groupsList.forEach(g => { groupMap[g.id] = (g.name || "").toLowerCase(); });

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
                        let profName = "turismo";
                        if (d.groups) {
                            for (let i = 0; i < d.groups.length; i++) {
                                const gName = groupMap[d.groups[i].id];
                                if (gName && gName.includes("furgoneta")) {
                                    profName = "furgoneta"; break;
                                }
                            }
                        }

                        const p = masterData[d.id];
                        const s = {
                            FL: calculateStatus(p.FL, p.FR, profName), FR: calculateStatus(p.FR, p.FL, profName),
                            RL: calculateStatus(p.RL, p.RR, profName), RR: calculateStatus(p.RR, p.RL, profName)
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