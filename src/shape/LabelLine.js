define(function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');

    var LabelLine = function (opts) {
        ShapeBase.call(this, opts);
    }

    LabelLine.prototype.type = 'labelline';

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

        // 画Label圆
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 10;
        if (cx == null) {
            cx = (style.xStart + style.xEnd) / 2;
            cy = (style.yStart + style.yEnd) / 2;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
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

        var width = ctx.measureText(text).width;
        var height = ctx.measureText('国').width;
        if (angle < 0.2 || angle > 2.94) {
            y -= r + textPadding;
            x -= width / 2;
            ctx.textBaseline = 'bottom';
            // 顺便保存rect
            this.__rect = {
                x: Math.min(x, cx - r * 2),
                y: y - height,
                width: Math.max(width, r * 4),
                height: height + textPadding + r * 4
            };
        } else {
            x += r + textPadding;
            ctx.textBaseline = 'middle';
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
        
        var rect = this.getRect(this.style);
        if (!rect) {
            return false;
        }
        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height);
    }

    zrUtil.inherits(LabelLine, ShapeBase);

    return LabelLine;
});