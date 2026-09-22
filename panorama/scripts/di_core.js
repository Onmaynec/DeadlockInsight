(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};

    function isValidPanel(panel) {
        try {
            return !!(panel && panel.IsValid && panel.IsValid());
        } catch (e) {
            return false;
        }
    }

    function findRoot(panel) {
        var current = panel;
        var guard = 0;
        while (isValidPanel(current) && current.GetParent && current.GetParent() && guard < 64) {
            current = current.GetParent();
            guard++;
        }
        return current;
    }

    function clamp(value, min, max) {
        var n = Number(value);
        if (!isFinite(n)) return min;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    function formatSeconds(totalSeconds) {
        var s = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
        var m = Math.floor(s / 60);
        var ss = s % 60;
        return (m < 10 ? "0" + m : String(m)) + ":" + (ss < 10 ? "0" + ss : String(ss));
    }

    function parseClock(text) {
        if (!text) return null;

        var raw = String(text).trim();
        var negative = raw.charAt(0) === "-";
        if (negative) raw = raw.substring(1);

        var parts = raw.split(":");
        if (parts.length < 2 || parts.length > 3) return null;

        var h = 0;
        var m = 0;
        var s = 0;

        if (parts.length === 3) {
            h = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            s = parseInt(parts[2], 10);
        } else {
            m = parseInt(parts[0], 10);
            s = parseInt(parts[1], 10);
        }

        if (isNaN(h) || isNaN(m) || isNaN(s)) return null;

        var value = h * 3600 + m * 60 + s;
        return negative ? -value : value;
    }

    function getOrCreate(parent, type, id, className) {
        if (!isValidPanel(parent)) return null;

        var panel = null;
        try {
            panel = parent.FindChildTraverse ? parent.FindChildTraverse(id) : null;
        } catch (e) {}

        if (!isValidPanel(panel)) {
            try {
                panel = $.CreatePanel(type || "Panel", parent, id);
            } catch (e2) {
                return null;
            }
        }

        if (className && panel.AddClass) {
            try {
                panel.AddClass(className);
            } catch (e3) {}
        }

        return panel;
    }

    function setClass(panel, className, enabled) {
        if (!isValidPanel(panel) || !panel.SetHasClass) return;
        try {
            panel.SetHasClass(className, !!enabled);
        } catch (e) {}
    }

    function setText(panel, value) {
        if (!isValidPanel(panel)) return;
        var text = value == null ? "" : String(value);
        try {
            if (panel.text !== text) panel.text = text;
        } catch (e) {}
    }

    function safeClass(panel, className) {
        if (!isValidPanel(panel) || !panel.BHasClass) return false;
        try {
            return !!panel.BHasClass(className);
        } catch (e) {
            return false;
        }
    }

    DI.Core = {
        isValidPanel: isValidPanel,
        findRoot: findRoot,
        clamp: clamp,
        formatSeconds: formatSeconds,
        parseClock: parseClock,
        getOrCreate: getOrCreate,
        setClass: setClass,
        setText: setText,
        safeClass: safeClass
    };
})();
