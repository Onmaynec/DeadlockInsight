(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};
    var Core = DI.Core;
    var State = DI.State.value;

    var lastScan = 0;
    var minimapCache = null;

    function getNeutralType(panel) {
        if (!Core.isValidPanel(panel)) return null;
        if (Core.safeClass(panel, "neutral_weak")) return "neutral_weak";
        if (Core.safeClass(panel, "neutral_medium")) return "neutral_medium";
        if (Core.safeClass(panel, "neutral_large")) return "neutral_large";
        if (Core.safeClass(panel, "neutral_vault")) return "neutral_vault";
        return null;
    }

    function getMinimap(root) {
        if (Core.isValidPanel(minimapCache)) return minimapCache;
        if (!Core.isValidPanel(root)) return null;

        try {
            minimapCache = root.FindChildTraverse("hud_minimap");
        } catch (e) {
            minimapCache = null;
        }

        return minimapCache;
    }

    function keyFor(type, x, y, panel) {
        if (Core.isValidPanel(panel) && panel.id) {
            return type + "::" + panel.id;
        }

        var rx = Math.round((Number(x) || 0) / 4) * 4;
        var ry = Math.round((Number(y) || 0) / 4) * 4;
        return type + "::" + rx + "::" + ry;
    }

    function scan(nowMs) {
        var now = nowMs || Date.now();
        if (now - lastScan < DI.Config.CAMP_SCAN_MS) return;
        lastScan = now;

        var root = DI.DataProvider.refreshPanels();
        var minimap = getMinimap(root);
        if (!Core.isValidPanel(minimap)) return;

        var buttons = null;
        try {
            buttons = minimap.FindChildrenWithClassTraverse("map_button");
        } catch (e) {
            return;
        }

        if (!buttons || !buttons.length) return;

        var width = Number(minimap.actuallayoutwidth || minimap.contentwidth || 0);
        var height = Number(minimap.actuallayoutheight || minimap.contentheight || 0);
        if (!isFinite(width) || width <= 0 || !isFinite(height) || height <= 0) return;

        var seen = {};

        for (var i = 0; i < buttons.length; i++) {
            var panel = buttons[i];
            if (!Core.isValidPanel(panel)) continue;

            var type = getNeutralType(panel);
            if (!type) continue;

            var x = Number(panel.actualxoffset || 0);
            var y = Number(panel.actualyoffset || 0);
            if (!isFinite(x) || !isFinite(y)) continue;

            var key = keyFor(type, x, y, panel);
            var camp = State.map.camps[key];
            var active = Core.safeClass(panel, "active");
            var respawnSeconds = DI.Config.NEUTRAL_RESPAWN_SECONDS[type] || 0;

            if (!camp) {
                camp = {
                    id: key,
                    type: type,
                    active: active,
                    previousActive: active,
                    seenActiveOnce: active,
                    respawnAt: null,
                    confidence: active ? DI.Config.CONFIDENCE.CONFIRMED : DI.Config.CONFIDENCE.UNKNOWN,
                    xPct: Core.clamp((x / width) * 100, 0, 100),
                    yPct: Core.clamp((y / height) * 100, 0, 100),
                    panel: panel,
                    lastSeenAt: now
                };
                State.map.camps[key] = camp;
            } else {
                camp.previousActive = camp.active;
                camp.active = active;
                camp.panel = panel;
                camp.xPct = Core.clamp((x / width) * 100, 0, 100);
                camp.yPct = Core.clamp((y / height) * 100, 0, 100);
                camp.lastSeenAt = now;

                if (active) {
                    camp.seenActiveOnce = true;
                    camp.respawnAt = null;
                    camp.confidence = DI.Config.CONFIDENCE.CONFIRMED;
                } else if (
                    camp.previousActive === true &&
                    camp.seenActiveOnce &&
                    respawnSeconds > 0 &&
                    State.gameTimeKnown
                ) {
                    // Таймер создаётся только после явного перехода native UI active -> inactive.
                    // Исчезновение panel само по себе не считается убийством кемпа.
                    camp.respawnAt = State.gameTime + respawnSeconds;
                    camp.confidence = DI.Config.CONFIDENCE.CONFIRMED;
                }
            }

            if (camp.respawnAt != null && State.gameTimeKnown && State.gameTime >= camp.respawnAt) {
                camp.respawnAt = null;
                camp.active = true;
                camp.confidence = DI.Config.CONFIDENCE.ESTIMATED;
            }

            seen[key] = true;
        }

        // Не делаем выводов из пропавших minimap panels.
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
                active: !!camp.active,
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
