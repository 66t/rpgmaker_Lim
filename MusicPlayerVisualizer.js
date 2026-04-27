/*:
 * @target MZ
 * @plugindesc 现代音乐鉴赏室 V2：侧边栏布局 + 场景切换音乐恢复
 * @author Limpid
 * * @help 
 * 1. 自动记录玩家在游戏中听过的 BGM 到公共存档（配置）。
 * 2. 进入鉴赏室时会自动停止当前地图 BGM，退出时恢复。
 * 3. 布局调整：列表在左，可视化在右。
 */

//--- 1. 全局数据管理 ---
ConfigManager.unlockedMusic = [];

const _ConfigManager_makeData = ConfigManager.makeData;
ConfigManager.makeData = function() {
    const res = _ConfigManager_makeData.call(this);
    res.unlockedMusic = this.unlockedMusic;
    return res;
};

const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(data) {
    _ConfigManager_applyData.call(this, data);
    this.unlockedMusic = data.unlockedMusic || [];
};

const _AudioManager_playBgm = AudioManager.playBgm;
AudioManager.playBgm = function(bgm, pos) {
    _AudioManager_playBgm.call(this, bgm, pos);
    if (bgm && bgm.name && !ConfigManager.unlockedMusic.includes(bgm.name)) {
        ConfigManager.unlockedMusic.push(bgm.name);
        ConfigManager.save();
    }
};

//--- 2. 可视化精灵 ---
class Sprite_MusicVisualizer extends Sprite {
    initialize() {
        super.initialize(new Bitmap(Graphics.width, Graphics.height));
        this._analyser = null;
        this._dataArray = null;
        this.setupWebAudio();
    }

    setupWebAudio() {
        const context = WebAudio._context;
        if (!context) return;
        this._analyser = context.createAnalyser();
        this._analyser.fftSize = 512;
        this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
        if (WebAudio._masterGainNode) WebAudio._masterGainNode.connect(this._analyser);
    }

    update() {
        super.update();
        if (this._analyser) {
            this._analyser.getByteFrequencyData(this._dataArray);
            this.drawVisualizer();
        }
    }

    drawVisualizer() {
        const bitmap = this.bitmap;
        const ctx = bitmap.context;
        // 可视化中心向右偏移，避开左侧菜单
        const centerX = Graphics.width * 0.65;
        const centerY = Graphics.height / 2 - 20;

        ctx.clearRect(0, 0, bitmap.width, bitmap.height);

        let bassSum = 0;
        for(let i = 0; i < 10; i++) bassSum += this._dataArray[i];
        const bassEnergy = bassSum / 10 / 255;
        const radius = 120 + (bassEnergy * 40);

        const barCount = 100;
        const angleStep = (Math.PI * 2) / barCount;

        for (let i = 0; i < barCount; i++) {
            const val = this._dataArray[i % 50];
            const barHeight = (val / 255) * 100;
            const angle = i * angleStep;

            const xStart = centerX + Math.cos(angle) * radius;
            const yStart = centerY + Math.sin(angle) * radius;
            const xEnd = centerX + Math.cos(angle) * (radius + barHeight);
            const yEnd = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.beginPath();
            ctx.strokeStyle = `hsla(${200 + i * 2}, 90%, 65%, ${0.4 + (val / 255)})`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.moveTo(xStart, yStart);
            ctx.lineTo(xEnd, yEnd);
            ctx.stroke();
        }
        bitmap._baseTexture.update();
    }
}

//--- 3. 音乐播放场景 ---
class Scene_MusicPlayer extends Scene_MenuBase {
    create() {
        super.create();
        this.saveCurrentBgm(); // 保存当前 BGM
        this.createVisualizer();
        this.createListWindow();
        this.createUIOverlay();
    }

    saveCurrentBgm() {
        // 记录进入前的 BGM
        this._mapBgm = AudioManager.saveBgm();
        AudioManager.stopBgm();
    }

    createVisualizer() {
        this._visualizer = new Sprite_MusicVisualizer();
        this.addChild(this._visualizer);
    }

    createListWindow() {
        // 列表在左侧，宽度占据屏幕的 30%
        const rect = new Rectangle(0, 0, Graphics.boxWidth * 0.3, Graphics.boxHeight);
        this._listWindow = new Window_MusicList(rect);
        this._listWindow.setHandler("ok", this.onMusicOk.bind(this));
        this._listWindow.setHandler("cancel", this.onCancel.bind(this));
        this.addWindow(this._listWindow);
    }

    createUIOverlay() {
        this._infoSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
        this.addChild(this._infoSprite);
    }

    update() {
        super.update();
        this.updateInfo();
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    updateInfo() {
        const bitmap = this._infoSprite.bitmap;
        bitmap.clear();
        if (AudioManager._bgmBuffer) {
            const total = AudioManager._bgmBuffer.duration || 0;
            const current = AudioManager._bgmBuffer.seek() || 0;
            const ratio = current / total;

            const startX = Graphics.width * 0.45;
            const width = Graphics.width * 0.4;
            const y = Graphics.height - 80;

            // 绘制歌曲名
            bitmap.fontSize = 28;
            bitmap.drawText(this._currentBgmName || "Selection", startX, y - 50, width, 40, "center");

            // 绘制进度条
            bitmap.fillRect(startX, y, width, 6, "rgba(255,255,255,0.1)");
            bitmap.fillRect(startX, y, width * ratio, 6, "#00f2fe");

            // 绘制时间文字
            bitmap.fontSize = 18;
            bitmap.drawText(this.formatTime(current), startX, y + 10, 100, 30, "left");
            bitmap.drawText(this.formatTime(total), startX + width - 100, y + 10, 100, 30, "right");
        }
    }

    onMusicOk() {
        const bgmName = this._listWindow.currentSymbol();
        if (bgmName && bgmName !== "none") {
            AudioManager.playBgm({ name: bgmName, volume: 90, pitch: 100, pan: 0 });
            this._currentBgmName = bgmName;
        }
        this._listWindow.activate();
    }

    onCancel() {
        // 退出场景时恢复之前的音乐
        if (this._mapBgm) {
            AudioManager.replayBgm(this._mapBgm);
        }
        this.popScene();
    }
}

//--- 4. 侧边列表窗口 ---
class Window_MusicList extends Window_Command {
    makeCommandList() {
        const list = ConfigManager.unlockedMusic;
        if (list.length === 0) {
            this.addCommand("未解锁音乐", "none", false);
        } else {
            for (const name of list) {
                this.addCommand(name, name);
            }
        }
    }
    // 列表垂直居中显示
    itemTextAlign() { return "left"; }
}