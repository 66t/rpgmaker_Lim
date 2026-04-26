Array.prototype.intersect = function(arr) {
    if (!Array.isArray(arr)) return [];
    const set = new Set(arr);
    return this.filter(x => set.has(x));
};
Array.prototype.diff = function(arr) {
    if (!Array.isArray(arr)) return this.slice();
    const set = new Set(arr);
    return this.filter(x => !set.has(x));
};
Array.prototype.union = function(arr) {
    return [...new Set([...this, ...arr])];
};
Array.prototype.shuffle = function() {
    for (let i = this.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
};
Array.prototype.countBy = function(func = (x) => x) {
    return this.reduce((acc, elem) => {
        const key = func(elem);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
};
Array.prototype.partBy = function(func) {
    return this.reduce(([pass, fail], elem) =>
            func(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]],
        [[], []]
    );
};
Array.prototype.groupBy = function(keyFunc) {
    return this.reduce((acc, elem) => {
        const key = keyFunc(elem);
        (acc[key] || (acc[key] = [])).push(elem);
        return acc;
    }, {});
};
Array.prototype.uniqueBy = function(field) {
    if (typeof field !== 'string') {
        throw new TypeError('field must be a string');
    }
    const seen = new Set();
    return this.filter(item => {
        if (item == null || typeof item !== 'object') {
            return false; 
        }
        const value = item[field];
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
};
Array.prototype.weightedRandom = function(weights) {
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    const random = Math.random() * totalWeight;
    let sum = 0;
    for (let i = 0; i < this.length; i++) {
        sum += weights[i];
        if (random <= sum) return this[i];
    }
};
Array.prototype.flatten = function(depth = Infinity) {
    return this.reduce((acc, elem) =>
        acc.concat(Array.isArray(elem) && depth > 0 ?
            elem.flatten(depth - 1) : elem
        ), []
    );
};
Array.prototype.chunk = function(size) {
    return Array.from(
        { length: Math.ceil(this.length / size) },
        (_, i) => this.slice(i * size, i * size + size)
    );
};
Array.prototype.combinations = function(s) {
    const result = [];
    const length = this.length;
    if (s <= 0 || s > length) return result;
    const indices = Array.from({ length: s }, (_, i) => i);
    while (indices[0] <= length - s) {
        result.push(indices.map(i => this[i]));
        let i = s - 1;
        while (i >= 0 && indices[i] === i + length - s) i--;
        if (i < 0) break;
        indices[i]++;
        for (let j = i + 1; j < s; j++) {
            indices[j] = indices[j - 1] + 1;
        }
    }
    return result;
};
Array.prototype.permute = function() {
    const result = [];
    const array = this;
    const n = array.length;
    result.push(array.slice());
    let i = 0;
    let c = Array(n).fill(0);
    while (i < n) {
        if (c[i] < i) {
            if (i % 2 === 0) {
                [array[0], array[i]] = [array[i], array[0]];
            } else {
                [array[c[i]], array[i]] = [array[i], array[c[i]]];
            }
            result.push(array.slice());
            c[i]++;
            i = 0;
        } else {
            c[i] = 0;
            i++;
        }
    }
    return result;
};
Array.prototype.cartesianProduct = function(...arrays) {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(a => curr.map(b => [...a, b]));
    }, [this]);
};


Bitmap.prototype.drawLine = function(x1, y1, x2, y2, color, lineWidth, dashPattern = null) {
    const context = this.context;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
};
Bitmap.prototype.drawArc=function (x1, y1, x2, y2, color, lineWidth, dashPattern = null) {
    const context = this.context;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
    const startAngle = Math.atan2(y1 - centerY, x1 - centerX);
    const endAngle = Math.atan2(y2 - centerY, x2 - centerX);
    context.arc(centerX, centerY, radius, startAngle, endAngle);
    context.stroke();
    context.restore();
}
Bitmap.prototype.drawCurve=function (x1,y1,x2,y2, color, lineWidth, dashPattern = null,dire) {
    const context = this.context;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x1, y1);
    if(dire) context.quadraticCurveTo(x1 , y1 + (y2 - y1) / 2, x2, y2);
    else context.quadraticCurveTo(x1 + (x2 - x1) / 2 , y1, x2, y2);
    context.stroke();
    context.restore();
}

//Blt
Bitmap.prototype.bltEx = function(source, sx, sy, sw, sh, dx, dy, dw, dh, opacity, rotation) {
    dw = dw || sw;
    dh = dh || sh;
    opacity = opacity || 1.0;
    rotation = rotation || 0;
    try {
        const image = source._canvas || source._image;
        const ctx = this.context;
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = "source-over";
        const centerX = dx + dw / 2;
        const centerY = dy + dh / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
        this._baseTexture.update();
    } catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltAlpha = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        const ctx = this.context;
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.restore();
        this._baseTexture.update();
    }
    catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltHorz = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.globalCompositeOperation = "source-over";
        this.context.save();
        this.context.translate(dx + dw, dy);
        this.context.scale(-1, 1);
        this.context.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
        this.context.restore();
        this._baseTexture.update();
    } catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltVert = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.save();
        this.context.translate(dx, dy + dh);
        this.context.scale(1, -1);
        this.context.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
        this.context.restore();
        this._baseTexture.update();
    } catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltRounded = function(source,radius, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.save();
        this.context.beginPath();
        this.context.moveTo(dx + radius, dy);
        this.context.arcTo(dx + dw, dy, dx + dw, dy + dh, radius);
        this.context.arcTo(dx + dw, dy + dh, dx, dy + dh, radius);
        this.context.arcTo(dx, dy + dh, dx, dy, radius);
        this.context.arcTo(dx, dy, dx + dw, dy, radius);
        this.context.closePath();
        this.context.clip();
        this.context.globalCompositeOperation = "source-over";
        this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        this.context.restore();
        this._baseTexture.update();
    }
    catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltTriangle = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.save();
        this.context.beginPath();
        const centerX = dx + dw / 2;
        const centerY = dy + dh / 2;
        const height = Math.sin(Math.PI / 3) * dw;
        const halfWidth = dw / 2;
        const x1 = centerX - halfWidth;
        const y1 = centerY + height / 2;
        const x2 = centerX + halfWidth;
        const y2 = centerY + height / 2;
        const x3 = centerX;
        const y3 = centerY - height / 2;
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.lineTo(x3, y3);
        this.context.closePath();
        this.context.clip();
        this.context.globalCompositeOperation = "source-over";
        this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        this.context.restore();
        this._baseTexture.update();
    } catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltCircular = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.save();
        this.context.beginPath();
        const radius = Math.min(dw, dh) / 2;
        const centerX = dx + dw / 2;
        const centerY = dy + dh / 2;
        this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.context.closePath();
        this.context.clip();
        this.context.globalCompositeOperation = "source-over";
        this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        this.context.restore();
        this._baseTexture.update();
    }
    catch (e) {
        console.error(e);
    }

};
Bitmap.prototype.bltDiamond = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        this.context.beginPath();
        this.context.moveTo(dx + dw / 2, dy);
        this.context.lineTo(dx + dw, dy + dh / 2);
        this.context.lineTo(dx + dw / 2, dy + dh);
        this.context.lineTo(dx, dy + dh / 2);
        this.context.closePath();
        this.context.clip();
        this.context.globalCompositeOperation = "source-over";
        this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        this._baseTexture.update();
        this.context.restore();
    } catch (e) {
        console.error(e);
    }
};
Bitmap.prototype.bltGraphic = function(source, point, side, distance, startAngle, rota, rate, r1, r2, sx, sy, sw, sh, dx, dy, dw, dh) {
    dw = dw || sw;
    dh = dh || sh;
    try {
        const image = source._canvas || source._image;
        const context = this.context;
        context.save();
        const p1 = Math.calcPolygonPoints(point, side, distance, startAngle);
        const p2 = Math.transformPolygon(p1, point, rota);
        context.beginPath();
        let p = null;
        for (let i = 0; i < p1.length; i++) {
            const np = {
                x: point.x + (p2[i].x - point.x) * rate / 2,
                y: point.y + (p2[i].y - point.y) * rate / 2
            };
            if (i === 0) {
                context.moveTo(p1[i].x, p1[i].y);
                const start = {x: p1[i].x, y: p1[i].y};
                const up = Math.computeCP(start, np, r1);
                context.quadraticCurveTo(up.x, up.y, np.x, np.y);
                p = np;
            } else {
                const cp1 = Math.computeCP(p, {x: p1[i].x, y: p1[i].y}, r2);
                context.quadraticCurveTo(cp1.x, cp1.y, p1[i].x, p1[i].y);
                const start = {x: p1[i].x, y: p1[i].y};
                const cp2 = Math.computeCP(start, np, r1);
                context.quadraticCurveTo(cp2.x, cp2.y, np.x, np.y);
                p = np;
            }
            if (i === p1.length - 1) {
                const start = {x: p1[0].x, y: p1[0].y};
                const cp2 = Math.computeCP(np, start, r2);
                context.quadraticCurveTo(cp2.x, cp2.y, start.x, start.y);
            }
        }
        context.closePath();
        context.clip();
        context.globalCompositeOperation = "source-over";
        context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        context.restore();
        this._baseTexture.update();
    } catch (e) {
        console.error(e);
    }
};

