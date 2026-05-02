//=============================================================================
// DynamicTrapsMV.js
//=============================================================================

/*:
 * @plugindesc [MV] 动态陷阱系统：支持变量/玩家坐标公式、同位置自动覆盖、存档持久化。
 * @author Limpid (Adapted for MV)
 *
 * @help DynamicTrapsMV.js
 * 
 * 【插件指令】
 * 
 *  PlaceTrap x y characterName characterIndex triggerTag animationId commonEventId selfSwitch disappear
 * 
 *  参数说明：
 *  x, y           : 坐标。支持数字(10)、变量(v[1])、玩家(p)、玩家偏移(p+1)
 *  characterName  : 行走图文件名（无需后缀）。若无则填 ""
 *  characterIndex : 行走图索引 (0-7)
 *  triggerTag     : 触发标签。玩家默认为 player，事件需在备注写 <tag:enemy>
 *  animationId    : 触发时的动画ID (0为无)
 *  commonEventId  : 触发后的公共事件ID (0为无)
 *  selfSwitch     : 触发后开启【踩中者】的独立开关 (A,B,C,D 或填 none)
 *  disappear      : 触发后是否消失 (true / false)
 * 
 *  例子：
 *  PlaceTrap p p Trap 0 player 45 1 A true
 *  (在玩家脚下放一个Trap图形的陷阱，仅玩家触发，播45号动画，执行1号公共事件，开启玩家A开关，触发后消失)
 *
 * 【标签 (Tag) 设定】
 * - 玩家默认标签: player
 * - 事件标签: 在事件【备注栏】填写 <tag:enemy>
 */

