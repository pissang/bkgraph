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
    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

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
            color: '#00a2ff',
            opacity: 0.8,
            hidden: true
        };
        this.showStyle = {
            color: '#00a2ff',
            opacity: 1,
            hidden: false
        };
        this.highlightStyle = {
            color: '#fffc00',
            opacity: 1,
            hidden: false
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
                opacity: this.style.opacity,
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
    };

    ExtraEdgeEntity.prototype.hidden = true;

    ExtraEdgeEntity.prototype.initialize = function (zr) {
        this.update();
    };

    ExtraEdgeEntity.prototype.setZLevel = function (zlevel) {
        this.el.zlevel = zlevel;
        this.el.modSelf();
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

    ExtraEdgeEntity.prototype.setStyle = function (name, value) {
        this.style[name] = value;
        switch (name) {
            case 'color':
                this.el.style.strokeColor = value;
                this.el.style.color = value;
                break;
            case 'lineWidth':
                this.el.style.lineWidth = value;
                break;
            case 'hidden':
                this.hidden = value;
        }
    }

    ExtraEdgeEntity.prototype.show = function () {
        this.hidden = this.showStyle.hidden;
        this.el.zlevel = 1;
        this.el.style.color = this.showStyle.color;
        this.el.style.strokeColor = this.showStyle.color;
        this.el.style.opacity = this.showStyle.opacity;
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.highlight = function () {
        this.hidden = this.highlightStyle.hidden;
        this.el.zlevel = 3;
        this.el.style.color = this.highlightStyle.color;
        this.el.style.strokeColor = this.highlightStyle.color;
        this.el.style.opacity = this.highlightStyle.opacity;
        this.el.modSelf();

        this._isHighlight = true;
    };

    ExtraEdgeEntity.prototype.lowlight = function () {
        this.hidden = this.style.hidden;
        this.el.zlevel = 0;
        this.el.style.color = this.style.color;
        this.el.style.strokeColor = this.style.color;
        this.el.style.opacity = this.style.opacity;
        this.el.modSelf();

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
            .delay(delay)
            .done(function () {
                cb && cb();
            })
            .start()
        );
    }

    ExtraEdgeEntity.prototype.highlightLabel = EdgeEntity.prototype.highlightLabel;
    
    ExtraEdgeEntity.prototype.lowlightLabel = EdgeEntity.prototype.lowlightLabel;

    ExtraEdgeEntity.prototype.animateTextPadding = EdgeEntity.prototype.animateTextPadding;

    ExtraEdgeEntity.prototype.startActiveAnimation = EdgeEntity.prototype.startActiveAnimation;

    ExtraEdgeEntity.prototype.stopActiveAnimation = EdgeEntity.prototype.stopActiveAnimation;

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

        p1 = intersect.curveCircle(curve.style, p1, sourceEntity.radius);
        p2 = intersect.curveCircle(curve.style, p2, sourceEntity.radius);
        curve.style.xStart = p1[0];
        curve.style.yStart = p1[1];
        curve.style.xEnd = p2[0];
        curve.style.yEnd = p2[1];
        
        curve.style.cx = curveTool.quadraticAt(
            curve.style.xStart, curve.style.cpX1, curve.style.xEnd, 0.5
        );
        curve.style.cy = curveTool.quadraticAt(
            curve.style.yStart, curve.style.cpY1, curve.style.yEnd, 0.5
        );
        curve.style.a = 10;
        curve.style.b = 15;

        inv = inv || 1;
    }

    ExtraEdgeEntity.prototype.intersectRect = function (rect) {

        return intersect.curveRect(this.el.style, rect);
    }

    ExtraEdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.el.style;
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

    zrUtil.inherits(ExtraEdgeEntity, Entity);

    return ExtraEdgeEntity;
});