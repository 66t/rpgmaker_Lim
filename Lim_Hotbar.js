/*:
 * @target MZ
 * @plugindesc 物品快捷栏 - 支持技能与道具绑定
 * @author Limpid 
 * @help 
 * 1. 只有“随时可用”或“仅地图”的技能/道具可以绑定。
 * 2. 快捷栏实时显示 MP 消耗数字（蓝色框）或道具剩余数量（绿色框）。
 * 3. 屏幕底部增加队长的 MP 状态槽。
 * 4. 自动扣除 MP/道具数量，资源不足或时机不对时会有提示音。
 *
 * @command OpenBindScene
 * @text 打开技能/道具绑定界面
 * @desc 打开快捷栏绑定场景，设置每个按键对应的内容。
 */

(() => {
    const pluginName = "Lim_Hotbar";

    // --- 1. 系统初始化与按键映射 ---
    for (let i = 1; i <= 9; i++) Input.keyMapper[48 + i] = 'hotbar_' + i;
    Input.keyMapper[48] = 'hotbar_0';

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        // 数据结构更改为对象存储： { type: 'skill' | 'item', id: number }
        this._hotbarData = new Array(10).fill(null);
    };

    // 兼容旧存档数据结构
    Game_System.prototype.checkHotbarDataInit = function() {
        if (!this._hotbarData) this._hotbarData = new Array(10).fill(null);
        if (this._hotbarSkills) {
            for (let i = 0; i < 10; i++) {
                if (this._hotbarSkills[i]) {
                    this._hotbarData[i] = { type: 'skill', id: this._hotbarSkills[i] };
                }
            }
            delete this._hotbarSkills;
        }
    };

    Game_System.prototype.getHotbarData = function(index) {
        this.checkHotbarDataInit();
        return this._hotbarData[index];
    };

    Game_System.prototype.setHotbarData = function(index, type, id) {
        this.checkHotbarDataInit();
        if (!type || !id) this._hotbarData[index] = null;
        else this._hotbarData[index] = { type: type, id: id };
    };

    // --- 2. 核心 HUD 绘制 (Sprite 层) ---
    class Sprite_Hotbar extends Sprite {
        initialize() {
            super.initialize();
            this.z = 10;
            this.bitmap = new Bitmap(Graphics.width, 120);
            this.y = Graphics.height - 100;
            this._lastDataStr = "";
            this._lastMp = -1;
            this._lastItemCounts = "";
        }

        update() {
            super.update();
            const actor = $gameParty.leader();
            const currentMp = actor ? actor.mp : 0;

            $gameSystem.checkHotbarDataInit();
            const currentDataStr = JSON.stringify($gameSystem._hotbarData);

            // 监听道具数量变化
            let itemCounts = "";
            for (let i = 0; i < 10; i++) {
                let data = $gameSystem.getHotbarData(i);
                if (data && data.type === 'item') {
                    itemCounts += $gameParty.numItems($dataItems[data.id]) + ",";
                }
            }

            if (this._lastDataStr !== currentDataStr || this._lastMp !== currentMp || this._lastItemCounts !== itemCounts) {
                this._lastDataStr = currentDataStr;
                this._lastMp = currentMp;
                this._lastItemCounts = itemCounts;
                this.redraw();
            }
        }

        redraw() {
            this.bitmap.clear();
            const actor = $gameParty.leader();
            if (!actor) return;

            const slotWidth = 44;
            const spacing = 8;
            const totalWidth = (slotWidth * 10) + (spacing * 9);
            let x = (Graphics.width - totalWidth) / 2;

            this.drawMpGauge(x, 0, totalWidth, actor);

            for (let i = 0; i < 10; i++) {
                const sx = x + i * (slotWidth + spacing);
                const sy = 35;
                const data = $gameSystem.getHotbarData(i);

                if (data && data.type === 'skill') {
                    // 技能框：偏蓝底色
                    this.bitmap.fillRect(sx, sy, slotWidth, slotWidth, "rgba(0,30,60,0.8)");
                    this.bitmap.strokeRect(sx, sy, slotWidth, slotWidth, "rgba(100,200,255,0.8)");

                    const skill = $dataSkills[data.id];
                    this.drawIcon(skill.iconIndex, sx + 6, sy + 6);
                    if (skill.mpCost > 0) {
                        this.bitmap.fontSize = 12;
                        this.bitmap.textColor = "#80ffff"; // 蓝字代表MP
                        this.bitmap.drawText(skill.mpCost, sx, sy + slotWidth - 16, slotWidth - 4, 14, "right");
                    }
                } else if (data && data.type === 'item') {
                    // 道具框：偏绿底色
                    this.bitmap.fillRect(sx, sy, slotWidth, slotWidth, "rgba(20,50,20,0.8)");
                    this.bitmap.strokeRect(sx, sy, slotWidth, slotWidth, "rgba(150,255,100,0.8)");

                    const item = $dataItems[data.id];
                    this.drawIcon(item.iconIndex, sx + 6, sy + 6);
                    const num = $gameParty.numItems(item);
                    this.bitmap.fontSize = 12;
                    this.bitmap.textColor = num > 0 ? "#ffffff" : "#ff8080"; // 数量0显示红字
                    this.bitmap.drawText(num, sx, sy + slotWidth - 16, slotWidth - 4, 14, "right");
                } else {
                    // 空白框
                    this.bitmap.fillRect(sx, sy, slotWidth, slotWidth, "rgba(0,0,0,0.6)");
                    this.bitmap.strokeRect(sx, sy, slotWidth, slotWidth, "rgba(255,255,255,0.5)");
                }

                // 键位标签
                this.bitmap.fontSize = 14;
                this.bitmap.textColor = "#ffffff";
                this.bitmap.drawText(i === 9 ? "0" : i + 1, sx + 4, sy + 2, slotWidth, 20, "left");
            }
        }

        drawMpGauge(x, y, width, actor) {
            const h = 10;
            const fillW = Math.floor(width * (actor.mp / actor.mmp));
            this.bitmap.fillRect(x, y, width, h, "rgba(0,0,0,0.8)");
            this.bitmap.gradientFillRect(x, y, fillW, h, "#204080", "#4080ff", false);
            this.bitmap.fontSize = 12;
            this.bitmap.drawText(`MP: ${actor.mp}/${actor.mmp}`, x, y, width, h, "center");
        }

        drawIcon(iconIndex, x, y) {
            const bitmap = ImageManager.loadSystem("IconSet");
            const pw = ImageManager.iconWidth;
            const ph = ImageManager.iconHeight;
            const sx = (iconIndex % 16) * pw;
            const sy = Math.floor(iconIndex / 16) * ph;
            this.bitmap.blt(bitmap, sx, sy, pw, ph, x, y, 32, 32);
        }
    }

    const _Spriteset_Map_createUpperLayer = Spriteset_Map.prototype.createUpperLayer;
    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);
        this.addChild(new Sprite_Hotbar());
    };

    // --- 3. 技能/道具触发逻辑 ---
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        if (!SceneManager.isSceneChanging() && !$gameMap.isEventRunning()) {
            for (let i = 1; i <= 10; i++) {
                const key = i === 10 ? 'hotbar_0' : 'hotbar_' + i;
                if (Input.isTriggered(key)) this.useHotbarAction(i - 1);
            }
        }
    };

    Scene_Map.prototype.useHotbarAction = function(index) {
        const data = $gameSystem.getHotbarData(index);
        if (!data) return;

        const actor = $gameParty.leader();
        if (!actor) return;

        if (data.type === 'skill') {
            const skill = $dataSkills[data.id];
            if (skill && actor.canUse(skill)) {
                actor.paySkillCost(skill);
                SoundManager.playUseSkill();
                this.applyMapEffects(skill);
            } else {
                SoundManager.playBuzzer();
            }
        } else if (data.type === 'item') {
            const item = $dataItems[data.id];
            // 检查道具是否可以在地图使用，且背包里有存货
            if (item && actor.canUse(item) && $gameParty.hasItem(item)) {
                $gameParty.consumeItem(item);
                SoundManager.playUseItem();
                this.applyMapEffects(item);
            } else {
                SoundManager.playBuzzer();
            }
        }
    };

    Scene_Map.prototype.applyMapEffects = function(itemOrSkill) {
        itemOrSkill.effects.forEach(e => {
            if (e.code === Game_Action.EFFECT_COMMON_EVENT) {
                $gameTemp.reserveCommonEvent(e.dataId);
            }
        });
    };

    // --- 4. 绑定界面 (Scene & Windows) ---
    class Scene_HotbarBind extends Scene_MenuBase {
        create() {
            super.create();
            this.createIndexWindow();
            this.createCategoryWindow();
            this.createListWindow();

            this._indexWindow.activate();
            this._indexWindow.select(0);
        }

        createIndexWindow() {
            const rect = new Rectangle(0, 0, 360, Graphics.height-10);
            this._indexWindow = new Window_HotbarIndex(rect);
            this._indexWindow.setHandler('ok', this.onIndexOk.bind(this));
            this._indexWindow.setHandler('cancel', this.popScene.bind(this));
            this.addWindow(this._indexWindow);
        }

        createCategoryWindow() {
            const rect = new Rectangle(365, this.mainAreaTop(), Graphics.width - 375, 80);
            this._categoryWindow = new Window_HotbarCategory(rect);
            this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));
            this._categoryWindow.setHandler('cancel', this.onCategoryCancel.bind(this));
            this.addWindow(this._categoryWindow);
            this._categoryWindow.deactivate();
            this._categoryWindow.deselect();
        }

        createListWindow() {
            const rect = new Rectangle(365, this.mainAreaTop()+80, Graphics.width - 375, Graphics.height-this.mainAreaTop()-90);
            this._listWindow = new Window_HotbarList(rect);
            this._listWindow.setHandler('ok', this.onListOk.bind(this));
            this._listWindow.setHandler('cancel', this.onListCancel.bind(this));
            this.addWindow(this._listWindow);
            this._listWindow.deactivate();
            this._listWindow.deselect();

            this._categoryWindow.setItemWindow(this._listWindow);
        }

        onIndexOk() {
            this._categoryWindow.activate();
            this._categoryWindow.select(0);
        }

        onCategoryOk() {
            const symbol = this._categoryWindow.currentSymbol();
            if (symbol === 'clear') {
                $gameSystem.setHotbarData(this._indexWindow.index(), null, 0);
                this._indexWindow.refresh();
                this._categoryWindow.activate();
            } else {
                this._listWindow.activate();
                this._listWindow.select(0);
            }
        }

        onCategoryCancel() {
            this._categoryWindow.deselect();
            this._categoryWindow.deactivate();
            this._indexWindow.activate();
        }

        onListOk() {
            const item = this._listWindow.item();
            const type = this._categoryWindow.currentSymbol();
            if (item) {
                $gameSystem.setHotbarData(this._indexWindow.index(), type, item.id);
            }
            this._indexWindow.refresh();
            this.onListCancel();
        }

        onListCancel() {
            this._listWindow.deselect();
            this._listWindow.deactivate();
            this._categoryWindow.activate();
        }
    }

    class Window_HotbarIndex extends Window_Selectable {
        constructor(rect) { super(rect); this.refresh(); }
        maxItems() { return 10; }
        drawItem(index) {
            const rect = this.itemLineRect(index);
            const data = $gameSystem.getHotbarData(index);
            const label = index === 9 ? "按键 0" : `按键 ${index + 1}`;

            this.drawText(label, rect.x, rect.y, 80);

            if (data) {
                let item = null;
                if (data.type === 'skill') {
                    item = $dataSkills[data.id];
                    this.changeTextColor("#80ffff");
                    this.drawText("[技能]", rect.x + 70, rect.y, 60);
                } else if (data.type === 'item') {
                    item = $dataItems[data.id];
                    this.changeTextColor("#a0ffa0");
                    this.drawText("[道具]", rect.x + 70, rect.y, 60);
                }

                this.resetTextColor();
                if (item) {
                    this.drawIcon(item.iconIndex, rect.x + 130, rect.y + 2);
                    this.drawText(item.name, rect.x + 166, rect.y, rect.width - 166);
                }
            } else {
                this.changePaintOpacity(false);
                this.drawText("--- 未绑定 ---", rect.x + 70, rect.y, rect.width - 70);
                this.changePaintOpacity(true);
            }
        }
    }

    class Window_HotbarCategory extends Window_HorzCommand {
        constructor(rect) { super(rect); }
        maxCols() { return 3; }
        makeCommandList() {
            this.addCommand("绑定技能", 'skill');
            this.addCommand("绑定道具", 'item');
            this.addCommand("清除当前绑定", 'clear');
        }
        setItemWindow(window) {
            this._itemWindow = window;
            this.update();
        }
        update() {
            super.update();
            if (this._itemWindow && this.currentSymbol() !== 'clear') {
                this._itemWindow.setCategory(this.currentSymbol());
            }
        }
    }

    class Window_HotbarList extends Window_Command {
        constructor(rect) {
            super(rect);
            this._category = 'none'; // <--- 这里提前使用了 this，导致报错
        }
        setCategory(category) {
            if (this._category !== category) {
                this._category = category;
                this.refresh();
            }
        }
        makeCommandList() {
            const actor = $gameParty.leader();
            if (!actor) return;

            if (this._category === 'skill') {
                actor.skills().forEach(skill => {
                    if ([0, 2].includes(skill.occasion)) {
                        this.addCommand(skill.name, 'bind_skill', true, skill);
                    }
                });
            } else if (this._category === 'item') {
                $gameParty.items().forEach(item => {
                    if ([0, 2].includes(item.occasion)) {
                        this.addCommand(item.name, 'bind_item', true, item);
                    }
                });
            }
        }
        item() { return this.currentExt(); }

        drawItem(index) {
            const rect = this.itemLineRect(index);
            const item = this._list[index].ext;
            this.resetTextColor();
            this.changePaintOpacity(this.isCommandEnabled(index));

            if (item && item.iconIndex) {
                this.drawIcon(item.iconIndex, rect.x, rect.y + 2);
                rect.x += ImageManager.iconWidth + 4;
                rect.width -= ImageManager.iconWidth + 4;
            }

            this.drawText(this.commandName(index), rect.x, rect.y, rect.width);

            // 绘制右侧数值（MP或持有数量）
            if (this._category === 'skill' && item && item.mpCost > 0) {
                this.changeTextColor("#80ffff");
                this.drawText(`MP:${item.mpCost}`, rect.x, rect.y, rect.width, "right");
            } else if (this._category === 'item' && item) {
                const count = $gameParty.numItems(item);
                this.changeTextColor("#a0ffa0");
                this.drawText(`x${count}`, rect.x, rect.y, rect.width, "right");
            }
            this.resetTextColor();
        }
    }

    PluginManager.registerCommand(pluginName, "OpenBindScene", () => {
        SceneManager.push(Scene_HotbarBind);
    });

})();