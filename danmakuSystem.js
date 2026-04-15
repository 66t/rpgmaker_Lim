/*:
 * @target MZ
 * @plugindesc [danmakuSystem] 전문가용 물리 탄막 시스템 (변수 및 수식 계산 지원)
 * @author Limpid
 *
 * @help
 * ============================================================================
 * [LIMPID] 기능 소개 (Features)
 * ============================================================================
 * 이 플러그인은 탄막 물리 모델을 완벽하게 재현하며, 
 * RPG Maker의 프레임 업데이트(1/60초)를 통해 총알의 궤적을 계산합니다.
 * * * [신규 기능: 동적 변수 및 수학 수식 지원]
 * 이제 대부분의 수치 입력란(속도, 각도, 발사 수 등)에 변수와 수학 수식을 
 * 직접 입력할 수 있습니다!
 * - 문법: ${변수ID}를 사용하여 게임 변수의 값을 읽어옵니다.
 * - 연산: +, -, *, / 및 괄호( )를 지원합니다.
 * - 예시 1: 속도를 1번 변수 값에 50을 더한 값으로 설정 -> ${1} + 50 입력
 * - 예시 2: 발사 수를 2번 변수의 두 배로 설정 -> ${2} * 2 입력
 * - 예시 3: 순수 숫자도 정상적으로 작동합니다 -> 250 입력
 *
 * ============================================================================
 * 플러그인 커맨드 (Plugin Commands)
 * ============================================================================
 * 【탄막 발사】 (Fire)
 * 지정된 위치에서 물리 속성을 가진 탄막을 발사합니다.
 *
 * @command fire
 * @text 탄막 발사 (Fire)
 * @desc 설정된 물리 파라미터에 따라 탄막을 발사합니다.
 *
 * @arg bindType
 * @text 발사원 유형 (Bind Type)
 * @type select
 * @option 절대 좌표 (아래의 X, Y 사용)
 * @value absolute
 * @option 플레이어 (Player)
 * @value player
 * @option 이벤트 (현재 이벤트 또는 지정 ID)
 * @value event
 * @default event
 *
 * @arg eventId
 * @text 발사원 이벤트 ID
 * @desc 0을 입력하면 현재 이벤트를 의미합니다. 수식 지원 (예: ${1})
 * @type string
 * @default 0
 *
 * @arg x
 * @text 절대 좌표 X (타일 단위)
 * @desc 수식 지원 (예: ${2} + 5)
 * @type string
 * @default 0
 *
 * @arg y
 * @text 절대 좌표 Y (타일 단위)
 * @desc 수식 지원 (예: ${3} + 5)
 * @type string
 * @default 0
 *
 * @arg count
 * @text 발사 수량 (Count)
 * @desc 한 번에 발사할 총알의 수입니다. 수식 지원 (예: ${1} + 3)
 * @type string
 * @default 1
 *
 * @arg range
 * @text 부채꼴 범위 (각도)
 * @desc 0은 단일 방향, 0보다 크면 부채꼴 형태로 발사합니다. 수식 지원
 * @type string
 * @default 0
 *
 * @arg startAngle
 * @text 시작 각도 (도)
 * @desc 0은 우측, 90은 하단, 180은 좌측, 270은 상단을 향합니다. 수식 지원
 * @type string
 * @default 90
 *
 * @arg speed
 * @text 기본 속도 (픽셀/초)
 * @desc 수식 지원 (예: ${1} * 1.5 + 100)
 * @type string
 * @default 250
 *
 * @arg acc
 * @text 가속도 (픽셀/초²)
 * @desc 수식 지원
 * @type string
 * @default 0
 *
 * @arg pVel
 * @text 자전 속도 (도/초)
 * @desc 수식 지원
 * @type string
 * @default 0
 *
 * @arg rVel
 * @text 편향 속도 (도/초)
 * @desc 수식 지원
 * @type string
 * @default 0
 *
 * @arg hitRadius
 * @text 충돌 반경 (픽셀)
 * @desc 플레이어 명중 판정 크기입니다. 수식 지원
 * @type string
 * @default 12
 *
 * @arg hitCommonEvent
 * @text 명중 시 커먼 이벤트
 * @desc 플레이어 명중 시 트리거되는 커먼 이벤트 ID입니다.
 * @type common_event
 * @default 0
 *
 * @arg vanishRegions
 * @text 소멸 지역 (Region)
 * @desc 쉼표로 구분된 지역 ID (예: 1,2). 총알이 닿으면 소멸됩니다.
 * @type string
 * @default 
 *
 * @arg bounceRegions
 * @text 반사 지역 (Region)
 * @desc 쉼표로 구분된 지역 ID (예: 4,5). 총알이 닿으면 물리적 반사가 발생합니다.
 * @type string
 * @default 
 *
 * @arg duration
 * @text 유지 시간 (초)
 * @desc 수식 지원
 * @type string
 * @default 10.0
 *
 * @arg charName
 * @text 총알 캐릭터 칩 (Character)
 * @type file
 * @dir img/characters/
 *
 * @arg charIndex
 * @text 캐릭터 칩 인덱스
 * @desc 수식 지원
 * @type string
 * @default 0
 *
 * @arg stepAnimSpeed
 * @text 발걸음 애니메이션 속도(프레임)
 * @desc 0은 재생 안 함, 기본값은 10입니다. 수식 지원
 * @type string
 * @default 10
 */

