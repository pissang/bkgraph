define(function (require) {

    var Entity = require('./Entity');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');
    var LabelCurveShape = require('../shape/LabelCurve');
    var CircleShape = require('zrender/shape/Circle');

    var util = require('../util/util');
    var intersect = require('../util/intersect');
    var config = require('../config');

    var vec2 = require('zrender/tool/vector');
    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    var baseRadius = 8;

    function lerp(x0, x1, t) {
        return x0 * (1 - t) + x1 * t;
    }

    var CurveEdgeEntity = function (opts) {
        
        Entity.call(this);

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        // 标示曲线的弧度方向
        this.layerCounter = opts.layerCounter || 1;

        this.isExtra = opts.isExtra;

        this.states = {
            normal: {
                name: 'normal',
                zlevel: 1,
                z: 0,
            },
            hover: {
                name: 'hover',
                zlevel: 3,
                onenter: function (state, previousState) {
                    this.animateTextPadding(12, 300);
                    this.startActiveAnimation();
                },
                onleave: function (state, nextState) {
                    if (nextState.name !== 'active') {
                        this.animateTextPadding(5, 300);
                        this.stopActiveAnimation();
                    }
                }
            },
            active: {
                name: 'active',
                zlevel: 3,
                onenter: function (state, previousState) {
                    if (previousState.name !== 'hover') {
                        this.animateTextPadding(12, 300);
                        this.startActiveAnimation();
                    }
                },
                onleave: function (state, nextState) {
                    this.animateTextPadding(5, 300);
                    this.stopActiveAnimation();
                }
            }
        }

        zrUtil.merge(this.states, opts.states || {});

        this.defaultState = opts.defaultState == null
            ? 'normal'//(this.isExtra ? 'hidden' : 'normal')
            : opts.defaultState;

        this.statesTransition = {
            normal: ['hover', 'active'],
            hover: ['normal', 'active'],
            active: ['normal']
        };

        this._animatingCircles = [];
    };

    CurveEdgeEntity.prototype.initialize = function (zr) {

        Entity.prototype.initialize.call(this, zr);

        var self = this;
        var labelLineShape = new LabelCurveShape({
            style: {
                r: 8,
                text: util.truncate(this.label, 10),
                textFont: '13px 微软雅黑',
                textPadding: 5,
                dropletPadding: 0
            },
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

        this.addShape('labelLine', labelLineShape);

        this.update();

        if (this.defaultState) {
            this.setState(this.defaultState);
        }
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

    CurveEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        var curve = this.getShape('labelLine');
        var curveStyle = curve.style;
        var x0, y0, x2, y2;
        var x1 = curveStyle.cpX1;
        var y1 = curveStyle.cpY1;
        var animateFromSource = fromEntity === this.sourceEntity;
        if (animateFromSource) {
            var x0 = curveStyle.xStart;
            var x2 = curveStyle.xEnd;
            var y0 = curveStyle.yStart;
            var y2 = curveStyle.yEnd;
        } else {
            var x0 = curveStyle.xEnd;
            var x2 = curveStyle.xStart;
            var y0 = curveStyle.yEnd;
            var y2 = curveStyle.yStart;
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
                curveStyle.cpX1 = x01;
                curveStyle.cpY1 = y01;
                if (animateFromSource) {
                    curveStyle.xEnd = x012;
                    curveStyle.yEnd = y012;   
                } else {
                    curveStyle.xStart = x012;
                    curveStyle.yStart = y012;
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

    CurveEdgeEntity.prototype.animateTextPadding = function (textPadding, time, cb) {
        var self = this;
        var zr = this.zr;
        this.stopAnimation('textPadding');
        this.addAnimation('textPadding', zr.animation.animate(this.getShape('labelLine').style))
            .when(time, {
                textPadding: textPadding
            })
            .during(function () {
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(cb)
            .start('ElasticOut');
    };;

    CurveEdgeEntity.prototype.startActiveAnimation = function (e) {

        if (this._animatingCircles.length) {
            return;
        }

        var zr = this.zr;
        var labelLineShape = this.getShape('labelLine');
        for (var i = 3; i > 0; i--) {
            var circle = new CircleShape({
                style: {
                    x: labelLineShape.style.cx,
                    y: labelLineShape.style.cy,
                    r: baseRadius,
                    color: this.states.hover.shapeStyle.labelLine.strokeColor,
                    opacity: this.states.hover.shapeStyle.labelLine.opacity * 0.8
                },
                hoverable: false,
                zlevel: 3
            });

            this.addAnimation('ripplecircle', zr.animation.animate(circle.style, {loop: true})
                .when(3000, {
                    r: baseRadius + 12,
                    opacity: 0
                })
                .during(function () {
                    // mod一个就行了
                    circle.modSelf();
                    zr.refreshNextFrame();
                })
                .delay(-1000 * i)
                .start('Linear')
            );

            this.el.addChild(circle);
            this._animatingCircles.push(circle);
        }
    };

    CurveEdgeEntity.prototype.stopActiveAnimation = function (zr) {
        if (this._animatingCircles.length) {
            for (var i = 0; i < this._animatingCircles.length; i++) {
                var circle = this._animatingCircles[i];
                this.el.removeChild(circle);
            }
            this._animatingCircles.length = 0;

            this.stopAnimation('ripplecircle');

            this.zr.refreshNextFrame();
        }
    };

    CurveEdgeEntity.prototype._computeCurvePoints = function (p1, p2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this.getShape('labelLine');
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
        return intersect.curveRect(this.getShape('labelLine').style, rect);
    }

    CurveEdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.getShape('labelLine').style;
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