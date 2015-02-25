define(function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');
    var area = require('zrender/tool/area');

    var LabelLineShape = require('./LabelLine');

    var LabelCurve = function (opts) {
        ShapeBase.call(this, opts);
    }

    LabelCurve.prototype.type = 'labelcurve';

    LabelCurve.prototype.brush = function (ctx, isHighlight) {

        var style = this.beforeBrush(ctx, isHighlight);

        var x0 = style.xStart || 0;
        var y0 = style.yStart || 0;
        var x1 = style.cpX1 || 0;
        var y1 = style.cpY1 || 0;
        var x2 = style.xEnd || 0;
        var y2 = style.yEnd || 0;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(x1, y1, x2, y2);
        ctx.stroke();

        // 画Label
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 8;
        if (cx == null) {
            cx = curveTool.quadraticAt(x0, x1, x2, 0.5);
            cy = curveTool.quadraticAt(y0, y1, y2, 0.5);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 画Label文本
        var text = style.text;
        var textPadding = style.textPadding;
        if (textPadding == null) { textPadding = 5; }

        ctx.font = style.textFont;
        var width = area.getTextWidth(text, style.textFont);
        var height = area.getTextWidth('国', style.textFont);
        ctx.textBaseline = 'top';
        var x = cx + r + textPadding;
        var y = cy - height / 2;
        ctx.fillText(text, x, y);
        // 顺便保存rect
        this.__rect = {
            x: cx - r * 2,
            y: cy - Math.max(r * 2, height / 2),
            width: width + r * 2 + textPadding,
            height: Math.max(height, r * 2)
        };

        this.afterBrush(ctx);
    }

    LabelCurve.prototype.getRect = LabelLineShape.prototype.getRect;

    LabelCurve.prototype.isCover = LabelLineShape.prototype.isCover;

    zrUtil.inherits(LabelCurve, ShapeBase);

    return LabelCurve;
});