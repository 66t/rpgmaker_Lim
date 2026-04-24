/*:
 * @target MZ
 * @plugindesc 瑞士轮与淘汰赛系统 
 * @author Limpid
 * * @help
 * ============================================================================
 * 1. 确保安装了 TwoTroopsBattle.js 插件并放置在它下面。
 * 2. 插件命令：
 * - 启动比赛：传入一组敌群(Troop) ID。系统会跳过所有介绍，直接进入排表界面。
 * ============================================================================
 * * @command setupTournament
 * @text 初始化并开始比赛
 * @desc 设定参赛的敌群 ID 列表，并自动开始介绍和抽签流程。
 * * @arg troopIds
 * @type troop[]
 * @text 参赛敌群列表
 * @desc 选择参与比赛的所有敌群。
 * * @arg swissRounds
 * @type number
 * @min 1
 * @default 3
 * @text 瑞士轮轮次
 * @desc 进行几轮瑞士轮后进入淘汰赛。
 * * @arg topCut
 * @type select
 * @option 2
 * @option 4
 * @option 8
 * @text 晋级人数
 * @desc 瑞士轮结束后排名前几的队伍进入淘汰赛。
 * * @command openTournamentScene
 * @text 打开比赛界面
 * @desc 手动进入比赛对阵和排名显示界面。
 */

