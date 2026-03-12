geotab.addin.tirePressureAddin = function (api, state) {
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    function getStatusColor(val, sideVal) {
        if (!val) return "gray";
        // Lógica de desviación entre lados (>5%)
        if (sideVal && Math.abs((val - sideVal) / sideVal) > 0.05) return "red"; 
        // Lógica de presión absoluta (kPa)
        if (val < 200 || val > 300) return "red";
        if (val < 220 || val > 280) return "orange";
        return "green";
    }

    function renderVehicleCard(vehicle) {
        const p = vehicle.pressures;
        const statusFL = getStatusColor(p.FL, p.FR);
        const statusFR = getStatusColor(p.FR, p.FL);
        const statusRL = getStatusColor(p.RL, p.RR);
        const statusRR = getStatusColor(p.RR, p.RL);

        let alertMsg = "";
        if (statusFL === "red" || statusFR === "red" || statusRL === "red" || statusRR === "red") {
            alertMsg = '<div class="alert-tag">CRÍTICO / DESALINEACIÓN</div>';
        }

        return `
            <div class="vehicle-card" data-severity="${alertMsg ? 1 : 2}">
                header><strong>${vehicle.name}</strong>${alertMsg}</header>
                <div class="car-diagram">
                    <div class="tire FL" style="background:${statusFL}"></div>
                    <div class="tire FR" style="background:${statusFR}"></div>
                    <div class="tire RL" style="background:${statusRL}"></div>
                    <div class="tire RR" style="background:${statusRR}"></div>
                    <div class="car-body"></div>
                </div>
                <div class="stats">
                    <span>${p.FL||'--'}/${p.FR||'--'} kPa</span><br>
                    <span>${p.RL||'--'}/${p.RR||'--'} kPa</span>
                </div>
            </div>
        `;
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = "Cargando flota...";

            // 1. Obtener todos los vehículos
            api.call("Get", { typeName: "Device" }, function (devices) {
                // 2. Obtener presiones (simplificado para el ejemplo con una llamada masiva)
                api.call("Get", {
                    typeName: "StatusData",
                    search: { diagnosticSearch: { id: "DiagnosticTirePressureFrontLeftId" } } // Ejemplo simplificado
                }, function (data) {
                    // Aquí procesaríamos el mapeo masivo de datos
                    // Por brevedad, simulamos la renderización ordenada:
                    let html = devices.map(d => {
                        d.pressures = { FL: 240, FR: 210, RL: 245, RR: 242 }; // Datos de ejemplo
                        return renderVehicleCard(d);
                    }).join('');
                    
                    container.innerHTML = `<div class="fleet-grid">${html}</div>`;
                });
            });
        }
    };
};