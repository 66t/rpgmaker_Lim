/*:
 * @target MZ
 * @plugindesc 교역 시스템 - 동적 가격 및 수요/공급 로직
 * @author limpid_
 * * @param RefreshInterval
 * @text 가격 갱신 간격
 * @desc 가격을 갱신할 프레임 단위 간격입니다 (60프레임 = 1초).
 * @default 3600
 *
 * @help
 * TradeSystem.js
 * * 이 플러그인은 맵별로 아이템의 재고를 관리하며, 재고량에 따라 
 * 실시간으로 매입/매각 가격이 변동하는 시스템을 제공합니다.
 *
 * [스크립트 명령 사용법]
 * * 1. 교역소 상점 열기:
 * TradeManager.openTrade($gameMap.mapId());
 * (현재 맵의 동적 가격이 적용된 상점 창을 엽니다.)
 *
 * 2. NPC의 생산 및 소비 시뮬레이션:
 * TradeManager.simulateLife(mapId, itemId, amount);
 * - amount가 양수(+)이면: NPC가 상품을 생산 (공급 증가 -> 가격 하락)
 * - amount가 음수(-)이면: NPC가 상품을 소비 (수요 증가 -> 가격 상승)
 *
 * 3. 예시:
 * TradeManager.simulateLife($gameMap.mapId(), 1, -5); 
 * (1번 아이템의 재고를 5개 줄여 가격을 상승시킴)
 */

var TradeManager = TradeManager || {};

(() => {
    const pluginName = "TradeSystem";
    const params = PluginManager.parameters(pluginName);
    const REFRESH_INTERVAL = Number(params['RefreshInterval'] || 3600);

    // 데이터 초기화
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._marketData = {};
        this._tradeTimer = 0;
    };

    // 동적 가격 계산 로직
    TradeManager.getPrice = function(mapId, itemId, isBuying) {
        const item = $dataItems[itemId];
        if (!item) return 0;

        const basePrice = item.price;
        const market = this.getMapMarket(mapId, itemId);

        // 공급과 수요 곡선 알고리즘:
        // 기준 재고(100)보다 적으면 가격 상승, 많으면 가격 하락
        let ratio = 100 / (market.stock + 1);
        ratio = Math.max(0.5, Math.min(2.5, ratio)); // 가격 변동 폭 제한 (0.5배 ~ 2.5배)

        let finalPrice = basePrice * ratio;

        // 매입/매각 가격 차이 (매입가에 10% 수수료 추가, 매각가는 10% 차감)
        return isBuying ? Math.ceil(finalPrice * 1.1) : Math.floor(finalPrice * 0.9);
    };

    TradeManager.getMapMarket = function(mapId, itemId) {
        if (!$gameSystem._marketData[mapId]) $gameSystem._marketData[mapId] = {};
        if (!$gameSystem._marketData[mapId][itemId]) {
            // 초기 재고는 100으로 설정
            $gameSystem._marketData[mapId][itemId] = { stock: 100 };
        }
        return $gameSystem._marketData[mapId][itemId];
    };

    // 시간 경과에 따른 가격 자동 갱신
    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        this.updateTradeTimer();
    };

    Scene_Map.prototype.updateTradeTimer = function() {
        $gameSystem._tradeTimer++;
        if ($gameSystem._tradeTimer >= REFRESH_INTERVAL) {
            TradeManager.refreshAllMarkets();
            $gameSystem._tradeTimer = 0;
        }
    };

    TradeManager.refreshAllMarkets = function() {
        for (let mapId in $gameSystem._marketData) {
            for (let itemId in $gameSystem._marketData[mapId]) {
                const market = $gameSystem._marketData[mapId][itemId];
                // 재고가 서서히 기준치(100)로 수렴하며 무작위 변동 발생
                market.stock += (100 - market.stock) * 0.05 + (Math.random() * 6 - 3);
                market.stock = Math.max(1, market.stock);
            }
        }
    };

    // NPC 생산/소비 인터랙션
    TradeManager.simulateLife = function(mapId, itemId, amount) {
        const market = this.getMapMarket(mapId, itemId);
        market.stock += amount;
    };

    // 상점 인터페이스 연결
    TradeManager.openTrade = function(mapId) {
        const goods = this.getAvailableGoods(mapId);
        const shopGoods = goods.map(id => [0, id, 1, 0]);

        // 상점 매입가 오버라이드
        const _Window_ShopBuy_price = Window_ShopBuy.prototype.price;
        Window_ShopBuy.prototype.price = function(item) {
            if (item && $gameSystem._marketData[mapId]) {
                return TradeManager.getPrice(mapId, item.id, true);
            }
            return _Window_ShopBuy_price.call(this, item);
        };

        // 상점 매각가 오버라이드
        const _Scene_Shop_sellingPrice = Scene_Shop.prototype.sellingPrice;
        Scene_Shop.prototype.sellingPrice = function() {
            const item = this._item;
            if (item && $gameSystem._marketData[mapId]) {
                return TradeManager.getPrice(mapId, item.id, false);
            }
            return _Scene_Shop_sellingPrice.call(this);
        };

        SceneManager.push(Scene_Shop);
        SceneManager.prepareNextScene(shopGoods, false);
    };

    // 맵별 취급 상품 설정 (예시: 1~10번 아이템)
    TradeManager.getAvailableGoods = function(mapId) {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    };

})();