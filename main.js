window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    const diagIds = {
        FL: "DiagnosticTirePressureFrontLeftId",
        FR: "DiagnosticTirePressureFrontRightId",
        RL: "DiagnosticTirePressureRearLeftId",
        RR: "DiagnosticTirePressureRearRightId"
    };

    // Valores por defecto — se sobreescriben con lo guardado en localStorage
    const DEFAULTS = {
        turismo:   { minC: 2.0, minO: 2.2, maxO: 2.8, maxC: 3.0 },
        furgoneta: { minC: 2.8, minO: 3.2, maxO: 3.8, maxC: 4.2 }
    };

    function loadPresiones() {
        try {
            const saved = localStorage.getItem("tirePressureProfiles");
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return JSON.parse(JSON.stringify(DEFAULTS));
    }

    function savePresiones(data) {
        localStorage.setItem("tirePressureProfiles", JSON.stringify(data));
    }

    let PRESIONES = loadPresiones();

    // ─── Modal de configuración ───────────────────────────────────────────────

    function buildModal() {
        if (document.getElementById("tpa-modal-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "tpa-modal-overlay";
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.45);
            display:flex; align-items:center; justify-content:center;
            z-index:9999; backdrop-filter:blur(3px);
        `;

        const labelStyle = "display:block; font-size:11px; color:#636e72; font-weight:600; margin-bottom:4px; text-transform:uppercase; letter-spacing:.5px;";
        const inputStyle = "width:100%; padding:7px 10px; border:1px solid #ced6e0; border-radius:6px; font-size:13px; box-sizing:border-box; outline:none; transition:border .2s;";
        const rowStyle   = "display:grid; grid-template-columns:1fr 1fr; gap:10px;";

        function fieldGroup(id, label, val) {
            return `
                <div>
                    <label style="${labelStyle}">${label}</label>
                    <input id="${id}" type="number" step="0.1" min="0" max="8" value="${val}"
                        style="${inputStyle}"
                        onfocus="this.style.borderColor='#0984e3'"
                        onblur="this.style.borderColor='#ced6e0'">
                </div>`;
        }

        overlay.innerHTML = `
            <div style="background:white; border-radius:14px; padding:28px;
                        width:420px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.25);
                        font-family:sans-serif; animation:tpa-fadein .2s ease;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                    <h2 style="margin:0; font-size:16px; color:#2d3436;">⚙️ Configurar Presiones (Bar)</h2>
                    <button id="tpa-modal-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:#b2bec3; line-height:1;">✕</button>
                </div>

                <!-- TURISMO -->
                <div style="background:#f4f7f6; border-radius:8px; padding:14px; margin-bottom:14px;">
                    <div style="font-size:13px; font-weight:700; color:#2d3436; margin-bottom:12px;">🚗 Turismo</div>
                    <div style="${rowStyle}">
                        ${fieldGroup("t-minC","Crítico mín.",PRESIONES.turismo.minC)}
                        ${fieldGroup("t-minO","Óptimo mín.",PRESIONES.turismo.minO)}
                        ${fieldGroup("t-maxO","Óptimo máx.",PRESIONES.turismo.maxO)}
                        ${fieldGroup("t-maxC","Crítico máx.",PRESIONES.turismo.maxC)}
                    </div>
                </div>

                <!-- FURGONETA -->
                <div style="background:#f4f7f6; border-radius:8px; padding:14px; margin-bottom:20px;">
                    <div style="font-size:13px; font-weight:700; color:#2d3436; margin-bottom:12px;">🚐 Furgoneta</div>
                    <div style="${rowStyle}">
                        ${fieldGroup("f-minC","Crítico mín.",PRESIONES.furgoneta.minC)}
                        ${fieldGroup("f-minO","Óptimo mín.",PRESIONES.furgoneta.minO)}
                        ${fieldGroup("f-maxO","Óptimo máx.",PRESIONES.furgoneta.maxO)}
                        ${fieldGroup("f-maxC","Crítico máx.",PRESIONES.furgoneta.maxC)}
                    </div>
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button id="tpa-modal-reset"
                        style="padding:9px 16px; border:1px solid #ced6e0; border-radius:6px;
                               background:white; cursor:pointer; font-size:13px; color:#636e72;">
                        Restaurar</button>
                    <button id="tpa-modal-save"
                        style="padding:9px 20px; border:none; border-radius:6px;
                               background:#0984e3; color:white; cursor:pointer;
                               font-size:13px; font-weight:600;">
                        Guardar y aplicar</button>
                </div>
            </div>
            <style>
                @keyframes tpa-fadein { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
            </style>
        `;

        document.body.appendChild(overlay);

        // Cerrar clickando fuera o en ✕
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
        document.getElementById("tpa-modal-close").addEventListener("click", closeModal);

        // Restaurar valores por defecto
        document.getElementById("tpa-modal-reset").addEventListener("click", () => {
            const d = DEFAULTS;
            document.getElementById("t-minC").value = d.turismo.minC;
            document.getElementById("t-minO").value = d.turismo.minO;
            document.getElementById("t-maxO").value = d.turismo.maxO;
            document.getElementById("t-maxC").value = d.turismo.maxC;
            document.getElementById("f-minC").value = d.furgoneta.minC;
            document.getElementById("f-minO").value = d.furgoneta.minO;
            document.getElementById("f-maxO").value = d.furgoneta.maxO;
            document.getElementById("f-maxC").value = d.furgoneta.maxC;
        });

        // Guardar
        document.getElementById("tpa-modal-save").addEventListener("click", () => {
            const g = (id) => parseFloat(document.getElementById(id).value);
            PRESIONES = {
                turismo:   { minC: g("t-minC"), minO: g("t-minO"), maxO: g("t-maxO"), maxC: g("t-maxC") },
                furgoneta: { minC: g("f-minC"), minO: g("f-minO"), maxO: g("f-maxO"), maxC: g("f-maxC") }
            };
            savePresiones(PRESIONES);
            closeModal();
            // Redibujar la flota con los nuevos perfiles (usa la caché de flota si existe)
            if (window._tpaFleetCache) renderFleet(window._tpaFleetCache);
        });
    }

    function openModal() {
        buildModal();
        document.getElementById("tpa-modal-overlay").style.display = "flex";
    }

    function closeModal() {
        const overlay = document.getElementById("tpa-modal-overlay");
        if (overlay) overlay.remove();
    }

    // ─── Lógica de alertas ────────────────────────────────────────────────────

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

    // ─── Render ───────────────────────────────────────────────────────────────

    function renderFleet(vehicles) {
        window._tpaFleetCache = vehicles;
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const pt = PRESIONES["turismo"];
        const pf = PRESIONES["furgoneta"];

        const legendHtml = `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif;
                        font-size: 13px; color: #2d3436; border-left: 4px solid #0984e3;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                    <strong style="font-size: 14px;">Leyenda de Avisos y Alertas (Datos de última semana):</strong>
                    <button id="tpa-settings-btn"
                        style="background:#0984e3; color:white; border:none; border-radius:6px;
                               padding:6px 12px; font-size:12px; cursor:pointer; font-weight:600;
                               display:flex; align-items:center; gap:5px;">
                        ⚙️ Configurar presiones
                    </button>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #20bf6b; border-radius: 4px;"></div> Óptimo</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f7b731; border-radius: 4px;"></div> Aviso Leve</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #eb3b5a; border-radius: 4px;"></div> Alerta Crítica</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; border: 2px solid #eb3b5a; background: #ffeaa7; border-radius: 4px;"></div> Desviación en el eje > 5%</div>
                </div>
                <div style="font-size: 11px; color: #636e72; background: #f4f7f6; padding: 8px; border-radius: 4px; line-height: 1.7;">
                    <strong>Valores de Perfiles (Bar):</strong><br>
                    🚗 <strong>Turismo:</strong> Óptimo (${pt.minO} – ${pt.maxO}) | Aviso (${pt.minC}–${pt.minO} / ${pt.maxO}–${pt.maxC}) | Crítico (&lt;${pt.minC} o &gt;${pt.maxC})<br>
                    🚐 <strong>Furgoneta:</strong> Óptimo (${pf.minO} – ${pf.maxO}) | Aviso (${pf.minC}–${pf.minO} / ${pf.maxO}–${pf.maxC}) | Crítico (&lt;${pf.minC} o &gt;${pf.maxC})
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

        // Conectar botón de configuración (se renderiza dentro del innerHTML)
        const settingsBtn = document.getElementById("tpa-settings-btn");
        if (settingsBtn) settingsBtn.addEventListener("click", openModal);
    }

    // ─── Punto de entrada ─────────────────────────────────────────────────────

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

                const calls = Object.values(diagIds).map(id => ["Get", {
                    typeName: "StatusData",
                    search: { diagnosticSearch: { id: id }, fromDate: fromDate }
                }]);

                api.multiCall(calls, function (results) {
                    const masterData = {};
                    devices.forEach(d => masterData[d.id] = { FL: null, FR: null, RL: null, RR: null });

                    const keys = ['FL', 'FR', 'RL', 'RR'];
                    results.forEach((statusList, index) => {
                        const key = keys[index];
                        statusList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                        statusList.forEach(log => {
                            const devId = log.device.id;
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
        blur: function () { closeModal(); }
    };
};