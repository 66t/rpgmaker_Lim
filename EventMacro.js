/*:
 * @plugindesc 그림 명령 동적 플레이스홀더 해석 (변수/스위치 실시간 동기화 지원)
 * @target MV,MZ
 * * @help
 * ============================================================================
 * ■ 플러그인 핵심 기능
 * ============================================================================
 * 이 플러그인은 「그림 표시」 명령을 확장하여 다음 매개변수에서 
 * "변수" 또는 "스위치"를 사용할 수 있도록 합니다:
 * 1. 그림 이름 (리소스 동적 교체용)
 * 2. X 좌표 (동적 위치 이동용)
 * 3. Y 좌표 (동적 위치 이동용)
 * * * 핵심 특징: 동적 모니터링. 그림이 표시된 후, 연결된 변수나 스위치의 값이 
 * 변경되면 화면상의 그림이 【즉시 자동으로 업데이트】됩니다. 
 * 별도의 “그림 표시” 명령을 다시 실행할 필요가 없습니다.
 * * ============================================================================
 * ■ 플레이스홀더 구문 (그림 이름 또는 좌표 입력란에 입력)
 * ============================================================================
 * 1. $v[ID]         - 해당 ID 번호 변수의 값으로 교체됩니다.
 * 예: 그림 이름에 `Hero_$v[1]` 입력 -> 1번 변수가 5일 때, `Hero_5` 표시.
 * * 2. $v[ID:기본값]  - 변수 값이 유효하지 않을 때 사용할 대체값입니다.
 * 예: X좌표에 `$v[10:100]` 입력 -> 10번 변수가 정의되지 않았다면 좌표는 100이 됨.
 * * 3. $s[ID]         - 해당 ID 번호 스위치의 상태로 교체됩니다 (ON=1, OFF=0).
 * 예: 그림 이름에 `Icon_$s[5]` 입력 -> 5번 스위치가 켜져 있으면 `Icon_1` 표시.
 * * 4. $v[ID#최대값]  - 치환된 수치의 상한선을 제한합니다.
 * 예: X좌표에 `$v[1#640]` 입력 -> 1번 변수가 999이더라도 좌표는 640으로 고정.
 * * ============================================================================
 * ■ 사용 팁 및 주의사항
 * ============================================================================
 * 1. 【좌표 입력】:
 * 에디터 제약상 「그림 표시」 패널의 '상수' 입력란에는 문자를 입력할 수 없습니다.
 * 다음과 같이 【스크립트】 명령을 사용해 호출하는 것을 권장합니다:
 * $gameScreen.showPicture(번호, "그림명_$v[1]", 원점, "$v[2]", "$v[3]", 
 * 확대율X, 확대율Y, 불투명도, 합성모드);
 * * 2. 【자동 부드러운 이동】:
 * 변수를 통해 그림 좌표를 변경하면, 플러그인이 자동으로 그림의 대상 좌표를 
 * 업데이트하여 실시간 추적 효과를 구현합니다.
 * * 3. 【세이브 데이터 관련】:
 * 게임을 불러온 후에는 동적 바인딩 관계가 초기화됩니다. 맵 이동 직후나 
 * 로드 후 초기화 이벤트에서 「그림 표시」 명령을 다시 한 번 실행하여 
 * 모니터링을 활성화하는 것이 좋습니다.
 * * 4. 【이미지 깜빡임】:
 * 변수 변경으로 인해 "그림 이름"이 바뀌면 엔진이 새 이미지를 로드하므로, 
 * 용량이 큰 이미지는 짧은 깜빡임이 발생할 수 있습니다. 관련 리소스를 
 * 미리 캐싱(Preload)해두는 것을 권장합니다.
 * ============================================================================
 */

