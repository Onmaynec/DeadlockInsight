(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var Core = DI.Core;
    var State = DI.State.value;

    var lastScan = 0;
    var minimapCache = null;
    var minimapContainerCache = null;
    var minimapBoxCache = null;

    function getNeutralType(panel) {
        if (!Core.isValidPanel(panel)) return null;
        if (Core.safeClass(panel, "neutral_weak")) return "neutral_weak";
        if (Core.safeClass(panel, "neutral_medium")) return "neutral_medium";
        if (Core.safeClass(panel, "neutral_large")) return "neutral_large";
        if (Core.safeClass(panel, "neutral_vault")) return "neutral_vault";
        return null;
    }

    function refreshMinimapRefs(root) {
        if (!Core.isValidPanel(root)) return false;

        try {
            if (!Core.isValidPanel(minimapCache)) {
                minimapCache = root.FindChildTraverse("hud_minimap");
            }
            if (!Core.isValidPanel(minimapContainerCache)) {
                minimapContainerCache = root.FindChildTraverse("HudMinimapContainer");
            }
            if (!Core.isValidPanel(minimapBoxCache)) {
                minimapBoxCache = root.FindChildTraverse("minimap_container");
            }
        } catch (e) {
            return false;
        }

        return Core.isValidPanel(minimapCache) &&
            Core.isValidPanel(minimapContainerCache) &&
            Core.isValidPanel(minimapBoxCache);
    }

    function keyFor(type, x, y, panel) {
        if (Core.isValidPanel(panel) && panel.id) {
            return type + "::" + panel.id;
        }

        var rx = Math.round((Number(x) || 0) / 4) * 4;
        var ry = Math.round((Number(y) || 0) / 4) * 4;
        return type + "::" + rx + "::" + ry;
    }

    function positionInOverlay(panel) {
        var boxW = Number(minimapBoxCache.actuallayoutwidth || minimapBoxCache.contentwidth || 0);
        var boxH = Number(minimapBoxCache.actuallayoutheight || minimapBoxCache.contentheight || 0);

        if (!isFinite(boxW) || boxW <= 0 || !isFinite(boxH) || boxH <= 0) {
            return null;
        }

        var localX = Number(panel.actualxoffset || 0);
        var localY = Number(panel.actualyoffset || 0);
        var minimapOffsetX = Number(minimapCache.actualxoffset || 0);
        var minimapOffsetY = Number(minimapCache.actualyoffset || 0);
        var containerOffsetX = Number(minimapContainerCache.actualxoffset || 0);
        var containerOffsetY = Number(minimapContainerCache.actualyoffset || 0);

        if (
            !isFinite(localX) || !isFinite(localY) ||
            !isFinite(minimapOffsetX) || !isFinite(minimapOffsetY) ||
            !isFinite(containerOffsetX) || !isFinite(containerOffsetY)
        ) {
            return null;
        }

        return {
            rawX: localX,
            rawY: localY,
            xPct: Core.clamp(((localX + minimapOffsetX + containerOffsetX) / boxW) * 100, 0, 100),
            yPct: Core.clamp(((localY + minimapOffsetY + containerOffsetY) / boxH) * 100, 0, 100)
        };
    }

    function scan(nowMs) {
        var now = nowMs || Date.now();
        if (now - lastScan < DI.Config.CAMP_SCAN_MS) return;
        lastScan = now;

        var root = DI.DataProvider.refreshPanels();
        if (!refreshMinimapRefs(root)) return;

        var buttons = null;
        try {
            buttons = minimapCache.FindChildrenWithClassTraverse("map_button");
        } catch (e) {
            return;
        }

        if (!buttons || !buttons.length) return;

        var seen = {};

        for (var i = 0; i < buttons.length; i++) {
            var panel = buttons[i];
            if (!Core.isValidPanel(panel)) continue;

            var type = getNeutralType(panel);
            if (!type) continue;

            var pos = positionInOverlay(panel);
            if (!pos) continue;

            var key = keyFor(type, pos.rawX, pos.rawY, panel);
            var camp = State.map.camps[key];
            var nativeActive = Core.safeClass(panel, "active");
            var respawnSeconds = DI.Config.NEUTRAL_RESPAWN_SECONDS[type] || 0;

            if (!camp) {
                camp = {
                    id: key,
                    type: type,
                    nativeActive: nativeActive,
                    previousNativeActive: nativeActive,
                    seenActiveOnce: nativeActive,
                    estimatedReady: false,
                    respawnAt: null,
                    confidence: nativeActive
                        ? DI.Config.CONFIDENCE.CONFIRMED
                        : DI.Config.CONFIDENCE.UNKNOWN,
                    xPct: pos.xPct,
                    yPct: pos.yPct,
                    panel: panel,
                    lastSeenAt: now
                };
                State.map.camps[key] = camp;
            } else {
                var previousNativeActive = camp.nativeActive;

                camp.previousNativeActive = previousNativeActive;
                camp.nativeActive = nativeActive;
                camp.panel = panel;
                camp.xPct = pos.xPct;
                camp.yPct = pos.yPct;
                camp.lastSeenAt = now;

                if (nativeActive) {
                    camp.seenActiveOnce = true;
                    camp.estimatedReady = false;
                    camp.respawnAt = null;
                    camp.confidence = DI.Config.CONFIDENCE.CONFIRMED;
                } else if (
                    previousNativeActive === true &&
                    camp.seenActiveOnce &&
                    respawnSeconds > 0 &&
                    State.gameTimeKnown
                ) {
                    // Таймер создаётся только после явного native UI перехода active -> inactive.
                    // Пропавший panel или отсутствие данных не считаются убийством кемпа.
                    camp.respawnAt = State.gameTime + respawnSeconds;
                    camp.estimatedReady = false;
                    camp.confidence = DI.Config.CONFIDENCE.CONFIRMED;
                }
            }

            if (camp.respawnAt != null && State.gameTimeKnown && State.gameTime >= camp.respawnAt) {
                camp.respawnAt = null;
                camp.estimatedReady = true;
                camp.confidence = DI.Config.CONFIDENCE.ESTIMATED;
            }

            seen[key] = true;
        }

        // Пропавшие minimap panels не меняют игровое состояние.
        var keys = Object.keys(State.map.camps);
        for (var k = 0; k < keys.length; k++) {
            var existing = State.map.camps[keys[k]];
            if (!seen[keys[k]] && now - existing.lastSeenAt > 15000) {
                existing.panel = null;
            }
        }
    }

    function getSnapshot() {
        var list = [];
        var keys = Object.keys(State.map.camps);

        for (var i = 0; i < keys.length; i++) {
            var camp = State.map.camps[keys[i]];
            var remaining = null;

            if (camp.respawnAt != null && State.gameTimeKnown) {
                remaining = Math.max(0, camp.respawnAt - State.gameTime);
            }

            list.push({
                id: camp.id,
                type: camp.type,
                active: !!camp.nativeActive || !!camp.estimatedReady,
                nativeActive: !!camp.nativeActive,
                estimatedReady: !!camp.estimatedReady,
                remaining: remaining,
                confidence: camp.confidence,
                xPct: camp.xPct,
                yPct: camp.yPct
            });
        }

        return list;
    }

    DI.CampTracker = {
        tick: scan,
        getSnapshot: getSnapshot
    };
})();
