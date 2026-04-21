/*:
 * @target MZ
 * @plugindesc 맵 화면의 오른쪽 렌더링 영역을 잘라내어 UI 공간을 확보합니다.
 * @author Limpid
 * * @param UIWidth
 * @text 우측 여백 너비
 * @desc 화면 오른쪽에서 잘라낼 픽셀 너비입니다.
 * @type number
 * @default 200
 *
 * @help
 * 이 플러그인은 맵 렌더링 영역을 수평 방향으로 제한(절단)합니다.
 * 예를 들어 게임 해상도가 800x600이고 여백을 200으로 설정하면,
 * 맵은 왼쪽의 600x600 영역에서만 렌더링됩니다.
 */

(() => {
    const pluginName = "MapRenderTruncator";
    const parameters = PluginManager.parameters(pluginName);
    const UI_WIDTH = Number(parameters['UIWidth'] || 200);


    const _Game_Map_screenTileX = Game_Map.prototype.screenTileX;
    Game_Map.prototype.screenTileX = function() {
        return (Graphics.width - UI_WIDTH) / this.tileWidth();
    };

    const _Scene_Map_createSpriteset = Scene_Map.prototype.createSpriteset;
    Scene_Map.prototype.createSpriteset = function() {
        _Scene_Map_createSpriteset.call(this);
        this.applyMapViewportMask();
    };


    Scene_Map.prototype.applyMapViewportMask = function() {
        if (this._spriteset) {
            const mask = new PIXI.Graphics();
            mask.beginFill(0xffffff);
            mask.drawRect(0, 0, Graphics.width - UI_WIDTH, Graphics.height);
            mask.endFill();
            this.addChild(mask);
            this._spriteset.mask = mask;
        }
    };
})();