define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/graphic/Group');
    var zrUtil = require('zrender/core/util');
    var curveTool = require('zrender/core/curve');
    var CircleShape = require('zrender/graphic/shape/Circle');
    var CurveShape = require('zrender/graphic/shape/BezierCurve');

    var util = require('../util/util');
    var intersect = require('../util/intersect');
    var config = require('../config');

    var vec2 = require('zrender/core/vector');
    var vec2Create = vec2.create;
    var vec2Set = vec2.set;
    var vec2Min = vec2.min;
    var vec2Max = vec2.max;

    var v1 = vec2Create();
    var v2 = vec2Create();
    var v3 = vec2Create();
    var min = vec2Create();
    var max = vec2Create();

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
                zlevel: 0,
                z: 0,
            },
            hover: {
                name: 'hover',
                zlevel: 2,
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
                zlevel: 2,
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
        var curve = new CurveShape({
            shape: {}
        });

        var label = new CircleShape({
            shape: {
                r: 8
            },
            style: {
                text: util.truncate(this.label, 10),
                textFont: '13px 微软雅黑',
                textPadding: 5,
                textPosition: 'right'
            }
        });

        var el = this.el;
        el.on('click', function () {
            self.trigger('click');
        });
        el.on('mouseover', function () {
            self.trigger('mouseover');
        });
        el.on('mouseout', function () {
            self.trigger('mouseout');
        });

        this.addElement('label', label);
        this.addElement('curve', curve);

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
        this.el.dirty();
    };

    CurveEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        var curve = this.getElement('curve');
        var curveShape = curve.shape;
        var x1, y1, x3, y3;
        var x2 = curveShape.x2;
        var y2 = curveShape.y2;
        var animateFromSource = fromEntity === this.sourceEntity;
        if (animateFromSource) {
            var x1 = curveShape.x1;
            var x3 = curveShape.x3;
            var y1 = curveShape.y1;
            var y3 = curveShape.y3;
        } else {
            var x1 = curveShape.x3;
            var x3 = curveShape.x1;
            var y1 = curveShape.y3;
            var y3 = curveShape.y1;
        }
        var self = this;
        var obj = {t: 0};

        this.addAnimation('length', zr.animation.animate(obj)
            .when(time || 1000, {
                t: 1
            })
            .during(function (target, t) {
                // Subdivide
                var x12 = lerp(x1, x2, t);
                var x23 = lerp(x2, x3, t);
                var x123 = lerp(x12, x23, t);
                var y12 = lerp(y1, y2, t);
                var y23 = lerp(y2, y3, t);
                var y123 = lerp(y12, y23, t);

                curveShape.x2 = x12;
                curveShape.y2 = y12;
                if (animateFromSource) {
                    curveShape.x3 = x123;
                    curveShape.y3 = y123;   
                } else {
                    curveShape.x1 = x123;
                    curveShape.y1 = y123;
                }

                curve.dirty();
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
        this.stopAnimation('textPadding');
        this.addAnimation('textPadding', this.getElement('label').animate('style'))
            .when(time, {
                textPadding: textPadding
            })
            .done(cb)
            .start('ElasticOut');
    };;

    CurveEdgeEntity.prototype.startActiveAnimation = function () {

        if (this._animatingCircles.length) {
            return;
        }

        var labelShape = this.getElement('label');

        var labelLineHoverStyle = this.states.hover.shapeStyle.label;
        for (var i = 3; i > 0; i--) {
            var circle = new CircleShape({
                shape: {
                    cx: labelShape.shape.cx,
                    cy: labelShape.shape.cy,
                    r: baseRadius
                },
                style: {
                    fill: labelLineHoverStyle.fill,
                    opacity: 0.8
                },
                hoverable: false,
                z: -1,
                zlevel: 2
            });

            this.el.addElement(circle);

            this.addAnimation('ripplecircle', circle.animate('shape', true)
                .when(3000, {
                    r: baseRadius + 12
                })
                .delay(-1000 * i)
                .start('Linear')
            );

            this.addAnimation('ripplecircle', circle.animate('style', true)
                .when(3000, {
                    opacity: 0
                })
                .delay(-1000 * i)
                .start('Linear')
            );

            this._animatingCircles.push(circle);
        }
    };

    CurveEdgeEntity.prototype.stopActiveAnimation = function () {
        var animatingCircles = this._animatingCircles;
        if (animatingCircles.length) {
            for (var i = 0; i < animatingCircles.length; i++) {
                var circle = animatingCircles[i];
                this.el.removeElement(circle);
            }
            animatingCircles.length = 0;

            this.stopAnimation('ripplecircle');
        }
    };

    CurveEdgeEntity.prototype._computeCurvePoints = function (p1, p2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this.getElement('curve');
        var label = this.getElement('label');
        this._setCurvePoints(curve, p1, p2);

        p1 = intersect.curveCircle(curve.shape, p1, sourceEntity.originalRadius);
        p2 = intersect.curveCircle(curve.shape, p2, targetEntity.originalRadius);

        this._setCurvePoints(curve, p1, p2);

        var curveShape = curve.shape;
        label.shape.cx = curveTool.quadraticAt(
            curveShape.x1, curveShape.x2, curveShape.x3, 0.5
        );
        label.shape.cy = curveTool.quadraticAt(
            curveShape.y1, curveShape.y2, curveShape.y3, 0.5
        );
    };

    CurveEdgeEntity.prototype._setCurvePoints = function (curve, p1, p2) {
        var curveShape = curve.shape;
        curveShape.x1 = p1[0];
        curveShape.y1 = p1[1];
        curveShape.x3 = p2[0];
        curveShape.y3 = p2[1];

        var inv = 1;
        if (this.isExtra) {
            inv = 1.3;
        }

        inv *= (this.layerCounter % 2 == 0) ? 1 : -1;
        curveShape.x2 = (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) / 4;
        curveShape.y2 = (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) / 4;
    };

    CurveEdgeEntity.prototype.intersectRect = function (rect) {
        return intersect.curveRect(this.getElement('curve').style, rect);
    }

    CurveEdgeEntity.prototype.isInsideRect = function (rect) {
        var shape = this.getElement('curve').shape;
        vec2Set(v2, shape.x2, shape.y2);
        vec2Set(v3, shape.x3, shape.y3);
        vec2Set(min, shape.x1, shape.y1);
        vec2Set(max, shape.x1, shape.y1);

        vec2Min(min, min, v2);
        vec2Min(min, min, v3);
        vec2Max(max, max, v2);
        vec2Max(max, max, v3);
        return !(max[0] < rect.x || max[1] < rect.y || min[0] > (rect.x + rect.width) || min[1] > (rect.y + rect.height));
    }

    zrUtil.inherits(CurveEdgeEntity, Entity);

    return CurveEdgeEntity;
});