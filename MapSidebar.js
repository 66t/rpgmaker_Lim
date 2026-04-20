/*:
 * @target MZ
 * @plugindesc [Limpid] 맵 렌더링 너비를 줄이고 변수를 표시하는 사이드바 창을 생성합니다.
 * @author Limpid
 *
 * @param SidebarWidth
 * @text 사이드바 너비
 * @desc 사이드바가 차지할 픽셀 너비입니다.
 * @type number
 * @default 200
 *
 * @param SidebarPosition
 * @text 사이드바 위치
 * @desc 사이드바를 표시할 화면 위치를 선택합니다.
 * @type select
 * @option 왼쪽
 * @value left
 * @option 오른쪽
 * @value right
 * @default right
 *
 * @param VariableList
 * @text 표시할 변수 목록
 * @desc 사이드바 창에 실시간으로 표시할 변수 ID 목록입니다.
 * @type variable[]
 * @default [1, 2, 3]
 *
 * @help
 * 이 플러그인은 맵 화면의 가로 너비를 줄이고 남는 공간에 변수를 표시하는 창을 만듭니다.
 * * [주요 기능]
 * 1. 물리적 렌더링 제한: 사이드바 영역 아래로 맵이나 캐릭터가 그려지지 않도록 마스크 처리를 합니다.
 * 2. 터치 UI 자동 조정: 메뉴 버튼 등 터치 UI 버튼이 사이드바에 가려지지 않도록 위치를 조정합니다.
 * 3. 대화창 최적화: 메시지 윈도우가 줄어든 맵 영역에 맞춰 자동으로 너비가 조절됩니다.
 */

(() => {
    const pluginName = "MapSidebar";
    const parameters = PluginManager.parameters(pluginName);
    const sidebarWidth = Number(parameters['SidebarWidth'] || 200);
    const sidebarPos = parameters['SidebarPosition'] || 'right';
    const variableList = JSON.parse(parameters['VariableList'] || "[]").map(Number);

    const getMapVisibleWidth = () => Graphics.width - sidebarWidth;
    const getMapXOffset = () => (sidebarPos === 'left' ? sidebarWidth : 0);

    // --- 1. 로직 층: 맵 좌표 및 카메라 제한 수정 ---
    Game_Map.prototype.screenTileX = function() {
        return getMapVisibleWidth() / this.tileWidth();
    };

    // --- 2. 렌더링 층: 맵 마스크 및 오프셋 설정 ---
    const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _Spriteset_Map_createLowerLayer.call(this);
        this.createMapMask();
    };

    // 사이드바 영역에 맵이 그려지지 않도록 물리적 마스크 생성
    Spriteset_Map.prototype.createMapMask = function() {
        const mask = new PIXI.Graphics();
        mask.beginFill(0xFFFFFF);
        mask.drawRect(getMapXOffset(), 0, getMapVisibleWidth(), Graphics.height);
        mask.endFill();
        this.addChild(mask);
        this.mask = mask;
    };

    const _Spriteset_Map_update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        _Spriteset_Map_update.call(this);
        this.x = getMapXOffset();
    };

    // --- 3. UI 층: 터치 버튼(메뉴 버튼 등) 위치 수정 ---
    const _Scene_Map_buttonAreaRect = Scene_Map.prototype.buttonAreaRect;
    Scene_Map.prototype.buttonAreaRect = function() {
        const rect = _Scene_Map_buttonAreaRect.call(this);
        rect.width = getMapVisibleWidth();
        if (sidebarPos === 'left') rect.x = sidebarWidth;
        return rect;
    };

    const _Scene_Map_updateButtonsConfig = Scene_Map.prototype.updateButtonsConfig;
    Scene_Map.prototype.updateButtonsConfig = function() {
        _Scene_Map_updateButtonsConfig.call(this);
        if (this._menuButton) {
            // 사이드바 위치에 따라 메뉴 버튼 좌표 강제 보정
            if (sidebarPos === 'right') {
                this._menuButton.x = getMapVisibleWidth() - this._menuButton.width - 4;
            } else {
                this._menuButton.x = Graphics.width - this._menuButton.width - 4;
            }
        }
    };

    // --- 4. 사이드바 윈도우 클래스 정의 ---
    class Window_MapSidebar extends Window_Base {
        constructor(rect) {
            super(rect);
            this.refresh();
        }
        update() {
            super.update();
            // 성능을 위해 15프레임마다 갱신
            if (Graphics.frameCount % 15 === 0) this.refresh();
        }
        refresh() {
            this.contents.clear();
            let y = 0;
            variableList.forEach(varId => {
                const name = $dataSystem.variables[varId] || `Variable ${varId}`;
                const value = $gameVariables.value(varId);
                this.changeTextColor(ColorManager.systemColor());
                this.drawText(name, 0, y, this.contentsWidth());
                this.resetTextColor();
                this.drawText(value, 0, y, this.contentsWidth(), "right");
                y += this.lineHeight();
            });
        }
    }

    // --- 5. 맵 장면(Scene_Map) 통합 ---
    const _Scene_Map_create = Scene_Map.prototype.create;
    Scene_Map.prototype.create = function() {
        this._originalBoxWidth = Graphics.boxWidth;
        // 대화창 등이 사이드바를 피하도록 박스 너비 조정
        Graphics.boxWidth = getMapVisibleWidth();
        _Scene_Map_create.call(this);
    };

    const _Scene_Map_createWindowLayer = Scene_Map.prototype.createWindowLayer;
    Scene_Map.prototype.createWindowLayer = function() {
        _Scene_Map_createWindowLayer.call(this);
        if (sidebarPos === 'left') {
            this._windowLayer.x = sidebarWidth;
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createMapSidebarWindow();
    };

    Scene_Map.prototype.createMapSidebarWindow = function() {
        const x = (sidebarPos === 'left' ? 0 : getMapVisibleWidth());
        const rect = new Rectangle(x, 0, sidebarWidth, Graphics.height);
        this._sidebarWindow = new Window_MapSidebar(rect);
        // 최상단 레이어에 추가하여 맵 마스크의 영향을 받지 않게 함
        this.addChild(this._sidebarWindow);
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        _Scene_Map_terminate.call(this);
        // 장면 전환 시 전역 박스 너비 복구
        Graphics.boxWidth = this._originalBoxWidth;
    };
})();