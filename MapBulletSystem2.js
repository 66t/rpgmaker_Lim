/*:
 * @target MZ
 * @plugindesc 맵 탄막 시스템
 *
 * @help
 * ============================================================================
 * ============================================================================
 *
 * @command fire
 * @text 탄막 발사 (CS 모드)
 *
 * @arg eventId
 * @text 발사원 이벤트 ID
 * @type number
 * @min -1
 * @desc 0: 현재 이벤트, -1: 플레이어, 기타: 지정 ID.
 * @default 0
 *
 * @arg count
 * @text 탄환 개수
 * @type number
 * @min 1
 * @default 1
 *
 * @arg range
 * @text 커버 범위 (도)
 * @type number
 * @min 0
 * @max 360
 * @default 0
 *
 * @arg baseAngle
 * @text 기본 각도 (-1 ~ 360)
 * @type number
 * @min -1
 * @max 360
 * @desc 0: 오른쪽, 90: 아래, 180: 왼쪽, 270: 위. -1 입력 시 자동 조준(자기狙) 활성화.
 * @default 90
 *
 * @arg speed
 * @text 초기 속도
 * @type number
 * @decimals 3
 * @default 0.100
 *
 * @arg accel
 * @text 가속도
 * @type number
 * @decimals 4
 * @default 0.0000
 *
 * @arg angularVel
 * @text 각속도 (회전)
 * @type number
 * @decimals 2
 * @default 0.00
 *
 * @arg duration
 * @text 생존 시간 (프레임)
 * @type number
 * @min 1
 * @default 180
 *
 * @arg charName
 * @text 탄환 이미지
 * @type file
 * @dir img/characters
 * @default !Flame
 *
 * @arg charIndex
 * @text 이미지 인덱스
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @arg hitCommonEvent
 * @text 명중 공통 이벤트
 * @type common_event
 * @desc 플레이어 명중 후 트리거되는 공통 이벤트 ID. 0은 트리거하지 않습니다.
 * @default 0
 *
 * @arg tasks
 * @text 이벤트 태스크 (JSON)
 * @type note
 * @desc 예: [{"time":60,"speed":0.05}]
 * @default ""
 */

