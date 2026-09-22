(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};

    var state = {
        sessionId: 0,
        gameTime: 0,
        gameTimeKnown: false,

        ui: {
            root: null,
            hud: null,
            minimapBox: null,
            minimap: null,
            shopOpen: false
        },

        map: {
            camps: {},
            sequence: 0
        },

        objectives: {
            powerups: {
                nextSpawn: null,
                remaining: null,
                phase: "unknown",
                confidence: "estimated"
            },
            casinosReady: 0,
            casinosKnown: 0,
            midBoss: {
                phase: "unknown",
                remaining: null,
                confidence: "unknown"
            }
        },

        analysis: {
            context: null,
            recommendations: [],
            generatedAt: 0
        }
    };

    function resetMatch() {
        state.sessionId++;
        state.gameTime = 0;
        state.gameTimeKnown = false;
        state.map.camps = {};
        state.map.sequence = 0;
        state.objectives.powerups.nextSpawn = null;
        state.objectives.powerups.remaining = null;
        state.objectives.powerups.phase = "unknown";
        state.objectives.casinosReady = 0;
        state.objectives.casinosKnown = 0;
        state.objectives.midBoss.phase = "unknown";
        state.objectives.midBoss.remaining = null;
        state.analysis.context = null;
        state.analysis.recommendations = [];
        state.analysis.generatedAt = 0;
    }

    DI.State = {
        value: state,
        resetMatch: resetMatch
    };
})();
