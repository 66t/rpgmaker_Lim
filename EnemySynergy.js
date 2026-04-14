/*:
 * @target MZ
 * @plugindesc 적 그룹 시너지 시스템 (Enemy Synergy System)
 * @author Gemini
 *
 * @help EnemySynergy.js
 *
 * 이 플러그인은 전투 시 적들에게 "오토체스"와 유사한 
 * 시너지(종족/직업) 시스템을 추가해주는 플러그인입니다.
 *
 * ============================================================================
 * 노트 태그 (Notetags)
 * ============================================================================
 * 데이터베이스의 [적 캐릭터] 메모란에 아래와 같이 태그를 입력하세요.
 * (쉼표를 사용하여 여러 개의 시너지를 부여할 수 있습니다)
 *
 * <시너지: 불,악마>
 * 또는
 * <Synergy: Fire,Demon>
 *
 * ============================================================================
 * 💻 스크립트 호출 (Script Calls)
 * ============================================================================
 * 이벤트, 스킬의 데미지 공식, 조건 분기 등에서 시너지 정보를 가져와
 * 다양한 기믹을 만들고 싶을 때 아래의 스크립트를 사용하세요.
 *
 * 1. 현재 적 그룹 중 특정 시너지를 가진 적의 '수'를 가져오기:
 * $gameTroop.getSynergyCount("불")
 *
 * 2. 현재 적 그룹 중 특정 시너지를 가진 적 '객체(배열)' 가져오기:
 * $gameTroop.getEnemiesBySynergy("불")
 * * * 응용 예시: 필드에 있는 모든 "악마"들의 평균 공격력 구하기
 * let demons = $gameTroop.getEnemiesBySynergy("악마");
 * let totalAtk = demons.reduce((sum, enemy) => sum + enemy.atk, 0);
 * let avgAtk = demons.length > 0 ? totalAtk / demons.length : 0;
 *
 * ============================================================================
 * 플러그인 매개변수 설명
 * ============================================================================
 * 1. 시너지 설정 목록 (Synergies): 시너지 규칙을 설정하는 곳입니다.
 * 각 규칙은 '시너지 이름', '단계별 필요 수량 및 부여할 상태(State) ID', 
 * 그리고 '적용 범위(전체 적군 적용 혹은 해당 시너지 보유자만 적용)'를 포함합니다.
 * ※ 조건을 만족하는 가장 높은 단계의 상태이상만 자동으로 부여됩니다.
 * * 2. 전투 시작 공통 이벤트: 전투가 시작될 때 지정된 공통 이벤트를 자동으로
 * 실행합니다. 연출을 넣거나 추가 변수 계산을 할 때 유용합니다.
 *
 * @param synergies
 * @text 시너지 설정 목록
 * @type struct<Synergy>[]
 * @desc 게임에 적용할 모든 시너지 규칙을 설정합니다.
 * @default []
 *
 * @param startCommonEvent
 * @text 전투 시작 공통 이벤트
 * @type common_event
 * @desc 전투 시작 시 자동으로 실행될 공통 이벤트입니다. 사용하지 않으려면 0으로 설정하세요.
 * @default 0
 */

/*~struct~Synergy:
 * @param tag
 * @text 시너지 태그 이름
 * @type string
 * @desc 적 캐릭터 메모에 적힌 단어와 일치해야 합니다. (예: 불)
 * @default 
 *
 * @param tiers
 * @text 시너지 단계 설정
 * @type struct<Tier>[]
 * @desc 수량과 그에 따른 상태이상 설정 (예: 2명일 때 A상태, 4명일 때 B상태)
 * @default []
 * * @param applyToAll
 * @text 적용 범위
 * @type boolean
 * @on 생존한 적 전체에게
 * @off 해당 시너지를 가진 적에게만
 * @desc 조건 달성 시 버프(상태이상)를 모든 적에게 줄지, 해당 시너지 보유자에게만 줄지 결정합니다.
 * @default false
 */

/*~struct~Tier:
 * @param count
 * @text 필요 수량
 * @type number
 * @min 1
 * @desc 이 단계를 활성화하기 위해 필요한 동일 시너지 보유 적의 수
 * @default 2
 *
 * @param stateId
 * @text 부여할 상태(State) ID
 * @type state
 * @desc 조건을 만족했을 때 부여될 상태이상의 ID
 * @default 1
 */

