(function () {
    "use strict";

    var DI = globalThis.DeadlockInsight = globalThis.DeadlockInsight || {};

    function number(value, fallback) {
        var n = Number(value);
        return isFinite(n) ? n : (fallback || 0);
    }

    function addReason(result, code, weight, text) {
        if (!weight) return;
        result.score += weight;
        result.reasons.push({
            code: code,
            weight: weight,
            text: text
        });
    }

    function scoreItem(item, context) {
        var result = {
            itemId: item.id,
            name: item.name || item.id,
            price: number(item.price),
            score: number(item.baseScore),
            reasons: []
        };

        var self = context && context.self ? context.self : {};
        var enemy = context && context.enemyProfile ? context.enemyProfile : {};
        var lane = context && context.lane ? context.lane : {};
        var team = context && context.teamProfile ? context.teamProfile : {};
        var economy = context && context.economy ? context.economy : {};

        var roleWeights = item.roleWeights || {};
        var roles = self.roles || [];
        for (var i = 0; i < roles.length; i++) {
            var roleWeight = number(roleWeights[roles[i]]);
            if (roleWeight) addReason(result, "role:" + roles[i], roleWeight, "Подходит текущей роли героя");
        }

        var counters = item.counterWeights || {};
        var threats = enemy.threatTags || [];
        for (var t = 0; t < threats.length; t++) {
            var counterWeight = number(counters[threats[t]]);
            if (counterWeight) addReason(result, "counter:" + threats[t], counterWeight, "Контрит заметную угрозу противника");
        }

        var laneWeights = item.laneWeights || {};
        var laneTags = lane.tags || [];
        for (var l = 0; l < laneTags.length; l++) {
            var laneWeight = number(laneWeights[laneTags[l]]);
            if (laneWeight) addReason(result, "lane:" + laneTags[l], laneWeight, "Полезно в текущем лайновом матчапе");
        }

        var synergy = item.teamSynergyWeights || {};
        var teamTags = team.tags || [];
        for (var s = 0; s < teamTags.length; s++) {
            var synergyWeight = number(synergy[teamTags[s]]);
            if (synergyWeight) addReason(result, "team:" + teamTags[s], synergyWeight, "Усиливает текущую командную синергию");
        }

        if (economy.souls != null && result.price > 0) {
            var missing = result.price - number(economy.souls);
            if (missing <= 0) {
                addReason(result, "economy:affordable", 8, "Можно купить прямо сейчас");
            } else if (missing <= number(economy.nearPurchaseWindow, 500)) {
                addReason(result, "economy:near", 3, "До покупки осталось немного душ");
            }
        }

        var ownedTags = self.ownedTags || [];
        var redundancy = item.redundancyTags || [];
        for (var r = 0; r < redundancy.length; r++) {
            if (ownedTags.indexOf(redundancy[r]) >= 0) {
                addReason(result, "redundancy:" + redundancy[r], -10, "Эффект частично дублируется текущим билдом");
            }
        }

        result.score = Math.round(result.score * 10) / 10;
        return result;
    }

    function rankItems(catalog, context, limit) {
        if (!catalog || !catalog.length) return [];

        var scored = [];
        for (var i = 0; i < catalog.length; i++) {
            if (!catalog[i] || !catalog[i].id) continue;
            scored.push(scoreItem(catalog[i], context || {}));
        }

        scored.sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return a.price - b.price;
        });

        return scored.slice(0, Math.max(1, limit || 4));
    }

    function tick() {
        var State = DI.State.value;
        var visible = DI.DataProvider.getVisibleMatchContext();
        var catalog = DI.DataProvider.getItemCatalog();

        State.analysis.context = visible;
        State.analysis.recommendations = rankItems(
            catalog,
            visible || {},
            DI.Config.UI.maxShopRecommendations
        );
        State.analysis.generatedAt = Date.now();
    }

    DI.RecommendationEngine = {
        scoreItem: scoreItem,
        rankItems: rankItems,
        tick: tick
    };
})();
