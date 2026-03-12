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
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" }; // Gris (Sin datos)
        
        const bar = val / 100000;
        let weight = 1;
        let color = "#20bf6b"; // VERDE: Óptimo (2.2 a 2.8 Bar)
        let msg = "";

        // 1. Umbrales de Presión en Bar
        if (bar < 2.0 || bar > 3.0) {
            weight = 3; color = "#eb3b5a"; // ROJO: Alerta crítica
        } else if (bar < 2.2 || bar > 2.8) {
            weight = 2; color = "#f7b731"; // AMARILLO: Aviso leve
        }

        // 2. Alerta por Desviación (> 5% diferencia en el mismo eje)
        if (sideVal && sideVal > 0) {
            if (Math.abs((val - sideVal) / sideVal) > 0.05) {
                weight = 3; // Forzamos máxima prioridad
                color = "#eb3b5a"; // Forzamos rojo
                msg = "Posible desalineación o fuga lenta";
            }
        }

        return { color, weight, msg };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        
        // ORDENACIÓN: Gravedad 3 (Rojo) primero, luego 2 (Amarillo), luego 1 (Verde)
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        // Contenedor principal con Flexbox para crear la cuadrícula
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; padding-top: 10px;">';

        vehicles.forEach(v => {
            const hasCritical = v.maxWeight === 3;
            const fmt = (val) => val ? (val / 100000).toFixed(2) : '--';
            
            // Recopilar alertas sin duplicar
            let alerts = [];
            if (v.status.FL.msg) alerts.push("Eje Del: " + v.status.FL.msg);
            if (v.status.RL.msg) alerts.push("Eje Tras: " + v.status.RL.msg);
            alerts = [...new Set(alerts)];
            
            // Cuadro de alerta amarillo si hay problemas, o un espacio en blanco para mantener todo alineado
            const alertHtml = alerts.length > 0 
                ? `<div style="background: #ffeaa7; color: #eb3b5a; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 4px; margin-bottom: 15px; line-height: 1.3;">⚠️ ${alerts.join('<br>')}</div>` 
                : `<div style="height: 27px; margin-bottom: 15px;"></div>`; 

            const borderStyle = hasCritical ? 'border: 2px solid #eb3b5a;' : 'border: 1px solid #d1d8e0;';

            // Estilos CSS incrustados para forzar el dibujo
            const tireBaseStyle = "position: absolute; width: 42px; height: 50px; border-radius: 6px; border: 2px solid #2d3436; z-index: 2; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold; text-shadow: 1px 1px 2px #000; box-sizing: border-box;";

            html += `
                <div style="background: white; border-radius: 12px; padding: 15px; width: 230px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); text-align: center; ${borderStyle}">
                    <div style="font-size: 15px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee; font-family: sans-serif;"><strong>${v.name}</strong></div>
                    
                    ${alertHtml}
                    
                    <div style="position: relative; width: 140px; height: 180px; margin: 0 auto 10px auto;">
                        
                        <div style="position: absolute; top: 10px; left: 40px; width: 60px; height: 160px; background: #dfe6e9; border-radius: 20px 20px 10px 10px; border: 2px solid #b2bec3; z-index: 1;">
                            <div style="position: absolute; top: 30px; left: 10px; width: 36px; height: 30px; background: #8395a7; border-radius: 5px;"></div>
                        </div>

                        <div style="${tireBaseStyle} top: 25px; left: 10px; background:${v.status.FL.color}">${fmt(v.pressures.FL)}</div>
                        <div style="${tireBaseStyle} top: 25px; right: 10px; background:${v.status.FR.color}">${fmt(v.pressures.FR)}</div>
                        
                        <div style="${tireBaseStyle} bottom: 25px; left: 10px; background:${v.status.RL.color}">${fmt(v.pressures.RL)}</div>
                        <div style="${tireBaseStyle} bottom: 25px; right: 10px; background:${v.status.RR.color}">${fmt(v.pressures.RR)}</div>
                    </div>

                    <div style="font-size: 10px; color: #636e72; font-weight: bold; letter-spacing: 1px; margin-top: 15px;">UNIDAD: BAR</div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center; font-family: sans-serif;">Analizando presiones en Bar y generando esquemas...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                const calls = devices.map(d => [
                    "Get", {
                        typeName: "StatusData",
                        search: { deviceSearch: { id: d.id }, fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
                        resultsLimit: 100 
                    }
                ]);

               // SUSTITUYE EL BLOQUE "api.call("Get", { typeName: "Device" }..." POR ESTE:

api.call("Get", { typeName: "Device" }, function (devices) {
    // Creamos una lista de llamadas mucho más precisa
    const calls = [];
    
    devices.forEach(d => {
        // Por cada dispositivo, pedimos específicamente el ÚLTIMO dato de cada rueda
        Object.values(diagIds).forEach(diagId => {
            calls.push(["Get", {
                typeName: "StatusData",
                search: {
                    deviceSearch: { id: d.id },
                    diagnosticSearch: { id: diagId },
                    // Buscamos hacia atrás lo suficiente para encontrar el último dato real
                    fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                resultsLimit: 1 // Solo queremos el más reciente de cada uno
            }]);
        });
    });

    api.multiCall(calls, function (results) {
        const fleetData = devices.map((device, devIndex) => {
            // Cada dispositivo ahora tiene 4 resultados asignados en el array 'results'
            const startIndex = devIndex * 4;
            const getValFromRes = (offset) => {
                const res = results[startIndex + offset];
                return (res && res.length > 0) ? res[0].data : null;
            };

            const p = {
                FL: getValFromRes(0),
                FR: getValFromRes(1),
                RL: getValFromRes(2),
                RR: getValFromRes(3)
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
    }, function(err) { console.error(err); });
});
        },
        blur: function () {}
    };

};
