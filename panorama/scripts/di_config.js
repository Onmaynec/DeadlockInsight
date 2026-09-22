(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};

    DI.VERSION = "0.1.0-dev";

    DI.Config = {
        POLL_RATE_ACTIVE: 0.50,
        POLL_RATE_IDLE: 1.00,
        PANEL_REFRESH_MS: 2000,
        CAMP_SCAN_MS: 500,

        CONFIDENCE: {
            CONFIRMED: "confirmed",
            ESTIMATED: "estimated",
            UNKNOWN: "unknown"
        },

        NEUTRAL_RESPAWN_SECONDS: {
            neutral_weak: 85,
            neutral_medium: 290,
            neutral_large: 335,
            neutral_vault: 300
        },

        POWERUPS: {
            firstSpawn: 300,
            interval: 300,
            spawnWindow: 15
        },

        UI: {
            showObjectiveBar: true,
            showMinimapCampState: true,
            showCampCountdownUnderSeconds: 60,
            showShopPanel: true,
            maxShopRecommendations: 4
        },

        // Важное правило проекта: provider не должен читать скрытое состояние матча.
        // Любая информация для анализа должна уже быть доступна штатному клиентскому UI
        // либо являться расчётом из публичного тайминга.
        FAIR_DATA_ONLY: true
    };
})();
