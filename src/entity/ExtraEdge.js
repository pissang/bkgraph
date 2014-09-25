define(function (require) {

    var Entity = require('./Entity');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');

    var vec2 = require('zrender/tool/vector');

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
            opacity: 0.3,
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
                x: 0,
                y: 0,
                r: 10
            },
            highlightStyle: {
                opacity: 0
            },
            z: 1,
            zlevel: 0
        });

        this.el.addChild(this._curveShape);
        this.el.addChild(this._labelShape);

        this.update(zr);
    };

    ExtraEdgeEntity.prototype.update = function (zr) {
        if (this.sourceEntity && this.targetEntity) {
            var sourceEntity = this.sourceEntity;
            var targetEntity = this.targetEntity;

            var p1 = sourceEntity.el.position;
            var p2 = targetEntity.el.position;

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
        zr.modGroup(this.el.id);
    };

    ExtraEdgeEntity.prototype.highlight = function (zr) {
        this._curveShape.style.strokeColor = this.highlightStyle.color;
        this._curveShape.style.opacity = this.highlightStyle.opacity;
        if (this._labelShape) {
            this._labelShape.style.color = this.highlightStyle.labelColor
            this._labelShape.style.textColor = this.highlightStyle.labelColor;
            this._labelShape.style.opacity = this.highlightStyle.opacity;
        }
        zr.modGroup(this.el.id);
    };

    ExtraEdgeEntity.prototype.lowlight = function (zr) {
        this._curveShape.style.strokeColor = this.style.color;
        this._curveShape.style.opacity = this.style.opacity;
        if (this._labelShape) {
            this._labelShape.style.opacity = this.style.opacity;
            this._labelShape.style.color = this.style.color;
            this._labelShape.style.textColor = this.style.labelColor;
            this._labelShape.style.opacity = this.style.opacity;
        }
        zr.modGroup(this.el.id);
    };

    ExtraEdgeEntity.prototype.getRect = function () {
        return this._curveShape.getRect(this._curveShape.style);
    }

    zrUtil.inherits(ExtraEdgeEntity, Entity);

    return ExtraEdgeEntity;
});