(() => {
    'use strict';

    // ------------------------------------------------------------------------
    // 플러그인 매개변수 파싱
    // ------------------------------------------------------------------------
    const pluginName = "EnemySynergy";
    const parameters = PluginManager.parameters(pluginName);
    const startCommonEventId = Number(parameters['startCommonEvent'] || 0);

    let synergyRules = [];
    try {
        const parsedList = JSON.parse(parameters['synergies'] || '[]');
        for (const item of parsedList) {
            const syn = JSON.parse(item);
            const tiers = JSON.parse(syn.tiers || '[]').map(t => {
                const tier = JSON.parse(t);
                return { count: Number(tier.count), stateId: Number(tier.stateId) };
            });
            // 필요 수량이 높은 고단계 시너지가 먼저 매칭되도록 내림차순 정렬
            tiers.sort((a, b) => b.count - a.count);

            synergyRules.push({
                tag: syn.tag.trim(),
                tiers: tiers,
                applyToAll: syn.applyToAll === 'true'
            });
        }
    } catch (e) {
        console.error(`${pluginName}: 매개변수 파싱 오류가 발생했습니다.`, e);
    }

    // ------------------------------------------------------------------------
    // Game_Enemy 확장: 적 캐릭터의 시너지 태그 배열화
    // ------------------------------------------------------------------------
    Game_Enemy.prototype.synergyTags = function() {
        if (this._synergyTags === undefined) {
            this._synergyTags = [];
            // <시너지: > 또는 <Synergy: > 노트 태그를 확인
            const meta = this.enemy().meta['시너지'] || this.enemy().meta['Synergy'];
            if (meta) {
                // 쉼표(,)를 기준으로 나누고 앞뒤 공백 제거
                this._synergyTags = String(meta).split(/[,，]/).map(s => s.trim());
            }
        }
        return this._synergyTags;
    };

    // ------------------------------------------------------------------------
    // Game_Troop 확장: 시너지 계산 및 상태 적용
    // ------------------------------------------------------------------------

    // 특정 시너지 태그를 가진 '생존해 있는' 모든 적 객체 가져오기
    Game_Troop.prototype.getEnemiesBySynergy = function(tag) {
        return this.members().filter(enemy => enemy.isAlive() && enemy.synergyTags().includes(tag));
    };

    // 특정 시너지 태그를 가진 생존 적의 '수' 가져오기
    Game_Troop.prototype.getSynergyCount = function(tag) {
        return this.getEnemiesBySynergy(tag).length;
    };

    // 전투 셋업(Setup) 시점에 시너지를 적용
    const _Game_Troop_setup = Game_Troop.prototype.setup;
    Game_Troop.prototype.setup = function(troopId) {
        _Game_Troop_setup.call(this, troopId);
        this.applySynergies();
    };

    Game_Troop.prototype.applySynergies = function() {
        for (const rule of synergyRules) {
            const count = this.getSynergyCount(rule.tag);
            if (count === 0) continue;

            // 조건에 맞는 가장 높은 단계의 티어를 찾음 (이미 내림차순 정렬됨)
            const activeTier = rule.tiers.find(t => count >= t.count);

            if (activeTier) {
                const stateId = activeTier.stateId;
                // 타겟 결정: 생존한 전체 적군 vs 시너지를 보유한 적군만
                const targets = rule.applyToAll ?
                    this.members().filter(m => m.isAlive()) :
                    this.getEnemiesBySynergy(rule.tag);

                for (const enemy of targets) {
                    enemy.addState(stateId);
                }
            }
        }
    };

    // ------------------------------------------------------------------------
    // BattleManager 확장: 전투 시작 시 공통 이벤트 트리거
    // ------------------------------------------------------------------------
    const _BattleManager_startBattle = BattleManager.startBattle;
    BattleManager.startBattle = function() {
        _BattleManager_startBattle.call(this);

        if (startCommonEventId > 0) {
            $gameTemp.reserveCommonEvent(startCommonEventId);
        }
    };

})();