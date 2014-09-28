define(function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    var Cresent = function (opts) {

        ShapeBase.call(this, opts);
    }

    Cresent.prototype.type = 'cresent';

    Cresent.prototype.buildPath = function (ctx, style) {
        var r = style.r;
        var cx = style.x;
        var cy = style.y;

        var rad1 = Math.PI / 2;
        var angle = Math.acos((r - style.height) / r);
        var rad0 = rad1 - angle;
        var rad2 = rad1 + angle;

        var x0 = cx + Math.cos(rad0) * r;
        var y0 = cy + Math.sin(rad0) * r;
        ctx.moveTo(x0, y0);
        ctx.arc(cx, cy, r, rad0, rad2);
        ctx.closePath();
    }

    Cresent.prototype.getRect = function (style) {
        var r = style.r;
        var cx = style.x;
        var cy = style.y;

        var rad1 = Math.PI / 2;
        var angle = Math.acos((r - style.height) / r);
        var rad0 = rad1 - angle;
        var rad2 = rad1 + angle;

        var x0 = cx + Math.cos(rad0) * r;
        var y0 = cy + Math.sin(rad0) * r;
        var x1 = cx + Math.cos(rad2) * r;
        var y1 = cy + Math.sin(rad2) * r;

        return {
            x: x0,
            y: y0,
            width: x1 - x0,
            height: r - y0
        }
    }

    zrUtil.inherits(Cresent, ShapeBase);

    return Cresent;
});