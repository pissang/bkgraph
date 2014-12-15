define(function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');
    var area = require('zrender/tool/area');

    var LabelLine = function (opts) {
        ShapeBase.call(this, opts);
    }

    LabelLine.prototype.type = 'labelline';

    LabelLine.prototype.buildDropletPath = function(ctx, style) {

        var dropletPadding = style.dropletPadding || 0;
        var cy = style.cy - dropletPadding;
        ctx.moveTo(style.cx, cy - style.a);
        ctx.bezierCurveTo(
            style.cx + style.a,
            cy - style.a,
            style.cx + style.a * 3 / 2,
            cy + style.a / 3,
            style.cx,
            cy + style.b
        );
        ctx.bezierCurveTo(
            style.cx - style.a * 3 / 2,
            cy + style.a / 3,
            style.cx - style.a,
            cy - style.a,
            style.cx,
            cy - style.a
        );
        ctx.closePath();
    };

    LabelLine.prototype.brush = function (ctx, isHighlight) {
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
        ctx.lineTo(style.xEnd, style.yEnd);
        ctx.stroke();

        // 画Label水滴
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        // var r = style.r || 10;
        if (cx == null) {
            cx = (style.xStart + style.xEnd) / 2;
            cy = (style.yStart + style.yEnd) / 2;
        }
        ctx.beginPath();
        // ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.buildDropletPath(ctx, style);
        ctx.fill();

        // 画Label标签
        var text = style.text;
        var textPadding = style.textPadding;
        if (textPadding == null) { textPadding = 5; }

        ctx.font = style.textFont;
        var angle = Math.atan2(style.yEnd - style.yStart, style.xEnd - style.xStart);
        angle = Math.abs(angle);
        var x = cx;
        var y = cy;

        var width = area.getTextWidth(text, style.textFont);
        var height = area.getTextWidth('国', style.textFont);
        ctx.textBaseline = 'top';
        if (angle < 0.2 || angle > 2.94) {
            y -= style.b + textPadding + height;
            x -= width / 2;
            // 顺便保存rect
            this.__rect = {
                x: Math.min(x, cx - style.a),
                y: y,
                width: Math.max(width, style.a * 2),
                height: height + textPadding + style.b * 2
            };
        } else {
            x += style.a + textPadding;
            y -= height / 2;
            // 顺便保存rect
            this.__rect = {
                x: cx - style.a,
                y: cy - Math.max(style.b, height / 2),
                width: width + style.a * 2 + textPadding,
                height: Math.max(height, style.b * 2)
            };
        }
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    LabelLine.prototype.getRect = function (style) {
        return this.__rect;
    }

    LabelLine.prototype.isCover = function (x, y) {
        var originPos = this.getTansform(x, y);
        x = originPos[0];
        y = originPos[1];
        
        var style = this.style;
        var rect = this.getRect(style);
        if (!rect) {
            return false;
        }
        var isInsideLine = false;
        if (style.cpX1) {
            isInsideLine = area.isInsideQuadraticStroke(style.xStart, style.yStart, style.cpX1, style.cpY1, style.xEnd, style.yEnd, 20, x, y);
        }
        else {
            isInsideLine = area.isInsideLine(style.xStart, style.yStart, style.xEnd, style.yEnd, 20, x, y);
        }
        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height)
            || isInsideLine;
    }

    zrUtil.inherits(LabelLine, ShapeBase);

    return LabelLine;
});