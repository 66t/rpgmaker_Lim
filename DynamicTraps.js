//=============================================================================
// DynamicTraps.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 动态陷阱系统：支持变量/玩家坐标公式、同位置自动覆盖、存档持久化。
 * @author Limpid
 *
 * @help DynamicTraps.js
 * 
 * 在地图上动态放置陷阱，陷阱数据会跟随存档保存。
 * 
 * 【坐标输入规则 (重要)】
 * 在插件命令的 X 和 Y 坐标栏，你可以输入以下内容：
 * 1. 纯数字：直接指定坐标。例如：15
 * 2. 变量：输入 v[n] 读取变量n的值。例如：v[10]
 * 3. 玩家坐标：输入 p 代表玩家当前的坐标。
 * 4. 玩家偏移：输入 p+n 或 p-n。例如：p+1 表示玩家坐标右侧/下方一格。
 * 
 * 【同位置覆盖】
 * 如果在已经有动态陷阱的坐标再次放置新陷阱，旧陷阱会被立即销毁。
 * 
 * 【标签 (Tag) 设定】
 * - 玩家默认标签: player
 * - 事件标签: 在事件【备注栏】填写 <tag:enemy>
 * 
 * @command placeTrap
 * @text 放置陷阱
 * @desc 在指定位置放置陷阱（支持公式）。若目标点已有动态陷阱则会覆盖。
 *
 * @arg x
 * @text X 坐标公式
 * @type string
 * @desc 数字(10)、变量(v[1])、玩家(p)、玩家偏移(p+1, p-1)
 * @default p
 *
 * @arg y
 * @text Y 坐标公式
 * @type string
 * @desc 数字(10)、变量(v[1])、玩家(p)、玩家偏移(p+1, p-1)
 * @default p
 *
 * @arg characterName
 * @text 行走图文件名
 * @type file
 * @dir img/characters/
 * @desc 陷阱显示的行走图。留空则无图像。
 * @default
 *
 * @arg characterIndex
 * @text 行走图索引
 * @type number
 * @desc 行走图索引 (0-7)
 * @default 0
 *
 * @arg triggerTag
 * @text 触发标签 (Tag)
 * @type string
 * @desc 触发者备注里的tag。玩家为 player。
 * @default player
 *
 * @arg animationId
 * @text 触发时动画ID
 * @type animation
 * @default 0
 *
 * @arg commonEventId
 * @text 触发后公共事件ID
 * @type common_event
 * @default 0
 *
 * @arg selfSwitch
 * @text 目标独立开关
 * @type select
 * @option 无 @value 
 * @option A @value A
 * @option B @value B
 * @option C @value C
 * @option D @value D
 * @desc 触发后打开【踩中者】的独立开关。
 * @default 
 *
 * @arg disappear
 * @text 触发后是否消失
 * @type boolean
 * @on 消失 @off 存留
 * @default true
 */
(() => {
    const pluginName = "DynamicTraps";

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

    // --- 注册命令 ---
    PluginManager.registerCommand(pluginName, "placeTrap", args => {
        const mapId = $gameMap.mapId();
        const tx = parseCoordinate(args.x, true);
        const ty = parseCoordinate(args.y, false);

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
            characterName: args.characterName || "",
            characterIndex: Number(args.characterIndex),
            triggerTag: args.triggerTag || "",
            animationId: Number(args.animationId),
            commonEventId: Number(args.commonEventId),
            selfSwitch: args.selfSwitch || "",
            disappear: args.disappear === "true",
            triggered: false
        };
        $gameSystem.addCustomTrap(mapId, trapData);
    });

    //=============================================================================
    // Game_TrapEvent (修正：必须导出到全局以便 JsonEx 识别)
    //=============================================================================
    function Game_TrapEvent() {
        this.initialize(...arguments);
    }

    Game_TrapEvent.prototype = Object.create(Game_Event.prototype);
    Game_TrapEvent.prototype.constructor = Game_TrapEvent;

    // 暴露给全局环境
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
        if (this._trapData.animationId > 0) $gameTemp.requestAnimation([this], this._trapData.animationId);
        if (this._trapData.commonEventId > 0) $gameTemp.reserveCommonEvent(this._trapData.commonEventId);

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
    // 兼容性修正
    //=============================================================================
    Game_CharacterBase.prototype.getTrapTag = function() { return ""; };
    Game_Player.prototype.getTrapTag = function() { return "player"; };

    Game_Event.prototype.getTrapTag = function() {
        const data = this.event();
        if (data && data.meta && data.meta.tag) return data.meta.tag.trim();
        return "";
    };

    Game_Map.prototype.spawnTrapEvent = function(trapId, trapData) {
        // 如果事件已存在则不再创建（防止读档时 setupEvents 重复调用）
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

        // 动态添加精灵（仅在地图运行中时需要，如果是 setupEvents 阶段，系统会自动创建）
        if (SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset) {
            const spriteset = SceneManager._scene._spriteset;
            const sprite = new Sprite_Character(trapEvent);
            spriteset._characterSprites.push(sprite);
            spriteset._tilemap.addChild(sprite);
        }
    };

    // 读档或切换地图时重新生成
    const _Game_Map_setupEvents = Game_Map.prototype.setupEvents;
    Game_Map.prototype.setupEvents = function() {
        _Game_Map_setupEvents.call(this);
        const traps = $gameSystem.getTrapsForMap(this._mapId);
        for (const trapId in traps) {
            this.spawnTrapEvent(Number(trapId), traps[trapId]);
        }
    };

})();