(() => {
    const pluginName = "danmakuSystem";

    // ========================================================================
    // 유틸리티 함수: 동적 수식 파서 (Dynamic Formula Parser)
    // ========================================================================
    const parseMath = (val, defaultVal = 0) => {
        if (val === undefined || val === null || val === "") return defaultVal;

        // 숫자로 직접 변환을 시도하며, 순수 숫자인 경우 바로 반환하여 성능 최적화
        const numCheck = Number(val);
        if (!isNaN(numCheck)) return numCheck;

        try {
            const expr = String(val).replace(/\$\{(\d+)\}/g, (match, p1) => {
                return $gameVariables.value(Number(p1));
            });
            return Number(Function("return " + expr)());
        } catch (e) {
            // 오류 발생 시 (예: 잘못된 수식 입력) 게임 크래시를 방지하기 위해 기본값 반환
            return defaultVal;
        }
    };

    // ========================================================================
    // Game_DanmakuBullet
    // ========================================================================
    class Game_DanmakuBullet {
        constructor(params) {
            this.id = Date.now() + "_" + Math.random();

            this.px = params.startX * 48 + 24;
            this.py = params.startY * 48 + 24;
            this.p = params.startAngle;
            this.r = 0;
            this.speed = params.speed;
            this.acc = params.acc;
            this.pVel = params.pVel;
            this.rVel = params.rVel;

            this.charName = params.charName || "";
            this.charIndex = params.charIndex || 0;
            this.stepAnimSpeed = params.stepAnimSpeed !== undefined ? params.stepAnimSpeed : 10;

            this.life = 0;
            this.duration = params.duration;

            this.hitRadiusSq = params.hitRadius * params.hitRadius;
            this.hitCommonEvent = params.hitCommonEvent;

            this.vanishRegions = params.vanishRegions;
            this.bounceRegions = params.bounceRegions;

            this.toBeRemoved = false;
        }

        update() {
            const dt = 1 / 60; // 델타 타임 (Delta Time)
            this.life += dt;

            if (this.life >= this.duration) {
                this.toBeRemoved = true;
                return;
            }

            const prevPx = this.px;
            const prevPy = this.py;

            this.p += this.pVel * dt;
            this.r += this.rVel * dt;
            this.speed += this.acc * dt;

            const rad = ((this.p + this.r) * Math.PI) / 180;
            this.px += Math.cos(rad) * this.speed * dt;
            this.py += Math.sin(rad) * this.speed * dt;

            const tileX = Math.floor(this.px / 48);
            const tileY = Math.floor(this.py / 48);
            const prevTileX = Math.floor(prevPx / 48);
            const prevTileY = Math.floor(prevPy / 48);

            // 맵 경계 확인 (Map bounds check)
            if (!$gameMap.isValid(tileX, tileY)) {
                this.toBeRemoved = true;
                return;
            }

            const regionId = $gameMap.regionId(tileX, tileY);

            // 소멸 구역 처리 (Vanish region check)
            if (this.vanishRegions.includes(regionId)) {
                this.toBeRemoved = true;
                return;
            }

            // 반사 구역 처리 (Bounce region check)
            if (this.bounceRegions.includes(regionId)) {
                let bounced = false;
                if (tileX !== prevTileX) {
                    this.p = 180 - this.p;
                    this.r = -this.r;
                    this.px = prevPx;
                    bounced = true;
                }
                if (tileY !== prevTileY) {
                    this.p = -this.p;
                    this.r = -this.r;
                    this.py = prevPy;
                    bounced = true;
                }
                if (!bounced) {
                    this.p += 180;
                    this.px = prevPx;
                    this.py = prevPy;
                }
            }

            // 플레이어 충돌 판정 (Player collision detection)
            const playerPx = ($gamePlayer._realX + 0.5) * 48;
            const playerPy = ($gamePlayer._realY + 0.5) * 48 - 6;

            const distSq = Math.pow(this.px - playerPx, 2) + Math.pow(this.py - playerPy, 2);
            if (distSq <= this.hitRadiusSq) {
                this.toBeRemoved = true;
                if (this.hitCommonEvent > 0) {
                    $gameTemp.reserveCommonEvent(this.hitCommonEvent);
                }
            }
        }
    }

    // ========================================================================
    // Game_Map 확장 (Game_Map Extension)
    // ========================================================================
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function(mapId) {
        _Game_Map_setup.call(this, mapId);
        this._danmakuBullets = [];
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.call(this, sceneActive);
        if (sceneActive && this._danmakuBullets) {
            for (let i = this._danmakuBullets.length - 1; i >= 0; i--) {
                const bullet = this._danmakuBullets[i];
                bullet.update();
                if (bullet.toBeRemoved) {
                    this._danmakuBullets.splice(i, 1);
                }
            }
        }
    };

    // ========================================================================
    // Spriteset_Map 렌더링 레이어 확장 (Spriteset_Map Rendering Layer Extension)
    // ========================================================================
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        this._bulletSprites = [];
        this._bulletContainer = new Sprite();
        this._tilemap.addChild(this._bulletContainer);
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        this.updateDanmakuBullets();
    };

    Spriteset_Map.prototype.updateDanmakuBullets = function() {
        const bullets = $gameMap._danmakuBullets;
        if (!bullets) return;

        const tw = $gameMap.tileWidth();
        const th = $gameMap.tileHeight();

        for (let i = 0; i < bullets.length; i++) {
            let sprite = this._bulletSprites[i];
            if (!sprite) {
                sprite = new Sprite();
                sprite.anchor.set(0.5, 0.5);
                this._bulletSprites[i] = sprite;
                this._bulletContainer.addChild(sprite);
            }

            const b = bullets[i];

            if (sprite._lastChar !== b.charName) {
                sprite.bitmap = ImageManager.loadCharacter(b.charName);
                sprite._lastChar = b.charName;
                sprite._ready = false;
            }

            if (sprite.bitmap && sprite.bitmap.isReady()) {
                const isBig = ImageManager.isBigCharacter(b.charName);
                const bw = sprite.bitmap.width / (isBig ? 3 : 12);
                const bh = sprite.bitmap.height / (isBig ? 4 : 8);
                const n = isBig ? 0 : b.charIndex;

                let pattern = 1;
                if (b.stepAnimSpeed > 0) {
                    const stepCycle = Math.floor(Graphics.frameCount / b.stepAnimSpeed) % 4;
                    const patternMap = [1, 2, 1, 0];
                    pattern = patternMap[stepCycle];
                }

                const sx = ((n % 4) * 3 + pattern) * bw;
                const sy = Math.floor(n / 4) * 4 * bh;
                sprite.setFrame(sx, sy, bw, bh);
                sprite._ready = true;
            }

            sprite.x = $gameMap.adjustX(b.px / tw) * tw;
            sprite.y = $gameMap.adjustY(b.py / th) * th;
            sprite.rotation = ((b.p + b.r + 90) * Math.PI) / 180;
            sprite.visible = true;
        }

        // 남은 스프라이트 숨김 처리 (Hide unused sprites)
        for (let i = bullets.length; i < this._bulletSprites.length; i++) {
            this._bulletSprites[i].visible = false;
        }
    };

    // ========================================================================
    // 플러그인 커맨드 등록 (Plugin Command Registration)
    // ========================================================================
    PluginManager.registerCommand(pluginName, "fire", args => {
        let sx = 0;
        let sy = 0;

        if (args.bindType === "player") {
            sx = $gamePlayer._realX;
            sy = $gamePlayer._realY;
        } else if (args.bindType === "event") {
            // 이벤트 ID도 동일하게 파싱 (발사원을 변수 값에 바인딩된 이벤트로 설정 가능)
            const evIdRaw = parseMath(args.eventId, 0);
            const evId = evIdRaw === 0 ? $gameMap._interpreter.eventId() : evIdRaw;
            const ev = $gameMap.event(evId);
            if (ev) {
                sx = ev._realX;
                sy = ev._realY;
            }
        } else {
            sx = parseMath(args.x, 0);
            sy = parseMath(args.y, 0);
        }

        const parseRegions = (str) => str ? String(str).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)) : [];
        const vanish = parseRegions(args.vanishRegions);
        const bounce = parseRegions(args.bounceRegions);

        // --- 코어: parseMath를 활용하여 최종 연산 결과를 파싱 ---
        const count = Math.max(1, parseMath(args.count, 1));
        const range = parseMath(args.range, 0);
        const baseAngle = parseMath(args.startAngle, 90);

        const step = count > 1 ? range / (count - 1) : 0;
        const startOffset = count > 1 ? range / 2 : 0;

        for (let i = 0; i < count; i++) {
            const finalAngle = baseAngle + (i * step - startOffset);

            const bullet = new Game_DanmakuBullet({
                startX: sx,
                startY: sy,
                speed: parseMath(args.speed, 250),
                acc: parseMath(args.acc, 0),
                pVel: parseMath(args.pVel, 0),
                rVel: parseMath(args.rVel, 0),
                startAngle: finalAngle,
                hitRadius: parseMath(args.hitRadius, 12),
                hitCommonEvent: parseMath(args.hitCommonEvent, 0),
                duration: parseMath(args.duration, 10.0),
                vanishRegions: vanish,
                bounceRegions: bounce,
                charName: args.charName,
                charIndex: parseMath(args.charIndex, 0),
                stepAnimSpeed: parseMath(args.stepAnimSpeed, 10)
            });

            $gameMap._danmakuBullets.push(bullet);
        }
    });

})();