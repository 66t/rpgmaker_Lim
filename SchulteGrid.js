/*:
 * @target MZ
 * @plugindesc 舒尔特方格小游戏（纯净精简版 - 保存秒数）
 * @author Gemini
 *
 * @help SchulteGrid.js
 *
 * 这是一个舒尔特方格（Schulte Grid）小游戏插件。
 * 玩家需要在网格中按顺序（从 1 开始）点击数字。
 * * 【功能特性】：
 * 1. 点击正确的数字后，该数字会变成绿色。
 * 2. 移除所有作弊模式及通关音乐，保持纯净。
 * 3. 游戏完成后，提示“测试完毕，任意键退出”，并显示最终成绩。
 * 4. 【更新】：成绩以“秒”（保留两位小数）的形式保存在指定变量中。
 *
 * 游戏完成后，消耗的时间（秒）将被保存在指定的变量中。
 * 游戏过程中可以按取消键（Esc/鼠标右键）随时退出，此时不记录成绩。
 *
 * @command start
 * @text 开始舒尔特方格
 * @desc 启动舒尔特方格小游戏界面。
 *
 * @arg size
 * @text 矩阵大小
 * @desc 方格的边长。例如填 5 就是 5x5 (共25个数字)。建议 3 ~ 7。
 * @type number
 * @default 5
 * @min 2
 * @max 10
 *
 * @arg variableId
 * @text 成绩保存变量
 * @desc 游戏完成时，消耗的时间（秒）将被保存在这个变量中。
 * @type variable
 * @default 1
 */

