function FormulaInterpreter() {
    throw new Error("This is a static class");
}

FormulaInterpreter.create=function (raw, origin){
    var reactiveObj = {};
    for (let key in raw) { 
        Object.defineProperty(reactiveObj, key, {
            get: function() {
                return raw[key]
            },
            enumerable: true
        });
    }
    origin.params=reactiveObj
}


Scene_Base.prototype.initialize = function() {
    Stage.prototype.initialize.call(this);
    this._started = false;
    this._active = false;
    this._fadeSign = 0;
    this._fadeDuration = 0;
    this._fadeWhite = 0;
    this._fadeOpacity = 0;
    this.createColorFilter();
    let data= {
        x1: "^startX^ + (^t^ * (V[1] * 0.5))",
        y1: "^startY^ + (^t^ * 0.5)",
        size1: "15 + sn(20, ^t^) * 10",
        color1: "'#1e90ff'"
    }
    FormulaInterpreter.create(data,this)
};
