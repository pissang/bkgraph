define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var LabelLineShape = require('../shape/LabelLine');

    var util = require('../util/util');
    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    var EdgeEntity = function (opts) {
        
        Entity.call(this);

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this.style = {
            color: '#0e90fe',
            labelColor: '#0e90fe'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            labelColor: '#f9dd05'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        var self = this;
        this.el = new LabelLineShape({
            style: {
                lineWidth: 1,
                opacity: this.style.opacity,
                color: this.style.color,
                strokeColor: this.style.color,
                text: util.truncate(this.label, 6),
                textFont: '12px 微软雅黑',
                textPadding: 5
            },
            z: 0,
            zlevel: 0,
            clickable: true,
            onclick: function () {
                self.dispatch('click')
            },
            onmouseover: function () {
                self.dispatch('mouseover');
            },
            onmouseout: function () {
                self.dispatch('mouseout');
            }
        });

    };

    EdgeEntity.prototype.initialize = function (zr) {
        this.update(zr);
    };

    EdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._computeLinePoints(v1, v2);
            this._setLinePoints(v1, v2);
        }
        this.el.modSelf();
    };

    EdgeEntity.prototype.highlight = function () {
        this.el.style.color = this.highlightStyle.color;
        this.el.style.strokeColor = this.highlightStyle.color;
        this.el.zlevel = 3;
        this.el.modSelf();

        this._isHighlight = true;
    };

    EdgeEntity.prototype.lowlight = function () {
        this.el.style.color = this.style.color;
        this.el.style.strokeColor = this.style.color;
        this.el.zlevel = 0;
        this.el.style.opacity = 0.7;

        this.el.modSelf();

        this._isHighlight = false;
    };

    EdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        this._computeLinePoints(v1, v2);
        var self = this;
        this.addAnimation('length', zr.animation.animate(this.el.style))
            .when(0, {
                xStart: v1[0],
                yStart: v1[1],
                xEnd: v1[0],
                yEnd: v1[1]
            })
            .when(time || 1000, {
                xStart: v1[0],
                yStart: v1[1],
                xEnd: v2[0],
                yEnd: v2[1]
            })
            .during(function () {
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(cb)
            .start();
    };

    EdgeEntity.prototype.highlightLabel = function () {
        if (!this._isHighlight) {
            this.el.style.color = this.highlightStyle.color;
        }
        // 显示全文
        this.el.style.text = this.label;
        this.el.modSelf();
    };
    EdgeEntity.prototype.lowlightLabel = function () {
        if (!this._isHighlight) {
            this.el.style.color = this.style.color;
        }
        // 隐藏多余文字
        this.el.style.text = util.truncate(this.label, 6);
        this.el.modSelf();
    };

    EdgeEntity.prototype.animateTextPadding = function (zr, time, textPadding, cb) {
        var self = this;
        this.stopAnimation('textPadding');
        this.addAnimation('textPadding', zr.animation.animate(this.el.style))
            .when(time, {
                textPadding: textPadding
            })
            .during(function () {
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(cb)
            .start('ElasticOut');
    };

    EdgeEntity.prototype._computeLinePoints = function (v1, v2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var p1 = sourceEntity.el.position;
        var p2 = targetEntity.el.position;

        // vec2.sub(v, p1, p2);
        // vec2.normalize(v, v);

        // vec2.scaleAndAdd(v1, p1, v, -sourceEntity.radius);
        // vec2.scaleAndAdd(v2, p2, v, targetEntity.radius);
        
        vec2.copy(v1, p1);
        vec2.copy(v2, p2);

        var line = this.el;
    }

    EdgeEntity.prototype._setLinePoints = function (v1, v2) {
        var line = this.el;
        line.style.xStart = v1[0];
        line.style.yStart = v1[1];
        line.style.xEnd = v2[0];
        line.style.yEnd = v2[1];
        line.style.cx = (v1[0] + v2[0]) / 2;
        line.style.cy = (v1[1] + v2[1]) / 2;
        line.style.r = (
            this.sourceEntity.radius + this.targetEntity.radius
        ) / 20 + 3;
    }

    EdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.lineRect(this.el.style, rect, out);
    }

    EdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.el.style;
        vec2.set(v1, style.xEnd, style.yEnd);
        vec2.set(v2, style.xStart, style.yStart);

        vec2.min(min, v1, v2);
        vec2.max(max, v1, v2);
        return !(max[0] < rect.x || max[1] < rect.y || min[0] > (rect.x + rect.width) || min[1] > (rect.y + rect.height));
    }

    zrUtil.inherits(EdgeEntity, Entity);

    return EdgeEntity;
});