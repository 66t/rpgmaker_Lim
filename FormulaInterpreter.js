//=============================================================================
// RPG Maker Plugin - Formula Interpreter
// FormulaInterpreter.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [V1.0] 고급 공식 해석기: 정적/동적 수치 바인딩 및 약축 문법 지원.
 * @author Limpid
 * * @help
 * 이 플러그인은 특수한 문자열 공식을 해석하기 위한 정적 클래스입니다.
 * * [문법 설명]
 * 1. 변수 참조:
 * - v[id]: 정적 변수 값 (초기화 시 1회 로드)
 * - V[id]: 동적 변수 값 (참조 시마다 실시간 로드)
 * * 2. 호스트 속성 참조:
 * - @^prop^: origin 객체의 속성을 정적으로 참조
 * - ^prop^: origin 객체의 속성을 동적으로 참조 (값 변경 시 실시간 반영)
 * * 3. 기타 약축:
 * - s[id] / S[id]: 스위치 상태 (1/0)
 * - r[n] / R[n]: 랜덤 숫자 (0 ~ n)
 * - g / G: 소지 골드
 * - i[id] / I[id]: 아이템 소지 수
 * - l[id] / L[id]: 액터 레벨
 * - p[id.attr] / P[id.attr]: 액터 특정 속성 (예: P[1.hp])
 * * 4. 내장 함수:
 * - a(x): 절대값
 * - s(max, i): 사인파 계산 (Math.sin((PI/2)/max * i))
 * - c(max, i): 코사인파 계산
 */

var Imported = Imported || {};
Imported.FormulaInterpreter = true;

function FormulaInterpreter() {
    throw new Error("이 클래스는 정적 클래스이므로 인스턴스화할 수 없습니다.");
}

/**
 * 내부 수학 메서드 라이브러리
 * 공식 내에서 "s(100, ^t^)"와 같이 사용 가능
 */
FormulaInterpreter.methods = {
    a: Math.abs,
    // 애니메이션 및 부드러운 전환을 위해 설계된 사인 함수
    s: function(max, i) {
        return Math.sin((Math.PI / 2) / (Number(max) || 1) * (Number(i) || 0));
    },
    c: function(max, i) {
        return Math.cos((Math.PI / 2) / (Number(max) || 1) * (Number(i) || 0));
    }
};

/**
 * 문법 레지스트리
 * static: 구체적인 수치 반환
 * dynamic: Function 생성을 위한 JS 코드 문자열 반환
 */
FormulaInterpreter.registry ={
    static: {
        'v': (id) => $gameVariables.value(Number(id)),
        's': (id) => $gameSwitches.value(Number(id)) ? 1 : 0,
        'r': (n) => Math.random() * Number(n),
        'g': () => $gameParty.gold(),
        'i': (id) => $gameParty.numItems($dataItems[Number(id)]),
        'l': (id) => $gameActors.actor(Number(id))?.level || 0,
        'p': (id_attr) => {
            const [id, attr] = id_attr.split('.');
            return $gameActors.actor(Number(id))?.[attr] || 0;
        }
    },
    dynamic: {
        'V': (id) => `$gameVariables.value(${id})`,
        'S': (id) => `$gameSwitches.value(${id})`,
        'R': (id) => `(Math.random() * ${id})`,
        'G': () => `$gameParty.gold()`,
        'I': (id) => `$gameParty.numItems($dataItems[${id}])`,
        'L': (id) => `$gameActors.actor(${id})?.level || 0`,
        'P': (id_attr) => {
            const [id, attr] = id_attr.split('.');
            return `$gameActors.actor(${id})?.${attr} || 0`;
        }
    }
};

/**
 * 입구 메서드: 원본 설정 객체를 반응형 파라미터 객체로 변환
 * @param {Object} raw - 공식 문자열을 포함한 설정 객체
 * @param {Object} origin - 호스트 객체 (Scene 또는 Sprite 등)
 */
FormulaInterpreter.create = function (raw, origin){
    var reactiveObj = {};
    for (let key in raw) {
        let compiled = FormulaInterpreter.compile(raw[key], origin);
        if (compiled.type === 'dynamic') {
            // 동적 공식인 경우 getter를 사용하여 실시간 계산
            Object.defineProperty(reactiveObj, key, {
                get: function() {
                    return compiled.func.call(FormulaInterpreter, origin, FormulaInterpreter.methods);
                },
                enumerable: true,
                configurable: true
            });
        } else {
            // 정적 공식인 경우 직접 대입
            reactiveObj[key] = compiled.value;
        }
    }
    // 결과를 호스트의 params 속성에 주입
    origin.params = reactiveObj;
};