(() => {
    const pluginName = "Limpid_SwissTournament";

    //-------------------------------------------------------------------------
    // TournamentParticipant (参赛选手类)
    //-------------------------------------------------------------------------
    class TournamentParticipant {
        constructor(troopId) {
            this.troopId = troopId;
            const troop = $dataTroops[troopId];
            this.name = troop.name;
            this.enemyId = troop.members[0].enemyId;
            this.enemyData = $dataEnemies[this.enemyId];

            this.wins = 0;
            this.losses = 0;
            this.score = 0;
            this.opponents = [];
            this.isEliminated = false;
            this.sos = 0;
        }
    }

    //-------------------------------------------------------------------------
    // TournamentManager (核心管理器)
    //-------------------------------------------------------------------------
    window.TournamentManager = class {
        static init(troopIds, swissRounds, topCut) {
            this._participants = troopIds.map(id => new TournamentParticipant(Number(id)));
            this._maxSwissRounds = Number(swissRounds);
            this._topCut = Number(topCut);
            this._currentRound = 1;
            this._phase = "Swiss";
            this._currentPairings = [];
            this._battleResults = [];

            // 直接生成第一轮对阵并进入主界面
            this.generatePairings();
            SceneManager.push(Scene_Tournament);
        }

        static isActive() { return !!this._participants; }
        static participants() { return this._participants; }

        static updateSOS() {
            for (const p of this._participants) {
                p.sos = p.opponents.reduce((sum, oppId) => {
                    const opp = this._participants.find(x => x.troopId === oppId);
                    return sum + (opp ? opp.score : 0);
                }, 0);
            }
        }

        static generatePairings() {
            this.updateSOS();
            let players = this._participants.filter(p => !p.isEliminated);

            if (this._phase === "Swiss") {
                players.sort((a, b) => b.score - a.score || b.sos - a.sos);
                this._currentPairings = [];
                let used = new Set();

                for (let i = 0; i < players.length; i++) {
                    if (used.has(players[i].troopId)) continue;
                    let found = false;
                    for (let j = i + 1; j < players.length; j++) {
                        if (!used.has(players[j].troopId) && !players[i].opponents.includes(players[j].troopId)) {
                            this._currentPairings.push({p1: players[i], p2: players[j], winner: null});
                            used.add(players[i].troopId);
                            used.add(players[j].troopId);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        for (let j = i + 1; j < players.length; j++) {
                            if (!used.has(players[j].troopId)) {
                                this._currentPairings.push({p1: players[i], p2: players[j], winner: null});
                                used.add(players[i].troopId);
                                used.add(players[j].troopId);
                                break;
                            }
                        }
                    }
                }
            } else {
                this._currentPairings = [];
                for (let i = 0; i < players.length / 2; i++) {
                    this._currentPairings.push({p1: players[i], p2: players[players.length - 1 - i], winner: null});
                }
            }
            this._battleResults = [];
        }

        static onBattleEnd(winnerTroopId, loserTroopId) {
            const winner = this._participants.find(p => p.troopId === winnerTroopId);
            const loser = this._participants.find(p => p.troopId === loserTroopId);

            if (winner && loser) {
                winner.wins++;
                winner.score += 1;
                winner.opponents.push(loserTroopId);
                loser.losses++;
                loser.opponents.push(winnerTroopId);

                if (this._phase === "Elimination") {
                    loser.isEliminated = true;
                }

                // 记录本局胜者，用于UI高亮
                for(let pair of this._currentPairings) {
                    if ((pair.p1.troopId === winnerTroopId && pair.p2.troopId === loserTroopId) ||
                        (pair.p2.troopId === winnerTroopId && pair.p1.troopId === loserTroopId)) {
                        pair.winner = winnerTroopId;
                    }
                }
            }

            if (this._battleResults.length === this._currentPairings.length) {
                this.advanceRound();
            }
        }

        static advanceRound() {
            if (this._phase === "Swiss") {
                if (this._currentRound >= this._maxSwissRounds) {
                    this.startElimination();
                } else {
                    this._currentRound++;
                    this.generatePairings();
                }
            } else {
                let remaining = this._participants.filter(p => !p.isEliminated);
                if (remaining.length <= 1) {
                    this._phase = "Finished";
                    SceneManager.push(Scene_TournamentChampion);
                } else {
                    this._currentRound++;
                    this.generatePairings();
                }
            }
        }

        static startElimination() {
            this._phase = "Elimination";
            this._participants.sort((a, b) => b.score - a.score || b.sos - a.sos);
            for (let i = this._topCut; i < this._participants.length; i++) {
                this._participants[i].isEliminated = true;
            }
            this.generatePairings();
        }
    };

    //-------------------------------------------------------------------------
    // 动画场景：VsScreen & Champion
    //-------------------------------------------------------------------------
    class Scene_VsScreen extends Scene_Base {
        prepare(troop1Id, troop2Id) {
            this._troop1Id = troop1Id;
            this._troop2Id = troop2Id;
        }
        create() {
            super.create();
            this._timer = 120;
            this.createBackground();

            const e1 = $dataEnemies[$dataTroops[this._troop1Id].members[0].enemyId];
            const e2 = $dataEnemies[$dataTroops[this._troop2Id].members[0].enemyId];

            this._sprite1 = new Sprite();
            this._sprite1.bitmap = $gameSystem.isSideView() ? ImageManager.loadSvEnemy(e1.battlerName) : ImageManager.loadEnemy(e1.battlerName);
            this._sprite1.anchor.set(0.5, 0.5);
            this._sprite1.x = -100; this._sprite1.y = Graphics.boxHeight / 2;

            this._sprite2 = new Sprite();
            this._sprite2.bitmap = $gameSystem.isSideView() ? ImageManager.loadSvEnemy(e2.battlerName) : ImageManager.loadEnemy(e2.battlerName);
            this._sprite2.anchor.set(0.5, 0.5);
            this._sprite2.x = Graphics.boxWidth + 100; this._sprite2.y = Graphics.boxHeight / 2;

            if (e1.note.includes("朝左")) this._sprite1.scale.x = -1;
            if (e2.note.includes("朝右")) this._sprite2.scale.x = -1;

            this._vsSprite = new Sprite(new Bitmap(200, 100));
            this._vsSprite.bitmap.fontSize = 80;
            this._vsSprite.bitmap.fontItalic = true;
            this._vsSprite.bitmap.textColor = '#ff0000';
            this._vsSprite.bitmap.outlineColor = '#ffffff';
            this._vsSprite.bitmap.drawText("VS", 0, 0, 200, 100, 'center');
            this._vsSprite.anchor.set(0.5, 0.5);
            this._vsSprite.x = Graphics.boxWidth / 2; this._vsSprite.y = Graphics.boxHeight / 2;
            this._vsSprite.scale.set(0.1);

            this.addChild(this._sprite1);
            this.addChild(this._sprite2);
            this.addChild(this._vsSprite);
            AudioManager.playSe({name: "Sword1", volume: 100, pitch: 100, pan: 0});
        }
        createBackground() {
            this._backSprite = new Sprite();
            this._backSprite.bitmap = SceneManager.backgroundBitmap();
            this._backSprite.setColorTone([-80, -80, -80, 0]);
            this.addChild(this._backSprite);
        }
        update() {
            super.update();
            this._timer--;
            if (this._sprite1.x < Graphics.boxWidth / 4) this._sprite1.x += 15;
            if (this._sprite2.x > Graphics.boxWidth * 0.75) this._sprite2.x -= 15;
            if (this._vsSprite.scale.x < 1) {
                this._vsSprite.scale.x += 0.05; this._vsSprite.scale.y += 0.05;
            }
            if (this._timer <= 0) {
                BattleManager.setupTroopVsTroop(this._troop1Id, this._troop2Id);
                SceneManager.goto(Scene_Battle);
            }
        }
    }

    class Scene_TournamentChampion extends Scene_Base {
        create() {
            super.create();
            this.createBackground();
            const winner = TournamentManager.participants().filter(p => !p.isEliminated)[0];
            this._sprite = new Sprite();
            this._sprite.bitmap = $gameSystem.isSideView() ? ImageManager.loadSvEnemy(winner.enemyData.battlerName) : ImageManager.loadEnemy(winner.enemyData.battlerName);
            this._sprite.anchor.set(0.5, 1);
            this._sprite.x = Graphics.boxWidth / 2; this._sprite.y = Graphics.boxHeight - 100;
            this.addChild(this._sprite);

            this.createWindowLayer();
            this._textWindow = new Window_Base(new Rectangle(0, 0, Graphics.boxWidth, Graphics.boxHeight));
            this.addWindow(this._textWindow);
            this._textWindow.contents.fontSize = 72;
            this._textWindow.changeTextColor(ColorManager.powerUpColor());
            this._textWindow.drawText("比赛冠军", 0, 50, Graphics.boxWidth, 'center');
            this._textWindow.contents.fontSize = 48;
            this._textWindow.resetTextColor();
            this._textWindow.drawText(winner.name, 0, 150, Graphics.boxWidth, 'center');
            AudioManager.playMe({name: "Victory1", volume: 100, pitch: 100, pan: 0});
        }
        createBackground() {
            this._backSprite = new Sprite();
            this._backSprite.bitmap = SceneManager.backgroundBitmap();
            this.addChild(this._backSprite);
        }
        update() {
            super.update();
            const time = Graphics.frameCount * 0.05;
            this._sprite.scale.x = 1 + Math.sin(time) * 0.05;
            this._sprite.scale.y = 1 + Math.sin(time) * 0.05;
            if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
                SoundManager.playOk();
                SceneManager.goto(Scene_Map);
            }
        }
    }


    //-------------------------------------------------------------------------
    // 美化的赛程UI (Tabs, Pairings, Standings, Roster)
    //-------------------------------------------------------------------------

    // 顶部选项卡
    class Window_TourneyTabs extends Window_HorzCommand {
        initialize(rect) {
            super.initialize(rect);
        }
        maxCols() { return 3; }
        makeCommandList() {
            this.addCommand("当前对阵", "pairings");
            this.addCommand("积分排名", "standings");
            this.addCommand("选手图鉴", "roster");
        }
        select(index) {
            const lastIndex = this.index();
            super.select(index);
            if (this.index() !== lastIndex) {
                this.callHandler('change');
            }
        }
    }

    // 对阵表 (美化版)
    class Window_TournamentPairings extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this.refresh();
        }
        maxItems() { return TournamentManager._currentPairings.length; }
        itemHeight() { return 72; }

        isCurrentItemEnabled() {
            const isDone = TournamentManager._battleResults.includes(this.index());
            return !isDone;
        }

        drawItem(index) {
            const pair = TournamentManager._currentPairings[index];
            const rect = this.itemLineRect(index);
            const isDone = TournamentManager._battleResults.includes(index);

            // 背景交替色
            if (index % 2 === 0) {
                this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, 'rgba(255,255,255,0.05)');
            }

            let color1 = ColorManager.normalColor();
            let color2 = ColorManager.normalColor();

            if (isDone) {
                this.changePaintOpacity(false);
                if (pair.winner === pair.p1.troopId) color2 = '#666666';
                else if (pair.winner === pair.p2.troopId) color1 = '#666666';
            } else {
                this.changePaintOpacity(true);
            }

            this.contents.fontSize = 28;

            // 绘制P1
            this.changeTextColor(color1);
            this.drawText(pair.p1.name, rect.x, rect.y + 12, rect.width / 2 - 40, 'right');

            // 绘制VS
            this.changeTextColor('#ff4444');
            this.contents.fontItalic = true;
            this.contents.fontSize = 32;
            this.drawText("VS", rect.x, rect.y + 10, rect.width, 'center');
            this.contents.fontItalic = false;

            // 绘制P2
            this.contents.fontSize = 28;
            this.changeTextColor(color2);
            this.drawText(pair.p2.name, rect.x + rect.width / 2 + 40, rect.y + 12, rect.width / 2 - 40, 'left');

            this.resetTextColor();

            // 状态标记
            if (isDone) {
                this.contents.fontSize = 18;
                this.changeTextColor(ColorManager.powerUpColor());
                this.drawText("◆ 已结束", rect.x + 20, rect.y + 18, 100, 'left');
                this.resetTextColor();
            } else {
                this.contents.fontSize = 18;
                this.changeTextColor(ColorManager.systemColor());
                this.drawText("▶ 待战斗", rect.x + 20, rect.y + 18, 100, 'left');
                this.resetTextColor();
            }
        }
    }

    // 积分榜
    class Window_TournamentStandings extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._list = [];
            this.refresh();
        }
        maxItems() { return this._list.length; }
        itemHeight() { return 48; }

        refresh() {
            this._list = [...TournamentManager.participants()].sort((a,b) => b.score - a.score || b.sos - a.sos);
            super.refresh();
        }

        drawItem(index) {
            const p = this._list[index];
            const rect = this.itemLineRect(index);

            if (index % 2 === 0) {
                this.contents.fillRect(rect.x, rect.y, rect.width, rect.height, 'rgba(255,255,255,0.05)');
            }

            this.changePaintOpacity(!p.isEliminated);

            this.contents.fontSize = 24;
            let rankColor = ColorManager.normalColor();
            if (index === 0) rankColor = '#ffff00';
            else if (index === 1) rankColor = '#cccccc';
            else if (index === 2) rankColor = '#cc8833';

            this.changeTextColor(rankColor);
            this.drawText(`#${index + 1}`, rect.x + 10, rect.y, 60, 'left');
            this.resetTextColor();
            this.drawText(p.name, rect.x + 80, rect.y, 250, 'left');

            this.contents.fontSize = 22;
            const wLText = `${p.wins}胜 - ${p.losses}负`;
            this.drawText(wLText, rect.x + 350, rect.y, 150, 'left');
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(`小分(SOS): ${p.sos}`, rect.x + 500, rect.y, 150, 'left');

            if (p.isEliminated) {
                this.changeTextColor('#ff4444');
                this.drawText("【已淘汰】", rect.x + rect.width - 120, rect.y, 100, 'right');
            } else {
                this.changeTextColor('#00ff00');
                this.drawText("【晋级中】", rect.x + rect.width - 120, rect.y, 100, 'right');
            }

            this.resetTextColor();
            this.changePaintOpacity(true);
        }
    }

    // 选手图鉴列表
    class Window_TourneyRoster extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this._list = TournamentManager.participants();
            this.refresh();
        }
        maxItems() { return this._list.length; }
        itemHeight() { return 48; }

        setDetailWindow(detailWindow) {
            this._detailWindow = detailWindow;
            this.callUpdateHelp();
        }

        callUpdateHelp() {
            if (this._detailWindow && this.index() >= 0) {
                this._detailWindow.setParticipant(this._list[this.index()]);
            }
        }

        drawItem(index) {
            const p = this._list[index];
            const rect = this.itemLineRect(index);
            this.changePaintOpacity(!p.isEliminated);
            this.drawText(p.name, rect.x, rect.y, rect.width, 'center');
            this.changePaintOpacity(true);
        }
    }

    // 选手图鉴详情
    class Window_TourneyDetails extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._participant = null;
        }

        setParticipant(p) {
            if (this._participant !== p) {
                this._participant = p;
                this.refresh();
            }
        }

        refresh() {
            this.contents.clear();
            if (!this._participant) return;

            const p = this._participant;
            const enemy = p.enemyData;

            const bmp = $gameSystem.isSideView() ? ImageManager.loadSvEnemy(enemy.battlerName) : ImageManager.loadEnemy(enemy.battlerName);
            if(bmp.isReady()) {
                this.drawPortrait(bmp, enemy);
            } else {
                bmp.addLoadListener(() => this.drawPortrait(bmp, enemy));
            }

            const yStart = 20;
            this.contents.fontSize = 32;
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(p.name, 200, yStart, this.innerWidth - 200, 'left');
            this.resetTextColor();

            this.contents.fontSize = 20;
            let statusText = p.isEliminated ? "状态：已淘汰" : "状态：正常晋级";
            let statusColor = p.isEliminated ? '#ff4444' : '#00ff00';
            this.changeTextColor(statusColor);
            this.drawText(statusText, 200, yStart + 40, this.innerWidth - 200, 'left');
            this.resetTextColor();

            const pY = yStart + 80;
            const params = enemy.params;
            this.drawText(`最大HP: ${params[0]}`, 200, pY, 150);
            this.drawText(`最大MP: ${params[1]}`, 360, pY, 150);
            this.drawText(`攻击力: ${params[2]}`, 200, pY + 30, 150);
            this.drawText(`防御力: ${params[3]}`, 360, pY + 30, 150);
            this.drawText(`敏捷值: ${params[6]}`, 200, pY + 60, 150);

            this.changeTextColor(ColorManager.powerUpColor());
            this.drawText(`当前战绩: ${p.wins}胜 ${p.losses}负 (积分:${p.score})`, 200, pY + 110, 300);
            this.resetTextColor();
        }

        drawPortrait(bmp, enemy) {
            const pw = bmp.width;
            const ph = bmp.height;
            const targetW = 160;
            const targetH = 160;
            const scale = Math.min(targetW / pw, targetH / ph);
            const drawW = pw * scale;
            const drawH = ph * scale;
            const dx = 20 + (targetW - drawW)/2;
            const dy = 20 + (targetH - drawH)/2;

            this.contents.blt(bmp, 0, 0, pw, ph, dx, dy, drawW, drawH);
        }
    }

    // 赛程主场景
    class Scene_Tournament extends Scene_MenuBase {
        create() {
            super.create();
            this.createHelpWindow();
            this.createTabsWindow();
            this.createPairingsWindow();
            this.createStandingsWindow();
            this.createRosterWindows();

            this._tabsWindow.activate();
            this.onChangeTab();
        }

        // 返回该场景时刷新窗口内容，确保数据显示准确
        start() {
            super.start();
            if (!AudioManager._currentBgm) {
                $gameMap.autoplay();
            }
            this.refreshAll();
            this._pairingsWindow.refresh();
            this._standingsWindow.refresh();
            this._rosterList.refresh();
            this.updateHelpText();
        }
        refreshAll() {
            this._pairingsWindow.refresh();
            this._standingsWindow.refresh();
            this._rosterList.refresh();
           
        }
        updateHelpText() {
            let phaseText = TournamentManager._phase === "Swiss" ? "瑞士轮" : "淘汰赛";
            this._helpWindow.setText(`当前赛程: ${phaseText} - 第 ${TournamentManager._currentRound} 轮`);
        }

        createHelpWindow() {
            super.createHelpWindow();
            this.updateHelpText();
        }

        createTabsWindow() {
            const y = this._helpWindow.height;
            const wh = this.calcWindowHeight(1, true); // 使用规范的动态行高替代固定高度
            const rect = new Rectangle(0, y, Graphics.boxWidth, wh);
            this._tabsWindow = new Window_TourneyTabs(rect);
            this._tabsWindow.setHandler('pairings', this.onTabPairings.bind(this));
            this._tabsWindow.setHandler('standings', this.onTabStandings.bind(this));
            this._tabsWindow.setHandler('roster', this.onTabRoster.bind(this));
            this._tabsWindow.setHandler('cancel', this.popScene.bind(this));
            this._tabsWindow.setHandler('change', this.onChangeTab.bind(this));

            this.addWindow(this._tabsWindow);
        }

        contentRect() {
            const y = this._tabsWindow.y + this._tabsWindow.height;
            return new Rectangle(0, y, Graphics.boxWidth, Graphics.boxHeight - y);
        }

        createPairingsWindow() {
            this._pairingsWindow = new Window_TournamentPairings(this.contentRect());
            this._pairingsWindow.setHandler('ok', this.onMatchSelect.bind(this));
            this._pairingsWindow.setHandler('cancel', this.onSubCancel.bind(this));
            this.addWindow(this._pairingsWindow);
        }

        createStandingsWindow() {
            this._standingsWindow = new Window_TournamentStandings(this.contentRect());
            this._standingsWindow.setHandler('cancel', this.onSubCancel.bind(this));
            this.addWindow(this._standingsWindow);
        }

        createRosterWindows() {
            const rect = this.contentRect();
            const leftRect = new Rectangle(rect.x, rect.y, 240, rect.height);
            const rightRect = new Rectangle(rect.x + 240, rect.y, rect.width - 240, rect.height);

            this._rosterList = new Window_TourneyRoster(leftRect);
            this._rosterList.setHandler('cancel', this.onSubCancel.bind(this));

            this._rosterDetail = new Window_TourneyDetails(rightRect);
            this._rosterList.setDetailWindow(this._rosterDetail);

            this.addWindow(this._rosterList);
            this.addWindow(this._rosterDetail);
        }

        hideAllContents() {
            this._pairingsWindow.hide();
            this._standingsWindow.hide();
            this._rosterList.hide();
            this._rosterDetail.hide();
        }

        onChangeTab() {
            this.hideAllContents();
            switch (this._tabsWindow.currentSymbol()) {
                case 'pairings': this._pairingsWindow.show(); break;
                case 'standings': this._standingsWindow.show(); break;
                case 'roster':
                    this._rosterList.show();
                    this._rosterDetail.show();
                    break;
            }
        }

        onTabPairings() {
            this._pairingsWindow.activate();
            this._pairingsWindow.select(0);
        }

        onTabStandings() {
            this._standingsWindow.activate();
            this._standingsWindow.select(0);
        }

        onTabRoster() {
            this._rosterList.activate();
            this._rosterList.select(0);
        }

        onSubCancel() {
            this._pairingsWindow.deselect();
            this._standingsWindow.deselect();
            this._rosterList.deselect();
            this._tabsWindow.activate();
        }

        onMatchSelect() {
            const index = this._pairingsWindow.index();
            const pair = TournamentManager._currentPairings[index];
            TournamentManager._lastMatchIndex = index;
            TournamentManager._currentFightingIds = [pair.p1.troopId, pair.p2.troopId];

            SceneManager.push(Scene_VsScreen);
            SceneManager.prepareNextScene(pair.p1.troopId, pair.p2.troopId);
        }
    }

    const _Window_TourneyTabs_processCursorMove = Window_TourneyTabs.prototype.processCursorMove;
    Window_TourneyTabs.prototype.processCursorMove = function() {
        const lastIndex = this.index();
        _Window_TourneyTabs_processCursorMove.call(this);
        if (this.index() !== lastIndex) {
            this.callHandler('change');
        }
    };


    //-------------------------------------------------------------------------
    // 战斗结果拦截与屏幕中央大字显示
    //-------------------------------------------------------------------------
    const _BattleManager_processTvTEnd = BattleManager.processTvTEnd;
    BattleManager.processTvTEnd = function(winnerName) {
        if (this._isBattleEndProcessed) return;
        _BattleManager_processTvTEnd.call(this, winnerName);
        AudioManager.stopBgm();
        AudioManager.stopBgs();
        AudioManager.playMe({name: "Victory1", volume: 100, pitch: 100, pan: 0});
        this._tvTEndTimer = 180;

        if (TournamentManager.isActive() && SceneManager._scene instanceof Scene_Battle) {
            SceneManager._scene.showTourneyWinnerSplash(winnerName);

            let winnerId, loserId;
            if (this._winnerTroopIndex === 1) {
                winnerId = TournamentManager._currentFightingIds[1];
                loserId = TournamentManager._currentFightingIds[0];
            } else {
                winnerId = TournamentManager._currentFightingIds[0];
                loserId = TournamentManager._currentFightingIds[1];
            }
            TournamentManager._battleResults.push(TournamentManager._lastMatchIndex);
            TournamentManager.onBattleEnd(winnerId, loserId);
        }
    };

    Scene_Battle.prototype.showTourneyWinnerSplash = function(winnerName) {
        const text = `${winnerName} 获胜！`;

        this._splashDimmer = new Sprite(new Bitmap(Graphics.width, 160));
        this._splashDimmer.bitmap.fillRect(0, 0, Graphics.width, 160, 'rgba(0,0,0,0.6)');
        this._splashDimmer.y = Graphics.height / 2 - 80;
        this._splashDimmer.opacity = 0;
        this.addChild(this._splashDimmer);

        this._tourneyWinnerSprite = new Sprite(new Bitmap(Graphics.width, 200));
        this._tourneyWinnerSprite.bitmap.fontSize = 72;
        this._tourneyWinnerSprite.bitmap.fontItalic = true;
        this._tourneyWinnerSprite.bitmap.textColor = '#ffff00';
        this._tourneyWinnerSprite.bitmap.outlineColor = '#ff0000';
        this._tourneyWinnerSprite.bitmap.outlineWidth = 8;
        this._tourneyWinnerSprite.bitmap.drawText(text, 0, 0, Graphics.width, 200, 'center');

        this._tourneyWinnerSprite.anchor.set(0.5, 0.5);
        this._tourneyWinnerSprite.x = Graphics.width / 2;
        this._tourneyWinnerSprite.y = Graphics.height / 2;

        this._tourneyWinnerSprite.scale.set(3.0);
        this._tourneyWinnerSprite.opacity = 0;

        this.addChild(this._tourneyWinnerSprite);
    };

    const _Scene_Battle_update = Scene_Battle.prototype.update;
    Scene_Battle.prototype.update = function() {
        _Scene_Battle_update.call(this);

        if (this._tourneyWinnerSprite) {
            if (this._tourneyWinnerSprite.opacity < 255) {
                this._tourneyWinnerSprite.opacity += 20;
                this._splashDimmer.opacity += 10;
            }
            if (this._tourneyWinnerSprite.scale.x > 1) {
                this._tourneyWinnerSprite.scale.x -= 0.15;
                this._tourneyWinnerSprite.scale.y -= 0.15;
                if (this._tourneyWinnerSprite.scale.x <= 1) {
                    this._tourneyWinnerSprite.scale.set(1.0);
                    $gameScreen.startShake(5, 5, 20);
                }
            }
        }
    };

    const _BattleManager_updateBattleEnd = BattleManager.updateBattleEnd;
    BattleManager.updateBattleEnd = function() {
        if (TournamentManager.isActive() && this._tvTEndTimer > 0) {
            this._tvTEndTimer--;
            if (this._tvTEndTimer === 0) {
                SceneManager.pop();
            }
            return;
        }
        _BattleManager_updateBattleEnd.call(this);
    };

    // 插件命令注册
    PluginManager.registerCommand(pluginName, "setupTournament", args => {
        const ids = JSON.parse(args.troopIds);
        TournamentManager.init(ids, args.swissRounds, args.topCut);
    });

    PluginManager.registerCommand(pluginName, "openTournamentScene", () => {
        SceneManager.push(Scene_Tournament);
    });

})();