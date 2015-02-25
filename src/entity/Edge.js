define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var LabelLineShape = require('../shape/LabelLine');
    var CircleShape = require('zrender/shape/Circle');

    var util = require('../util/util');
    var intersect = require('../util/intersect');
    var config = require('../config');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    var baseRadius = 8;

    var EdgeEntity = function (opts, zr) {
        
        Entity.call(this, zr);

        this.el = new Group();

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this._animatingCircles = [];
    };

    EdgeEntity.prototype.initialize = function (zr) {
        var self = this;
        var labelLineShape = new LabelLineShape({
            style: {
                lineWidth: this.style.lineWidth,
                r: 8,
                opacity: 1,
                text: util.truncate(this.label, 6),
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

        this.addShape('labelLine', labelLineShape);

        this.update(zr);
    };

    EdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._computeLinePoints(v1, v2);
            this._setLinePoints(v1, v2);
        }
        this.el.modSelf();
    };

    EdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        this._computeLinePoints(v1, v2);
        var self = this;
        this._labelLineShape.style.xStart = this._labelLineShape.style.xEnd = v1[0];
        this._labelLineShape.style.yStart = this._labelLineShape.style.yEnd = v1[1];
        this.el.modSelf();
        zr.refreshNextFrame();
        this.addAnimation('length', zr.animation.animate(this.el.style))
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
            .delay(delay)
            .done(cb)
            .start();
    };

    EdgeEntity.prototype.animateTextPadding = function (textPadding, time, cb) {
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
    };

    EdgeEntity.prototype.startActiveAnimation = function (e) {

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
                zlevel: 2
            });

            this.addAnimation('ripplecircle', zr.animation.animate(circle.style, {loop: true})
                .when(2500, {
                    r: baseRadius + 7,
                    opacity: 0
                })
                .during(function () {
                    // mod一个就行了
                    circle.modSelf();
                    zr.refreshNextFrame();
                })
                .delay(-800 * i)
                .start('CubicInOut')
            );

            this.el.addChild(circle);
            this._animatingCircles.push(circle);
        }
    };

    EdgeEntity.prototype.stopActiveAnimation = function (zr) {
        if (this._animatingCircles.length) {
            for (var i = 0; i < this._animatingCircles.length; i++) {
                var circle = this._animatingCircles[i];
                this.el.removeChild(circle);
            }
            this._animatingCircles.length = 0;

            this.stopAnimation('ripplecircle');

            zr.refreshNextFrame();
        }
    };

    EdgeEntity.prototype._computeLinePoints = function (v1, v2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var p1 = sourceEntity.el.position;
        var p2 = targetEntity.el.position;

        vec2.sub(v, p1, p2);
        vec2.normalize(v, v);

        vec2.scaleAndAdd(v1, p1, v, -sourceEntity.originalRadius);
        vec2.scaleAndAdd(v2, p2, v, targetEntity.originalRadius);
        
        // vec2.copy(v1, p1);
        // vec2.copy(v2, p2);

        var line = this.el;
    }

    EdgeEntity.prototype._setLinePoints = function (v1, v2) {
        var line = this._labelLineShape;
        line.style.xStart = v1[0];
        line.style.yStart = v1[1];
        line.style.xEnd = v2[0];
        line.style.yEnd = v2[1];
        line.style.cx = (v1[0] + v2[0]) / 2;
        line.style.cy = (v1[1] + v2[1]) / 2;
        // line.style.r = (
        //     this.sourceEntity.radius + this.targetEntity.radius
        // ) / 20 + 3;
        // line.style.a = 8;
        // line.style.b = 14;
    }

    EdgeEntity.prototype.intersectRect = function (rect) {

        return intersect.lineRect(this.el.style, rect);
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