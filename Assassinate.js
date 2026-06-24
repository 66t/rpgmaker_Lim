/*:
 * @target MZ
 * @plugindesc 模仿 DNF 影舞者“瞬杀”技能的处决分尸效果（RM原生打击判定版）
 * @author limpid
 *
 * @help
 * ============================================================================
 * 功能说明
 * ============================================================================
 * 在数据库的“技能”备注栏中，添加以下任意一个标签，即可赋予该技能“瞬杀”特性：
 * <瞬杀>
 * <Assassination>
 *
 * 当带有此标签的技能，按照 RPG Maker MZ 自带的命中/闪避/伤害判定成功击杀怪物时，
 * 怪物会触发特殊的处决特效：
 * 1. 受击后闪烁白光并硬直。
 * 2. 伴随屏幕震动与音效，精灵图被横向和竖向十字切开，分成 4 瓣。
 * 3. 碎片带有重力系统，向四周抛物线击飞并在落地时淡出。
 *
 * ============================================================================
 */

(() => {
    'use strict';

    // =========================================================================
    // 工具函数
    // =========================================================================
    function hasAssassinationTag(item) {
        if (!item || !item.meta) return false;
        return !!(item.meta['瞬杀'] || item.meta['Assassination']);
    }

    function copyTone(tone) {
        if (Array.isArray(tone)) return tone.slice();
        return [0, 0, 0, 0];
    }

    // =========================================================================
    // 1. 伤害结算拦截：使用 RM 原生命中结果判断是否触发“瞬杀”
    // =========================================================================
    const _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        // 记录受击前状态
        const wasDead = target.isDead();

        // 先让 RM 原生流程完整跑完（命中、闪避、暴击、伤害、死亡状态等）
        _Game_Action_apply.call(this, target);

        // 只处理敌人
        if (!target || !target.isEnemy()) return;

        // 只处理带标签的技能
        const item = this.item();
        if (!hasAssassinationTag(item)) return;

        // 使用 RM 自带的结果对象做“打击判定”
        const result = target.result();
        if (!result || !result.isHit()) return;

        // 必须是本次结算前没死，本次结算后死亡
        if (wasDead || !target.isDead()) return;

        // 打上“被瞬杀”标记，供 Sprite_Enemy 的死亡收缩流程使用
        target._isAssassinated = true;
    };

    // =========================================================================
    // 2. 敌人初始化：清理标记，防止残留
    // =========================================================================
    const _Game_Enemy_setup = Game_Enemy.prototype.setup;
    Game_Enemy.prototype.setup = function(enemyId, x, y) {
        _Game_Enemy_setup.call(this, enemyId, x, y);
        this._isAssassinated = false;
    };

    // =========================================================================
    // 3. Sprite_Enemy：接管 collapse 流程
    // =========================================================================
    const _Sprite_Enemy_initMembers = Sprite_Enemy.prototype.initMembers;
    Sprite_Enemy.prototype.initMembers = function() {
        _Sprite_Enemy_initMembers.call(this);
        this._isAssassinationEffect = false;
        this._assassinationParts = null;
    };

    const _Sprite_Enemy_startCollapse = Sprite_Enemy.prototype.startCollapse;
    Sprite_Enemy.prototype.startCollapse = function() {
        // 先走引擎原有 collapse 初始化
        _Sprite_Enemy_startCollapse.call(this);

        // 如果该敌人被标记为“瞬杀”，则改走自定义处决特效
        if (this._battler && this._battler._isAssassinated) {
            this._effectDuration = 90; // 自定义总时长
            this._isAssassinationEffect = true;

            // 立即清掉标记，避免后续重复使用
            this._battler._isAssassinated = false;
        }
    };

    const _Sprite_Enemy_updateCollapse = Sprite_Enemy.prototype.updateCollapse;
    Sprite_Enemy.prototype.updateCollapse = function() {
        if (this._isAssassinationEffect) {
            this.updateAssassinationCollapse();
        } else {
            _Sprite_Enemy_updateCollapse.call(this);
        }
    };

    // =========================================================================
    // 4. 分尸动画核心演算
    // =========================================================================
    Sprite_Enemy.prototype.updateAssassinationCollapse = function() {
        // 保证自定义 collapse 也会正常倒计时
        if (this._effectDuration > 0) {
            this._effectDuration--;
        }

        // 第一阶段：触发死亡时的白光闪烁
        if (this._effectDuration === 89) {
            this.setBlendColor([255, 255, 255, 180]);
        }

        // 第二阶段：切断瞬间
        if (this._effectDuration === 60) {
            this.setBlendColor([0, 0, 0, 0]);

            // 音效与震屏
            AudioManager.playSe({ name: "Slash1", volume: 90, pitch: 100, pan: 0 });
            $gameScreen.startShake(5, 5, 15);

            // 生成 4 块碎片
            this.createAssassinationParts();

            // 隐藏原始怪物贴图
            this.opacity = 0;
        }

        // 第三阶段：碎片抛物线飞散
        if (this._effectDuration < 60 && this._assassinationParts) {
            for (const part of this._assassinationParts) {
                part.x += part.vx;
                part.vy += 0.5;
                part.y += part.vy;
                part.rotation += part.vr;

                if (this._effectDuration < 20) {
                    part.opacity -= 13;
                    if (part.opacity < 0) part.opacity = 0;
                }
            }
        }

        // 收尾清理
        if (this._effectDuration === 0) {
            this.cleanupAssassinationParts();
            this.opacity = 0;
            this.blendMode = 0;
            this.setBlendColor([0, 0, 0, 0]);
            this._isAssassinationEffect = false;
        }
    };

    // =========================================================================
    // 5. 精灵图切片生成器
    // =========================================================================
    Sprite_Enemy.prototype.createAssassinationParts = function() {
        this.cleanupAssassinationParts();
        this._assassinationParts = [];

        if (!this.bitmap || !this.parent) return;

        const fw = this._frame.width;
        const fh = this._frame.height;
        const fx = this._frame.x;
        const fy = this._frame.y;

        const scaleX = this.scale.x;
        const scaleY = this.scale.y;

        // Sprite_Enemy 的默认锚点通常是底部居中
        const centerX = this.x;
        const centerY = this.y - (fh / 2) * scaleY;

        const configs = [
            {
                rect: [fx, fy, fw / 2, fh / 2],
                ox: -fw / 4 * scaleX,
                oy: -fh / 4 * scaleY,
                vx: -3,
                vy: -6,
                vr: -0.1
            },
            {
                rect: [fx + fw / 2, fy, fw / 2, fh / 2],
                ox: fw / 4 * scaleX,
                oy: -fh / 4 * scaleY,
                vx: 3,
                vy: -6,
                vr: 0.1
            },
            {
                rect: [fx, fy + fh / 2, fw / 2, fh / 2],
                ox: -fw / 4 * scaleX,
                oy: fh / 4 * scaleY,
                vx: -1.5,
                vy: -2,
                vr: -0.05
            },
            {
                rect: [fx + fw / 2, fy + fh / 2, fw / 2, fh / 2],
                ox: fw / 4 * scaleX,
                oy: fh / 4 * scaleY,
                vx: 1.5,
                vy: -2,
                vr: 0.05
            }
        ];

        for (const conf of configs) {
            const part = new Sprite(this.bitmap);
            part.setFrame(conf.rect[0], conf.rect[1], conf.rect[2], conf.rect[3]);
            part.anchor.x = 0.5;
            part.anchor.y = 0.5;
            part.scale.x = scaleX;
            part.scale.y = scaleY;
            part.x = centerX + conf.ox;
            part.y = centerY + conf.oy;

            // 轻微随机扰动
            part.vx = conf.vx + (Math.random() - 0.5) * 3;
            part.vy = conf.vy + (Math.random() - 0.5) * 3;
            part.vr = conf.vr + (Math.random() - 0.5) * 0.05;

            part.blendMode = this.blendMode;
            part.setColorTone(copyTone(this._colorTone));

            this.parent.addChild(part);
            this._assassinationParts.push(part);
        }
    };

    // =========================================================================
    // 6. 垃圾回收机制
    // =========================================================================
    Sprite_Enemy.prototype.cleanupAssassinationParts = function() {
        if (this._assassinationParts) {
            for (const part of this._assassinationParts) {
                if (part.parent) {
                    part.parent.removeChild(part);
                }
                if (part.destroy) {
                    part.destroy();
                }
            }
            this._assassinationParts = null;
        }
    };

    const _Sprite_Enemy_destroy = Sprite_Enemy.prototype.destroy;
    Sprite_Enemy.prototype.destroy = function(options) {
        this.cleanupAssassinationParts();
        _Sprite_Enemy_destroy.call(this, options);
    };

})();