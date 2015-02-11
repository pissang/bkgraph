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

        var angle = style.angle || 0;
        var dropletPadding = style.dropletPadding || 0;
        var cx = style.cx;
        var cy = style.cy - dropletPadding;

        ctx.arc(cx, cy, style.a, 0, 2 * Math.PI);
        ctx.moveTo(cx + style.a * Math.cos((30 + angle) * Math.PI / 180), cy + style.a * Math.sin((30 + angle) * Math.PI / 180));
        ctx.lineTo(cx - style.b * Math.sin(Math.PI / 180 * angle), cy + style.b * Math.cos(Math.PI / 180 * angle));
        ctx.lineTo(cx - style.a * Math.sin(Math.PI / 180 * (60 + angle)), cy + style.a * Math.cos(Math.PI / 180 * (60 + angle)));
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

        // 画Label
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 8;
        if (cx == null) {
            cx = (style.xStart + style.xEnd) / 2;
            cy = (style.yStart + style.yEnd) / 2;
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
        var angle = Math.atan2(style.yEnd - style.yStart, style.xEnd - style.xStart);
        angle = Math.abs(angle);
        var x = cx;
        var y = cy;

        var width = area.getTextWidth(text, style.textFont);
        var height = area.getTextWidth('国', style.textFont);
        ctx.textBaseline = 'top';
        if (angle < 0.2 || angle > 2.94) {
            y -= r + textPadding + height;
            x -= width / 2;
            // 顺便保存rect
            this.__rect = {
                x: Math.min(x, cx - r * 2),
                y: y - height,
                width: Math.max(width, r * 2),
                height: height + textPadding + r * 2
            };
        } else {
            x += r + textPadding;
            y -= height / 2;
            // 顺便保存rect
            this.__rect = {
                x: cx - r * 2,
                y: cy - Math.max(r * 2, height / 2),
                width: width + r * 4 + textPadding,
                height: Math.max(height, r * 4)
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