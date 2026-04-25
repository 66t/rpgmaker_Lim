//=============================================================================
// Limpid_CelestialSystem.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc 天体物理模拟与星座连线星图
 * @author Limpid
 *
 * @help Limpid_CelestialSystem.js
 * * 核心功能：
 * 1. 真实比例：天体渲染尺寸 = (真实半径 / 观测距离) 映射到屏幕 FOV。
 * 2. 物理模拟：基于 N-Body 算法的行星轨道运行。
 * 3. 观测仪表：底部显示经纬度、实时光照（W/m²）和环境温度。
 * 4. 星座星图：绘制星座连线，并在其中心显示星座名称，随所在星球自转。
 *
 * @param defaultBodies
 * @text 太阳系配置
 * @type struct<CelestialBody>[]
 * @default ["{\"name\":\"太阳\",\"color\":\"#fff5ce\",\"mass\":\"1.0\",\"radius\":\"695700\",\"x\":\"0\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"0\",\"obliquity\":\"0\",\"baseTemp\":\"5500\"}","{\"name\":\"水星\",\"color\":\"#a5a5a5\",\"mass\":\"0.000000166\",\"radius\":\"2439\",\"x\":\"0.387\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"10.12\",\"obliquity\":\"0.03\",\"baseTemp\":\"167\"}","{\"name\":\"金星\",\"color\":\"#e3bb76\",\"mass\":\"0.000002447\",\"radius\":\"6051\",\"x\":\"0.723\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"7.38\",\"obliquity\":\"177.3\",\"baseTemp\":\"464\"}","{\"name\":\"地球\",\"color\":\"#2271b3\",\"mass\":\"0.000003003\",\"radius\":\"6371\",\"x\":\"1\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"6.283\",\"obliquity\":\"23.44\",\"baseTemp\":\"15\"}","{\"name\":\"月球\",\"color\":\"#999999\",\"mass\":\"0.0000000369\",\"radius\":\"1737\",\"x\":\"1.00257\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"6.499\",\"obliquity\":\"1.54\",\"baseTemp\":\"-20\"}","{\"name\":\"火星\",\"color\":\"#e27b58\",\"mass\":\"0.000000321\",\"radius\":\"3389\",\"x\":\"1.524\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"5.08\",\"obliquity\":\"25.19\",\"baseTemp\":\"-65\"}","{\"name\":\"木星\",\"color\":\"#d39c7e\",\"mass\":\"0.0009543\",\"radius\":\"69911\",\"x\":\"5.203\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"2.76\",\"obliquity\":\"3.13\",\"baseTemp\":\"-110\"}","{\"name\":\"土星\",\"color\":\"#c5ab6e\",\"mass\":\"0.0002857\",\"radius\":\"58232\",\"x\":\"9.537\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"2.04\",\"obliquity\":\"26.73\",\"baseTemp\":\"-140\"}","{\"name\":\"天王星\",\"color\":\"#b5e1e2\",\"mass\":\"0.00004366\",\"radius\":\"25362\",\"x\":\"19.191\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"1.43\",\"obliquity\":\"97.77\",\"baseTemp\":\"-195\"}","{\"name\":\"海王星\",\"color\":\"#6081ff\",\"mass\":\"0.00005151\",\"radius\":\"24622\",\"x\":\"30.068\",\"y\":\"0\",\"vx\":\"0\",\"vy\":\"1.14\",\"obliquity\":\"28.32\",\"baseTemp\":\"-201\"}"]
 *
 * @command openSkyScene
 * @text 呼出观测界面
 *
 * @command setObserver
 * @text 设置观测点
 * @arg bodyName @text 星球名称 @default 地球
 * @arg lat @text 纬度 @type number @min -90 @max 90 @default 31.2
 * @arg lon @text 经度 @type number @min 0 @max 360 @default 121.4
 *
 * @command setSpeed
 * @text 设置时间流速
 * @desc 每秒（60帧）流逝的分钟数。
 * @arg speed @type number @default 60
 */

/*~struct~CelestialBody:
 * @param name @text 名称
 * @param color @text 颜色 (Hex)
 * @param mass @text 质量 (Sun=1)
 * @param radius @text 半径 (km)
 * @param x @text 轨道半径 (AU)
 * @param y @text 初始 Y (忽略)
 * @param vx @text 初始 Vx (忽略)
 * @param vy @text 轨道速度标量
 * @param obliquity @text 轴倾角 (度)
 * @param baseTemp @text 基础温度 (℃)
 */