(function() {
    var pictureDependencies = {};
    var varToPictures = {};
    var switchToPictures = {};

    // ID 추출 함수 (v: 변수, s: 스위치)
    function extractIds(str, type) {
        var ids = {};
        if (typeof str !== 'string') return ids;

        var regex = type === 'v' ? /\$v\[(\d+)/g : /\$s\[(\d+)/g;
        var match;
        while ((match = regex.exec(str)) !== null) {
            var id = parseInt(match[1], 10);
            if (id > 0) ids[id] = true;
        }
        regex.lastIndex = 0;
        return ids;
    }

    // 변수/스위치 플레이스홀더 치환 처리
    function replaceGameVarSwitchPlaceholders(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/\$([vs])\[(\d+)(?::([^:#\]]+))?(?:#(\d+))?\]/g,
            function(match, type, idStr, defaultStr, maxStr) {
                var id = parseInt(idStr, 10);
                var defaultValue = defaultStr !== undefined ? defaultStr : '0';
                var hasMax = maxStr !== undefined;
                var maxValue = hasMax ? parseInt(maxStr, 10) : Infinity;

                var rawValue;
                if (type === 'v') {
                    rawValue = $gameVariables.value(id);
                } else if (type === 's') {
                    rawValue = $gameSwitches.value(id) ? 1 : 0;
                }
                var value = (rawValue != null && rawValue !== '') ? rawValue : defaultValue;
                var numValue = Number(value);
                if (!isNaN(numValue)) {
                    if (numValue > maxValue) {
                        numValue = maxValue;
                    }
                    return numValue.toString();
                } else {
                    return value.toString();
                }
            });
    }

    // 그림 업데이트 로직
    function updatePicture(pictureId) {
        var dep = pictureDependencies[pictureId];
        if (!dep) return;
        var pic = $gameScreen.picture(pictureId);
        if (!pic) return;
        var newName = replaceGameVarSwitchPlaceholders(dep.templateName);
        var newXStr = replaceGameVarSwitchPlaceholders(dep.templateX);
        var newYStr = replaceGameVarSwitchPlaceholders(dep.templateY);
        var newX = parseFloat(newXStr) || 0;
        var newY = parseFloat(newYStr) || 0;
        var changed = false;

        // 이름 변경 확인
        if (newName !== pic._name) {
            pic._name = newName;
            changed = true;
        }
        // 좌표 변경 확인 및 즉시 갱신
        if (newX !== pic._x || newY !== pic._y) {
            pic._x = newX;
            pic._y = newY;
            pic._targetX = newX;
            pic._targetY = newY;
            pic._duration = 0;
            changed = true;
        }
        if (!changed) return;
    }

    // 값이 변경된 변수/스위치에 영향을 받는 그림들 업데이트
    function updateAffectedPictures(changedId, isVariable) {
        var map = isVariable ? varToPictures : switchToPictures;
        var affected = map[changedId];
        if (affected) {
            for (var pictureId in affected) {
                if (affected.hasOwnProperty(pictureId)) {
                    updatePicture(Number(pictureId));
                }
            }
        }
    }

    // 변수 설정 후크
    var _Game_Variables_setValue = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        if (this.value(variableId) !== value) {
            _Game_Variables_setValue.call(this, variableId, value);
            updateAffectedPictures(variableId, true);
        }
    };

    // 스위치 설정 후크
    var _Game_Switches_setValue = Game_Switches.prototype.setValue;
    Game_Switches.prototype.setValue = function(switchId, value) {
        if (this.value(switchId) !== value) {
            _Game_Switches_setValue.call(this, switchId, value);
            updateAffectedPictures(switchId, false);
        }
    };

    // 그림 표시 함수 확장 (의존성 등록)
    var _Game_Screen_showPicture = Game_Screen.prototype.showPicture;
    Game_Screen.prototype.showPicture = function(pictureId, name, origin, x, y, scaleX, scaleY, opacity, blendMode) {
        var templateName = name;
        var templateX = x;
        var templateY = y;
        var allStrings = [templateName, templateX, templateY].filter(function(s) { return typeof s === 'string'; });
        var varIds = {};
        var switchIds = {};

        for (var i = 0; i < allStrings.length; i++) {
            var str = allStrings[i];
            var vIds = extractIds(str, 'v');
            for (var id in vIds) {
                if (vIds.hasOwnProperty(id)) varIds[id] = true;
            }
            var sIds = extractIds(str, 's');
            for (var id in sIds) {
                if (sIds.hasOwnProperty(id)) switchIds[id] = true;
            }
        }

        pictureDependencies[pictureId] = { varIds: varIds, switchIds: switchIds, templateName: templateName, templateX: templateX, templateY: templateY };

        // 역방향 인덱스 구축 (변수ID -> 그림ID)
        for (var varId in varIds) {
            if (varIds.hasOwnProperty(varId)) {
                if (!varToPictures.hasOwnProperty(varId)) varToPictures[varId] = {};
                varToPictures[varId][pictureId] = true;
            }
        }
        for (var switchId in switchIds) {
            if (switchIds.hasOwnProperty(switchId)) {
                if (!switchToPictures.hasOwnProperty(switchId)) switchToPictures[switchId] = {};
                switchToPictures[switchId][pictureId] = true;
            }
        }

        var processedName = replaceGameVarSwitchPlaceholders(templateName);
        var processedX = replaceGameVarSwitchPlaceholders(templateX);
        var processedY = replaceGameVarSwitchPlaceholders(templateY);
        var finalX = typeof processedX === 'string' ? parseFloat(processedX) || 0 : processedX;
        var finalY = typeof processedY === 'string' ? parseFloat(processedY) || 0 : processedY;

        _Game_Screen_showPicture.call( this, pictureId, processedName, origin, finalX, finalY, scaleX, scaleY, opacity, blendMode );
    };

    // 그림 제거 시 의존성 삭제
    var _Game_Screen_erasePicture = Game_Screen.prototype.erasePicture;
    Game_Screen.prototype.erasePicture = function(pictureId) {
        var dep = pictureDependencies[pictureId];
        if (dep) {
            for (var varId in dep.varIds) {
                if (dep.varIds.hasOwnProperty(varId)) {
                    var set = varToPictures[varId];
                    if (set) {
                        delete set[pictureId];
                        var remaining = 0;
                        for (var key in set) {
                            if (set.hasOwnProperty(key)) remaining++;
                        }
                        if (remaining === 0) delete varToPictures[varId];
                    }
                }
            }
            for (var switchId in dep.switchIds) {
                if (dep.switchIds.hasOwnProperty(switchId)) {
                    var set = switchToPictures[switchId];
                    if (set) {
                        delete set[pictureId];
                        var remaining = 0;
                        for (var key in set) {
                            if (set.hasOwnProperty(key)) remaining++;
                        }
                        if (remaining === 0) delete switchToPictures[switchId];
                    }
                }
            }
            delete pictureDependencies[pictureId];
        }
        _Game_Screen_erasePicture.call(this, pictureId);
    };

    // 새 게임 시작 시 데이터 초기화
    var _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        pictureDependencies = {};
        varToPictures = {};
        switchToPictures = {};
        _DataManager_setupNewGame.call(this);
    };

    // 로드 시 데이터 초기화 (도움말 문서에 따라 수동 갱신 권장)
    var _DataManager_loadGame = DataManager.loadGame;
    DataManager.loadGame = function(savefileId) {
        var result = _DataManager_loadGame.call(this, savefileId);
        if (result) {
            pictureDependencies = {};
            varToPictures = {};
            switchToPictures = {};
        }
        return result;
    };

})();