//清空
Bitmap.prototype.clearRound = function(x, y, width, height, radius) {
    const context = this.context;
    const x0 = x;
    const y0 = y;
    const x1 = x + width;
    const y1 = y + height;
    context.beginPath();
    context.moveTo(x0 + radius, y0);
    context.arcTo(x1, y0, x1, y1, radius);
    context.arcTo(x1, y1, x0, y1, radius);
    context.arcTo(x0, y1, x0, y0, radius);
    context.arcTo(x0, y0, x1, y0, radius);
    context.closePath();
    context.save();
    context.clip();
    context.clearRect(x, y, width, height);
    context.restore();
};
Bitmap.prototype.clearChamfer = function(x, y, width, height, radius) {
    const context = this.context;
    const x0 = x;
    const y0 = y;
    const x1 = x + width;
    const y1 = y + height;

    context.beginPath();
    context.moveTo(x0 + radius, y0);
    context.lineTo(x1 - radius, y0);
    context.lineTo(x1, y0 + radius);
    context.lineTo(x1, y1 - radius);
    context.lineTo(x1 - radius, y1);
    context.lineTo(x0 + radius, y1);
    context.lineTo(x0, y1 - radius);
    context.lineTo(x0, y0 + radius);
    context.lineTo(x0 + radius, y0);
    context.closePath();
    context.save();
    context.clip();
    context.clearRect(x, y, width, height);
    context.restore();
};
Bitmap.prototype.clearCircle = function(x, y, radius) {
    const context = this.context;
    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2, true);
    context.clip();
    context.clearRect(x - radius, y - radius, radius * 2, radius * 2);
    context.restore();
};
Bitmap.prototype.clearOutside = function(circles) {
    this.context.save();
    this.context.beginPath();
    circles.forEach(circle => {
        const { x, y, radius } = circle;
        this.context.arc(x, y, radius, 0, Math.PI * 2, true);
    });
    this.context.rect(0, 0, this.width, this.height);
    this.context.clip("evenodd");
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.restore();
};
Bitmap.prototype.clearTriangle = function(x1, y1, x2, y2, x3, y3) {
    const context = this.context;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.closePath();
    context.save();
    context.clip();
    context.clearRect(Math.min(x1, x2, x3), Math.min(y1, y2, y3),
        Math.max(x1, x2, x3) - Math.min(x1, x2, x3),
        Math.max(y1, y2, y3) - Math.min(y1, y2, y3));
    context.restore();
};

