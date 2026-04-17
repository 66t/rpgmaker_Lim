/*:
 * @target MZ
 * @plugindesc [V1.0] 교병필패(驕兵必敗) 및 애병필승(哀兵必勝) 시스템
 * @author Limpid
 * * @help
 * 이 플러그인은 심리 상태에 기반한 동적 전투 시스템을 구현합니다:
 * * 1. 교병 수치 (Pride): 
 * 가하는 피해량이 증가하지만, 방어력과 회피율이 크게 감소하여 '자만'으로 인한 허점을 표현합니다.
 * * 2. 애병 수치 (Sorrow): 
 * 아군이 쓰러지거나 큰 피해를 입었을 때 축적되며, 역전의 발판이 되는 강력한 버프를 제공합니다.
 * * 데미지 공식 영향:
 * 최종 데미지 = 기본 데미지 * (1 + 애병 보너스) * (1 + 교병 보정)
 * * @param PrideDamageRate
 * @text 교병 데미지 증가량
 * @desc 교병 수치 1점당 증가하는 데미지 출력 비율 (0.01 = 1%).
 * @default 0.01
 * * @param PrideVulnerability
 * @text 교병 취약성 페널티
 * @desc 교병 수치 1점당 증가하는 피격 데미지 비율 (0.02 = 2%).
 * @default 0.02
 * * @param SorrowBoost
 * @text 애병 폭발 증익
 * @desc 애병 수치 1점당 증가하는 데미지 출력 비율 (0.03 = 3%).
 * @default 0.03
 */

(() => {
    const pluginName = "Lim_PrideAndSorrow";
    const params = PluginManager.parameters(pluginName);
    const PRIDE_DMG = Number(params['PrideDamageRate'] || 0.01);
    const PRIDE_VUL = Number(params['PrideVulnerability'] || 0.02);
    const SORROW_BST = Number(params['SorrowBoost'] || 0.03);

    // 1. 데이터 초기화
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._prideValue = 0;   // 0-100
        this._sorrowValue = 0;  // 0-100
    };

    // 속성 정의
    Object.defineProperties(Game_BattlerBase.prototype, {
        pride: { get: function() { return Math.min(Math.max(this._prideValue, 0), 100); }, configurable: true },
        sorrow: { get: function() { return Math.min(Math.max(this._sorrowValue, 0), 100); }, configurable: true }
    });

    // 2. 수치 증감 로직
    // 피해를 입을 때 애병 수치 증가, 적을 처치하거나 치명타 시 교병 수치 증가
    const _Game_Battler_onDamage = Game_Battler.prototype.onDamage;
    Game_Battler.prototype.onDamage = function(value) {
        _Game_Battler_onDamage.call(this, value);
        // 큰 피해를 입으면 애병 증가 (최대 HP의 20% 초과 시)
        if (value > this.mhp * 0.2) {
            this._sorrowValue += 15;
            this._prideValue -= 10; // 충격으로 인해 자만심 하락
        }
    };

    const _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        _Game_Action_apply.call(this, target);
        const result = target.result();
        if (result.isHit() && result.hpDamage > 0) {
            // 적 처치 시 교병 수치 대폭 증가
            if (target.hp <= 0) {
                this.subject()._prideValue += 20;
            }
            // 치명타 발생 시 교병 수치 증가
            if (result.critical) {
                this.subject()._prideValue += 10;
            }
        }
    };

    // 3. 핵심: 데미지 공식 수정
    const _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function(target, critical) {
        let value = _Game_Action_makeDamageValue.call(this, target, critical);

        const subject = this.subject();

        // 공격자의 보너스 (교병/애병)
        const atkPrideMod = 1 + (subject.pride * PRIDE_DMG);
        const atkSorrowMod = 1 + (subject.sorrow * SORROW_BST);

        // 방어자의 페널티 (교병필패: 자만한 상태에서는 더 큰 피해를 입음)
        const trgPrideMod = 1 + (target.pride * PRIDE_VUL);

        value = value * atkPrideMod * atkSorrowMod * trgPrideMod;

        return Math.round(value);
    };

    // 4. 전투 시작/종료 처리
    const _BattleManager_setup = BattleManager.setup;
    BattleManager.setup = function(troopId, canEscape, canLose) {
        _BattleManager_setup.call(this, troopId, canEscape, canLose);
        // 매 전투 시작 시, 이전 전투의 교병 수치 20% 유지 (연승감), 애병 수치는 초기화
        $gameParty.members().forEach(actor => {
            actor._prideValue *= 0.2;
            actor._sorrowValue = 0;
        });
    };

})();