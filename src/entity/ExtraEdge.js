define(function (require) {

    var Entity = require('./Entity');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');

    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();

    var ExtraEdgeEntity = function (opts) {
        
        Entity.call(this);

        this.el = new Group();

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this.style = {
            color: '#0e90fe',
            opacity: 0.2,
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
    };

    ExtraEdgeEntity.prototype.initialize = function (zr) {
        this._curveShape = new BezierCurveShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                cpX1: 0,
                cpY1: 0,
                lineWidth: 1,
                opacity: this.style.opacity,
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
                textFont: '12px 微软雅黑',
                textColor: this.style.labelColor,
                color: this.style.color,
                opacity: this.style.opacity,
                x: 0,
                y: 0,
                r: 10
            },
            highlightStyle: {
                opacity: 0
            },
            ignore: true,
            z: 0,
            zlevel: 0
        });

        this.el.addChild(this._curveShape);
        this.el.addChild(this._labelShape);

        this.update();
    };

    ExtraEdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._setCurvePoints(
                this.sourceEntity.el.position,
                this.targetEntity.el.position
            );
        }
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.highlight = function () {
        this._curveShape.style.strokeColor = this.highlightStyle.color;
        this._curveShape.style.opacity = this.highlightStyle.opacity;
        this._curveShape.zlevel = 3;
        if (this._labelShape) {
            this._labelShape.style.color = this.highlightStyle.labelColor
            this._labelShape.style.textColor = this.highlightStyle.labelColor;
            this._labelShape.style.opacity = this.highlightStyle.opacity;
            this._labelShape.zlevel = 3;
            this._labelShape.ignore = false;
        }
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.lowlight = function () {
        this._curveShape.style.strokeColor = this.style.color;
        this._curveShape.style.opacity = this.style.opacity;
        this._curveShape.zlevel = 0;
        if (this._labelShape) {
            this._labelShape.style.opacity = this.style.opacity;
            this._labelShape.style.color = this.style.color;
            this._labelShape.style.textColor = this.style.labelColor;
            this._labelShape.zlevel = 0;
            this._labelShape.ignore = true;
        }
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        if (fromEntity === this.targetEntity) {
            vec2.copy(v1, this.targetEntity.el.position);
            vec2.copy(v2, this.sourceEntity.el.position);
        } else {
            vec2.copy(v1, this.sourceEntity.el.position);
            vec2.copy(v2, this.targetEntity.el.position);
        }
        var self = this;
        var obj = {t: 0};
        var curve = this._curveShape;
        this._setCurvePoints(v1, v2);

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
            .during(function (target, percent) {
                v[0] = curveTool.quadraticAt(
                    x0, x1, x2, obj.t
                );
                v[1] = curveTool.quadraticAt(
                    y0, y1, y2, obj.t
                );
                self._setCurvePoints(v1, v);
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(function () {
                cb && cb();
            })
            .start()
        );
    }

    ExtraEdgeEntity.prototype.getRect = function () {
        return this._curveShape.getRect(this._curveShape.style);
    }

    ExtraEdgeEntity.prototype._setCurvePoints = function (p1, p2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this._curveShape;
        curve.style.xStart = p1[0];
        curve.style.yStart = p1[1];
        curve.style.xEnd = p2[0];
        curve.style.yEnd = p2[1];

        curve.style.cpX1 = (p1[0] + p2[0]) / 2 - (p2[1] - p1[1]) / 4;
        curve.style.cpY1 = (p1[1] + p2[1]) / 2 - (p1[0] - p2[0]) / 4;

        if (this._labelShape) {
            var labelShape = this._labelShape;
            labelShape.position[0] = curveTool.quadraticAt(
                curve.style.xStart, curve.style.cpX1, curve.style.xEnd, 0.5
            );
            labelShape.position[1] = curveTool.quadraticAt(
                curve.style.yStart, curve.style.cpY1, curve.style.yEnd, 0.5
            );
        }
    }

    ExtraEdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.lineRect(this._curveShape.style, rect, out);
    }

    zrUtil.inherits(ExtraEdgeEntity, Entity);

    return ExtraEdgeEntity;
});