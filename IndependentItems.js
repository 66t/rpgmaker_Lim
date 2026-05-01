/*:
 * @target MZ
 * @plugindesc 独立物品系统
 * @author Limpid
 *
 * @help
 */

(() => {
    'use strict';

    window.ItemManager = window.ItemManager || {};

    ItemManager.isBaseIndependentItem = function(item) {
        return item && item.id > 0 && item.id < 10000 && item.meta && item.meta['Independent Item'];
    };

    ItemManager.isIndependentInstance = function(item) {
        return item && item.id >= 10000;
    };

    ItemManager.getItemType = function(item) {
        if (DataManager.isItem(item)) return 'item';
        if (DataManager.isWeapon(item)) return 'weapon';
        if (DataManager.isArmor(item)) return 'armor';
        return null;
    };

    ItemManager.registerIndependentItem = function(baseItem) {
        const type = this.getItemType(baseItem);
        const id = $gameSystem.getNewIndependentId();
        // 生成数据时，顺便计算理论最大/最小值用于算品级
        const customData = this.generateCustomData(baseItem);

        const inst = {
            id: id,
            type: type,
            originalId: baseItem.id,
            data: customData
        };

        $gameSystem._independentItems[id] = inst;
        return this.buildItemData(inst);
    };

    ItemManager.generateCustomData = function(baseItem) {
        const data = { params: {}, currentTotal: 0, minTotal: 0, maxTotal: 0 };
        const paramsMap = { mhp:0, mmp:1, atk:2, def:3, mat:4, mdf:5, agi:6, luk:7 };
        const note = baseItem.note;

        const regex = /<(\w+):\s*(-?\d+)(?:\s*~\s*(-?\d+))?>/gi;
        let match;

        while ((match = regex.exec(note)) !== null) {
            const stat = match[1].toLowerCase();
            if (paramsMap[stat] !== undefined) {
                const paramId = paramsMap[stat];
                let min = parseInt(match[2], 10);
                let max = match[3] ? parseInt(match[3], 10) : min;

                if (min > max) [min, max] = [max, min];

                const val = Math.floor(Math.random() * (max - min + 1)) + min;
                data.params[paramId] = val;
                
                data.currentTotal += val;
                data.minTotal += min;
                data.maxTotal += max;
            }
        }
        return data;
    };

    ItemManager.buildItemData = function(inst) {
        let baseItem, dataArray;
        switch(inst.type) {
            case 'item': baseItem = $dataItems[inst.originalId]; dataArray = $dataItems; break;
            case 'weapon': baseItem = $dataWeapons[inst.originalId]; dataArray = $dataWeapons; break;
            case 'armor': baseItem = $dataArmors[inst.originalId]; dataArray = $dataArmors; break;
        }

        if (!baseItem) return null;

        const newItem = JsonEx.parse(JsonEx.stringify(baseItem));
        newItem.id = inst.id;

        // 应用属性
        if (newItem.params) {
            for (const paramId in inst.data.params) {
                newItem.params[paramId] += inst.data.params[paramId];
            }
        }

        // 计算品级 (0-100%)
        if(inst.data.maxTotal) {
            let gradeText = "";
            let range = inst.data.maxTotal - inst.data.minTotal;
            let percent = range === 0 ? 100 : ((inst.data.currentTotal - inst.data.minTotal) / range) * 100;

            if (percent < 20) gradeText = "最下级";
            else if (percent < 40) gradeText = "下级";
            else if (percent < 60) gradeText = "中级";
            else if (percent < 80) gradeText = "上级";
            else gradeText = "最上级";

            newItem.description = `【${gradeText}】${newItem.description}`;
        }
        dataArray[inst.id] = newItem;
        return newItem;
    };
    

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        if ($gameSystem._independentItems) {
            for (const id in $gameSystem._independentItems) {
                ItemManager.buildItemData($gameSystem._independentItems[id]);
            }
        }
    };

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._independentItemsCounter = 10000;
        this._independentItems = {};
    };

    Game_System.prototype.getNewIndependentId = function() {
        if (!this._independentItemsCounter) this._independentItemsCounter = 10000;
        return this._independentItemsCounter++;
    };

    const _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
        if (ItemManager.isBaseIndependentItem(item) && amount > 0) {
            for (let i = 0; i < amount; i++) {
                const newItem = ItemManager.registerIndependentItem(item);
                _Game_Party_gainItem.call(this, newItem, 1, includeEquip);
            }
        } else {
            _Game_Party_gainItem.call(this, item, amount, includeEquip);
        }
    };

    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function(actorId) {
        _Game_Actor_setup.call(this, actorId);
        for (let i = 0; i < this._equips.length; i++) {
            const item = this._equips[i].object();
            if (item && ItemManager.isBaseIndependentItem(item)) {
                const newItem = ItemManager.registerIndependentItem(item);
                this._equips[i].setObject(newItem);
            }
        }
    };
    

})();