/**
 * 핵심 컴파일 엔진
 */
FormulaInterpreter.compile = function(formula, origin) {
    if (typeof formula !== 'string') return { type: 'static', value: Number(formula) || 0 };

    let f = formula;
    // 1. 정적 호스트 변수 참조 처리 @^prop^
    f = f.replace(/@\^([\w.]+)\^/g, (_, p) => this._getOriginValue(origin, p));

    // 2. 중첩된 소문자 정적 약축 문법 재귀 해석 (예: v[s[1]])
    let last;
    do {
        last = f;
        f = f.replace(/([a-z])\[([^\[\]]+)\]/g, (match, type, content) => {
            const handler = this.registry.static[type];
            return (handler && !match.includes('(')) ? handler(content) : match;
        });
    } while (last !== f);

    // 3. 동적 마커(^ 또는 대문자 약축) 포함 여부 판단
    const isDynamic = /\^|[A-Z]\[/.test(f);
    const jsSyntax = this._toJsSyntax(f);

    if (!isDynamic) {
        try {
            return { type: 'static', value: this._execute(jsSyntax, origin) };
        } catch (e) {
            console.error("Formula Static Eval Error:", e);
            return { type: 'static', value: 0 };
        }
    }

    // 4. 동적 실행 함수 반환
    return {
        type: 'dynamic',
        func: new Function('origin', 'm', `try { return ${jsSyntax}; } catch(e) { return 0; }`)
    };
};

/**
 * 약축 문법을 유효한 JavaScript 표현식으로 변환
 */
FormulaInterpreter._toJsSyntax = function(f) {
    let js = f;
    // 동적 호스트 참조 변환
    js = js.replace(/\^([\w.]+)\^/g, (_, p) => `this._getOriginValue(origin, "${p}")`);

    // 대문자 동적 약축 변환
    const dynamicRegex = /([A-Z]+)\[([^\[\]]+)\]/g;
    while (dynamicRegex.test(js)) {
        js = js.replace(dynamicRegex, (match, type, content) => {
            const handler = this.registry.dynamic[type];
            return handler ? handler(content) : match;
        });
        dynamicRegex.lastIndex = 0;
    }

    // 내장 메서드 매핑 변환 (예: a() -> m.a())
    return js.replace(/([a-z]\w*)\(/gi, (m, p1) => {
        const funcName = p1.toLowerCase();
        return this.methods[funcName] ? `m.${funcName}(` : m;
    });
};

/**
 * 호스트 객체로부터 안전하게 속성 값 획득 (중첩 속성 지원)
 */
FormulaInterpreter._getOriginValue = function(o, p) {
    if (!o) return 0;
    return p.split('.').reduce((acc, k) => {
        return (acc && acc[k] !== undefined) ? acc[k] : 0;
    }, o);
};

/**
 * 정적 JS 표현식 실행
 */
FormulaInterpreter._execute = function(js, o) {
    return new Function('origin', 'm', `return ${js}`).call(this, o, this.methods);
};

//=============================================================================
// 예제 주입: Scene_Base
//=============================================================================

const _Scene_Base_initialize = Scene_Base.prototype.initialize;
Scene_Base.prototype.initialize = function() {
    _Scene_Base_initialize.call(this);

    // 예제 데이터 구조
    let data = {
        x1: "^startX^ + (^t^ * (V[1] * 0.5))", // startX, t, 변수1에 따라 실시간 변화
        y1: "R[100]",                         // 접근할 때마다 새로운 랜덤값 생성
        size1: "r[100]",                      // 초기화 시 결정된 고정 랜덤값
        color1: "'#1e90ff'"                   // 정적 문자열
    };

    // 호스트 객체의 기본 속성 설정
    this.startX = 100;
    this.t = 0;

    FormulaInterpreter.create(data, this);
};

const _Scene_Base_update = Scene_Base.prototype.update;
Scene_Base.prototype.update = function() {
    _Scene_Base_update.call(this);

    // 매 프레임 t 증가. x1은 ^t^와 연결되어 있으므로 this.params.x1이 자동 갱신됨
    this.t++;

    if (this.params) {
        // 동적 y1 값 출력 (매 프레임 다른 값)
        // console.log("현재 Y1:", this.params.y1);
    }
};