var Limpid = Limpid || {};
Limpid.FWJ = Limpid.FWJ || {};

(function() {
    const _Game_BattlerBase_paramPlus = Game_BattlerBase.prototype.paramPlus;
    Game_BattlerBase.prototype.paramPlus = function(paramId) {
        let value = _Game_BattlerBase_paramPlus.call(this, paramId);
        if ($gameParty.inBattle() && this.isActor()) {
            const formationId = $gameParty.getFormationId();
            const pos = $gameParty.battleMembers().indexOf(this);
            if (formationId > 0 && pos >= 0) {
                const bonus = Limpid.FWJ.FormationData[formationId][pos];
                if (bonus && bonus[paramId]) value += bonus[paramId];
            }
        }
        return value;
    };

    const _Game_Action_calcElementRate = Game_Action.prototype.calcElementRate;
    Game_Action.prototype.calcElementRate = function(target) {
        let rate = _Game_Action_calcElementRate.call(this, target);
        const subjectWuXing = this.subject().getProperty('wuxing');
        const targetWuXing = target.getProperty('wuxing');
        if (subjectWuXing && targetWuXing) {
            rate *= Limpid.FWJ.getWuXingMultiplier(subjectWuXing, targetWuXing);
        }
        return rate;
    };

    const _Game_Actor_traitObjects = Game_Actor.prototype.traitObjects;
    Game_Actor.prototype.traitObjects = function() {
        let objects = _Game_Actor_traitObjects.call(this);
        if (this._transformCardId) {
            const cardState = $dataStates[this._transformCardId];
            if (cardState) objects.push(cardState);
        }
        return objects;
    };

    Object.defineProperties(Game_BattlerBase.prototype, {
        sp: { get: function() { return this._tp; }, configurable: true },
        mzp: { get: function() { return 150; }, configurable: true }
    });

    Game_BattlerBase.prototype.setSp = function(sp) {
        this._tp = sp.clamp(0, this.mzp);
        this.refresh();
    };

    const _Game_BattlerBase_canPaySkillCost = Game_BattlerBase.prototype.canPaySkillCost;
    Game_BattlerBase.prototype.canPaySkillCost = function(skill) {
        if (skill.meta.isTeji) {
            return this.sp >= this.skillTpCost(skill);
        }
        return _Game_BattlerBase_canPaySkillCost.call(this, skill);
    };

    Limpid.FWJ.getWuXingMultiplier = function(s, t) {
        const table = {
            'Gold': {'Wood': 1.2, 'Fire': 0.8},
            'Wood': {'Earth': 1.2, 'Gold': 0.8},
            'Earth': {'Water': 1.2, 'Wood': 0.8},
            'Water': {'Fire': 1.2, 'Earth': 0.8},
            'Fire': {'Gold': 1.2, 'Water': 0.8}
        };
        return (table[s] && table[s][t]) ? table[s][t] : 1.0;
    };

    Limpid.FWJ.FormationData = {
        1: [ {2: 10, 6: 20}, {2: 5}, {2: 5}, {3: 15}, {3: 15} ]
    };

})();