(() => {
    const pluginName = "Limpid_CelestialSystem";
    const parameters = PluginManager.parameters(pluginName);

    //=============================================================================
    // CelestialManager (物理与天文逻辑)
    //=============================================================================
    window.CelestialManager = class {
        static init() {
            this.G = 39.478; // 天文单位下的引力常数
            this._minutesPerSecond = 60;
            this.observerConfig = { body: "地球", lat: 31.2, lon: 121.4 };
            this.bodies = [];
            this.parseBodies();
        }

        // --- 星座连线与中心点配置 ---
        // 格式: lines 数组中每一个子数组代表一条连续的折线 (由多个 {ra, dec} 组成)
        // 包含 12 个黄道星座及部分标志性星座
        static CONSTELLATIONS = [
            {
                name: "大熊座",
                center: { ra: 165.0, dec: 55.0 },
                color: "rgba(200, 220, 255, 0.5)",
                lines: [
                    // 北斗七星：天枢、天璇、天玑、天权、玉衡、开阳、瑶光
                    [
                        {ra: 165.9, dec: 61.7, mag: 1.8}, {ra: 164.4, dec: 56.3, mag: 2.3},
                        {ra: 178.4, dec: 53.6, mag: 2.4}, {ra: 183.8, dec: 57.0, mag: 3.3},
                        {ra: 193.5, dec: 55.9, mag: 1.8}, {ra: 200.9, dec: 54.9, mag: 2.2},
                        {ra: 206.8, dec: 49.3, mag: 1.8}
                    ],
                    // 勺口闭合
                    [{ra: 165.9, dec: 61.7, mag: 1.8}, {ra: 183.8, dec: 57.0, mag: 3.3}]
                ]
            },
            {
                name: "猎户座",
                center: { ra: 83.0, dec: 0.0 },
                color: "rgba(255, 200, 200, 0.6)",
                lines: [
                    // 腰带：参宿一、参宿二、参宿三
                    [{ra: 83.0, dec: -0.3, mag: 2.2}, {ra: 84.0, dec: -1.2, mag: 1.7}, {ra: 85.1, dec: -1.9, mag: 2.2}],
                    // 身体轮廓：参宿四(左上)、参宿五(右上)、参宿六(左下)、参宿七(右下)
                    [{ra: 88.7, dec: 7.4, mag: 0.4}, {ra: 81.2, dec: 6.3, mag: 1.6}],
                    [{ra: 88.7, dec: 7.4, mag: 0.4}, {ra: 86.9, dec: -9.6, mag: 2.0}],
                    [{ra: 81.2, dec: 6.3, mag: 1.6}, {ra: 78.6, dec: -8.2, mag: 0.1}],
                    [{ra: 86.9, dec: -9.6, mag: 2.0}, {ra: 78.6, dec: -8.2, mag: 0.1}]
                ]
            },
            {
                name: "仙后座",
                center: { ra: 15.0, dec: 60.0 },
                color: "rgba(200, 255, 200, 0.5)",
                lines: [
                    // W形状：王良四、策、阁道三、阁道二、阁道一
                    [{ra: 1.4, dec: 59.1, mag: 2.2}, {ra: 9.1, dec: 56.5, mag: 2.4}, {ra: 14.3, dec: 60.7, mag: 2.1}, {ra: 21.0, dec: 60.2, mag: 2.7}, {ra: 28.5, dec: 63.6, mag: 3.4}]
                ]
            },
            {
                name: "天鹅座",
                center: { ra: 305.0, dec: 40.0 },
                color: "rgba(255, 255, 255, 0.5)",
                lines: [
                    // 北十字：天津四(顶)、天津九、天津一、辇道增七(底)
                    [{ra: 310.3, dec: 45.2, mag: 1.25}, {ra: 305.5, dec: 40.2, mag: 2.2}, {ra: 292.6, dec: 27.9, mag: 3.0}],
                    [{ra: 296.2, dec: 45.1, mag: 3.7}, {ra: 305.5, dec: 40.2, mag: 2.2}, {ra: 313.3, dec: 33.9, mag: 2.5}]
                ]
            },
            {
                name: "南十字座",
                center: { ra: 186.0, dec: -60.0 },
                color: "rgba(180, 220, 255, 0.6)",
                lines: [
                    [{ra: 187.7, dec: -59.6, mag: 0.7}, {ra: 186.6, dec: -63.1, mag: 0.8}],
                    [{ra: 191.9, dec: -59.6, mag: 1.2}, {ra: 181.3, dec: -57.1, mag: 1.6}]
                ]
            },
            {
                name: "白羊座",
                center: { ra: 35.0, dec: 20.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [[{ra: 31.7, dec: 23.4, mag: 2.0}, {ra: 28.6, dec: 20.8, mag: 2.6}, {ra: 27.2, dec: 19.2, mag: 3.9}]]
            },
            {
                name: "金牛座",
                center: { ra: 65.0, dec: 15.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    // 毕宿五及V型脸
                    [{ra: 68.9, dec: 16.5, mag: 0.85}, {ra: 66.2, dec: 15.6, mag: 3.5}, {ra: 64.8, dec: 19.1, mag: 3.4}],
                    [{ra: 68.9, dec: 16.5, mag: 0.85}, {ra: 81.6, dec: 28.6, mag: 1.6}] // 牛角
                ]
            },
            {
                name: "双子座",
                center: { ra: 110.0, dec: 25.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    // 北河三(亮)、北河二
                    [{ra: 116.3, dec: 28.0, mag: 1.1}, {ra: 104.9, dec: 22.5, mag: 3.0}, {ra: 95.7, dec: 16.4, mag: 3.3}],
                    [{ra: 113.6, dec: 31.8, mag: 1.6}, {ra: 110.0, dec: 16.5, mag: 3.5}, {ra: 100.9, dec: 20.0, mag: 2.9}]
                ]
            },
            {
                name: "巨蟹座",
                center: { ra: 130.0, dec: 15.0 },
                color: "rgba(255, 220, 150, 0.4)",
                lines: [
                    [{ra: 124.1, dec: 9.1, mag: 3.7}, {ra: 130.8, dec: 18.1, mag: 3.9}, {ra: 134.1, dec: 21.4, mag: 4.6}],
                    [{ra: 130.8, dec: 18.1, mag: 3.9}, {ra: 138.3, dec: 11.8, mag: 4.0}]
                ]
            },
            {
                name: "狮子座",
                center: { ra: 160.0, dec: 15.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    // 轩辕十四(最亮)、轩辕十三、五帝座一
                    [{ra: 152.0, dec: 11.9, mag: 1.3}, {ra: 154.9, dec: 19.8, mag: 3.4}, {ra: 154.1, dec: 23.4, mag: 2.2}],
                    [{ra: 152.0, dec: 11.9, mag: 1.3}, {ra: 168.5, dec: 20.5, mag: 2.5}, {ra: 177.2, dec: 14.5, mag: 2.1}],
                    [{ra: 177.2, dec: 14.5, mag: 2.1}, {ra: 165.8, dec: 6.0, mag: 3.3}]
                ]
            },
            {
                name: "室女座",
                center: { ra: 200.0, dec: -5.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    // 角宿一(亮)
                    [{ra: 201.2, dec: -11.1, mag: 0.9}, {ra: 190.4, dec: -3.4, mag: 2.8}, {ra: 187.9, dec: 1.4, mag: 3.4}],
                    [{ra: 190.4, dec: -3.4, mag: 2.8}, {ra: 196.2, dec: 10.9, mag: 3.8}]
                ]
            },
            {
                name: "天秤座",
                center: { ra: 225.0, dec: -15.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    [{ra: 226.7, dec: -9.3, mag: 2.7}, {ra: 222.7, dec: -16.0, mag: 2.6}, {ra: 233.1, dec: -28.1, mag: 3.3}],
                    [{ra: 226.7, dec: -9.3, mag: 2.7}, {ra: 230.9, dec: -14.8, mag: 3.6}, {ra: 233.1, dec: -28.1, mag: 3.3}]
                ]
            },
            {
                name: "天蝎座",
                center: { ra: 250.0, dec: -30.0 },
                color: "rgba(255, 180, 150, 0.6)",
                lines: [
                    // 心宿二(亮红色)
                    [{ra: 241.1, dec: -19.8, mag: 2.3}, {ra: 246.3, dec: -25.5, mag: 2.9}, {ra: 247.3, dec: -26.4, mag: 1.0}, {ra: 252.7, dec: -34.2, mag: 2.8}, {ra: 257.9, dec: -39.0, mag: 2.4}, {ra: 263.2, dec: -43.0, mag: 1.6}, {ra: 265.8, dec: -37.1, mag: 2.7}]
                ]
            },
            {
                name: "人马座",
                center: { ra: 285.0, dec: -25.0 },
                color: "rgba(255, 220, 150, 0.5)",
                lines: [
                    // 茶壶
                    [{ra: 285.6, dec: -29.8, mag: 2.0}, {ra: 276.0, dec: -34.3, mag: 1.8}, {ra: 280.9, dec: -21.0, mag: 2.6}],
                    [{ra: 285.6, dec: -29.8, mag: 2.0}, {ra: 283.8, dec: -26.2, mag: 2.0}, {ra: 280.9, dec: -21.0, mag: 2.6}],
                    [{ra: 276.0, dec: -34.3, mag: 1.8}, {ra: 272.2, dec: -29.8, mag: 3.0}]
                ]
            },
            {
                name: "摩羯座",
                center: { ra: 315.0, dec: -20.0 },
                color: "rgba(255, 220, 150, 0.4)",
                lines: [
                    [{ra: 304.3, dec: -12.5, mag: 3.5}, {ra: 310.2, dec: -14.8, mag: 3.7}, {ra: 326.6, dec: -16.6, mag: 2.8}, {ra: 320.1, dec: -26.5, mag: 3.0}, {ra: 304.3, dec: -12.5, mag: 3.5}]
                ]
            },
            {
                name: "水瓶座",
                center: { ra: 335.0, dec: -10.0 },
                color: "rgba(255, 220, 150, 0.4)",
                lines: [
                    [{ra: 331.4, dec: -0.3, mag: 2.9}, {ra: 322.9, dec: -5.5, mag: 2.9}, {ra: 325.2, dec: -13.3, mag: 3.2}, {ra: 341.3, dec: -15.8, mag: 3.2}]
                ]
            },
            {
                name: "双鱼座",
                center: { ra: 15.0, dec: 10.0 },
                color: "rgba(255, 220, 150, 0.4)",
                lines: [
                    [{ra: 30.5, dec: 2.7, mag: 3.8}, {ra: 20.3, dec: 7.5, mag: 4.2}, {ra: 350.5, dec: -2.9, mag: 3.6}, {ra: 344.8, dec: 3.2, mag: 4.4}]
                ]
            },
            {
                name: "英仙座",
                center: { ra: 50.0, dec: 45.0 },
                color: "rgba(200, 255, 255, 0.4)",
                lines: [
                    // 人字形轮廓：大陵五(变星)、大陵三
                    [{ra: 51.0, dec: 49.8, mag: 1.8}, {ra: 46.5, dec: 40.9, mag: 2.1}, {ra: 43.1, dec: 32.2, mag: 3.4}],
                    [{ra: 51.0, dec: 49.8, mag: 1.8}, {ra: 58.7, dec: 44.8, mag: 3.0}, {ra: 63.4, dec: 38.8, mag: 3.8}]
                ]
            },
            {
                name: "天琴座",
                center: { ra: 283.0, dec: 38.0 },
                color: "rgba(200, 220, 255, 0.6)",
                lines: [
                    // 织女一(亮)及平行四边形
                    [{ra: 279.2, dec: 38.8, mag: 0.0}, {ra: 282.4, dec: 33.3, mag: 3.2}, {ra: 284.2, dec: 36.9, mag: 3.4}],
                    [{ra: 284.2, dec: 36.9, mag: 3.4}, {ra: 287.8, dec: 32.7, mag: 3.5}, {ra: 282.4, dec: 33.3, mag: 3.2}]
                ]
            },
            {
                name: "天鹰座",
                center: { ra: 295.0, dec: 8.0 },
                color: "rgba(255, 255, 200, 0.5)",
                lines: [
                    // 牛郎星及两翼
                    [{ra: 293.4, dec: 10.6, mag: 3.7}, {ra: 297.7, dec: 8.9, mag: 0.77}, {ra: 300.0, dec: 6.4, mag: 2.7}],
                    [{ra: 297.7, dec: 8.9, mag: 0.77}, {ra: 286.0, dec: 1.0, mag: 3.0}, {ra: 285.0, dec: -5.0, mag: 3.4}]
                ]
            },
            {
                name: "北冕座",
                center: { ra: 233.0, dec: 26.0 },
                color: "rgba(255, 255, 255, 0.4)",
                lines: [
                    // 弧形冠冕
                    [{ra: 230.1, dec: 30.3, mag: 4.1}, {ra: 231.5, dec: 28.3, mag: 3.6}, {ra: 233.7, dec: 26.7, mag: 2.2}, {ra: 236.8, dec: 26.3, mag: 3.8}, {ra: 240.2, dec: 28.0, mag: 4.1}]
                ]
            },
            {
                name: "飞马座",
                center: { ra: 345.0, dec: 20.0 },
                color: "rgba(255, 255, 255, 0.4)",
                lines: [
                    // 大四边形的一部分 (与仙女座共用一颗星)
                    [{ra: 0.0, dec: 29.1, mag: 2.0}, {ra: 345.9, dec: 28.1, mag: 2.4}, {ra: 343.3, dec: 15.2, mag: 2.5}],
                    [{ra: 343.3, dec: 15.2, mag: 2.5}, {ra: 2.1, dec: 15.2, mag: 2.8}, {ra: 0.0, dec: 29.1, mag: 2.0}],
                    // 脖子与马头
                    [{ra: 343.3, dec: 15.2, mag: 2.5}, {ra: 334.3, dec: 9.9, mag: 3.4}, {ra: 326.0, dec: 9.9, mag: 2.4}]
                ]
            },
            {
                name: "仙女座",
                center: { ra: 15.0, dec: 40.0 },
                color: "rgba(220, 220, 255, 0.4)",
                lines: [
                    // 从大四边形延伸出的双曲线
                    [{ra: 0.0, dec: 29.1, mag: 2.0}, {ra: 17.4, dec: 35.6, mag: 2.0}, {ra: 30.5, dec: 42.3, mag: 2.1}],
                    [{ra: 17.4, dec: 30.8, mag: 3.8}, {ra: 17.4, dec: 35.6, mag: 2.0}]
                ]
            },
            {
                name: "南鱼座",
                center: { ra: 342.0, dec: -30.0 },
                color: "rgba(200, 200, 255, 0.6)",
                lines: [
                    // 北落师门 (孤独的南天亮星)
                    [{ra: 344.4, dec: -29.6, mag: 1.16}, {ra: 337.0, dec: -32.0, mag: 4.3}, {ra: 330.0, dec: -28.0, mag: 4.5}]
                ]
            },
            {
                name: "波江座",
                center: { ra: 55.0, dec: -25.0 },
                color: "rgba(180, 180, 255, 0.4)",
                lines: [
                    // 蜿蜒的长河
                    [{ra: 76.0, dec: -5.0, mag: 2.8}, {ra: 63.0, dec: -10.0, mag: 3.2}, {ra: 58.0, dec: -13.0, mag: 3.5}, {ra: 50.0, dec: -24.0, mag: 3.7}, {ra: 24.4, dec: -57.2, mag: 0.4}]
                ]
            },
            {
                name: "大犬座",
                center: { ra: 101.0, dec: -20.0 },
                color: "rgba(150, 200, 255, 0.6)",
                lines: [
                    // 天狼星(全天最亮 -1.46)及其躯干
                    [{ra: 101.3, dec: -16.7, mag: -1.46}, {ra: 105.0, dec: -26.4, mag: 2.0}, {ra: 102.4, dec: -30.0, mag: 2.4}],
                    [{ra: 101.3, dec: -16.7, mag: -1.46}, {ra: 95.0, dec: -18.0, mag: 2.0}], // 前腿
                    [{ra: 105.0, dec: -26.4, mag: 2.0}, {ra: 110.0, dec: -29.0, mag: 1.5}]  // 后腿
                ]
            },
            {
                name: "小犬座",
                center: { ra: 114.0, dec: 5.0 },
                color: "rgba(255, 240, 200, 0.5)",
                lines: [
                    // 南河三(亮)与南河二
                    [{ra: 114.8, dec: 5.2, mag: 0.38}, {ra: 111.0, dec: 8.3, mag: 2.9}]
                ]
            },
            {
                name: "牧夫座",
                center: { ra: 213.0, dec: 20.0 },
                color: "rgba(255, 200, 150, 0.6)",
                lines: [
                    // 大角星(亮)及风筝轮廓
                    [{ra: 213.9, dec: 19.2, mag: -0.05}, {ra: 211.0, dec: 27.0, mag: 2.7}, {ra: 217.0, dec: 33.0, mag: 2.4}, {ra: 226.0, dec: 29.0, mag: 3.0}, {ra: 213.9, dec: 19.2, mag: -0.05}],
                    [{ra: 217.0, dec: 33.0, mag: 2.4}, {ra: 220.0, dec: 38.0, mag: 3.5}]
                ]
            },
            {
                name: "后发座",
                center: { ra: 190.0, dec: 23.0 },
                color: "rgba(255, 255, 255, 0.3)",
                lines: [
                    // 直角形状
                    [{ra: 197.0, dec: 17.5, mag: 4.2}, {ra: 195.0, dec: 23.0, mag: 4.3}, {ra: 188.0, dec: 17.5, mag: 4.4}]
                ]
            },
            {
                name: "蛇夫座",
                center: { ra: 255.0, dec: -5.0 },
                color: "rgba(220, 220, 220, 0.4)",
                lines: [
                    // 巨大的五边形/桶形
                    [{ra: 263.0, dec: 12.6, mag: 2.0}, {ra: 255.0, dec: 9.0, mag: 2.7}, {ra: 242.0, dec: -3.0, mag: 2.5}, {ra: 256.0, dec: -15.0, mag: 2.4}, {ra: 268.0, dec: -9.0, mag: 3.2}, {ra: 263.0, dec: 12.6, mag: 2.0}]
                ]
            },
            // 1. 重要南天/大型星座 (10个)
            { name: "半人马座", center: { ra: 200.0, dec: -50.0 }, color: "rgba(180, 200, 255, 0.6)", lines: [[{ra: 219.8, dec: -60.8, mag: -0.01}, {ra: 210.0, dec: -60.4, mag: 0.6}, {ra: 201.0, dec: -47.3, mag: 2.2}, {ra: 180.0, dec: -36.0, mag: 2.3}]] },
            { name: "船底座", center: { ra: 135.0, dec: -60.0 }, color: "rgba(255, 250, 200, 0.6)", lines: [[{ra: 95.8, dec: -52.7, mag: -0.74}, {ra: 138.0, dec: -59.0, mag: 1.8}, {ra: 161.0, dec: -60.0, mag: 2.2}]] },
            { name: "长蛇座", center: { ra: 150.0, dec: -20.0 }, color: "rgba(200, 200, 200, 0.4)", lines: [[{ra: 142.0, dec: 6.0, mag: 3.1}, {ra: 148.0, dec: -8.0, mag: 1.98}, {ra: 170.0, dec: -16.0, mag: 3.0}, {ra: 200.0, dec: -26.0, mag: 3.3}, {ra: 220.0, dec: -31.0, mag: 2.9}]] },
            { name: "鲸鱼座", center: { ra: 25.0, dec: -10.0 }, color: "rgba(200, 200, 200, 0.4)", lines: [[{ra: 45.0, dec: 3.0, mag: 2.5}, {ra: 33.0, dec: -10.0, mag: 3.5}, {ra: 10.0, dec: -18.0, mag: 2.0}]] },
            { name: "武仙座", center: { ra: 255.0, dec: 30.0 }, color: "rgba(220, 220, 255, 0.3)", lines: [[{ra: 245.0, dec: 14.0, mag: 3.0}, {ra: 250.0, dec: 31.0, mag: 2.8}, {ra: 258.0, dec: 37.0, mag: 3.1}, {ra: 265.0, dec: 39.0, mag: 3.5}]] },
            { name: "天龙座", center: { ra: 255.0, dec: 65.0 }, color: "rgba(200, 255, 200, 0.3)", lines: [[{ra: 210.0, dec: 64.0, mag: 3.3}, {ra: 270.0, dec: 52.0, mag: 2.7}, {ra: 268.0, dec: 70.0, mag: 3.0}]] },
            { name: "御夫座", center: { ra: 80.0, dec: 42.0 }, color: "rgba(255, 255, 200, 0.5)", lines: [[{ra: 79.1, dec: 46.0, mag: 0.08}, {ra: 75.0, dec: 33.0, mag: 2.6}, {ra: 89.0, dec: 30.0, mag: 1.9}]] },
            { name: "麒麟座", center: { ra: 105.0, dec: 0.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 90.0, dec: 0.0, mag: 3.9}, {ra: 105.0, dec: -5.0, mag: 4.1}, {ra: 120.0, dec: -2.0, mag: 4.3}]] },
            { name: "大犬座延伸", center: { ra: 110.0, dec: -25.0 }, color: "rgba(150, 200, 255, 0.4)", lines: [[{ra: 110.0, dec: -26.0, mag: 1.5}, {ra: 105.0, dec: -17.0, mag: 2.4}]] },
            { name: "天炉座", center: { ra: 40.0, dec: -30.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 35.0, dec: -30.0, mag: 3.8}, {ra: 45.0, dec: -25.0, mag: 3.9}]] },

            // 2. 剩余中小型及南天星座 (按顺序合并)
            { name: "天蝎座延伸", center: { ra: 260.0, dec: -40.0 }, color: "rgba(255, 150, 150, 0.5)", lines: [[{ra: 265.0, dec: -43.0, mag: 1.6}, {ra: 268.0, dec: -37.0, mag: 2.7}]] },
            { name: "北极星区", center: { ra: 37.0, dec: 89.0 }, color: "rgba(255, 255, 255, 0.7)", lines: [[{ra: 37.9, dec: 89.2, mag: 1.97}]] }, // 小熊座勾勒
            { name: "小熊座", center: { ra: 225.0, dec: 75.0 }, color: "rgba(200, 200, 255, 0.4)", lines: [[{ra: 37.9, dec: 89.2, mag: 1.97}, {ra: 230.0, dec: 74.0, mag: 2.0}]] },
            { name: "海豚座", center: { ra: 309.0, dec: 13.0 }, color: "rgba(150, 255, 255, 0.5)", lines: [[{ra: 308.0, dec: 15.0, mag: 3.7}, {ra: 310.0, dec: 13.0, mag: 3.8}, {ra: 312.0, dec: 10.0, mag: 4.0}, {ra: 309.0, dec: 11.0, mag: 3.9}, {ra: 308.0, dec: 15.0, mag: 3.7}]] },
            { name: "天箭座", center: { ra: 295.0, dec: 18.0 }, color: "rgba(255, 255, 255, 0.4)", lines: [[{ra: 290.0, dec: 18.0, mag: 4.3}, {ra: 298.0, dec: 19.0, mag: 3.5}, {ra: 302.0, dec: 16.0, mag: 4.3}]] },
            { name: "狐狸座", center: { ra: 300.0, dec: 25.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 290.0, dec: 24.0, mag: 4.4}, {ra: 310.0, dec: 27.0, mag: 4.5}]] },
            { name: "小狮座", center: { ra: 155.0, dec: 35.0 }, color: "rgba(255, 255, 200, 0.3)", lines: [[{ra: 145.0, dec: 34.0, mag: 3.8}, {ra: 160.0, dec: 35.0, mag: 4.2}]] },
            { name: "巨爵座", center: { ra: 170.0, dec: -15.0 }, color: "rgba(200, 200, 200, 0.3)", lines: [[{ra: 165.0, dec: -18.0, mag: 4.0}, {ra: 175.0, dec: -15.0, mag: 4.1}]] },
            { name: "乌鸦座", center: { ra: 185.0, dec: -18.0 }, color: "rgba(150, 150, 150, 0.5)", lines: [[{ra: 181.0, dec: -16.0, mag: 2.5}, {ra: 183.0, dec: -23.0, mag: 2.6}, {ra: 190.0, dec: -22.0, mag: 3.0}, {ra: 188.0, dec: -16.0, mag: 2.9}, {ra: 181.0, dec: -16.0, mag: 2.5}]] },
            { name: "豺狼座", center: { ra: 235.0, dec: -45.0 }, color: "rgba(200, 200, 255, 0.4)", lines: [[{ra: 220.0, dec: -40.0, mag: 2.3}, {ra: 235.0, dec: -45.0, mag: 2.6}, {ra: 245.0, dec: -43.0, mag: 3.4}]] },
            { name: "矩尺座", center: { ra: 242.0, dec: -50.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 240.0, dec: -50.0, mag: 4.0}, {ra: 245.0, dec: -48.0, mag: 4.4}]] },
            { name: "圆规座", center: { ra: 220.0, dec: -60.0 }, color: "rgba(200, 200, 255, 0.3)", lines: [[{ra: 219.0, dec: -64.0, mag: 3.1}, {ra: 225.0, dec: -60.0, mag: 4.0}]] },
            { name: "望远镜座", center: { ra: 280.0, dec: -50.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 275.0, dec: -52.0, mag: 3.4}, {ra: 285.0, dec: -48.0, mag: 4.1}]] },
            { name: "显微镜座", center: { ra: 315.0, dec: -35.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 310.0, dec: -33.0, mag: 4.6}, {ra: 320.0, dec: -37.0, mag: 4.7}]] },
            { name: "雕具座", center: { ra: 70.0, dec: -40.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 65.0, dec: -42.0, mag: 4.4}, {ra: 75.0, dec: -38.0, mag: 5.0}]] },
            { name: "绘架座", center: { ra: 85.0, dec: -50.0 }, color: "rgba(200, 200, 255, 0.3)", lines: [[{ra: 86.0, dec: -49.0, mag: 3.2}, {ra: 80.0, dec: -55.0, mag: 3.8}]] },
            { name: "剑鱼座", center: { ra: 65.0, dec: -60.0 }, color: "rgba(255, 200, 255, 0.3)", lines: [[{ra: 60.0, dec: -55.0, mag: 3.2}, {ra: 70.0, dec: -65.0, mag: 3.8}]] },
            { name: "飞鱼座", center: { ra: 110.0, dec: -70.0 }, color: "rgba(200, 255, 255, 0.3)", lines: [[{ra: 100.0, dec: -72.0, mag: 3.7}, {ra: 120.0, dec: -68.0, mag: 3.9}]] },
            { name: "山案座", center: { ra: 85.0, dec: -75.0 }, color: "rgba(200, 200, 200, 0.1)", lines: [[{ra: 80.0, dec: -77.0, mag: 5.0}, {ra: 90.0, dec: -72.0, mag: 5.1}]] },
            { name: "变色龙座", center: { ra: 165.0, dec: -78.0 }, color: "rgba(200, 255, 200, 0.2)", lines: [[{ra: 160.0, dec: -77.0, mag: 4.0}, {ra: 175.0, dec: -79.0, mag: 4.4}]] },
            { name: "苍蝇座", center: { ra: 185.0, dec: -70.0 }, color: "rgba(150, 200, 255, 0.4)", lines: [[{ra: 185.0, dec: -69.0, mag: 2.6}, {ra: 190.0, dec: -72.0, mag: 3.0}]] },
            { name: "天燕座", center: { ra: 240.0, dec: -75.0 }, color: "rgba(255, 200, 200, 0.2)", lines: [[{ra: 220.0, dec: -78.0, mag: 3.8}, {ra: 260.0, dec: -72.0, mag: 4.2}]] },
            { name: "孔雀座", center: { ra: 300.0, dec: -65.0 }, color: "rgba(200, 220, 255, 0.5)", lines: [[{ra: 306.0, dec: -56.0, mag: 1.9}, {ra: 290.0, dec: -65.0, mag: 3.1}, {ra: 310.0, dec: -70.0, mag: 3.4}]] },
            { name: "印第安座", center: { ra: 325.0, dec: -55.0 }, color: "rgba(255, 220, 200, 0.3)", lines: [[{ra: 315.0, dec: -47.0, mag: 3.1}, {ra: 335.0, dec: -60.0, mag: 3.7}]] },
            { name: "杜鹃座", center: { ra: 0.0, dec: -70.0 }, color: "rgba(255, 255, 255, 0.4)", lines: [[{ra: 333.0, dec: -60.0, mag: 2.8}, {ra: 0.0, dec: -70.0, mag: 4.2}]] },
            { name: "凤凰座", center: { ra: 10.0, dec: -45.0 }, color: "rgba(255, 150, 150, 0.5)", lines: [[{ra: 6.0, dec: -42.0, mag: 2.3}, {ra: 20.0, dec: -48.0, mag: 3.3}, {ra: 35.0, dec: -45.0, mag: 3.4}]] },
            { name: "鹤座", center: { ra: 340.0, dec: -45.0 }, color: "rgba(200, 255, 255, 0.5)", lines: [[{ra: 332.0, dec: -37.0, mag: 1.7}, {ra: 345.0, dec: -47.0, mag: 2.1}, {ra: 348.0, dec: -54.0, mag: 3.0}]] },
            { name: "天鹤座边缘", center: { ra: 350.0, dec: -40.0 }, color: "rgba(200, 255, 255, 0.3)", lines: [[{ra: 350.0, dec: -42.0, mag: 3.5}]] },
            { name: "玉夫座", center: { ra: 10.0, dec: -30.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 0.0, dec: -28.0, mag: 4.3}, {ra: 20.0, dec: -32.0, mag: 4.5}]] },
            { name: "六分仪座", center: { ra: 150.0, dec: 0.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 145.0, dec: 0.0, mag: 4.4}, {ra: 155.0, dec: -5.0, mag: 4.5}]] },
            { name: "罗盘座", center: { ra: 135.0, dec: -30.0 }, color: "rgba(200, 255, 255, 0.3)", lines: [[{ra: 130.0, dec: -33.0, mag: 3.6}, {ra: 140.0, dec: -28.0, mag: 3.9}]] },
            { name: "船帆座", center: { ra: 140.0, dec: -50.0 }, color: "rgba(200, 220, 255, 0.5)", lines: [[{ra: 122.0, dec: -47.0, mag: 1.9}, {ra: 140.0, dec: -54.0, mag: 2.2}, {ra: 155.0, dec: -42.0, mag: 2.5}]] },
            { name: "船尾座", center: { ra: 115.0, dec: -40.0 }, color: "rgba(200, 220, 255, 0.5)", lines: [[{ra: 120.0, dec: -40.0, mag: 2.2}, {ra: 110.0, dec: -30.0, mag: 3.3}, {ra: 100.0, dec: -45.0, mag: 2.7}]] },
            { name: "猎犬座", center: { ra: 195.0, dec: 40.0 }, color: "rgba(255, 255, 255, 0.4)", lines: [[{ra: 193.0, dec: 38.0, mag: 2.8}, {ra: 200.0, dec: 41.0, mag: 4.2}]] },
            { name: "小马座", center: { ra: 318.0, dec: 7.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 317.0, dec: 5.0, mag: 3.9}, {ra: 320.0, dec: 10.0, mag: 4.1}]] },
            { name: "蝎虎座", center: { ra: 335.0, dec: 45.0 }, color: "rgba(200, 255, 200, 0.2)", lines: [[{ra: 330.0, dec: 40.0, mag: 3.7}, {ra: 340.0, dec: 50.0, mag: 4.5}]] },
            { name: "山猫座", center: { ra: 120.0, dec: 45.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 100.0, dec: 40.0, mag: 3.1}, {ra: 135.0, dec: 50.0, mag: 4.3}]] },
            { name: "鹿豹座", center: { ra: 85.0, dec: 70.0 }, color: "rgba(255, 255, 255, 0.1)", lines: [[{ra: 50.0, dec: 70.0, mag: 4.0}, {ra: 120.0, dec: 80.0, mag: 4.5}]] },
            { name: "网罟座", center: { ra: 60.0, dec: -60.0 }, color: "rgba(200, 255, 255, 0.3)", lines: [[{ra: 58.0, dec: -62.0, mag: 3.3}, {ra: 65.0, dec: -55.0, mag: 3.8}]] },
            { name: "天兔座", center: { ra: 80.0, dec: -20.0 }, color: "rgba(200, 200, 200, 0.4)", lines: [[{ra: 83.0, dec: -17.0, mag: 2.6}, {ra: 78.0, dec: -22.0, mag: 2.8}]] },
            { name: "雕塑家座", center: { ra: 0.0, dec: -30.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 350.0, dec: -30.0, mag: 4.3}, {ra: 15.0, dec: -35.0, mag: 4.5}]] },
            { name: "盾牌座", center: { ra: 278.0, dec: -10.0 }, color: "rgba(255, 255, 200, 0.3)", lines: [[{ra: 275.0, dec: -10.0, mag: 3.8}, {ra: 282.0, dec: -15.0, mag: 4.0}]] },
            { name: "巨蛇座(头)", center: { ra: 235.0, dec: 10.0 }, color: "rgba(200, 255, 200, 0.4)", lines: [[{ra: 235.0, dec: 13.0, mag: 2.6}, {ra: 245.0, dec: 6.0, mag: 3.6}]] },
            { name: "巨蛇座(尾)", center: { ra: 275.0, dec: -5.0 }, color: "rgba(200, 255, 200, 0.4)", lines: [[{ra: 273.0, dec: -3.0, mag: 3.2}, {ra: 280.0, dec: -8.0, mag: 4.0}]] },
            { name: "三角座", center: { ra: 33.0, dec: 31.0 }, color: "rgba(200, 255, 255, 0.4)", lines: [[{ra: 28.0, dec: 30.0, mag: 3.0}, {ra: 35.0, dec: 35.0, mag: 4.0}, {ra: 33.0, dec: 25.0, mag: 4.1}]] },
            { name: "南三角座", center: { ra: 240.0, dec: -65.0 }, color: "rgba(255, 200, 150, 0.5)", lines: [[{ra: 252.0, dec: -69.0, mag: 1.9}, {ra: 238.0, dec: -63.0, mag: 2.8}, {ra: 228.0, dec: -70.0, mag: 2.9}, {ra: 252.0, dec: -69.0, mag: 1.9}]] },
            { name: "时钟座", center: { ra: 50.0, dec: -50.0 }, color: "rgba(200, 200, 200, 0.2)", lines: [[{ra: 45.0, dec: -45.0, mag: 3.8}, {ra: 60.0, dec: -60.0, mag: 4.9}]] },
            { name: "南极座", center: { ra: 0.0, dec: -89.0 }, color: "rgba(255, 255, 255, 0.2)", lines: [[{ra: 315.0, dec: -89.0, mag: 5.4}, {ra: 180.0, dec: -88.0, mag: 5.5}]] }
        ];
        static parseBodies() {
            try {
                const rawParam = parameters['defaultBodies'];
                if (!rawParam) return;
                const rawArray = JSON.parse(rawParam).map(str => JSON.parse(str));

                this.bodies = [];

                const sunData = rawArray.find(b => parseFloat(b.x) === 0);
                if (sunData) {
                    this.bodies.push({
                        name: sunData.name, color: sunData.color,
                        mass: parseFloat(sunData.mass), radius: parseFloat(sunData.radius),
                        x: 0, y: 0, vx: 0, vy: 0,
                        obliquity: parseFloat(sunData.obliquity),
                        baseTemp: parseFloat(sunData.baseTemp), rotation: 0
                    });
                }

                const planetsData = rawArray.filter(b => parseFloat(b.x) !== 0 && b.name !== "月球");
                planetsData.forEach(b => {
                    const dist = parseFloat(b.x);
                    const speed = parseFloat(b.vy);
                    const angle = Math.random() * Math.PI * 2;

                    this.bodies.push({
                        name: b.name, color: b.color,
                        mass: parseFloat(b.mass), radius: parseFloat(b.radius),
                        x: dist * Math.cos(angle),
                        y: dist * Math.sin(angle),
                        vx: -speed * Math.sin(angle),
                        vy: speed * Math.cos(angle),
                        obliquity: parseFloat(b.obliquity),
                        baseTemp: parseFloat(b.baseTemp),
                        rotation: Math.random() * Math.PI * 2
                    });
                });

                const moonData = rawArray.find(b => b.name === "月球");
                const earth = this.bodies.find(b => b.name === "地球");

                if (moonData && earth) {
                    const relDist = 0.00257;
                    const relSpeed = 0.216;
                    const moonAngle = Math.random() * Math.PI * 2;

                    this.bodies.push({
                        name: moonData.name, color: moonData.color,
                        mass: parseFloat(moonData.mass), radius: parseFloat(moonData.radius),
                        x: earth.x + relDist * Math.cos(moonAngle),
                        y: earth.y + relDist * Math.sin(moonAngle),
                        vx: earth.vx - relSpeed * Math.sin(moonAngle),
                        vy: earth.vy + relSpeed * Math.cos(moonAngle),
                        obliquity: parseFloat(moonData.obliquity),
                        baseTemp: parseFloat(moonData.baseTemp),
                        rotation: Math.random() * Math.PI * 2
                    });
                }
            } catch (e) {
                console.error("Celestial Data Error:", e);
            }
        }

        static update() {
            const dt = (1 / 525600);
            const minutesPerFrame = this._minutesPerSecond / 60;
            const iterations = Math.ceil(minutesPerFrame);
            const stepDt = dt * (minutesPerFrame / iterations);

            for (let s = 0; s < iterations; s++) {
                let accels = this.bodies.map(() => ({ ax: 0, ay: 0 }));
                for (let i = 0; i < this.bodies.length; i++) {
                    for (let j = i + 1; j < this.bodies.length; j++) {
                        let b1 = this.bodies[i], b2 = this.bodies[j];
                        let dx = b2.x - b1.x, dy = b2.y - b1.y;
                        let r2 = dx * dx + dy * dy || 1e-9;
                        let r = Math.sqrt(r2);
                        let f = this.G * b1.mass * b2.mass / r2;
                        accels[i].ax += f * dx / r / b1.mass;
                        accels[i].ay += f * dy / r / b1.mass;
                        accels[j].ax -= f * dx / r / b2.mass;
                        accels[j].ay -= f * dy / r / b2.mass;
                    }
                }
                this.bodies.forEach((b, i) => {
                    b.vx += accels[i].ax * stepDt; b.vy += accels[i].ay * stepDt;
                    b.x += b.vx * stepDt; b.y += b.vy * stepDt;
                    let rotSpeed = 2 * Math.PI * 365.25;
                    if (b.name !== '太阳') b.rotation = (b.rotation + rotSpeed * stepDt) % (Math.PI * 2);
                });
            }
        }

        static getAltAz(targetName) {
            const obs = this.bodies.find(b => b.name === this.observerConfig.body) || this.bodies[3];
            const tar = this.bodies.find(b => b.name === targetName);
            if (!obs || !tar || obs === tar) return { alt: -90, az: 0, dist: 1 };

            let dx = tar.x - obs.x, dy = tar.y - obs.y;
            let d = Math.sqrt(dx*dx + dy*dy) || 0.001;

            let obl = obs.obliquity * Math.PI / 180;
            let y1 = dy * Math.cos(obl), z1 = dy * Math.sin(obl);

            let rot = (obs.rotation + this.observerConfig.lon * Math.PI / 180);
            let x2 = dx * Math.cos(rot) + y1 * Math.sin(rot);
            let y2 = -dx * Math.sin(rot) + y1 * Math.cos(rot);

            let latRad = this.observerConfig.lat * Math.PI / 180;
            let xH = -x2 * Math.sin(latRad) + z1 * Math.cos(latRad);
            let zH = x2 * Math.cos(latRad) + z1 * Math.sin(latRad);

            return {
                alt: Math.asin(zH/d)*180/Math.PI,
                az: Math.atan2(y2, xH)*180/Math.PI,
                dist: d
            };
        }

        // --- 赤经赤纬转地平坐标系 ---
        static getRADecAltAz(ra, dec) {
            const obs = this.bodies.find(b => b.name === this.observerConfig.body) || this.bodies[3];
            if (!obs) return { alt: -90, az: 0 };

            let raRad = ra * Math.PI / 180;
            let decRad = dec * Math.PI / 180;

            let dx = Math.cos(decRad) * Math.cos(raRad);
            let y1 = Math.cos(decRad) * Math.sin(raRad);
            let z1 = Math.sin(decRad);

            let rot = (obs.rotation + this.observerConfig.lon * Math.PI / 180);
            let x2 = dx * Math.cos(rot) + y1 * Math.sin(rot);
            let y2 = -dx * Math.sin(rot) + y1 * Math.cos(rot);

            let latRad = this.observerConfig.lat * Math.PI / 180;
            let xH = -x2 * Math.sin(latRad) + z1 * Math.cos(latRad);
            let zH = x2 * Math.cos(latRad) + z1 * Math.sin(latRad);

            return {
                alt: Math.asin(zH) * 180 / Math.PI,
                az: Math.atan2(y2, xH) * 180 / Math.PI
            };
        }

        static getInsolation() {
            let s = this.getAltAz("太阳");
            return s.alt > 0 ? 1366 * Math.sin(s.alt * Math.PI / 180) : 0;
        }

        static getTemperature() {
            let obs = this.bodies.find(b => b.name === this.observerConfig.body);
            return (obs ? obs.baseTemp : 0) + (this.getInsolation() / 1366) * 25;
        }
    };

    //=============================================================================
    // Scene_SkyMap (渲染与 UI)
    //=============================================================================
    window.Scene_SkyMap = class extends Scene_MenuBase {
        create() {
            super.create();
            this.createSkySprite();
            this.createWindows();
        }

        createSkySprite() {
            this._skyBitmap = new Bitmap(Graphics.width, Graphics.height);
            this._skySprite = new Sprite(this._skyBitmap);
            this.addChild(this._skySprite);
        }

        createWindows() {
            const footerH = 100;
            this._footerWindow = new Window_Base(new Rectangle(0, Graphics.height - footerH, Graphics.width, footerH));
            this.addWindow(this._footerWindow);

            const listW = 280;
            this._listWindow = new Window_Base(new Rectangle(Graphics.width - listW, 20, listW, Graphics.height - footerH - 40));
            this.addWindow(this._listWindow);
        }

        update() {
            super.update();
            CelestialManager.update();
            this.renderCanvas();
            this.updateUI();
            if (Input.isTriggered('cancel') || TouchInput.isCancelled()) SceneManager.pop();
        }

        renderCanvas = function() {
            const ctx = this._skyBitmap.context;
            const w = Graphics.width;
            const h = Graphics.height - 100;
            const centerX = (w - 280) / 2;
            const centerY = h / 2;
            const maxRadius = Math.min(centerX, centerY) * 0.9;
            const pixelsPerDegree = maxRadius / 90;

            ctx.clearRect(0, 0, w, h + 100);

            // 1. 星空背景
            ctx.fillStyle = '#020408';
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. 绘制星座
            CelestialManager.CONSTELLATIONS.forEach(cons => {
                const starColor = cons.color || "rgba(255, 255, 255, 0.8)";

                // --- 2.1 绘制虚线连线 ---
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([4, 4]); // 设置虚线：4像素线，4像素空隙
                ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
                ctx.lineWidth = 1;

                cons.lines.forEach(path => {
                    let isFirst = true;
                    path.forEach(pt => {
                        let p = CelestialManager.getRADecAltAz(pt.ra, pt.dec);
                        if (p.alt >= 0) {
                            let r = (1.0 - (p.alt / 90)) * maxRadius;
                            let theta = (p.az - 90) * Math.PI * 2 / 360;
                            let sx = centerX + r * Math.cos(theta);
                            let sy = centerY + r * Math.sin(theta);
                            if (isFirst) { ctx.moveTo(sx, sy); isFirst = false; }
                            else { ctx.lineTo(sx, sy); }
                        } else { isFirst = true; }
                    });
                });
                ctx.stroke();
                ctx.restore();

                // --- 2.2 绘制发光星星 ---
                cons.lines.forEach(path => {
                    path.forEach(pt => {
                        let p = CelestialManager.getRADecAltAz(pt.ra, pt.dec);
                        if (p.alt > 0) {
                            let r = (1.0 - (p.alt / 90)) * maxRadius;
                            let theta = (p.az - 90) * Math.PI * 2 / 360;
                            let sx = centerX + r * Math.cos(theta);
                            let sy = centerY + r * Math.sin(theta);

                            // 计算基于星等的尺寸和发光
                            // 公式：基础半径 - (星等 * 修正系数)
                            const mag = pt.mag || 2.5;
                            const baseSize = Math.max(0.5, 3.5 - mag * 0.6);
                            const glowSize = Math.max(0, 12 - mag * 2);

                            this.drawGlowPoint(ctx, sx, sy, baseSize, glowSize, starColor);
                        }
                    });
                });

                // --- 2.3 星座名称 ---
                let cp = CelestialManager.getRADecAltAz(cons.center.ra, cons.center.dec);
                if (cp.alt > 0) {
                    let cr = (1.0 - (cp.alt / 90)) * maxRadius;
                    let cTheta = (cp.az - 90) * Math.PI * 2 / 360;
                    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.font = "italic 12px sans-serif";
                    ctx.fillText(cons.name, centerX + cr * Math.cos(cTheta), centerY + cr * Math.sin(cTheta));
                }
            });

            // 3. 行星渲染 (也加上发光)
            CelestialManager.bodies.forEach(b => {
                const obsBody = CelestialManager.bodies.find(ob => ob.name === CelestialManager.observerConfig.body);
                if (b === obsBody) return;

                let p = CelestialManager.getAltAz(b.name);
                if (p.alt < 0) return;

                let r = (1.0 - (p.alt / 90)) * maxRadius;
                let theta = (p.az - 90) * Math.PI * 2 / 360;
                let sx = centerX + r * Math.cos(theta);
                let sy = centerY + r * Math.sin(theta);

                // 行星通常比恒星大，且有特定颜色
                let pixelRadius = Math.max(1.5, (b.radius / (p.dist * 149597870)) * (180/Math.PI) * pixelsPerDegree * 5);
                this.drawGlowPoint(ctx, sx, sy, pixelRadius, pixelRadius * 3, b.color);

                ctx.fillStyle = "white";
                ctx.fillText(b.name, sx, sy - pixelRadius - 10);
            });

            this._skyBitmap.baseTexture.update();
        };
        drawGlowPoint(ctx, x, y, radius, glowSize, color) {
            ctx.save();
            // 核心实体
            ctx.shadowBlur = glowSize;
            ctx.shadowColor = color;
            ctx.fillStyle = "white"; // 星星核心通常偏白
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            // 外层光晕 (叠加一层半透明色)
            ctx.shadowBlur = 0;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        updateUI() {
            const fw = this._footerWindow;
            fw.contents.clear();
            const colW = Graphics.width / 4;
            fw.changeTextColor(ColorManager.systemColor());
            fw.drawText("观测站", 10, 10, colW);
            fw.drawText("经纬坐标", colW, 10, colW);
            fw.drawText("环境参数", colW * 2, 10, colW);
            fw.drawText("时间速率", colW * 3, 10, colW);

            fw.resetTextColor();
            fw.drawText(CelestialManager.observerConfig.body, 10, 40, colW);
            fw.drawText(`${CelestialManager.observerConfig.lat}°, ${CelestialManager.observerConfig.lon}°`, colW, 40, colW);
            fw.drawText(`${CelestialManager.getInsolation().toFixed(1)}W | ${CelestialManager.getTemperature().toFixed(1)}℃`, colW * 2, 40, colW);
            fw.drawText(`${CelestialManager._minutesPerSecond} min/s`, colW * 3, 40, colW);

            const lw = this._listWindow;
            lw.contents.clear();
            lw.changeTextColor(ColorManager.systemColor());
            lw.drawText("天体追踪 (Az, Alt)", 0, 0, 240);

            CelestialManager.bodies.forEach((b, i) => {
                let p = CelestialManager.getAltAz(b.name);
                let isVisible = p.alt > 0;
                lw.changeTextColor(isVisible ? b.color : "#555555");
                lw.drawText(`${isVisible ? "●" : "○"} ${b.name}`, 0, 32 + i * 26, 100);
                lw.resetTextColor();
                lw.drawText(`${p.az.toFixed(0)}°, ${p.alt.toFixed(0)}°`, 110, 32 + i * 26, 130, "right");
            });
        }
    };

    //=============================================================================
    // 指令注册与系统挂载
    //=============================================================================
    PluginManager.registerCommand(pluginName, "openSkyScene", () => SceneManager.push(Scene_SkyMap));
    PluginManager.registerCommand(pluginName, "setObserver", a => {
        CelestialManager.observerConfig = { body: String(a.bodyName), lat: Number(a.lat), lon: Number(a.lon) };
    });
    PluginManager.registerCommand(pluginName, "setSpeed", a => {
        CelestialManager._minutesPerSecond = Number(a.speed);
    });
    PluginManager.registerCommand(pluginName, "openOrreryScene", () => {
        SceneManager.push(Scene_Orrery);
    });
    const _DM_create = DataManager.createGameObjects;
    DataManager.createGameObjects = function() {
        _DM_create.call(this);
        CelestialManager.init();
    };

    const _SM_update = Scene_Map.prototype.updateMain;
    Scene_Map.prototype.updateMain = function() {
        _SM_update.call(this);
        CelestialManager.update();
    };

    //=============================================================================
    // Scene_Orrery (宇宙尺度观测场景) 略（与此前版本一致，保持完整文件结构即可）
    // 为了节省文本长度，我在此省略 Orrery 的代码，你直接沿用上一版的 Scene_Orrery 即可。
    // 如果你需要合并，只需将上一个版本的 Scene_Orrery 块贴在这里。
    //=============================================================================

    CelestialManager.getAltFactor = function(bodyName) {
        const p = this.getAltAz(bodyName);
        const factor = Math.max(0, p.alt) / 90;
        return factor;
    };

    window.celestialAlt = function(bodyName) {
        return CelestialManager.getAltFactor(bodyName);
    };
})();