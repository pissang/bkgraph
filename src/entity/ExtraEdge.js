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

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();

    function lerp(x0, x1, t) {
        return x0 * (1 - t) + x1 * t;
    }

    var ExtraEdgeEntity = function (opts) {
        
        Entity.call(this);

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this.style = {
            color: '#0e90fe',
            opacity: 0.15,
            labelColor: 'white'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            opacity: 1,
            labelColor: '#f9dd05'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        var self = this;
        this.el = new LabelCurveShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                cpX1: 0,
                cpY1: 0,
                lineWidth: 1,
                opacity: this.highlightStyle.opacity,
                color: this.highlightStyle.color,
                strokeColor: this.highlightStyle.color,
                text: util.truncate(this.label, 10),
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

    ExtraEdgeEntity.prototype.hidden = true;

    ExtraEdgeEntity.prototype.initialize = function (zr) {
        this.update();
    };

    ExtraEdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._setCurvePoints(
                this.sourceEntity.el.position,
                this.targetEntity.el.position,
                1,
                true
            );
        }
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.highlight = function () {
        this.hidden = false;
        this._isHighlight = true;
    };

    ExtraEdgeEntity.prototype.lowlight = function () {
        this.hidden = true;
        this._isHighlight = false;
    };

    ExtraEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        var inv = 1;
        if (fromEntity === this.targetEntity) {
            vec2.copy(v1, this.targetEntity.el.position);
            vec2.copy(v2, this.sourceEntity.el.position);
            inv = -1;
        } else {
            vec2.copy(v1, this.sourceEntity.el.position);
            vec2.copy(v2, this.targetEntity.el.position);
        }
        var self = this;
        var obj = {t: 0};
        var curve = this.el;
        this._setCurvePoints(v1, v2, inv);

        var x0 = curve.style.xStart;
        var x1 = curve.style.cpX1;
        var x2 = curve.style.xEnd;
        var y0 = curve.style.yStart;
        var y1 = curve.style.cpY1;
        var y2 = curve.style.yEnd;
        
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
                curve.style.xEnd = x012;
                curve.style.yEnd = y012;

                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(function () {
                cb && cb();
            })
            .start()
        );
    }

    ExtraEdgeEntity.prototype.highlightLabel = EdgeEntity.prototype.highlightLabel;
    
    ExtraEdgeEntity.prototype.lowlightLabel = EdgeEntity.prototype.highlightLabel;

    ExtraEdgeEntity.prototype.animateTextPadding = EdgeEntity.prototype.animateTextPadding

    ExtraEdgeEntity.prototype._setCurvePoints = function (p1, p2, inv) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this.el;
        curve.style.xStart = p1[0];
        curve.style.yStart = p1[1];
        curve.style.xEnd = p2[0];
        curve.style.yEnd = p2[1];
        curve.style.cpX1 = (p1[0] + p2[0]) / 2 - inv * (p2[1] - p1[1]) / 4;
        curve.style.cpY1 = (p1[1] + p2[1]) / 2 - inv * (p1[0] - p2[0]) / 4;
        
        curve.style.cx = curveTool.quadraticAt(
            curve.style.xStart, curve.style.cpX1, curve.style.xEnd, 0.5
        );
        curve.style.cy = curveTool.quadraticAt(
            curve.style.yStart, curve.style.cpY1, curve.style.yEnd, 0.5
        );

        inv = inv || 1;
    }

    ExtraEdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.curveRect(this.el.style, rect, out);
    }

    ExtraEdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.el.style;
        return isPointInRect(style.xStart, style.yStart, rect)
            || isPointInRect(style.cpX1, style.cpY1, rect)
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

    zrUtil.inherits(ExtraEdgeEntity, Entity);

    return ExtraEdgeEntity;
});