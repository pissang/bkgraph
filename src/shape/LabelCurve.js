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
        var style = this.style;

        if (isHighlight) {
            // 根据style扩展默认高亮样式
            style = this.getHighlightStyle(
                style,
                this.highlightStyle || {},
                this.brushTypeOnly
            );
        }

        ctx.save();
        this.doClip(ctx);
        this.setContext(ctx, style);
        // 设置transform
        this.setTransform(ctx);

        ctx.beginPath();
        ctx.moveTo(style.xStart, style.yStart);
        ctx.quadraticCurveTo(style.cpX1, style.cpY1, style.xEnd, style.yEnd);
        ctx.stroke();

        // 画Label
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 8;
        if (cx == null) {
            cx = curveTool.quadraticAt(style.xStart, style.cpX1, style.xEnd, 0.5);
            cy = curveTool.quadraticAt(style.yStart, style.cpY1, style.yEnd, 0.5);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        // this.buildDropletPath(ctx, style);
        ctx.fill();

        // 画Label标签
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

        ctx.restore();
    }

    LabelCurve.prototype.buildDropletPath = LabelLineShape.prototype.buildDropletPath;

    LabelCurve.prototype.getRect = LabelLineShape.prototype.getRect;

    LabelCurve.prototype.isCover = LabelLineShape.prototype.isCover;

    zrUtil.inherits(LabelCurve, ShapeBase);

    return LabelCurve;
});