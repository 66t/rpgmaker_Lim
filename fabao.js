/*:
 * @target MZ
 * @plugindesc [v1.0] 모듈형 법보(FaBao) 합성 시스템.
 * @author Limpid
 *
 * @command OpenFaBaoMenu
 * @text 법보 합성 메뉴 열기
 * @desc 법보를 합성하기 위한 전용 씬을 엽니다.
 */

const Lim = Lim || {};
Lim.FaBao = Lim.FaBao || {};

//=============================================================================
// FaBaoManager
// 효율적인 데이터 처리를 위한 정적 클래스. 
// 런타임 중 데이터 파싱을 최소화하기 위해 플랫 캐싱 구조를 사용함.
//=============================================================================

function FaBaoManager() {
    throw new Error('이것은 정적 클래스입니다.');
}

FaBaoManager.init = function() {
    this._recipes = [];
    this.buildRecipeCache();
};

/**
 * 초기 부팅 시 모든 아이템의 노트를 스캔하여 레시피 캐시를 구축함.
 * 이는 실행 시간(Runtime) 동안의 문자열 파싱 오버헤드를 방지하기 위함임 (Cache-friendly 접근).
 */
FaBaoManager.buildRecipeCache = function() {
    for (let i = 1; i < $dataItems.length; i++) {
        const item = $dataItems[i];
        if (item && item.meta.FaBaoRecipe) {
            // 오행 재료 추출 및 정렬 (비교 최적화를 위해 정렬 수행)
            const elements = item.meta.FaBaoRecipe.split(',').map(s => s.trim());
            const tier = Number(item.meta.FaBaoTier || 1);

            this._recipes.push({
                resultId: item.id,
                tier: tier,
                elements: elements.sort()
            });
        }
    }
};

/**
 * 합성 로직 수행.
 * @param {number} neidanId - 사용된 내단의 아이템 ID
 * @param {number[]} materialIds - 사용된 재료 아이템 ID 배열
 * @returns {object|null} 합성 성공 시 결과 아이템 객체, 실패 시 null
 */
FaBaoManager.craft = function(neidanId, materialIds) {
    const neidan = $dataItems[neidanId];
    if (!neidan || !neidan.meta.FaBaoNeidan) return null;

    const coreTier = Number(neidan.meta.FaBaoNeidan);

    // 입력된 재료로부터 오행 속성 추출 및 정렬
    const inputElements = materialIds.map(id => {
        const mat = $dataItems[id];
        return mat && mat.meta.FaBaoMaterial ? mat.meta.FaBaoMaterial : null;
    }).filter(el => el !== null).sort();

    // 레시피 리스트에서 일치하는 항목 선형 탐색 (O(N))
    for (const recipe of this._recipes) {
        if (recipe.tier === coreTier && this.arraysEqual(recipe.elements, inputElements)) {
            this.consumeItems(neidanId, materialIds);
            $gameParty.gainItem($dataItems[recipe.resultId], 1);
            return $dataItems[recipe.resultId];
        }
    }
    return null; // 일치하는 레시피 없음
};

/**
 * 합성 성공 시 소모된 아이템을 인벤토리에서 제거
 */
FaBaoManager.consumeItems = function(neidanId, materialIds) {
    $gameParty.loseItem($dataItems[neidanId], 1);
    for (const id of materialIds) {
        $gameParty.loseItem($dataItems[id], 1);
    }
};

/**
 * 두 배열의 요소가 일치하는지 확인 (정렬된 상태 전제)
 */
FaBaoManager.arraysEqual = function(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

//=============================================================================
// 시스템 훅 (System Hooks)
// 데이터베이스 로드 후 캐시 생성
//=============================================================================
const _Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);
    FaBaoManager.init();
};

//=============================================================================
// 플러그인 커맨드 등록
//=============================================================================
PluginManager.registerCommand("Lim_FaBaoCraft", "OpenFaBaoMenu", args => {
    SceneManager.push(Scene_FaBaoCraft);
});

//=============================================================================
// Scene_FaBaoCraft
// 합성을 위한 UI 프레임워크 (미니멀리즘 설계)
//=============================================================================
class Scene_FaBaoCraft extends Scene_MenuBase {
    create() {
        super.create();
        this.createMaterialsWindow();
        this.createCommandWindow();
    }

    createMaterialsWindow() {
        const rect = new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight - 100);
        this._materialsWindow = new Window_ItemList(rect);
        this._materialsWindow.setCategory('item');
        this.addWindow(this._materialsWindow);
    }

    createCommandWindow() {
        const rect = new Rectangle(0, Graphics.boxHeight - 100, Graphics.boxWidth, 100);
        this._commandWindow = new Window_Command(rect);
        this._commandWindow.setHandler('cancel', this.popScene.bind(this));
        this.addWindow(this._commandWindow);
    }
}