(() => {
    const pluginName = "MapBulletSystem2";
    const ToRad = deg => (deg * Math.PI) / 180;

    //=============================================================================
    // Game_Map
    //=============================================================================
    const _Game_Map_initialize = Game_Map.prototype.initialize;
    Game_Map.prototype.initialize = function() {
        _Game_Map_initialize.call(this);
        this._bullets = [];
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (sceneActive) {
            this._bullets = this._bullets.filter(b => !b._needsDestroy);
            for (const bullet of this._bullets) bullet.update();
        }
    };

    //=============================================================================
    // Game_Bullet
    //=============================================================================
    class Game_Bullet {
        constructor(config) {
            this.x = config.x;
            this.y = config.y;
            this.angle = config.angle || 0;
            this.speed = config.speed || 0;
            this.accel = config.accel || 0;
            this.angularVel = config.angularVel || 0;
            this.duration = config.duration || 180;
            this.charName = config.charName;
            this.charIndex = config.charIndex || 0;
            this.hitCommonEvent = config.hitCommonEvent || 0;

            try {
                this.tasks = config.tasks ? JSON.parse(config.tasks) : [];
            } catch (e) {
                this.tasks = [];
            }

            this._age = 0;
            this._needsDestroy = false;
            this._spriteCreated = false;
        }

        update() {
            this._age++;
            if (this._age > this.duration) {
                this._needsDestroy = true;
                return;
            }

            for (const task of this.tasks) {
                if (this._age === task.time) {
                    if (task.speed !== undefined) this.speed = task.speed;
                    if (task.angle !== undefined) this.angle = task.angle;
                    if (task.accel !== undefined) this.accel = task.accel;
                    if (task.angularVel !== undefined) this.angularVel = task.angularVel;
                }
            }

            this.speed += this.accel;
            this.angle += this.angularVel;

            const rad = ToRad(this.angle);
            this.x += Math.cos(rad) * this.speed;
            this.y += Math.sin(rad) * this.speed;

            if (this.x < -2 || this.y < -2 || this.x > $gameMap.width() + 2 || this.y > $gameMap.height() + 2) {
                this._needsDestroy = true;
            }

            this.checkCollision();
        }

        checkCollision() {
            const px = $gamePlayer._realX;
            const py = $gamePlayer._realY;
            const distSq = Math.pow(this.x - px, 2) + Math.pow(this.y - py, 2);
            if (distSq < 0.15) {
                this._needsDestroy = true;
                if (this.hitCommonEvent > 0) {
                    $gameTemp.reserveCommonEvent(this.hitCommonEvent);
                }
            }
        }
    }

    //=============================================================================
    // Sprite_Bullet
    //=============================================================================
    class Sprite_Bullet extends Sprite {
        constructor(bullet) {
            super();
            this._bullet = bullet;
            this.anchor.set(0.5, 0.5);
            this.z = 6;
            this.visible = false;
            this.bitmap = ImageManager.loadCharacter(this._bullet.charName);
        }

        update() {
            super.update();
            if (!this._bullet || this._bullet._needsDestroy) return;

            if (!this.visible && this.bitmap.isReady() && this.bitmap.width > 0) {
                this.setupFrame();
                this.visible = true;
            }

            if (this.visible) {
                const tw = $gameMap.tileWidth();
                const th = $gameMap.tileHeight();
                this.x = $gameMap.adjustX(this._bullet.x) * tw + tw / 2;
                this.y = $gameMap.adjustY(this._bullet.y) * th + th / 2;
                this.rotation = ToRad(this._bullet.angle + 90);
            }
        }

        setupFrame() {
            const isBig = ImageManager.isBigCharacter(this._bullet.charName);
            const pw = this.bitmap.width / (isBig ? 3 : 12);
            const ph = this.bitmap.height / (isBig ? 4 : 8);
            const n = isBig ? 0 : this._bullet.charIndex;
            const sx = (n % 4 * 3 + 1) * pw;
            const sy = (Math.floor(n / 4) * 4) * ph;
            this.setFrame(sx, sy, pw, ph);
        }
    }
    
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        this._bulletSprites = [];
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        this.updateBulletSprites();
    };

    Spriteset_Map.prototype.updateBulletSprites = function() {
        const bullets = $gameMap._bullets;
        for (const bullet of bullets) {
            if (!bullet._spriteCreated) {
                const sprite = new Sprite_Bullet(bullet);
                this._bulletSprites.push(sprite);
                this._tilemap.addChild(sprite);
                bullet._spriteCreated = true;
            }
        }
        for (let i = this._bulletSprites.length - 1; i >= 0; i--) {
            const sprite = this._bulletSprites[i];
            if (sprite._bullet._needsDestroy) {
                this._tilemap.removeChild(sprite);
                sprite.destroy();
                this._bulletSprites.splice(i, 1);
            }
        }
    };
    
    PluginManager.registerCommand(pluginName, "fire", function(args) {
        let source;
        const eId = Number(args.eventId);
        if (eId === 0) source = $gameMap.event(this.eventId());
        else if (eId === -1) source = $gamePlayer;
        else source = $gameMap.event(eId);

        if (!source) return;

        let baseAngle = Number(args.baseAngle);
        if (baseAngle === -1) {
            const dx = $gamePlayer._realX - source._realX;
            const dy = $gamePlayer._realY - source._realY;
            baseAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        }

        const count = Math.max(1, Number(args.count));
        const range = Number(args.range);
        const startAngle = baseAngle - range / 2;
        const step = count > 1 ? range / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            $gameMap._bullets.push(new Game_Bullet({
                x: source._realX,
                y: source._realY,
                angle: startAngle + step * i,
                speed: Number(args.speed),
                accel: Number(args.accel),
                angularVel: Number(args.angularVel),
                duration: Number(args.duration),
                charName: args.charName,
                charIndex: Number(args.charIndex),
                hitCommonEvent: Number(args.hitCommonEvent),
                tasks: args.tasks
            }));
        }
    });

})();