(() => {
    const pluginName = "DynamicTrapsMV";

    // --- 坐标解析器 ---
    const parseCoordinate = (input, isX) => {
        const str = String(input).trim().toLowerCase();
        const playerPos = isX ? $gamePlayer.x : $gamePlayer.y;
        if (str === 'p') return playerPos;
        if (str.startsWith('p')) {
            const offset = parseInt(str.substring(1)) || 0;
            return playerPos + offset;
        }
        const varMatch = str.match(/v\[(\d+)\]/);
        if (varMatch) return $gameVariables.value(Number(varMatch[1]));
        return parseInt(str) || 0;
    };

    // --- MV 插件指令适配 ---
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === "PlaceTrap") {
            const mapId = $gameMap.mapId();
            const tx = parseCoordinate(args[0], true);
            const ty = parseCoordinate(args[1], false);

            // 覆盖逻辑
            const existingTraps = $gameSystem.getTrapsForMap(mapId);
            for (const id in existingTraps) {
                if (existingTraps[id].x === tx && existingTraps[id].y === ty) {
                    if ($gameMap._events[id]) {
                        $gameMap._events[id].erase();
                        delete $gameMap._events[id];
                    }
                    $gameSystem.removeCustomTrap(mapId, id);
                }
            }

            const trapData = {
                x: tx,
                y: ty,
                characterName: args[2] === '""' ? "" : args[2],
                characterIndex: Number(args[3] || 0),
                triggerTag: args[4] || "player",
                animationId: Number(args[5] || 0),
                commonEventId: Number(args[6] || 0),
                selfSwitch: (args[7] === "none" || !args[7]) ? "" : args[7],
                disappear: String(args[8]) === "true",
                triggered: false
            };
            $gameSystem.addCustomTrap(mapId, trapData);
        }
    };

    //=============================================================================
    // Game_TrapEvent
    //=============================================================================
    function Game_TrapEvent() {
        this.initialize.apply(this, arguments);
    }

    Game_TrapEvent.prototype = Object.create(Game_Event.prototype);
    Game_TrapEvent.prototype.constructor = Game_TrapEvent;

    window.Game_TrapEvent = Game_TrapEvent;

    Game_TrapEvent.prototype.initialize = function(mapId, trapId, trapData, eventData) {
        this._customEventData = eventData;
        this._trapData = trapData;
        this._trapId = trapId;
        Game_Event.prototype.initialize.call(this, mapId, trapId);
    };

    Game_TrapEvent.prototype.event = function() {
        return this._customEventData;
    };

    Game_TrapEvent.prototype.update = function() {
        Game_Event.prototype.update.call(this);
        if (this._trapData && !this._trapData.triggered && !this._erased) {
            this.checkTrapTrigger();
        }
    };

    Game_TrapEvent.prototype.checkTrapTrigger = function() {
        const targetTag = this._trapData.triggerTag;
        if ($gamePlayer.pos(this.x, this.y) && $gamePlayer.getTrapTag() === targetTag) {
            this.executeTrap($gamePlayer);
            return;
        }
        const events = $gameMap.events();
        for (const ev of events) {
            if (ev === this || ev._erased) continue;
            if (ev.pos(this.x, this.y) && ev.getTrapTag() === targetTag) {
                this.executeTrap(ev);
                return;
            }
        }
    };

    Game_TrapEvent.prototype.executeTrap = function(targetChar) {
        this._trapData.triggered = true;
        if (this._trapData.animationId > 0) {
            this.requestAnimation(this._trapData.animationId);
        }
        if (this._trapData.commonEventId > 0) {
            $gameTemp.reserveCommonEvent(this._trapData.commonEventId);
        }

        if (targetChar !== $gamePlayer && this._trapData.selfSwitch !== "") {
            const key = [$gameMap.mapId(), targetChar.eventId(), this._trapData.selfSwitch];
            $gameSelfSwitches.setValue(key, true);
        }

        if (this._trapData.disappear) {
            $gameSystem.removeCustomTrap($gameMap.mapId(), this._trapId);
            this.erase();
        }
    };

    //=============================================================================
    // Game_System
    //=============================================================================
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._customTraps = {};
        this._trapIdCounter = 1000;
    };

    Game_System.prototype.addCustomTrap = function(mapId, trapData) {
        if (!this._customTraps[mapId]) this._customTraps[mapId] = {};
        this._trapIdCounter++;
        const trapId = this._trapIdCounter;
        this._customTraps[mapId][trapId] = trapData;

        if ($gameMap.mapId() === mapId) {
            $gameMap.spawnTrapEvent(trapId, trapData);
        }
    };

    Game_System.prototype.removeCustomTrap = function(mapId, trapId) {
        if (this._customTraps[mapId]) {
            delete this._customTraps[mapId][trapId];
        }
    };

    Game_System.prototype.getTrapsForMap = function(mapId) {
        return this._customTraps[mapId] || {};
    };

    //=============================================================================
    // 兼容性
    //=============================================================================
    Game_CharacterBase.prototype.getTrapTag = function() { return ""; };
    Game_Player.prototype.getTrapTag = function() { return "player"; };

    Game_Event.prototype.getTrapTag = function() {
        const data = this.event();
        // MV 的 meta 访问与 MZ 一致
        if (data && data.meta && data.meta.tag) return String(data.meta.tag).trim();
        return "";
    };

    Game_Map.prototype.spawnTrapEvent = function(trapId, trapData) {
        if (this._events[trapId]) return;

        const eventData = {
            id: trapId, name: "Trap", note: "", meta: {},
            pages: [{
                conditions: { actorId: 1, actorValid: false, itemId: 1, itemValid: false, selfSwitchCh: "A", selfSwitchValid: false, switch1Id: 1, switch1Valid: false, switch2Id: 1, switch2Valid: false, variableId: 1, variableValid: false, variableValue: 0 },
                directionFix: true,
                image: { characterIndex: trapData.characterIndex, characterName: trapData.characterName, direction: 2, pattern: 1, tileId: 0 },
                list: [{ code: 0, indent: 0, parameters: [] }],
                moveFrequency: 3, moveRoute: { list: [{ code: 0, parameters: [] }], repeatable: true, skippable: false, wait: false },
                moveSpeed: 3, moveType: 0, priorityType: 0, stepAnime: false, through: true, trigger: 0, walkAnime: true
            }],
            x: trapData.x, y: trapData.y
        };

        const trapEvent = new Game_TrapEvent(this._mapId, trapId, trapData, eventData);
        this._events[trapId] = trapEvent;

        // MV 的渲染层级处理
        if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
            const spriteset = SceneManager._scene._spriteset;
            const sprite = new Sprite_Character(trapEvent);
            spriteset._characterSprites.push(sprite);
            // MV 所有的角色精灵通常放在 _tilemap 层
            spriteset._tilemap.addChild(sprite);
        }
    };

    const _Game_Map_setupEvents = Game_Map.prototype.setupEvents;
    Game_Map.prototype.setupEvents = function() {
        _Game_Map_setupEvents.call(this);
        const traps = $gameSystem.getTrapsForMap(this._mapId);
        for (const trapId in traps) {
            this.spawnTrapEvent(Number(trapId), traps[trapId]);
        }
    };

})();