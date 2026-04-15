//=============================================================================
// LIMPID_GameBullet.js
//=============================================================================

/*:
 * @target MV MZ
 * @plugindesc 게임 내 총알
 * @author LIMPID
 *
 * @help
 * ============================================================================
 * [LIMPID] Game_Bullet
 * ============================================================================
 * 게임 내 총알의 이동, 수명 주기, 충돌 플래그 및 궤도 회전 로직을 처리합니다.
 */

//-----------------------------------------------------------------------------
// Game_Bullet
//
// 게임 내 총알(Bullet) 엔티티 클래스.

function Game_Bullet() {
    this.initialize(...arguments);
}

// 총알이 특정 기본 클래스(예: Game_CharacterBase)를 상속하도록 하려면 아래 두 줄의 주석을 해제하세요:
// Game_Bullet.prototype = Object.create(Game_CharacterBase.prototype);
// Game_Bullet.prototype.constructor = Game_Bullet;

Game_Bullet.prototype.initialize = function() {
    this.initMembers();
};

Game_Bullet.prototype.initMembers = function() {
    // 엔티티 속성 (Entity Properties)
    this._id = 0;                   // ID
    this._name = "";                // 이름 (Name)
    this._tag = "";                 // 태그 (Tag)
    this._group = 0;                // 그룹 (Group)

    // 수명 주기 및 타이머 (Lifecycle & Timing)
    this._birthFrame = 0;           // 생성 프레임 (주로 Graphics.frameCount로 설정)
    this._runCount = 0;             // 실행 카운트 (Run Count)
    this._pauseCount = 0;           // 일시정지 카운트 (Pause Count)

    // 생성 및 앵커 (Spawn & Anchor)
    this._birthCenter = {x:0,y:0};  // 생성 시 중심 좌표
    this._birthRule = "";           // 생성 규칙
    this._birthPoint = {x:0,y:0};   // 생성 위치
    this._anchorPoint = {x:0,y:0};  // 앵커 포인트
    this._anchorUnit = null;        // 앵커 유닛 (주로 Game_Character 또는 Game_Battler를 가리킴)

    // 좌표 및 방향 (Coordinates & Direction)
    this._x = 0;                    // 현재 X 좌표
    this._y = 0;                    // 현재 Y 좌표
    this._facing = 0;               // 현재 바라보는 방향 (각도 또는 라디안)
    this._moveDirection = 0;        // 이동 방향 (각도 또는 라디안)

    // 궤도 속성 (Orbit Properties)
    this._isOrbiting = false;       // 궤도 회전 여부
    this._orbitPoint = {x:0,y:0};   // 궤도 기준점
    this._orbitCenter = null;       // 궤도 중심 유닛
    this._startAngle = 0;           // 시작 각도
    this._startDistance = 0;        // 시작 거리
    this._orbitDistance = 0;        // 궤도 반경(거리)
    this._angle = 0;                // 각도 (현재 궤도 회전 각도)

    // 운동 및 회전 (Kinematics & Rotation)
    this._speed = 0;                // 속도 (Speed)
    this._acceleration = 0;         // 가속도 (Acceleration)
    this._selfRotation = 0;         // 자전 (현재 자전 각도)
    this._angularVelocity = 0;      // 각속도 (자전 또는 궤도 회전의 변화율)
    this._fspeed = [0,0,0,0,0];
    this._frota = [0,0,0,0,0];

    // 충돌 및 상태 플래그 (Collision & State Flags)
    this._isHit = true;             // 명중 여부
    this._hitFlag = 0;              // 명중 플래그
    this._reflectFlag = 0;          // 반사 플래그
    this._bounceFlag = 0;           // 바운스 플래그
    this._pierceFlag = 0;           // 관통 플래그
    this._vanishFlag = 0;           // 소멸 플래그
    this._triggerFlagA = 0;         // 트리거 플래그 A
    this._triggerFlagB = 0;         // 트리거 플래그 B
    this._triggerFlagC = 0;         // 트리거 플래그 C

    // 이벤트 및 연결 (Events & Associations)
    this._events = [];              // 이벤트 (바인딩된 트리거 이벤트 흐름이나 콜백을 저장)
    this._emitter = null;           // 발사체 (해당 총알을 발사한 소스 객체)
};



//-----------------------------------------------------------------------------
// 코어 업데이트 로직 (Core Update Logic)
//-----------------------------------------------------------------------------
Game_Bullet.prototype.update = function() {
    if (this._pauseCount > 0) {
        this._pauseCount--;
        return;
    }

    this._runCount++;

    this.updateSpeed();

    if (this._isOrbiting) {
        this.updateOrbit();
    } else {
        this.updateMove();
    }

    this.updateRotation();
    this.checkFlags();
};

Game_Bullet.prototype.updateSpeed = function() {
    if (this._acceleration !== 0) {
        this._speed += this._acceleration;
    }
};

Game_Bullet.prototype.updateMove = function() {
    // 간단한 직선 운동 로직 예시 (_moveDirection이 라디안이라고 가정)
    // this._x += Math.cos(this._moveDirection) * this._speed;
    // this._y += Math.sin(this._moveDirection) * this._speed;
};

Game_Bullet.prototype.updateOrbit = function() {
    // 궤도 로직을 처리하여 _angle을 업데이트하고 _orbitCenter를 기준으로 x/y를 재계산
    // this._angle += this._angularVelocity;
    // this._x = this._orbitCenter.x + Math.cos(this._angle) * this._orbitDistance;
    // this._y = this._orbitCenter.y + Math.sin(this._angle) * this._orbitDistance;
};

Game_Bullet.prototype.updateRotation = function() {
    if (this._angularVelocity !== 0 && !this._isOrbiting) {
        this._selfRotation += this._angularVelocity;
    }
};

Game_Bullet.prototype.checkFlags = function() {
    if (this._vanishFlag) {
        this.erase();
    }
};

Game_Bullet.prototype.erase = function() {
    // 정리 및 파괴 로직 (Cleanup or destroy logic)
};