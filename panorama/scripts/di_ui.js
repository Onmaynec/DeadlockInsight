(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var Core = DI.Core;
    var State = DI.State.value;

    var UI = {
        root: null,
        objectiveBar: null,
        powerupValue: null,
        casinoValue: null,
        bossValue: null,
        minimapLayer: null,
        shopPanel: null,
        shopList: null,
        campPanels: {}
    };

    function makeObjectiveCell(parent, id, title) {
        var cell = Core.getOrCreate(parent, "Panel", id, "InsightObjectiveCell");
        var titlePanel = Core.getOrCreate(cell, "Label", id + "_title", "InsightObjectiveTitle");
        var valuePanel = Core.getOrCreate(cell, "Label", id + "_value", "InsightObjectiveValue");
        Core.setText(titlePanel, title);
        return valuePanel;
    }

    function ensureRoot() {
        var root = DI.DataProvider.refreshPanels();
        if (!Core.isValidPanel(root)) return false;

        var hud = null;
        try {
            hud = root.FindChildTraverse("Hud") || root;
        } catch (e) {
            hud = root;
        }

        State.ui.root = root;
        State.ui.hud = hud;

        if (!Core.isValidPanel(UI.root)) {
            UI.root = Core.getOrCreate(hud, "Panel", "DeadlockInsightRoot", null);
            if (!Core.isValidPanel(UI.root)) return false;
            UI.root.style.width = "100%";
            UI.root.style.height = "100%";
            UI.root.hittest = false;
            UI.root.hittestchildren = false;
        }

        return true;
    }

    function ensureObjectiveBar() {
        if (!DI.Config.UI.showObjectiveBar || !Core.isValidPanel(UI.root)) return;

        if (!Core.isValidPanel(UI.objectiveBar)) {
            UI.objectiveBar = Core.getOrCreate(UI.root, "Panel", "InsightObjectiveBar", "InsightObjectiveBar");
            UI.powerupValue = makeObjectiveCell(UI.objectiveBar, "InsightPowerups", "POWERUPS");
            UI.casinoValue = makeObjectiveCell(UI.objectiveBar, "InsightCasinos", "CASINOS");
            UI.bossValue = makeObjectiveCell(UI.objectiveBar, "InsightMidBoss", "MID BOSS");
        }
    }

    function ensureMinimapLayer() {
        if (!DI.Config.UI.showMinimapCampState) return null;

        var root = DI.DataProvider.refreshPanels();
        if (!Core.isValidPanel(root)) return null;

        var minimapBox = null;
        try {
            minimapBox = root.FindChildTraverse("minimap_container");
        } catch (e) {}

        if (!Core.isValidPanel(minimapBox)) return null;
        State.ui.minimapBox = minimapBox;

        if (!Core.isValidPanel(UI.minimapLayer) || UI.minimapLayer.GetParent() !== minimapBox) {
            UI.minimapLayer = Core.getOrCreate(minimapBox, "Panel", "InsightMinimapLayer", null);
            if (Core.isValidPanel(UI.minimapLayer)) {
                UI.minimapLayer.hittest = false;
                UI.minimapLayer.hittestchildren = false;
                UI.minimapLayer.style.zIndex = "1900";
            }
        }

        return UI.minimapLayer;
    }

    function ensureShopPanel() {
        if (!DI.Config.UI.showShopPanel || !Core.isValidPanel(UI.root)) return;

        if (!Core.isValidPanel(UI.shopPanel)) {
            UI.shopPanel = Core.getOrCreate(UI.root, "Panel", "InsightShopPanel", "InsightShopPanel");
            var header = Core.getOrCreate(UI.shopPanel, "Label", "InsightShopHeader", "InsightShopHeader");
            var sub = Core.getOrCreate(UI.shopPanel, "Label", "InsightShopSubheader", "InsightShopSubheader");
            UI.shopList = Core.getOrCreate(UI.shopPanel, "Panel", "InsightShopList", null);

            Core.setText(header, "DEADLOCK INSIGHT");
            Core.setText(sub, "умные рекомендации магазина");
            UI.shopList.style.width = "100%";
            UI.shopList.style.flowChildren = "down";
        }

        State.ui.shopOpen = DI.DataProvider.isShopOpen();
        Core.setClass(UI.shopPanel, "is-open", State.ui.shopOpen);
    }

    function renderObjectives() {
        ensureObjectiveBar();
        if (!Core.isValidPanel(UI.objectiveBar)) return;

        var p = State.objectives.powerups;
        if (p.phase === "spawn-window") {
            Core.setText(UI.powerupValue, "SPAWN");
            Core.setClass(UI.powerupValue, "is-ready", true);
        } else if (p.remaining != null) {
            Core.setText(UI.powerupValue, Core.formatSeconds(p.remaining));
            Core.setClass(UI.powerupValue, "is-ready", false);
        } else {
            Core.setText(UI.powerupValue, "—");
            Core.setClass(UI.powerupValue, "is-unknown", true);
        }

        var known = State.objectives.casinosKnown;
        var ready = State.objectives.casinosReady;
        Core.setText(UI.casinoValue, known > 0 ? (ready + " READY") : "—");
        Core.setClass(UI.casinoValue, "is-ready", ready > 0);
        Core.setClass(UI.casinoValue, "is-unknown", known <= 0);

        Core.setText(UI.bossValue, "—");
        Core.setClass(UI.bossValue, "is-unknown", true);
    }

    function ensureCampPanel(layer, camp) {
        var panel = UI.campPanels[camp.id];

        if (!Core.isValidPanel(panel)) {
            var safeId = camp.id.replace(/[^a-zA-Z0-9_]/g, "_");
            panel = $.CreatePanel("Panel", layer, "InsightCamp_" + safeId);
            panel.AddClass("InsightCampMarker");
            panel.hittest = false;
            panel.hittestchildren = false;

            var timer = $.CreatePanel("Label", panel, "InsightCampTimer");
            timer.AddClass("InsightCampTimer");

            UI.campPanels[camp.id] = panel;
        }

        return panel;
    }

    function renderCamps() {
        var layer = ensureMinimapLayer();
        if (!Core.isValidPanel(layer)) return;

        var camps = DI.CampTracker.getSnapshot();
        var alive = {};

        for (var i = 0; i < camps.length; i++) {
            var camp = camps[i];
            var panel = ensureCampPanel(layer, camp);
            if (!Core.isValidPanel(panel)) continue;

            alive[camp.id] = true;
            panel.style.position = camp.xPct.toFixed(2) + "% " + camp.yPct.toFixed(2) + "% 0px";

            Core.setClass(panel, "neutral_weak", camp.type === "neutral_weak");
            Core.setClass(panel, "neutral_medium", camp.type === "neutral_medium");
            Core.setClass(panel, "neutral_large", camp.type === "neutral_large");
            Core.setClass(panel, "neutral_vault", camp.type === "neutral_vault");
            Core.setClass(panel, "is-ready", camp.active && camp.confidence !== DI.Config.CONFIDENCE.UNKNOWN);
            Core.setClass(panel, "is-cooldown", !camp.active && camp.remaining != null);
            Core.setClass(panel, "is-unknown", camp.confidence === DI.Config.CONFIDENCE.UNKNOWN);

            var timer = null;
            try {
                timer = panel.FindChildTraverse("InsightCampTimer");
            } catch (e) {}

            if (Core.isValidPanel(timer)) {
                var showCountdown = camp.remaining != null &&
                    camp.remaining <= DI.Config.UI.showCampCountdownUnderSeconds;
                Core.setText(timer, showCountdown ? Core.formatSeconds(camp.remaining) : "");
            }
        }

        var keys = Object.keys(UI.campPanels);
        for (var k = 0; k < keys.length; k++) {
            if (alive[keys[k]]) continue;

            var stale = UI.campPanels[keys[k]];
            if (Core.isValidPanel(stale)) {
                try { stale.DeleteAsync(0); } catch (e2) {}
            }
            delete UI.campPanels[keys[k]];
        }
    }

    function clearChildren(panel) {
        if (!Core.isValidPanel(panel)) return;
        try {
            panel.RemoveAndDeleteChildren();
        } catch (e) {}
    }

    function renderShop() {
        ensureShopPanel();
        if (!Core.isValidPanel(UI.shopPanel) || !Core.isValidPanel(UI.shopList)) return;
        if (!State.ui.shopOpen) return;

        clearChildren(UI.shopList);

        var list = State.analysis.recommendations || [];
        if (!list.length) {
            var empty = $.CreatePanel("Label", UI.shopList, "");
            empty.AddClass("InsightEmpty");
            empty.text = "Собираем данные матча. Рекомендации появятся только из подтверждённых источников HUD.";
            return;
        }

        for (var i = 0; i < list.length; i++) {
            var rec = list[i];
            var card = $.CreatePanel("Panel", UI.shopList, "");
            card.AddClass("InsightRecommendationCard");

            var title = $.CreatePanel("Label", card, "");
            title.AddClass("InsightRecommendationTitle");
            title.text = rec.name + "  ·  " + Math.round(rec.score);

            var reason = $.CreatePanel("Label", card, "");
            reason.AddClass("InsightRecommendationReason");
            reason.text = rec.reasons && rec.reasons.length ? rec.reasons[0].text : "Подходит текущему состоянию матча";
        }
    }

    function render() {
        if (!ensureRoot()) return;
        renderObjectives();
        renderCamps();
        renderShop();
    }

    DI.UI = {
        render: render
    };
})();
