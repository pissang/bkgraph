define(function (require) {

    var Entity = require('./Entity');
    var LineShape = require('zrender/shape/Line');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var zrUtil = require('zrender/tool/util');

    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();

    var EdgeEntity = function (opts) {
        
        Entity.call(this);

        this.el = new Group();

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
    };

    EdgeEntity.prototype.initialize = function (zr) {
        this._lineShape = new LineShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                lineWidth: 1,
                opacity: 0.7,
                strokeColor: this.style.color
            },
            highlightStyle: {
                opacity: 0
            },
            z: 0,
            zlevel: 0
        });

        this._labelShape = new CircleShape({
            style: {
                text: this.label,
                textPosition: 'right',
                textFont: '13px 微软雅黑',
                textColor: this.style.labelColor,
                color: this.style.color,
                opacity: this.style.opacity,
                x: 0,
                y: 0,
                r: 5
            },
            highlightStyle: {
                opacity: 0
            },
            z: 0,
            zlevel: 0
        });

        this.el.addChild(this._lineShape);
        this.el.addChild(this._labelShape);

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
        this._lineShape.style.strokeColor = this.highlightStyle.color;
        this._lineShape.zlevel = 3;
        if (this._labelShape) {
            this._labelShape.style.color = this.highlightStyle.color
            this._labelShape.style.textColor = this.highlightStyle.labelColor;   
            this._labelShape.zlevel = 3;
        }
        this.el.modSelf();
    };

    EdgeEntity.prototype.lowlight = function () {
        this._lineShape.style.strokeColor = this.style.color;
        this._lineShape.zlevel = 0;
        this._lineShape.style.opacity = 0.7;
        if (this._labelShape) {
            this._labelShape.style.color = this.style.color;
            this._labelShape.style.textColor = this.style.labelColor;
            this._labelShape.zlevel = 0;
        }
        this.el.modSelf();
    };

    EdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        this._computeLinePoints(v1, v2);
        var self = this;
        this.addAnimation('length', zr.animation.animate(this._lineShape.style)
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
            .done(function () {
                cb && cb();
            })
            .start()
        );
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

        var line = this._lineShape;
    }

    EdgeEntity.prototype._setLinePoints = function (v1, v2) {
        var line = this._lineShape;
        line.style.xStart = v1[0];
        line.style.yStart = v1[1];
        line.style.xEnd = v2[0];
        line.style.yEnd = v2[1];

        if (this._labelShape) {
            var labelShape = this._labelShape;
            labelShape.position[0] = (v1[0] + v2[0]) / 2;
            labelShape.position[1] = (v1[1] + v2[1]) / 2;
            this._labelShape.style.r = (
                this.sourceEntity.radius + this.targetEntity.radius
            ) / 20 + 3;
            var angle = Math.atan2(v2[1] - v1[1], v2[0] - v1[0]);
            if (Math.abs(angle) < 0.2 || Math.abs(angle) > 2.94) {
                this._labelShape.style.textPosition = 'top';
            } else {
                this._labelShape.style.textPosition = 'right';
            }
        }
    }

    EdgeEntity.prototype.getRect = function () {
        return this._lineShape.getRect(this._lineShape.style);
    }

    EdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.lineRect(this._lineShape.style, rect, out);
    }

    EdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this._lineShape.style;
        return isPointInRect(style.xStart, style.yStart, rect)
            || isPointInRect(style.xEnd, style.yEnd, rect);
    }

    function isPointInRect(x, y, rect) {
        return !(
            x > rect.x + rect.width
            || y > rect.y + rect.height
            || x < rect.x
            || y < rect.y
        );
    }

    zrUtil.inherits(EdgeEntity, Entity);

    return EdgeEntity;
});