//绘制
Bitmap.prototype.fillGraphic = function(point,side,distance,startAngle,rota,rate,r1,r2,color,borderColor,lineWidth,dashPattern) {
    const p1=Math.calcPolygonPoints(point,side,distance,startAngle)
    const p2=Math.transformPolygon(p1,point,rota)
    const context = this.context;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth||0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    let p = null;
    for (let i = 0; i < p1.length; i++) {
        const np={x:point.x+(p2[i].x-point.x)*rate/2,y:point.y+(p2[i].y-point.y)*rate/2}
        if (i === 0) {
            context.moveTo(p1[i].x, p1[i].y);
            const start = {x:p1[i].x,y:p1[i].y};
            const up = Math.computeCP(start, np, r1);
            context.quadraticCurveTo(up.x, up.y, np.x, np.y);
            p = np;
        }
        else {
            const cp1 = Math.computeCP(p, {x:p1[i].x,y:p1[i].y},r2);
            context.quadraticCurveTo(cp1.x, cp1.y, p1[i].x,p1[i].y);
            const start ={x:p1[i].x,y:p1[i].y}
            const cp2 = Math.computeCP(start,np, r1);
            context.quadraticCurveTo(cp2.x, cp2.y, np.x, np.y);
            p = np;
        }
        if (i === p1.length - 1) {
            const start = { x: p1[0].x, y: p1[0].y};
            const cp2 = Math.computeCP(np,start,r2);
            context.quadraticCurveTo(cp2.x, cp2.y, start.x, start.y);
        }
    }
    context.closePath();
    context.fill();
    if(lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
}
Bitmap.prototype.fillRounded = function(x, y, width, height, radius, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    const cornerRadius = Math.min(Math.min(width, height) / 2, radius);
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x + cornerRadius, y);
    context.lineTo(x + width - cornerRadius, y);
    context.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);
    context.lineTo(x + width, y + height - cornerRadius);
    context.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
    context.lineTo(x + cornerRadius, y + height);
    context.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
    context.lineTo(x, y + cornerRadius);
    context.arcTo(x, y, x + cornerRadius, y, cornerRadius);
    context.closePath();
    context.fill();
    if (lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillChamfer = function(x, y, width, height, radius, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    const cornerRadius = Math.min(Math.min(width, height) / 2, radius);
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x + cornerRadius, y);
    context.lineTo(x + width - cornerRadius, y);
    context.lineTo(x + width, y + cornerRadius);
    context.lineTo(x + width, y + height - cornerRadius);
    context.lineTo(x + width - cornerRadius, y + height);
    context.lineTo(x + cornerRadius, y + height);
    context.lineTo(x, y + height - cornerRadius);
    context.lineTo(x, y + cornerRadius);
    context.lineTo(x + cornerRadius, y);
    context.closePath();
    context.fill();
    if (lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillTriangle = function(x1, y1, x2, y2, x3, y3, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.closePath();
    context.fill();
    if (lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillOffsetRect = function(x, y, w, h, offset,dire, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    const p1 = { x: x,     y: y };
    const p2 = { x: x + w, y: y };
    const p3 = { x: x + w, y: y + h };
    const p4 = { x: x,     y: y + h };
    if(dire){
        p1.y += offset;
        p2.y -= offset;
        p3.y -= offset;
        p4.y += offset;
    }
    else {
        p1.x += offset;
        p2.x += offset;
        p3.x -= offset;
        p4.x -= offset;
    }
    context.save();
    context.fillStyle = color;
    context.strokeStyle = borderColor || color;
    context.lineWidth = lineWidth || 0;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(p1.x, p1.y);
    context.lineTo(p2.x, p2.y);
    context.lineTo(p3.x, p3.y);
    context.lineTo(p4.x, p4.y);
    context.closePath();

    context.fill();
    if (lineWidth) context.stroke();
    context.restore();

    this._baseTexture.update();
};
Bitmap.prototype.fillPolygon = function(points, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
    }
    context.closePath();
    context.fill();
    if (lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillRegularPolygon = function(x, y, side, size, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    for (let i = 0; i < side; i++) {
        const angleRad = (2 * Math.PI / side) * i;
        const xx = x + size * Math.cos(angleRad);
        const yy = y + size * Math.sin(angleRad);
        if (i === 0) {
            context.moveTo(xx, yy);
        } else {
            context.lineTo(xx, yy);
        }
    }
    context.closePath();

    if (lineWidth) context.stroke();
    context.fill();
    context.restore();

    this._baseTexture.update();
};
Bitmap.prototype.fillStar = function(x, y,side, size,color,borderColor,lineWidth,dashPattern) {
    const context = this.context;
    const innerRadius = size / 2;
    const outerRadius = size;
    const numPoints = side;
    const angle = Math.PI / numPoints;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth||0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    context.translate(x, y);
    context.moveTo(0, -outerRadius);
    for (let i = 0; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const currentAngle = angle * i;
        const xCoordinate = radius * Math.sin(currentAngle);
        const yCoordinate = radius * -Math.cos(currentAngle);
        context.lineTo(xCoordinate, yCoordinate);
    }
    context.closePath();
    if(lineWidth) context.stroke();
    context.fill();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillSector = function(x, y, radius, startAngleDegree, degree, color, borderColor, lineWidth,dashPattern) {
    const context = this.context;
    context.save();
    context.fillStyle = color;
    context.lineWidth = lineWidth || 0;
    context.strokeStyle = borderColor || color;
    if (dashPattern) {
        context.setLineDash(dashPattern);
    } else {
        context.setLineDash([]);
    }
    context.beginPath();
    const startAngle = startAngleDegree * Math.PI / 180;
    const endAngle = (startAngleDegree+degree) * Math.PI / 180;
    context.moveTo(x, y);
    context.arc(x, y, radius, startAngle, endAngle, false);
    context.lineTo(x, y);
    context.fill();
    if (lineWidth) context.stroke();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.fillSawtoothWave = function(x, y, w, h, sw, sh, color) {
    const context = this.context;
    const bh = h - sh * 2;
    context.save();
    context.beginPath();
    context.rect(x, y, w, h);
    context.clip();
    context.fillStyle = color;
    context.fillRect(x, y + sh, w, bh);
    let fx = 0;
    context.beginPath();
    while (fx < w+sw) {
        context.moveTo(x + fx, y + sh);
        context.lineTo(x + sw + fx, y + sh);
        context.lineTo(x + (sw / 2) + fx, y);
        const offsetX = fx - (sw / 2);
        context.moveTo(x + offsetX, y + sh + bh);
        context.lineTo(x + sw + offsetX, y + sh + bh);
        context.lineTo(x + (sw / 2) + offsetX, y + sh + bh + sh);
        fx += sw;
    }
    context.closePath();
    context.fill();
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype.strokeRounded = function(x, y, width, height, radius, color, lineWidth) {
    this.fillRounded(x, y, width, height, radius, color)
    this.clearRound(x+lineWidth,y+lineWidth,width-lineWidth*2,height-lineWidth*2,radius)
};

Bitmap.prototype.initialize = function(width, height) {
    this._canvas = null;
    this._context = null;
    this._baseTexture = null;
    this._image = null;
    this._url = "";
    this._paintOpacity = 255;
    this._smooth = true;
    this._loadListeners = [];
    this._loadingState = "none";

    if (width > 0 && height > 0) {
        this._createCanvas(width, height);
    }
    this.fontFace = "text";
    this.fontSize = 16;
    this.fontBold = false;
    this.fontItalic = false;
    this.textColor = "#ffffff";
    this.outlineColor = "rgba(0, 0, 0, 0.5)";
    this.outlineWidth = 3;
    this.inlineColor = "rgba(0, 0, 0, 0.0)";
    this.inlineWidth = 0;
};
Bitmap.prototype.drawText = function(text, x, y, maxWidth, lineHeight, align) {
    const context = this.context;
    const alpha = context.globalAlpha;
    maxWidth = maxWidth || 0xffffffff;
    let tx = x;
    let ty = Math.round(y + lineHeight / 2 + this.fontSize * 0.35);
    if (align === "center") {
        tx += maxWidth / 2;
    }
    if (align === "right") {
        tx += maxWidth;
    }
    context.save();
    context.font = this._makeFontNameText();
    context.textAlign = align;
    context.textBaseline = "alphabetic";
    context.globalAlpha = 1;
    this._drawTextOutline(text, tx, ty, maxWidth);
    this._drawTextInline(text, tx, ty, maxWidth);
    context.globalAlpha = alpha;
    this._drawTextBody(text, tx, ty, maxWidth);
    context.restore();
    this._baseTexture.update();
};
Bitmap.prototype._drawTextInline = function(text, tx, ty, maxWidth) {
    const context = this.context;
    context.strokeStyle = this.inlineColor;
    context.lineWidth = this.inlineWidth;
    context.lineJoin = "round";
    context.strokeText(text, tx, ty, maxWidth);
};


Math.computeRate=function(val,rate) {
    let r = rate * Math.abs(val) / (1 + rate * Math.abs(val))
    return val >= 0 ? r : -r
}
Math.gcd = function(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
};
Math.lcm = function(a, b) {
    return Math.abs(a * b) / Math.gcd(a, b);
};
Math.lowestTerms = function(n, d) {
    const gcd = Math.gcd(n, d);
    return [n / gcd, d / gcd];
};
Math.sumToN = function (n) { return n * (n + 1) / 2 }
Math.sinNum = function(max, i) {return Math.sin((Math.PI / 2) / max * i);}
Math.triNum = function(max, i) {return (2 / Math.PI) * Math.asin(Math.sin((Math.PI / 2) / max * i));}
Math.squNum = function(max, i) {return Math.sign(Math.sin((Math.PI / 2) / max * i));}
Math.sinRes = function(max, result) {return Math.asin(result) * (2 * max / Math.PI);}
Math.atBit = function(num, bit) { return (num >> bit) & 1; }
Math.setBit = function(num, bit, bool) { return bool ? (num | (1 << bit)) : (num & ~(1 << bit)); }
Math.isPrime = function(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6)
        if (num % i === 0 || num % (i + 2) === 0) return false;
    return true;
}
Math.getPrimes = function(num) {
    const arr = [2, 3];
    let i = 5;
    while (arr.length < num) {
        if (!arr.some(n => i % n === 0 && n * n <= i)) arr.push(i);
        i += i % 6 === 1 ? 4 : 2;
    }
    return arr;
}
Math.lerp = function(start, end, t) { return start + (end - start) * t; }
Math.areaCircle = function(r) { return Math.PI * r * r; };
Math.perimeterCircle = function(r) { return 2 * Math.PI * r; }
Math.radiusFromCircumference = function(c) {return c / (2 * Math.PI);}
Math.radiusFromArea = function(a) {return Math.sqrt(a / Math.PI);}

Math.toRadians = degrees => degrees * Math.PI / 180;
Math.toDegrees = radians => radians * 180 / Math.PI;
Math.dotPro = function(p1, p2) { return p1.x * p2.x + p1.y * p2.y; };
Math.crossPro = function(p1, p2) { return p1.x * p2.y - p2.x * p1.y; };
Math.azimuth = function(point, angle, distance) {
    return {
        x: point.x + distance * Math.cos(Math.toRadians(angle)),
        y: point.y + distance * Math.sin(Math.toRadians(angle))
    };
};
Math.directionAngle = function(p1, p2) {
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle;
};
Math.findIsect = function(p1, p2, p3, p4) {
    const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (denominator === 0) return { x: 0, y: 0 };
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
    return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) ? {
        x: p1.x + ua * (p2.x - p1.x),
        y: p1.y + ua * (p2.y - p1.y)
    } : { x: 0, y: 0 };
};
Math.bezierPoints = function(p1, p2, cps, number) {
    const binomialCoefficient = (n, k) => {
        let coeff = 1;
        for (let i = n; i > n - k; i--) coeff *= i;
        for (let i = 1; i <= k; i++) coeff /= i;
        return coeff;
    };
    return Array.from({ length: number }, (_, i) => {
        const t = i / (number - 1 || 1);
        return {
            x: [p1, ...cps, p2].reduce((acc, p, idx) =>
                    acc + binomialCoefficient(cps.length + 1, idx) * (1 - t) ** (cps.length + 1 - idx) * t ** idx * p.x,
                0),
            y: [p1, ...cps, p2].reduce((acc, p, idx) =>
                    acc + binomialCoefficient(cps.length + 1, idx) * (1 - t) ** (cps.length + 1 - idx) * t ** idx * p.y,
                0)
        };
    });
};
Math.nearestSeg = function(p1, p2, p3) {
    const ax = p2.x - p1.x;
    const ay = p2.y - p1.y;
    if (ax === 0 && ay === 0) {return { x: p1.x, y: p1.y };}
    const bx = p3.x - p1.x;
    const by = p3.y - p1.y;
    const dotProduct = bx * ax + by * ay;
    const aLengthSq = ax * ax + ay * ay;
    let t = dotProduct / aLengthSq;
    t = Math.max(0, Math.min(1, t));
    return {x: p1.x + t * ax, y: p1.y + t * ay};
};
Math.computeCP = function(p1, p2, t) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return p2;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const perpX = -dy / length * length * t;
    const perpY = dx / length * length * t;
    return { x: midX + perpX, y: midY + perpY };
}
Math.distanceEucle = function(p1, p2) { return Math.hypot(p2.x - p1.x, p2.y - p1.y); };
Math.distanceManh = function(p1, p2) { return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y); };
Math.calcFromPoints = function(point, angle, distance) {
    return angle.map((ang, i) => {
        const { x, y } = Math.azimuth(point, ang, distance[i]);
        return [x, y];
    });
};
Math.calcPolygonPoints=function (point, sides, distance, startAngle){
    const angles = Array.from({ length: sides }, (_, i) => startAngle + (360 / sides) * i);
    let distances;
    if (typeof distance === 'number') {
        distances = Array(sides).fill(distance);
    }
    else if (Array.isArray(distance)) {
        distances = distance.length === sides ? distance : Array(sides).fill(distance[0] ?? 0);
    }
    else {
        distances = Array(sides).fill(0);
    }
    return angles.map((ang, i) => {return Math.azimuth({ x: point.x, y: point.y }, ang, distances[i]);});
}
Math.transformPolygon=function (points,center,rota=0,scale=2) {
    let p;
    let newpoints = [];
    for (let i = 0; i < points.length; i++) {
        if (i === points.length - 1) {
            p = Math.nearestSeg(
                {x:parseFloat(points[i].x),y:parseFloat(points[i].y)},
                {x:parseFloat(points[0].x),y:parseFloat(points[0].y)},
                {x:center.x,y:center.y}
            )
        }
        else {
            p = Math.nearestSeg(
                {x:parseFloat(points[i].x),y:parseFloat(points[i].y)},
                {x:parseFloat(points[i+1].x),y:parseFloat(points[i+1].y)},
                {x:center.x,y:center.y}
            );
        }
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dist = Math.sqrt(dx ** 2 + dy ** 2);
        let angle = Math.atan2(dy, dx);
        const newAngle = angle + (rota * Math.PI / 180);
        const cp = {
            x: center.x + Math.cos(newAngle) * dist * scale,
            y: center.y + Math.sin(newAngle) * dist * scale
        };
        newpoints.push(cp);
    }
    return newpoints
}
Math.pointsTriangle = function(p1, side, angle0, angle1, angle2) {
    const p2 = Math.azimuth(p1, angle0, side);
    const p3 = Math.findIsect(
        p1, Math.azimuth(p1, angle0 + angle1, 1),
        p2, Math.azimuth(p2, angle0 - angle2, 1)
    );
    return [p1, p2, p3];
};
Math.slope = function(p1, p2) {
    return p2.x === p1.x ? Infinity : (p2.y - p1.y) / (p2.x - p1.x);
};
Math.intercept = function(p, slope) {
    return slope === Infinity ? p.x : p.y - slope * p.x;
};
Math.arePer = function(p1, p2, p3, p4) {
    const slope1 = Math.slope(p1, p2);
    const slope2 = Math.slope(p3, p4);
    if ((slope1 === Infinity && slope2 === 0) || (slope1 === 0 && slope2 === Infinity)) return true;
    return slope1 * slope2 === -1;
};
Math.lineLerp = function(p1, p2, t) {
    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
    };
};
Math.linePoints = function(p1, p2, number) {
    return Array.from({ length: number }, (_, i) =>
        Math.lineLerp(p1, p2, i / (number - 1 || 1))
    );
};
Math.distanceLines = function(p1, p2, p3, p4) {
    const slope1 = Math.slope(p1, p2);
    const slope2 = Math.slope(p3, p4);
    if (slope1 !== slope2) return -1;
    const intercept1 = Math.intercept(p1, slope1);
    const intercept2 = Math.intercept(p3, slope2);
    return Math.abs(intercept2 - intercept1) / Math.sqrt(1 + slope1 * slope1);
};
Math.checkRectColl = function(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x ||
        rect1.x > rect2.x + rect2.width ||
        rect1.y + rect1.height < rect2.y ||
        rect1.y > rect2.y + rect2.height);
};
Math.isInRect = function(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width &&
        point.y >= rect.y && point.y <= rect.y + rect.height;
};
Math.checkCircleColl = function(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (circle1.radius + circle2.radius);
};
Math.extRay = function(p1, p2, d) {
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    return { x: p2.x + d * Math.cos(angle), y: p2.y + d * Math.sin(angle) };
};
Math.findNearestPoint=function (points, iterations = 1000, epsilon = 1e-6) {
    const centroid = (points) => {
        let sumX = 0, sumY = 0;
        for (const p of points) {
            sumX += p.x;
            sumY += p.y;
        }
        return { x: sumX / points.length, y: sumY / points.length };
    };
    let current = centroid(points);
    for (let i = 0; i < iterations; i++) {
        let numeratorX = 0, numeratorY = 0;
        let denominator = 0;
        for (const p of points) {
            const dx = p.x - current.x;
            const dy = p.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < epsilon) return current;
            numeratorX += p.x / distance;
            numeratorY += p.y / distance;
            denominator += 1 / distance;
        }
        if (denominator === 0) break;
        const newX = numeratorX / denominator;
        const newY = numeratorY / denominator;
        const deltaX = newX - current.x;
        const deltaY = newY - current.y;
        if (deltaX * deltaX + deltaY * deltaY < epsilon * epsilon) break;
        current = { x: newX, y: newY };
    }
    return current;
}

Math.mulProb=function (prob) {return prob.reduce((acc, probability) => acc * probability, 1);}
Math.unionProb=function (prob) {return 1-Math.mulProb(prob.map(value => 1 - value));}
Math.expectedValue = function(values, probabilities) {return values.reduce((acc, value, index) => acc + value * probabilities[index], 0);}
Math.normalRandom = function(mu, sigma, min, max) {
    let attempts = 0;
    let result;
    do {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        result = mu + z * sigma;
        attempts++;
        if (min === undefined || max === undefined || (result >= min && result <= max)) {
            return result;
        }
    } while (attempts < 3);
    return mu;
};
Math.seedRandom = function(seed) {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
Math.statMean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
Math.statMedian = function(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
Math.statStdDev = function(arr) {
    const mean = Math.statMean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
};
Math.statKurt = function(arr) {
    const n = arr.length;
    const meanVal = Math.statMean(arr);
    const stdDevVal = Math.statStdDev(arr);
    const kurtosis = arr.reduce((acc, val) => acc + Math.pow(val - meanVal, 4), 0) / (n * Math.pow(stdDevVal, 4)) - 3;
    return kurtosis;
};
Math.radixNum = function(num, m = 10, n = 10) {
    return parseInt(num, m).toString(n);
};
Math.getThreshold=function (arr,val) {
    for (const item of arr)
        if (val >= item.thld)
            return item.val;
    return 0;
}

Sprite.prototype.getTotalValue = function(propertyName) {
    let total = this[propertyName];
    for (let current = this; current && current.parent && current.parent[propertyName]; current = current.parent) {
        total += current.parent[propertyName];
    }
    return total;
}
Sprite.prototype.getX = function() {return this.getTotalValue('x')}
Sprite.prototype.getY = function() {return this.getTotalValue('y')}
Object.defineProperty(Sprite.prototype, "blendMode", {
    get: function() {
        if (this._blendMode) {
            return this._blendMode;
        }
        else if(this._colorFilter) {
            return this._colorFilter.blendMode;
        }
        else return 0
    },
    set: function(value) {
        this._blendMode = value;
        if (this._colorFilter) {
            this._colorFilter.blendMode = value;
        }
    },
    configurable: true
});
Spriteset_Base.prototype.createPictures = function() {
    const rect = this.pictureContainerRect();
    this._pictureContainer = new Sprite();
    this._pictureContainer.setFrame(rect.x, rect.y, rect.width, rect.height);
    for (let i = 1; i <= $gameScreen.maxPictures(); i++) {
        this._pictureContainer.addChild(new Sprite_Picture(i));
    }
    this.addChildAt(this._pictureContainer,1);
};
String.prototype.getLen = function() {return [...this].reduce((len, char) => len + (char.charCodeAt(0) > 255 ? 2 : 1), 0);};
String.prototype.splice = function(start, del, newStr) {return this.slice(0, start) + (newStr || "") + this.slice(start + del);};
String.prototype.reverse = function() {return this.split("").reverse().join("");};
String.prototype.shuffleString = function (seed) {
    let input = this;
    let array = input.split('');
    let n = array.length;
    for (let i = n - 1; i > 0; i--) {
        let j = Math.floor(Math.seedRandom(seed + i) * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
};
Utils.rpgaReduce = function(r, g, b, a) {
    const toHex = (value) => this.radixNum(Math.min(value, 255), 10, 16).padStart(2, '0');
    return `${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
};
Utils.isNum = function(num) {
    return num !== null && num !== '' && !isNaN(num);
};
Utils.lengthNum = function(num) {
    try {
        if (isNaN(num)) {
            if (num.includes("w")) {
                const [a, b = 0] = num.split("w").map(parseFloat);
                return a * 0.01 * Graphics.width + b;
            } else if (num.includes("h")) {
                const [a, b = 0] = num.split("h").map(parseFloat);
                return a * 0.01 * Graphics.height + b;
            } else {
                return 0;
            }
        } else {
            return parseFloat(num);
        }
    } catch (e) {
        return 0;
    }
};
Utils.clockWise=function (A, B, N) {
    const clockwise = (B - A + N) % N;
    const counter = N - clockwise;
    return clockwise <= counter ? clockwise : -counter;
}
Utils.D = function(s) {
    const [numDice, numSides] = s.match(/(\d+)d(\d+)/).slice(1, 3).map(Number);
    let total = 0;
    for (let k = 1; k <= numDice; k++) {
        total += Math.floor(Math.random() * numSides) + 1;
    }
    return total;
};
Utils.assignValues=function (obj1, obj2, keys) {
    keys.forEach(item => {
        if (obj2.hasOwnProperty(item)) {
            obj1[item] = obj2[item];
        }
    });
}

function inherit(SubClass, SuperClass) {
    SubClass.prototype = Object.create(SuperClass.prototype);
    SubClass.prototype.constructor = SubClass;
    SubClass.prototype.super = function(method, ...args) {SuperClass.prototype[method].apply(this, args);};
}
function Weaver() {
    this.initialize.apply(this, arguments);
}
inherit(Weaver,Sprite)
Weaver.prototype.initialize = function (origin,z=0) {
    Sprite.prototype.initialize.call(this)
    this.z = 1000 + z;
    this.alpha = 0;
    this._origin = origin; 
    this._load = 0;       
    this._time = 0;
    this._mod = -1;      
    this._stack = [];
    this._run = 0;
    this._paused = false;  
    this.install()
    this.hatch()
    this.stateStore()
}
Weaver.prototype.install = function (){
    this._window={}
}
Weaver.prototype.stateStore=function (){
    this._state={}
}
Weaver.prototype.modify=function (mode,enter){
    if(this._state[mode]&&this._mod!==mode){
        if(!enter) this._stack.push(this._mod)
        else if(enter===2) this._stack=[]
        this._mod=mode
        for(let name of Object.keys(this._state[mode])){
            if(this._state[mode][name][0]) this._window[name].start()
            else this._window[name].stop()
            if(this._state[mode][name][1]) this._window[name].show()
            else this._window[name].hide()
        }
    }
}
Weaver.prototype.modBack=function (){
    if(this._stack.length)
        this.modify(this._stack.pop(),1)
}

Weaver.prototype.update=function (){
    if(this._load) return
    switch (this._run){
        case 0: this.execute();break
        case 1:
            this._time++
            this.loop()
            for (const child of this.children) {
                if (child.update) {
                    child.update();
                }
            }
    }
}
Weaver.prototype.loop=function () {}
Weaver.prototype.execute = function() {
    this._run =1
    this.alpha=1
    for(let key in this._window)
        this._window[key].execute()
}
Weaver.prototype.hatch=function (){
    for (let key in this._window){
        let item=this._window[key]
        for(let img in item.img)
            item.loadBit(img,item.img[img])
    }
    this._origin.addChild(this)
}
Weaver.prototype.death=function (){
    const children=this._origin.children
    for(let i=0;i<children.length;i++){
        if(children[i]===this){
            children.splice(i,1)
            break
        }
    }
    for(let key of Object.keys(this._window)) this._window[key].destroy()
    this.removeChildren()
    this.destroy()
}



function Cotton() {
    this.initialize.apply(this, arguments);
}
Cotton.prototype = Object.create(Sprite.prototype);
Cotton.prototype.constructor = Cotton;
Cotton.prototype.initialize = function (origin) {
    Sprite.prototype.initialize.call(this)
    this._origin=origin
    this._bit = {"n":new Bitmap(1,1)}
    this._input=[]

    this._delay = 0
    this._interval=4
    this._wheelTime = 0
    this._wheelInter= 5
    this._wheelthreshold = 20

    this._stop = true
    this._event={}
    this._edata={}
    this._animationSprites = [];
    this.initImage()
};

Cotton.prototype.initImage = function() {this.img={}}
Cotton.prototype.initWork=function (){}
Cotton.prototype.initAdorn=function (){}
Cotton.prototype.initEvent=function (){}

Cotton.prototype.execute = function () {
    this._page = 0
    this._time = 0
    this._note = {}
    this._expel= new Set()
    this.run = new Runflow(this)
    this.adorn = new Adorn(this)
    this.initWork()
    this.initAdorn()
    this.drawAdorn()
    this.initEvent()
    this._origin.addChild(this)
}

Cotton.prototype.setAdorn=function (key,bit,handler,data,w,h,x,y,cover,adso,alpha,rota){
    this.adorn.set(key,bit,handler,data,w,h,x,y,cover,adso,alpha,rota)
}
Cotton.prototype.setInput=function (arr){this._input = this._input.concat(arr);}
Cotton.prototype.setRun=function (key,init,cond,done){this.run.set(key,init,cond,done)}
Cotton.prototype.setEvent= function (name,handle,data){
    this._event[name]=handle
    this._edata[name]=data
}
Cotton.prototype.setEdata=function (name,data){
    if(this._event[name])
        this._event[name](this,data,this._edata[name])
}
Cotton.prototype.exeEvent= function (name,data) {
    this._event[name](this._edata[name],data)
}

Cotton.prototype.setData=function (key,k,v){this.adorn.setData(key,k,v)}
Cotton.prototype.getData=function (key,k){return this.adorn.getData(key,k)}
Cotton.prototype.setAttr=function (key,k,v){this.adorn.setAttr(key,k,v)}
Cotton.prototype.getAttr=function (key,k){return this.adorn.getAttr(key,k)}
Cotton.prototype.getNote = function (key) {
    return this._note[key]
}
Cotton.prototype.setNote = function (key, val) {
    this._note[key] = val
}
Cotton.prototype.getSp=function (key){
    return this.adorn.sp[key]
}

Cotton.prototype.stop=function (){this._stop=true}
Cotton.prototype.start=function (){this._stop=false}


Cotton.prototype.addExpel=function (handler){this._expel.add(handler)}
Cotton.prototype.delExpel=function (handler){this._expel.delete(handler)}
Cotton.prototype.setExpel=function (arr){
    this._expel=new Set()
    for(let item of arr) this._expel.add(item)
}

Cotton.prototype.delay=function (val){this._delay=val}
Cotton.prototype.work=function (work){this.run.install(work)}


Cotton.prototype.delAdorn=function (key){this.adorn.delete(key)}
Cotton.prototype.refAdorn=function (key){this.adorn.ref(key)}
Cotton.prototype.swapAdorn=function (key1,key2){this.adorn.swap(key1,key2)}
Cotton.prototype.bitAdorn=function (bit,key){if(this.adorn) this.adorn.setBit(bit,key)}
Cotton.prototype.drawAdorn=function (){if(this.adorn) this.adorn.draw()}
Cotton.prototype.evokeAdorn=function (key,bool){
    if(this.adorn) {
        if (bool) this.adorn.on(key)
        else this.adorn.off(key)
    }
}
Cotton.prototype.touchAdorn=function (key,bool){this.adorn.hitTran(key,bool)}

Cotton.prototype.setAnime =function (sp,key,val,repe,period,loss,wave,opera) {
    this.adorn.setAnime(sp,key,val,repe,period,loss,wave,opera)
}
Cotton.prototype.addAnime =function (sp,key,val,repe,period,loss,wave,opera) {
    this.adorn.addAnime(sp,key,val,repe,period,loss,wave,opera)
}
Cotton.prototype.setBack =function (sp,key,target,dura,cotton,event) {
    this.adorn.setBack(sp,key,target,dura,cotton,event)
}
Cotton.prototype.stopAnime =function (sp,key) {
    this.adorn.stopAnime(sp,key)
}

Cotton.prototype.spHandler=function (key,handler){this.adorn.spHandler(key,handler)}
Cotton.prototype.delHandler=function (key){this.adorn.delHandler(key)}


Cotton.prototype.createAnimationSprite = function(targets1, animation, mirror, delay,targets2) {
    const sprite = new Sprite_Animation();
    const baseDelay = 8
    const previous = null;
    sprite.targetObjects = [targets1];
    sprite.setup([targets1], animation, mirror, delay,null,targets2);
    this.addChild(sprite);
    this._animationSprites.push(sprite);
};
Cotton.prototype.playAnimation=function (name,animationId,mirror){
    const animation = $dataAnimations[animationId];
    const targets1=this.getSp(name)
    const targets2=this.getSp("re_"+name)

    this.createAnimationSprite(targets1, animation,mirror,0,targets2);
}
Cotton.prototype.removeAnimation = function(sprite) {
    this._animationSprites.remove(sprite);
    this.removeChild(sprite);
    sprite.destroy();
};
Cotton.prototype.clearAllAnimations = function() {
    const sprites = this._animationSprites.slice();
    for (const sprite of sprites) {
        this.removeAnimation(sprite);
    }
    this._animationSprites = [];
};

Cotton.prototype.update = function () {
    if(this._stop) return
    else if(this.run._active) {this.run.update()}
    else {
        if(this._delay===0) {
            this.processTouch()
            if(this.processKey()||this.processWheel()){
                this.delay(Math.max(this._delay,this._interval))
            }
        }
        else this._delay--
        this.innerListen()
    }
    this.adorn.update()
    for (const sprite of this._animationSprites) {
        sprite.update()
        if (!sprite.isPlaying()) {this.removeAnimation(sprite);}
    }
    this._time++
    this.outerListen()
}


Cotton.prototype.loadBit = function (key, val) {
    this._origin._load++
    this._bit[key] = ImageManager.loadBitmap(`img/${val[0]}/`, val[1]||key)
    this._bit[key].addLoadListener(() => { this._origin._load-- })
}
Cotton.prototype.addBit = function (key,bit) {
    if(this.adorn) {
        this._bit[key] = bit
        this.adorn.refBit(key)
    }
}
Cotton.prototype.getBit = function (key) {
    if (this._bit[key]) {
        let bit = new Bitmap(this._bit[key].width, this._bit[key].height)
        bit.blt(this._bit[key], 0, 0, this._bit[key].width, this._bit[key].height, 0, 0, this._bit[key].width, this._bit[key].height)
        return bit
    }
    return new Bitmap(1,1)
}
Cotton.prototype.grabBit = function (key) {
    if (this._bit[key]) return this._bit[key]
    return new Bitmap(1,1)
}

//E 进入
//Q 离开
//K 抬起 在范围内
//G 抬起
//L 左键
//R 右键

//C 在内部按下
//B 外按内放
//D 内按放外
//F 不用激活的K
//I 在内部 按下
//O 在外部 按下
//X 按下
//T 在内部 悬浮
//H 在外部 悬浮
Cotton.prototype.processTouch = function () {
    const cancelled=TouchInput.isCancelled()
    const pressed =TouchInput.isPressed()

    if(cancelled&&this.cancelled()) return
    const x= TouchInput.x
    const y= TouchInput.y
    for (let key of this.adorn.list.slice().reverse()) {
        const item = this.adorn.sp[key];
        const data = this.adorn.data[key];
        const bound= this.adorn.handler[key]
        if(bound) {
            const handler =bound.handler
            const res=bound.update(x,y,cancelled,pressed,item,this._expel)
            if(data.touch) {
                const pos = [res.touch[0], res.touch[1], res.touch[4] - res.touch[2], res.touch[5] - res.touch[3]]
                const bool = res.data
                let region = 0
                if (bool[0] === bool[1]) {
                    region = 2;
                } else if (bool[1] > bool[2]) {
                    region = 1;
                } else if (bool[0] === bool[2]) {
                    region = 3;
                }


                if (bool[6] === 2) {
                    if (region === 1 && this.triggerHandler(handler, "K", data.data, pos)) return
                }
                if (region === 1) {
                    if (bool[0] === bool[5] && this.triggerHandler(handler, "R", data.data, pos)) return
                    if (bool[0] === bool[3] && this.triggerHandler(handler, "L", data.data, pos)) return
                }

                if (bool[0] === bool[4]) {
                    if (bool[6] === 2) {
                        if (this.triggerHandler(handler, "G", data.data, pos)) return
                        if (region !== 1 && this.triggerHandler(handler, "D", data.data, pos)) return
                    }
                    if ((region === 1 || region === 2)) {
                        if (this.triggerHandler(handler, "B", data.data, pos)) return
                    }
                } else if (bool[3] > bool[4]) {
                    if (region === 0) {
                        if (this.triggerHandler(handler, "O", data.data, pos)) return
                    } else if (region === 1) {
                        if (this.triggerHandler(handler, "I", data.data, pos)) return
                    } else if (region === 2) {
                        if (this.triggerHandler(handler, "E", data.data, pos)) return
                    } else if (region === 3) {
                        if (this.triggerHandler(handler, "Q", data.data, pos)) return
                    }

                    if (bool[6] === 1) if (this.triggerHandler(handler, "C", data.data, pos)) return
                    if (region === 0 || region === 1) {
                        if (this.triggerHandler(handler, "X", data.data, pos)) return
                    }
                } else {
                    if (region === 0) {
                        if (this.triggerHandler(handler, "H", data.data, pos)) return
                    } else if (region === 2) {
                        if (this.triggerHandler(handler, "E", data.data, pos)) return
                    } else if (region === 3) {
                        if (this.triggerHandler(handler, "Q", data.data, pos)) return
                    } else if (region === 1) {
                        if (this.triggerHandler(handler, "T", data.data, pos)) return
                    }
                }
            }
        }
    }
}
Cotton.prototype.processWheel = function() {
    if(performance.now()-this._wheelTime>this._wheelInter){
        if (this[`WheelDown_${this._page}`]&&TouchInput.wheelY >= this._wheelthreshold) {
            this[`WheelDown_${this._page}`]()
            return true
        }
        if (this[`WheelUp_${this._page}`]&&TouchInput.wheelY <= -this._wheelthreshold) {
            this[`WheelUp_${this._page}`]()
            return true
        }
        this._wheelTime=performance.now()
    }
    return false
}
Cotton.prototype.processKey = function () {
    for(let key of this._input) {
        if (this[`Trigger_${key}_${this._page}`] && Input.isTriggered(key)) {
            this[`Trigger_${key}_${this._page}`]()
            return true
        }
        else if (this[`Key_${key}_${this._page}`] && Input.isPressed(key)) {
            this[`Key_${key}_${this._page}`]()
            return true
        }
        else if (this[`Repe_${key}_${this._page}`] && Input.isRepeated(key)) {
            this[`Repe_${key}_${this._page}`]()
            return true
        }
        else if (this[`Longkey_${key}_${this._page}`] && Input.isLongPressed(key)) {
            this[`Longkey_${key}_${this._page}`]()
            return true
        }
    }
    return  false
}
Cotton.prototype.triggerHandler = function (handler,name,data,pos) {
    if(this[handler+"_"+name]) return this[handler+"_"+name](data,pos)
    return false;
};
Cotton.prototype.cancelled = function () {
    if(this[`Back_${this._page}`]) return this[`Back_${this._page}`]()
    return false;
};
Cotton.prototype.innerListen =function (){}
Cotton.prototype.outerListen =function (){}
function Adorn() {
    this.initialize.apply(this, arguments);
}
Adorn.prototype = Object.create(Adorn.prototype);
Adorn.prototype.constructor = Adorn;
Adorn.prototype.initialize = function (origin) {
    this._origin=origin
    this.data={}
    this.list=[]
    this.map={}
    this.sp={}
    this.anime={}
    this.handler={}
}
Adorn.prototype.set=function (key,bit,handler,data,w,h,x,y,cover,adso,alpha,rota){
    this.data[key]={
        bit:bit,
        data:data||{},
        w:w||0,
        h:h||0,
        x:x||0,
        y:y||0,
        bm:0,
        cover: cover||0,
        adso: adso!==undefined?adso:7,
        alpha: alpha!==undefined?alpha:1,
        rota: rota || 0,
        hide:0,
        ox:1,
        oy:1,
        sx:0,
        sy:0,
        ex:0,
        ey:0,
        fx:0,
        fy:0,
        fw:100,
        fh:100,
        touch:false,
        trans:true,
        refresh:true
    }
    this.connectBit(bit,key)
    if(handler) this.spHandler(key,handler)
    this.list.push(key)
}
Adorn.prototype.delete =function (key){
    if(this.data[key]){
        delete this.data[key]
        if(this.list.indexOf(key)>-1)
            this.list.splice(this.list.indexOf(key),1)
        this.draw()
    }
}
Adorn.prototype.getData=function (key,k){
    if(this.data[key]) return this.data[key].data[k]
}
Adorn.prototype.setData=function (key,k,v){
    if(this.data[key]) {this.data[key].data[k] = v}
}
Adorn.prototype.getAttr=function (key,k){
    if(this.data[key]) return this.data[key][k]
}
Adorn.prototype.setAttr=function (key,k,v){
    if(this.data[key]) {this.data[key][k] = v}
}
Adorn.prototype.move=function (key,data){
    if(this.data[key]) {
        for (let k of Object.keys(data)) this.data[key][k] = data[k]
        this.data[key].trans = true
    }
}
Adorn.prototype.swap=function (v1,v2){
    const i1 = this.list.indexOf(v1);
    const i2 = this.list.indexOf(v2);
    if (i1 === -1 || i2 === -1) return
    this.list.splice(i1, 1);
    this.list.splice(i2, 0, v1);
}

Adorn.prototype.ref=function (key){if(this.data[key]) this.data[key].refresh=true}
Adorn.prototype.update=function (){
    for(let item in this.anime)
        for(let key of Object.keys(this.anime[item]))
            if(this.anime[item][key].update()) {
                delete this.anime[item][key]
            }

    for (let key of this.list)
        if (this.anime[key]||this.data[key].trans)
            this.trans(key)
}
Adorn.prototype.trans =function (key) {
    this.data[key].trans=false
    if(this.data[key]&&this.sp[key]) {
        let correct = this.getAnime(key)
        const sp = this.sp[key]
        const data = this.data[key]
        sp.anchor.set(0.5, 0.5);
        //隐藏
        if (data.hide) {
            sp.hide()
            return
        }
        sp.show()
        //缩放
        let w = 1
        let h = 1
        if (String(data.w).indexOf("%") > -1) w = parseFloat(data.w.replace('%', '')) / 100 || 1
        else w = Utils.lengthNum(data.w) / sp.bitmap.width

        if (String(data.h).indexOf("%") > -1) h = parseFloat(data.h.replace('%', '')) / 100 || 1
        else h = Utils.lengthNum(data.h) / sp.bitmap.height
        switch (data.cover) {
            case 1:
                sp.scale.x = Math.max(w, h)
                sp.scale.y = sp.scale.x
                break
            case 2:
                sp.scale.x = Math.min(w, h)
                sp.scale.y = sp.scale.x
                break
            default:
                sp.scale.x = w
                sp.scale.y = h
                break
        }
        let fx = Number(data.fx) + Number(correct.fx || 0)
        let fy = Number(data.fy) + Number(correct.fy || 0)
        let fw = Number(data.fw) + Number(correct.fw || 0)
        let fh = Number(data.fh) + Number(correct.fh || 0)
        //定位
        let qx = sp.scale.x
        let qy = sp.scale.y
        w = sp.bitmap.width
        h = sp.bitmap.height
        let sx = data.adso % 3 === 1 ? (w*fw/100) * qx * 0.5 :
            data.adso % 3 === 2 ? Graphics.width * 0.5 :
                Graphics.width - (w*fw/100) * qx * 0.5;
        let sy = data.adso > 6 ? (h*fh/100) * qy * 0.5 :
            data.adso < 4 ? Graphics.height - (h*fh/100) * qy * 0.5 :
                Graphics.height * 0.5;
        //裁剪
        sp.setFrame(w * fx / 100, h * fy / 100, w * fw / 100, h * fh / 100)
        //设定值
        sp.rx = (typeof data.x === 'string' && data.x.includes("%")) ? (parseFloat(data.x) / 100) * sp.bitmap.width : Utils.lengthNum(data.x);
        sp.x = sp.rx + sx - (correct.x || 0)*-1;
        sp.ry = (typeof data.y === 'string' && data.y.includes("%")) ? (parseFloat(data.y) / 100) * sp.bitmap.height : Utils.lengthNum(data.y);
        sp.y = sp.ry + sy - (correct.y || 0)*-1;
        sp.alpha = data.alpha + (correct.alpha || 0) / 100;
        sp.rotation = ((data.rota+(correct.rota || 0)) / 180)* Math.PI
        sp.scale.x *= data.ox + (correct.ox || 0) / 100
        sp.scale.y *= data.oy + (correct.oy || 0) / 100
        sp.scale.x+=(correct.sx || 0) / 100
        sp.scale.y+=(correct.sy || 0) / 100
        sp.skew.x=((data.ex||0)+(correct.ex || 0) / 180)* Math.PI
        sp.skew.y=((data.ey||0)+(correct.ey || 0) / 180)* Math.PI



        //颜色
        sp._hue = data.hue || 0
        sp._blendColor = [data.br || 0, data.bg || 0, data.bb || 0, data.ba || 0]
        sp._colorTone = [data.cr || 0, data.cg || 0, data.cb || 0, data.ca || 0]
        sp._colorFilter.setHue(sp._hue);
        sp._colorFilter.setBlendColor(sp._blendColor);
        sp._colorFilter.setColorTone(sp._colorTone);
        sp._blendMode=data.bm
        if(sp._blendMode){
            sp.filters=  []
        }
        else {
            sp.filters = [sp._colorFilter]

        }
    }
}

Adorn.prototype.getRef = function() {
    return this.list.filter(function(key) {return this.data[key].refresh;}, this);
};
Adorn.prototype.getLapse = function() {
    let spKeys = Object.keys(this.sp);
    let dataKeys = Object.keys(this.data);
    return spKeys.filter(function(key) { return !dataKeys.includes(key);}, this);
};
Adorn.prototype.draw = function () {
    const ref= this.getRef().union(this.getLapse())
    for(let i=0;i<this._origin.children.length;i++){
        if (this._origin.children[i].adorn){
            const adorn= this._origin.children[i].adorn
            if(ref.indexOf(adorn)>-1&&this.sp[adorn]){
                this._origin.children.splice(i--, 1)
                this.sp[adorn].destroy()
                delete this.sp[adorn]
            }
        }
    }
    this._origin.children=[]
    for (let key of this.list) {
        if (this.data[key]){
            if(this.data[key].refresh){
                this.data[key].refresh=false
                const bit = this._origin.grabBit(this.data[key].bit);
                if(bit){
                    const sp = new Sprite(bit);
                    sp._colorFilter = new ColorFilter();
                    sp.adorn=key
                    this.sp[key]=sp
                    this.trans(key)

                }
            }
            this._origin.addChild(this.sp[key])
        }
    }
}

Adorn.prototype.setBit=function (bit,key){
    if(this.data[key]) {
        if (this.data[key].bit) {
            let index = this.map[this.data[key].bit].indexOf(key)
            if (index > -1) this.map[this.data[key].bit].splice(index, 1)
        }
        this.data[key].bit = bit
        this.connectBit(bit, key)
        this.data[key].refresh = true
    }
}
Adorn.prototype.connectBit=function (bit,key){
    if(this.map[bit]) this.map[bit].push(key)
    else  this.map[bit]=[key]
}
Adorn.prototype.refBit=function (bit){
    if(this.map[bit])
        for(let key of this.map[bit])
            if(this.data[key]) this.data[key].refresh=true
}


Adorn.prototype.setAnime =function (sp,key,val,repe,period,loss,wave,opera) {
    if (this.data[sp]) {
        if (!this.anime[sp]) {
            this.anime[sp] = {}
        }
        let data = this.anime[sp]
        for (let i = 0; i < key.length; i++) {
            data[key[i]] =  new Rhythm(val[i],repe,period,loss,wave,opera)
        }
    }
}
Adorn.prototype.addAnime =function (sp,key,val,repe,period,loss,wave,opera) {
    let data = this.anime[sp]
    if(data&&data[key]){
        data[key].addWave(val,repe,period,loss,wave,opera)
    }
}
Adorn.prototype.setBack =function (sp,key,target,dura,cotton,event) {
    if(this.anime[sp]) {
        for (let i = 0; i < key.length; i++) {
            if (this.anime[sp][key[i]]) {
                this.anime[sp][key[i]].setBack(target[i],dura[i],cotton,event[i])
            }
        }
    }
}
Adorn.prototype.stopAnime=function (sp,key){
    if(this.anime[sp]) {
        for (let i = 0; i < key.length; i++) {
            if (this.anime[sp][key[i]]) {
                this.anime[sp][key[i]].stop()
            }
        }
    }
}
Adorn.prototype.getAnime=function (sp){
    const correct={}
    if(this.anime[sp]) {
        const item = this.anime[sp]
        for (let key in item) {
            if(item[key].update()){
                delete item[key]
            }
            else correct[key]=item[key].val()
        }
    }
    return correct
}

Adorn.prototype.hitTran =function (key,bool){
    if(this.handler[key]) this.handler[key].alpha=bool?0:1
}
Adorn.prototype.off=function (key){if(this.data[key]) this.data[key].touch=false}
Adorn.prototype.on=function (key) {if(this.data[key]) this.data[key].touch=true }
Adorn.prototype.spHandler=function (key,handler){
    this.delHandler(key)
    if(this.data[key]) this.handler[key]=new Handler(this,handler)
}
Adorn.prototype.delHandler=function (key){
    if(this.handler[key]) delete this.handler[key]
}
function Handler() {
    this.initialize.apply(this, arguments);
}
Handler.prototype = Object.create(Handler.prototype);
Handler.prototype.constructor = Handler;
Handler.prototype.initialize = function (origin,handler) {
    this._origin=origin
    this.handler=handler
    this.create()
}
Handler.prototype.create=function (){
    this.alpha=1    //是否判断颜色
    this.touch=[-1,-1,-1,-1,-1,-1]
    this.data=[0,-1,0,-1,0,-1,0]
    this.activa=true
}
Handler.prototype.update = function(x, y, cancelled, pressed, item, expel) {
    if (!this.activa) {
        return !expel.has(this.handler)
            ? (this.activa = true, this.update(x, y, cancelled, pressed, item, expel))
            : undefined;
    }
    const { scale, bitmap, width, height } = item;
    const scaleX = scale.x;
    const scaleY = scale.y;
    const itemWidth = width * scaleX;
    const itemHeight = height * scaleY;
    const itemX = item.getX();
    const itemY = item.getY();
    const relX = x - (itemX - itemWidth * 0.5);
    const relY = y - (itemY - itemHeight * 0.5);
    const px = relX / scaleX;
    const py = relY / scaleY;
    const alphaPixel = this.alpha || bitmap.getAlphaPixel(px, py);
    const prevTouch = this.touch;
    this.touch = [
        relX,
        relY,
        prevTouch[2] > -1 ? prevTouch[4] : x,
        prevTouch[3] > -1 ? prevTouch[5] : y,
        x,
        y
    ];
    if (expel.has(this.handler)) {
        this.activa = false;
        this.create();
        return;
    }
    const data = this.data;
    const currentTime = data[0] + 1;

    if (cancelled) {
        data[5] = currentTime;
    }
    const insideItem = alphaPixel > 0 &&
        relX >= 0 && relX <= itemWidth &&
        relY >= 0 && relY <= itemHeight;
    if (pressed) {
        if (data[4] > data[3]) {
            data[3] = currentTime;
            if (insideItem) data[6] = 1;
        }
    } else {
        if (data[3] > data[4]) data[4] = currentTime;
        if (data[6]) data[6] = data[6] === 1 ? 2 : 0;
    }
    if (insideItem) {
        if (data[2] > data[1]) data[1] = currentTime;
    } else {
        if (data[1] > data[2]) data[2] = currentTime;
    }
    data[0] = currentTime;
    return { data, touch: this.touch };
};


function Runflow() {
    this.initialize.apply(this, arguments);
}
Runflow.prototype = Object.create(Runflow.prototype);
Runflow.prototype.constructor = Runflow;
Runflow.prototype.initialize = function (origin) {
    this._origin=origin
    this._active=false
    this._time=0
    this._list=[]
    this._work={}
    this._init=""
    this._cond=""
    this._done=""
}
Runflow.prototype.set=function (key,init,cond,done){
    this._work[key] = {init: init || "",cond: cond || "", done: done || "",}
}
Runflow.prototype.install = function (work) {
    if (this._work[work]) {
        if(!this._active) {
            this._time=0
            this._active=true
            this._init=this._work[work].init
            this._cond=this._work[work].cond
            this._done=this._work[work].done
            return true
        }
        else {
            this._list.push(work)
            return true
        }
    }
    return false
}
Runflow.prototype.update=function (){
    if (this._time === 0) {
        this._time++;
        if (this._init && this._origin[this._init]) this._origin[this._init]();
    }
    else {
        if (!this._cond||(this._origin[this._cond]&&this._origin[this._cond]())){
            this._active = false;
            if(this._done&&this._origin[this._done]){
                this._origin[this._done]()
                let bool=true
                while (bool&&this._list.length) {
                    if (this.install(this._list.shift())) {
                        bool = false
                    }
                }
            }
        }
        else {
            this._time++
        }
    }
}

function Rhythm(){
    this.initialize.apply(this, arguments);
}
Rhythm.prototype = Object.create(Rhythm.prototype);
Rhythm.prototype.constructor = Rhythm;
Rhythm.prototype.initialize = function (amp, repe, period,loss, wave, opera) {
    this.queue = [];
    this.addWave(amp, repe, period,loss, wave, opera);
    this.counter = 0;
    this.running = true;
    this.prevTime=0
    this.prevValue=0
    this.setBack(0,0)
}
Rhythm.prototype.addWave = function (amp,repe, period,loss, wave, opera) {
    this.queue.push({
        active: true,
        amp: amp,
        repe: repe || 0,
        period: period || 1,
        loss: loss || 4,
        wave: wave || "sin",
        opera: opera || "add",
    });
}
Rhythm.prototype.setBack = function (target,dura,cotton,event) {
    this.targetVal=target
    this.dura=dura
    this.cotton=cotton
    this.event=event
}
Rhythm.prototype.update = function () {
    this.counter++;
    if (this.running) {
        for(let i=0;i<this.queue.length;i++){
            const item =this.queue[i]
            if(item.active&&item.repe>0&&this.counter>item.period*item.repe){
                item.active=false
            }
        }
        this.running = this.queue.some(item => item.active);
    }

    if (this.running)  this.prevTime=this.counter
    else {
        const bool=!this.dura||this.counter-this.prevTime>this.dura||this.prevValue===this.targetVal;
        if(bool&&this.cotton){
            this.cotton.exeEvent(this.event)
        }
        return bool}
}
Rhythm.prototype.stop=function (){
    this.running=false
}
Rhythm.prototype.val = function () {
    if(this.running) {
        this.prevValue=this.getVal(this.counter);
        return this.prevValue
    }
    else {
        if(this.dura===0) return this.targetVal
        else {
            let i= (this.counter-this.prevTime)/this.dura
            return  (this.prevValue-this.targetVal)*(1-i)+this.targetVal
        }

    }
}
Rhythm.prototype.getVal = function (counter) {
    return this.queue.reduce((acc, item) => {
        if(item.active) {
            const cycle = item.period
            let val = 0
            switch (item.wave) {
                case "sin":
                    val = Math.sinNum(cycle, counter % (cycle * item.loss)) * item.amp;
                    break
                case "tri":
                    val = Math.triNum(cycle, counter % (cycle * item.loss)) * item.amp;
                    break
                case "squ":
                    val = Math.squNum(cycle, counter % (cycle * item.loss)) * item.amp;
                    break
                case "blink":
                    val = ((counter%cycle)/cycle>0.5?1:0)*item.amp
                    break
                case "1/3":
                    val = Math.floor(3*(counter%cycle)/cycle)/3*item.amp
            }
            switch (item.opera) {
                case "add":
                    return val + acc;
                case "mul":
                    return val * acc;
                default:
                    return acc
            }
        }
        return acc
    }, 0);
}
Input.gamepadMapper[1]="escape"

TouchInput.clear = function() {
    this._mousePressed = false;
    this._screenPressed = false;
    this._pressedTime = 0;
    this._clicked = false;
    this._newState = this._createNewState();
    this._currentState = this._createNewState();
    this._x = 0;
    this._y = 0;
    this._triggerX = 0;
    this._triggerY = 0;
    this._moved = false;
    this._date = 0;
    this._prevX = 0;
    this._prevY = 0;
    this._dX = 0;
    this._dY = 0;
};
TouchInput.update = function() {
    this._currentState = this._newState;
    this._newState = this._createNewState();
    this._clicked = this._currentState.released && !this._moved;
    if (this.isPressed()) {
        this._pressedTime++;
    }
    this._dX = Math.abs(this._x - this._prevX);
    this._dY = Math.abs(this._y - this._prevY);
    this._prevX = this._x;
    this._prevY = this._y;
};
TouchInput.isDeltaMoved = function() {
    return this._dX+this._dY>0;
};
SceneManager.goto = function(sceneClass,data) {
    if (sceneClass) {
        this._nextScene = new sceneClass(data);
    }
    if (this._scene) {
        this._scene.stop();
    }
};
SceneManager.push = function(sceneClass,data) {
    this._stack.push(this._scene.constructor);
    this.goto(sceneClass,data);
};
