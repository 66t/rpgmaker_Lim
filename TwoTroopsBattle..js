/*:
 * @target MZ
 * @plugindesc [v1.0.0] 적 부대 vs 적 부대 전투 시스템 (Troop vs Troop)
 * @author Limpid
 * * @help
 * ============================================================================
 * [ Introduction ]
 * 이 플러그인은 적 부대와 적 부대가 서로 전투하는 시스템을 제공합니다.
 * BattleManager.setupTroopVsTroop(troopId1, troopId2)를 통해 실행합니다.
 * * [ Features ]
 * 1. 데이터베이스에 설정된 스킬 레이팅(Rating) 기반 AI 작동.
 * 2. 아군 및 적군 유닛 자동 식별.
 * 3. TvT 전용 승리 판정 로직.
 * * [ Terms of Use ]
 * 자유롭게 수정 및 배포가 가능하지만, 출처(Limpid)를 밝혀주시기 바랍니다.
 * ============================================================================
 * * @param WinnerMessage
 * @text 승리 메시지 형식
 * @desc 전투 종료 후 출력될 메시지입니다. (%1: 승리 팀 이름)
 * @default %1 승리!
 */

(() => {
    'use strict';

    const pluginName = "TwoTroopsBattle.";
    const parameters = PluginManager.parameters(pluginName);
    const winnerMsg = parameters['WinnerMessage'] || "%1 승리!";

    //-------------------------------------------------------------------------
    // Game_GlobalVariables
    //-------------------------------------------------------------------------
    window.$gameTroop2 = null;

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DataManager_createGameObjects.call(this);
        $gameTroop2 = new Game_Troop();
    };

    //-------------------------------------------------------------------------
    // BattleManager (Core Logic)
    //-------------------------------------------------------------------------
    BattleManager.setupTroopVsTroop = function(troopId1, troopId2) {
        this.setup(troopId1, false, false);
        $gameTroop2.setup(troopId2);
        this._isTroopVsTroop = true;
        this._isBattleEndProcessed = false;
        $gameParty.removeBattleStates();
    };

    BattleManager.allBattleMembers = function() {
        if (this._isTroopVsTroop) {
            return $gameTroop.members().concat($gameTroop2.members());
        }
        return $gameParty.battleMembers().concat($gameTroop.members());
    };

    const _BattleManager_makeActionOrders = BattleManager.makeActionOrders;
    BattleManager.makeActionOrders = function() {
        if (this._isTroopVsTroop) {
            const battlers = this.allBattleMembers();
            for (const battler of battlers) {
                battler.makeActions();
            }
            battlers.sort((a, b) => b.speed() - a.speed());
            this._actionBattlers = battlers;
        } else {
            _BattleManager_makeActionOrders.call(this);
        }
    };

    //-------------------------------------------------------------------------
    // Game_Enemy (Index & Unit Handling)
    //-------------------------------------------------------------------------
    Game_Enemy.prototype.index = function() {
        if (BattleManager._isTroopVsTroop) {
            const index1 = $gameTroop.members().indexOf(this);
            if (index1 !== -1) return index1;
            return $gameTroop2.members().indexOf(this);
        }
        return $gameTroop.members().indexOf(this);
    };

    Game_Enemy.prototype.friendsUnit = function() {
        if (BattleManager._isTroopVsTroop) {
            return $gameTroop.members().includes(this) ? $gameTroop : $gameTroop2;
        }
        return $gameTroop;
    };

    Game_Enemy.prototype.opponentsUnit = function() {
        if (BattleManager._isTroopVsTroop) {
            return $gameTroop.members().includes(this) ? $gameTroop2 : $gameTroop;
        }
        return $gameParty;
    };

    //-------------------------------------------------------------------------
    // Game_Enemy (AI Logic)
    //-------------------------------------------------------------------------
    Game_Enemy.prototype.makeActions = function() {
        Game_Battler.prototype.makeActions.call(this);
        if (this.numActions() > 0) {
            const action = this.action(0);
            action._isTroop2Action = $gameTroop2.members().includes(this);

            // DB 레이팅 기반 스킬 선택 로직
            const actionList = this.enemy().actions.filter(a => this.isActionValid(a));
            if (actionList.length > 0) {
                const ratingMax = Math.max(...actionList.map(a => a.rating));
                const ratingThreshold = ratingMax - 3;
                const finalCandidates = actionList.filter(a => a.rating > ratingThreshold);
                const chosenAction = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];
                action.setSkill(chosenAction.skillId);
            } else {
                action.setAttack();
            }
            this.decideTvTTarget(action);
        }
    };

    Game_Enemy.prototype.decideTvTTarget = function(action) {
        const unit = action.isForOpponent() ? this.opponentsUnit() : this.friendsUnit();
        const targets = unit.aliveMembers();
        if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            action.setTarget(target.index());
        }
    };

    //-------------------------------------------------------------------------
    // Game_Action (Subject Correction)
    //-------------------------------------------------------------------------
    Game_Action.prototype.subject = function() {
        if (this._subjectActorId > 0) return $gameActors.actor(this._subjectActorId);
        const index = this._subjectEnemyIndex;
        if (index >= 0) {
            return BattleManager.allBattleMembers().find(m =>
                m.isEnemy() && m.index() === index &&
                ((this._isTroop2Action && $gameTroop2.members().includes(m)) ||
                    (!this._isTroop2Action && $gameTroop.members().includes(m)))
            );
        }
        return null;
    };

    //-------------------------------------------------------------------------
    // Spriteset_Battle & Victory Logic
    //-------------------------------------------------------------------------
    const _Spriteset_Battle_createEnemies = Spriteset_Battle.prototype.createEnemies;
    Spriteset_Battle.prototype.createEnemies = function() {
        _Spriteset_Battle_createEnemies.call(this);
        if (BattleManager._isTroopVsTroop) {
            for (const enemy of $gameTroop2.members()) {
                const sprite = new Sprite_Enemy(enemy);
                this._enemySprites.push(sprite);
                this._battleField.addChild(sprite);
                // Troop2 위치 반전 (좌우 대칭 느낌)
                enemy._screenX = Graphics.width - enemy.screenX();
            }
        }
    };

    const _BattleManager_checkBattleEnd = BattleManager.checkBattleEnd;
    BattleManager.checkBattleEnd = function() {
        if (this._isTroopVsTroop) {
            if ($gameTroop.isAllDead()) return this.processTvTEnd("좌측 팀 (Troop 2)");
            if ($gameTroop2.isAllDead()) return this.processTvTEnd("우측 팀 (Troop 1)");
            return false;
        }
        return _BattleManager_checkBattleEnd.call(this);
    };

    BattleManager.processTvTEnd = function(winnerName) {
        if (this._isBattleEndProcessed) return;
        this._isBattleEndProcessed = true;
        $gameMessage.add(winnerMsg.format(winnerName));
        this._phase = "battleEnd";
    };

    const _BattleManager_update = BattleManager.update;
    BattleManager.update = function(timeActive) {
        _BattleManager_update.call(this, timeActive);
        if (this._isTroopVsTroop && this.isInputting()) this.startTurn();
    };

    Scene_Battle.prototype.updateStatusWindowVisibility = function() {
        if (BattleManager._isTroopVsTroop) this._statusWindow.hide();
    };

})();