(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var State = DI.State.value;

    var scheduled = null;
    var lastGameTime = null;

    function updateClock() {
        var gameTime = DI.DataProvider.getGameTime();

        if (gameTime == null) {
            State.gameTimeKnown = false;
            return;
        }

        // Новый матч / возврат таймера назад.
        if (lastGameTime != null && gameTime + 10 < lastGameTime) {
            DI.State.resetMatch();
        }

        State.gameTime = gameTime;
        State.gameTimeKnown = true;
        lastGameTime = gameTime;
    }

    function tick() {
        try {
            updateClock();
            DI.CampTracker.tick(Date.now());
            DI.ObjectiveTracker.tick();
            DI.RecommendationEngine.tick();
            DI.UI.render();
        } catch (e) {
            try { $.Warning("[DeadlockInsight] tick error: " + e); } catch (ignored) {}
        }

        var interval = State.ui.shopOpen
            ? DI.Config.POLL_RATE_ACTIVE
            : DI.Config.POLL_RATE_IDLE;

        scheduled = $.Schedule(interval, tick);
    }

    function boot() {
        try {
            $.Msg("[DeadlockInsight] " + DI.VERSION + " boot");
        } catch (e) {}

        if (scheduled) {
            try { $.CancelScheduled(scheduled); } catch (e2) {}
        }

        scheduled = $.Schedule(0.25, tick);
    }

    boot();
})();
