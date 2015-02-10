define(function (require) {

    var Entity = require('./Entity');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');
    var LabelCurveShape = require('../shape/LabelCurve');
    var EdgeEntity = require('./Edge');

    var util = require('../util/util');
    var intersect = require('../util/intersect');
    var config = require('../config');

    var vec2 = require('zrender/tool/vector');
    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    function lerp(x0, x1, t) {
        return x0 * (1 - t) + x1 * t;
    }

    var CurveEdgeEntity = function (opts) {
        
        Entity.call(this);

        this.el = new Group();

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        // 标示曲线的弧度方向
        this.layerCounter = opts.layerCounter || 1;

        this.isExtra = opts.isExtra;

        if (this.isExtra) {
            this.style = zrUtil.clone(config.edgeStyle.extra);
        }
        else {
            this.style = zrUtil.clone(config.edgeStyle['default']);
        }

        // this.style = zrUtil.clone(config.edgeStyle['default']);
        this.showStyle = zrUtil.clone(config.edgeStyle['default']);
        this.highlightStyle = zrUtil.clone(config.edgeStyle.highlight);

        if (opts.style) {
            zrUtil.merge(this.style, opts.style, true);
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        this._animatingCircles = [];
    };

    CurveEdgeEntity.prototype.hidden = false;

    CurveEdgeEntity.prototype.initialize = function (zr) {
        var self = this;
        var labelLineShape = new LabelCurveShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                cpX1: 0,
                cpY1: 0,
                opacity: this.style.opacity,
                lineWidth: this.style.lineWidth,
                hidden: this.style.hidden,
                color: this.style.color,
                strokeColor: this.style.color,
                text: util.truncate(this.label, 10),
                textFont: '13px 微软雅黑',
                textPadding: 5,
                dropletPadding: 0
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

        this.el.addChild(labelLineShape);
        this._labelLineShape = labelLineShape;
        this.update();
    };

    CurveEdgeEntity.prototype.setZLevel = function (zlevel) {
        this._labelLineShape.zlevel = zlevel;
        this.el.modSelf();
    };

    CurveEdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._computeCurvePoints(
                this.sourceEntity.el.position,
                this.targetEntity.el.position,
                1,
                true
            );
        }
        this.el.modSelf();
    };

    CurveEdgeEntity.prototype.setStyle = function (name, value) {
        this.style[name] = value;
        switch (name) {
            case 'color':
                this._labelLineShape.style.strokeColor = value;
                this._labelLineShape.style.color = value;
                break;
            case 'lineWidth':
                this._labelLineShape.style.lineWidth = value;
                break;
            case 'hidden':
                this.hidden = value;
        }
    }

    CurveEdgeEntity.prototype.show = function () {
        this.hidden = this.showStyle.hidden;
        this._labelLineShape.zlevel = 1;
        this._labelLineShape.style.color = this.showStyle.color;
        this._labelLineShape.style.strokeColor = this.showStyle.color;
        this._labelLineShape.style.opacity = this.showStyle.opacity;
        this._labelLineShape.style.lineWidth = this.showStyle.lineWidth;
        this._labelLineShape.style.hidden = this.showStyle.hidden;
        this.el.modSelf();
    };

    CurveEdgeEntity.prototype.highlight = function () {
        this.hidden = this.highlightStyle.hidden;
        this._labelLineShape.zlevel = 3;
        this._labelLineShape.style.color = this.highlightStyle.color;
        this._labelLineShape.style.strokeColor = this.highlightStyle.color;
        this._labelLineShape.style.opacity = this.highlightStyle.opacity;
        this._labelLineShape.style.lineWidth = this.highlightStyle.lineWidth;
        this._labelLineShape.style.hidden = this.highlightStyle.hidden;
        this.el.modSelf();

        this._isHighlight = true;
    };

    CurveEdgeEntity.prototype.lowlight = function () {
        this.hidden = this.style.hidden;
        this._labelLineShape.zlevel = 0;
        this._labelLineShape.style.color = this.style.color;
        this._labelLineShape.style.strokeColor = this.style.color;
        this._labelLineShape.style.opacity = this.style.opacity;
        this._labelLineShape.style.lineWidth = this.style.lineWidth;
        this._labelLineShape.style.hidden = this.style.hidden;
        this.el.modSelf();

        this._isHighlight = false;
    };

    CurveEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        var curve = this._labelLineShape;
        var x0, y0, x2, y2;
        var x1 = curve.style.cpX1;
        var y1 = curve.style.cpY1;
        var animateFromSource = fromEntity === this.sourceEntity;
        if (animateFromSource) {
            var x0 = curve.style.xStart;
            var x2 = curve.style.xEnd;
            var y0 = curve.style.yStart;
            var y2 = curve.style.yEnd;
        } else {
            var x0 = curve.style.xEnd;
            var x2 = curve.style.xStart;
            var y0 = curve.style.yEnd;
            var y2 = curve.style.yStart;
        }
        var self = this;
        var obj = {t: 0};
        
        this.addAnimation('length', zr.animation.animate(obj)
            .when(time || 1000, {
                t: 1
            })
            .during(function (target, t) {
                // Subdivide
                var x01 = lerp(x0, x1, t);
                var x12 = lerp(x1, x2, t);
                var x012 = lerp(x01, x12, t);
                var y01 = lerp(y0, y1, t);
                var y12 = lerp(y1, y2, t);
                var y012 = lerp(y01, y12, t);
                curve.style.cpX1 = x01;
                curve.style.cpY1 = y01;
                if (animateFromSource) {
                    curve.style.xEnd = x012;
                    curve.style.yEnd = y012;   
                } else {
                    curve.style.xStart = x012;
                    curve.style.yStart = y012;
                }

                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .delay(delay)
            .done(function () {
                cb && cb();
            })
            .start()
        );
    }

    CurveEdgeEntity.prototype.highlightLabel = EdgeEntity.prototype.highlightLabel;
    
    CurveEdgeEntity.prototype.lowlightLabel = EdgeEntity.prototype.lowlightLabel;

    CurveEdgeEntity.prototype.animateTextPadding = EdgeEntity.prototype.animateTextPadding;

    CurveEdgeEntity.prototype.startActiveAnimation = EdgeEntity.prototype.startActiveAnimation;

    CurveEdgeEntity.prototype.stopActiveAnimation = EdgeEntity.prototype.stopActiveAnimation;

    CurveEdgeEntity.prototype._computeCurvePoints = function (p1, p2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this._labelLineShape;
        this._setCurvePoints(curve, p1, p2);

        p1 = intersect.curveCircle(curve.style, p1, sourceEntity.originalRadius);
        p2 = intersect.curveCircle(curve.style, p2, targetEntity.originalRadius);

        this._setCurvePoints(curve, p1, p2);

        curve.style.cx = curveTool.quadraticAt(
            curve.style.xStart, curve.style.cpX1, curve.style.xEnd, 0.5
        );
        curve.style.cy = curveTool.quadraticAt(
            curve.style.yStart, curve.style.cpY1, curve.style.yEnd, 0.5
        );
        // curve.style.a = 8;
        // curve.style.b = 14;
    };

    CurveEdgeEntity.prototype._setCurvePoints = function (curve, p1, p2) {
        curve.style.xStart = p1[0];
        curve.style.yStart = p1[1];
        curve.style.xEnd = p2[0];
        curve.style.yEnd = p2[1];

        var inv = 1;
        if (this.isExtra) {
            inv = 1.3;
        }

        inv *= (this.layerCounter % 2 == 0) ? 1 : -1;
        curve.style.cpX1 = (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) / 4;
        curve.style.cpY1 = (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) / 4;
    };

    CurveEdgeEntity.prototype.intersectRect = function (rect) {
        return intersect.curveRect(this._labelLineShape.style, rect);
    }

    CurveEdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this._labelLineShape.style;
        vec2.set(v2, style.cpX1, style.cpY1);
        vec2.set(v3, style.xEnd, style.yEnd);
        vec2.set(min, style.xStart, style.yStart);
        vec2.set(max, style.xStart, style.yStart);

        vec2.min(min, min, v2);
        vec2.min(min, min, v3);
        vec2.max(max, max, v2);
        vec2.max(max, max, v3);
        return !(max[0] < rect.x || max[1] < rect.y || min[0] > (rect.x + rect.width) || min[1] > (rect.y + rect.height));
    }

    zrUtil.inherits(CurveEdgeEntity, Entity);

    return CurveEdgeEntity;
});