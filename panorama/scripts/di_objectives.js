(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var State = DI.State.value;

    function updatePowerups(gameTime) {
        var cfg = DI.Config.POWERUPS;
        var target;
        var phase = "countdown";

        if (gameTime < cfg.firstSpawn) {
            target = cfg.firstSpawn;
        } else {
            var sinceFirst = gameTime - cfg.firstSpawn;
            var cycle = Math.floor(sinceFirst / cfg.interval);
            var currentSpawn = cfg.firstSpawn + cycle * cfg.interval;
            var sinceSpawn = gameTime - currentSpawn;

            if (sinceSpawn >= 0 && sinceSpawn <= cfg.spawnWindow) {
                target = currentSpawn;
                phase = "spawn-window";
            } else {
                target = currentSpawn + cfg.interval;
            }
        }

        State.objectives.powerups.nextSpawn = target;
        State.objectives.powerups.remaining = Math.max(0, target - gameTime);
        State.objectives.powerups.phase = phase;
        State.objectives.powerups.confidence = DI.Config.CONFIDENCE.ESTIMATED;
    }

    function updateCasinos() {
        var camps = DI.CampTracker.getSnapshot();
        var ready = 0;
        var known = 0;

        for (var i = 0; i < camps.length; i++) {
            if (camps[i].type !== "neutral_vault") continue;
            if (camps[i].confidence !== DI.Config.CONFIDENCE.UNKNOWN) known++;
            if (camps[i].active) ready++;
        }

        State.objectives.casinosReady = ready;
        State.objectives.casinosKnown = known;
    }

    function tick() {
        if (!State.gameTimeKnown) return;
        updatePowerups(State.gameTime);
        updateCasinos();

        // Mid Boss пока намеренно остаётся unknown.
        // В следующем этапе подключим только штатный UI/event source после проверки.
    }

    DI.ObjectiveTracker = {
        tick: tick
    };
})();