(() => {
    const pluginName = "SchulteGrid";

    // 注册插件命令
    PluginManager.registerCommand(pluginName, "start", args => {
        const size = Number(args.size) || 5;
        const variableId = Number(args.variableId) || 1;
        SceneManager.push(Scene_Schulte);
        SceneManager.prepareNextScene(size, variableId);
    });

    //=============================================================================
    // Scene_Schulte
    //=============================================================================
    function Scene_Schulte() {
        this.initialize(...arguments);
    }

    Scene_Schulte.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Schulte.prototype.constructor = Scene_Schulte;

    Scene_Schulte.prototype.prepare = function(size, variableId) {
        this._gridSize = size;
        this._variableId = variableId;
    };

    Scene_Schulte.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createTimerWindow();
        this.createGridWindow();
    };

    Scene_Schulte.prototype.createTimerWindow = function() {
        const rect = this.timerWindowRect();
        this._timerWindow = new Window_SchulteTimer(rect);
        this.addWindow(this._timerWindow);
    };

    Scene_Schulte.prototype.timerWindowRect = function() {
        const ww = 450;
        const wh = this.calcWindowHeight(2, false);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = 40;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Schulte.prototype.createGridWindow = function() {
        const rect = this.gridWindowRect();
        this._gridWindow = new Window_SchulteGrid(rect, this._gridSize);
        this._gridWindow.setHandler("ok", this.onGridOk.bind(this));
        this._gridWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._gridWindow);
    };

    Scene_Schulte.prototype.gridWindowRect = function() {
        const size = Math.min(Graphics.boxWidth, Graphics.boxHeight) - 220;
        const ww = size;
        const wh = size;
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = this._timerWindow.y + this._timerWindow.height + 20;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_Schulte.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
        this._gridWindow.activate();
        this._startTime = Date.now();
        this._timerWindow.setStartTime(this._startTime);
        this._expected = 1;
        this._timerWindow.setExpected(this._expected);
        this._gridWindow.setExpected(this._expected);
        this._finished = false;
        this._finishWait = 30;
    };

    Scene_Schulte.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        if (this._finished) {
            if (this._finishWait > 0) {
                this._finishWait--;
            } else if (Input.isTriggered('ok') || TouchInput.isTriggered() || Input.isTriggered('cancel')) {
                SoundManager.playOk();
                this.popScene();
            }
        }
    };

    Scene_Schulte.prototype.onGridOk = function() {
        if (this._finished) return;
        const index = this._gridWindow.index();
        const number = this._gridWindow.numberAt(index);

        if (number === this._expected) {
            SoundManager.playOk();
            this._expected++;
            this._gridWindow.setExpected(this._expected);
            if (this._expected > this._gridSize * this._gridSize) {
                this.onWin();
            } else {
                this._timerWindow.setExpected(this._expected);
                this._gridWindow.activate();
            }
        } else {
            SoundManager.playBuzzer();
            this._gridWindow.activate();
        }
    };

    Scene_Schulte.prototype.onWin = function() {
        this._finished = true;

        // 获取消耗的总毫秒数
        const timeTaken = Date.now() - this._startTime;

        // 【核心修改】将毫秒换算为秒，并强制保留两位小数存储到变量中（例如：12.34）
        const seconds = Number((timeTaken / 1000).toFixed(2));
        $gameVariables.setValue(this._variableId, seconds);

        this._timerWindow.stopTimer();
        this._timerWindow.displayWin(timeTaken);
        this._gridWindow.deactivate();
    };

    //=============================================================================
    // Window_SchulteTimer
    //=============================================================================
    function Window_SchulteTimer() {
        this.initialize(...arguments);
    }

    Window_SchulteTimer.prototype = Object.create(Window_Base.prototype);
    Window_SchulteTimer.prototype.constructor = Window_SchulteTimer;

    Window_SchulteTimer.prototype.initialize = function(rect) {
        Window_Base.prototype.initialize.call(this, rect);
        this._startTime = 0;
        this._expected = 1;
        this._stopped = false;
        this._winTime = 0;
        this._lastTimeText = "0.00";
    };

    Window_SchulteTimer.prototype.setStartTime = function(time) {
        this._startTime = time;
    };

    Window_SchulteTimer.prototype.setExpected = function(num) {
        this._expected = num;
        this.refresh();
    };

    Window_SchulteTimer.prototype.stopTimer = function() {
        this._stopped = true;
    };

    Window_SchulteTimer.prototype.displayWin = function(timeTaken) {
        this._winTime = timeTaken;
        this.refresh();
    };

    Window_SchulteTimer.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        if (this._startTime > 0 && !this._stopped) {
            const elapsed = Date.now() - this._startTime;
            const timeText = (elapsed / 1000).toFixed(2);
            if (this._lastTimeText !== timeText) {
                this._lastTimeText = timeText;
                this.refresh();
            }
        }
    };

    Window_SchulteTimer.prototype.refresh = function() {
        this.contents.clear();
        if (this._winTime > 0) {
            const line1 = "测试完毕，任意键退出";
            const line2 = "总耗时: " + (this._winTime / 1000).toFixed(2) + " 秒";
            this.drawText(line1, 0, 0, this.innerWidth, 'center');
            this.drawText(line2, 0, this.lineHeight(), this.innerWidth, 'center');
        } else {
            const nextText = "当前目标数字: " + this._expected;
            const timeText = "已用时间: " + this._lastTimeText + " s";
            this.drawText(nextText, 0, 0, this.innerWidth, 'left');
            this.drawText(timeText, 0, this.lineHeight(), this.innerWidth, 'left');
        }
    };

    //=============================================================================
    // Window_SchulteGrid
    //=============================================================================
    function Window_SchulteGrid() {
        this.initialize(...arguments);
    }

    Window_SchulteGrid.prototype = Object.create(Window_Selectable.prototype);
    Window_SchulteGrid.prototype.constructor = Window_SchulteGrid;

    Window_SchulteGrid.prototype.initialize = function(rect, size) {
        this._gridSize = size;
        this._expected = 1;
        this.makeNumbers();
        Window_Selectable.prototype.initialize.call(this, rect);
        this.refresh();
    };

    Window_SchulteGrid.prototype.setExpected = function(expected) {
        this._expected = expected;
        this.refresh();
    };

    Window_SchulteGrid.prototype.maxCols = function() {
        return this._gridSize;
    };

    Window_SchulteGrid.prototype.maxItems = function() {
        return this._gridSize * this._gridSize;
    };

    Window_SchulteGrid.prototype.itemHeight = function() {
        return Math.floor(this.innerHeight / this._gridSize);
    };

    Window_SchulteGrid.prototype.makeNumbers = function() {
        const max = this.maxItems();
        this._numbers = [];
        for (let i = 1; i <= max; i++) {
            this._numbers.push(i);
        }
        for (let i = this._numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._numbers[i], this._numbers[j]] = [this._numbers[j], this._numbers[i]];
        }
    };

    Window_SchulteGrid.prototype.numberAt = function(index) {
        return this._numbers[index];
    };

    Window_SchulteGrid.prototype.drawItem = function(index) {
        const rect = this.itemRect(index);
        const num = this._numbers[index];

        this.contents.fontSize = Math.floor(rect.height * 0.4);

        if (num < this._expected) {
            this.changeTextColor(ColorManager.textColor(3));
        } else {
            this.resetTextColor();
        }

        this.contents.drawText(num, rect.x, rect.y, rect.width, rect.height, 'center');
        this.resetTextColor();
        this.contents.fontSize = $gameSystem.mainFontSize();
    };

    Window_SchulteGrid.prototype.drawItemBackground = function(index) {
        Window_Selectable.prototype.drawItemBackground.call(this, index);
        const rect = this.itemRect(index);
        this.contentsBack.strokeRect(rect.x, rect.y, rect.width, rect.height, ColorManager.normalColor());
    };

})();