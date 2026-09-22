(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var Core = DI.Core;

    var cache = {
        root: null,
        gameTimePanel: null,
        refreshedAt: 0
    };

    function refreshPanels() {
        var now = Date.now();

        if (
            now - cache.refreshedAt < DI.Config.PANEL_REFRESH_MS &&
            Core.isValidPanel(cache.root)
        ) {
            return cache.root;
        }

        var root = Core.findRoot($.GetContextPanel());
        if (!Core.isValidPanel(root)) return null;

        cache.root = root;
        cache.gameTimePanel = null;
        cache.refreshedAt = now;

        return root;
    }

    function getGameTime() {
        var root = refreshPanels();
        if (!Core.isValidPanel(root)) return null;

        if (!Core.isValidPanel(cache.gameTimePanel)) {
            try {
                cache.gameTimePanel = root.FindChildTraverse("GameTime");
            } catch (e) {
                cache.gameTimePanel = null;
            }
        }

        if (!Core.isValidPanel(cache.gameTimePanel)) return null;

        try {
            return Core.parseClock(cache.gameTimePanel.text);
        } catch (e2) {
            return null;
        }
    }

    function isShopOpen() {
        var root = refreshPanels();
        if (!Core.isValidPanel(root)) return false;

        if (Core.safeClass(root, "gShopOpen")) return true;

        try {
            var hud = root.FindChildTraverse("Hud");
            if (Core.safeClass(hud, "gShopOpen")) return true;
        } catch (e) {}

        return false;
    }

    function getVisibleMatchContext() {
        // Пустой интерфейс намеренно. Здесь будут добавляться только источники,
        // которые уже раскрыты штатному HUD: свои характеристики, видимые предметы
        // противника, командная экономика, lane context и т. п.
        return {
            self: null,
            allies: [],
            enemies: [],
            visibleEnemyItems: [],
            source: "native-ui",
            confidence: DI.Config.CONFIDENCE.UNKNOWN
        };
    }

    function getItemCatalog() {
        // Каталог будет подключён после фиксации актуального формата item data.
        // Не держим временные/выдуманные значения в runtime.
        return [];
    }

    DI.DataProvider = {
        refreshPanels: refreshPanels,
        getGameTime: getGameTime,
        isShopOpen: isShopOpen,
        getVisibleMatchContext: getVisibleMatchContext,
        getItemCatalog: getItemCatalog
    };
})();
