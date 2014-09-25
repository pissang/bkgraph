define(function (require) {

    var Entity = require('./Entity');
    var LineShape = require('zrender/shape/Line');
    var Group = require('zrender/Group');
    var RectShape = require('zrender/shape/Rectangle');
    var zrUtil = require('zrender/tool/util');

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
            labelColor: 'white'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            labelColor: '#27408a'
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
                opacity: 1,
                strokeColor: this.style.color
            },
            highlightStyle: {
                opacity: 0
            },
            z: 0,
            zlevel: 0
        });

        var width = zrUtil.getContext().measureText(this.label).width + 20;
        this._labelShape = new RectShape({
            style: {
                width: width,
                height: 20,
                text: this.label,
                textPosition: 'inside',
                textAlign: 'center',
                textFont: '12px 微软雅黑',
                textColor: this.style.labelColor,
                color: this.style.color,
                brushType: 'fill',
                x: -width / 2,
                y: -10,
                radius: 10
            },
            highlightStyle: {
                opacity: 0
            },
            z: 1
        });

        this.el.addChild(this._lineShape);
        this.el.addChild(this._labelShape);

        this.update(zr);
    };

    EdgeEntity.prototype.update = function (zr) {
        if (this.sourceEntity && this.targetEntity) {
            var sourceEntity = this.sourceEntity;
            var targetEntity = this.targetEntity;

            var p1 = sourceEntity.el.position;
            var p2 = targetEntity.el.position;

            vec2.sub(v, p1, p2);
            vec2.normalize(v, v);

            vec2.scaleAndAdd(v1, p1, v, -sourceEntity.radius);
            vec2.scaleAndAdd(v2, p2, v, targetEntity.radius);

            var line = this._lineShape;
            line.style.xStart = v1[0];
            line.style.yStart = v1[1];
            line.style.xEnd = v2[0];
            line.style.yEnd = v2[1];

            if (this._labelShape) {
                var labelShape = this._labelShape;

                if (v[0] > 0) {
                    vec2.negate(v, v);
                }
                var angle = Math.PI - Math.atan2(v[1], v[0]);
                labelShape.rotation[0] = angle;
                labelShape.position[0] = (v1[0] + v2[0]) / 2;
                labelShape.position[1] = (v1[1] + v2[1]) / 2;
            }
        }
        zr.modGroup(this.el.id);
    };

    EdgeEntity.prototype.highlight = function (zr) {
        this._lineShape.style.strokeColor = this.highlightStyle.color;
        if (this._labelShape) {
            this._labelShape.style.color = this.highlightStyle.color
            this._labelShape.style.textColor = this.highlightStyle.labelColor;   
        }
        zr.modGroup(this.el.id);
    };

    EdgeEntity.prototype.lowlight = function (zr) {
        this._lineShape.style.strokeColor = this.style.color;
        if (this._labelShape) {
            this._labelShape.style.color = this.style.color;
            this._labelShape.style.textColor = this.style.labelColor;   
        }
        zr.modGroup(this.el.id);
    };

    EdgeEntity.prototype.getRect = function () {
        return this._lineShape.getRect(this._lineShape.style);
    }

    zrUtil.inherits(EdgeEntity, Entity);

    return EdgeEntity;
});