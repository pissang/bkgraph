define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var RectShape = require('zrender/shape/Rectangle');
    var zrUtil = require('zrender/tool/util');

    var baseRadius = 50;

    var NodeEntity = function (opts) {

        Entity.call(this);
        
        this.el = new Group();

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        this.color = opts.color || '#0e90fe';

        this.label = opts.label || '';

        this.labelColor = opts.labelColor || 'rgba(55, 145, 220, 0.5)';

        this.image = opts.image || '';

        this.lineWidth = opts.lineWidth || 3;
    }

    NodeEntity.prototype.initialize = function (zr) {
        var self = this;
        var r = this.radius;

        var outlineShape = new CircleShape({
            style: {
                strokeColor: this.color,
                brushType: 'stroke',
                r: baseRadius,
                x: 0,
                y: 0,
                lineWidth: this.lineWidth
            },
            highlightStyle: {
                opacity: 0
            },
            z: 2,
            zlevel: 1,
            clickable: this.clickable
        });
        this.el.addChild(outlineShape);
        
        var contentGroup = new Group();
        var clipShape = new CircleShape({
            style: {
                r: baseRadius,
                x: 0,
                y: 0
            }
        });
        contentGroup.clipShape = clipShape;

        var imageShape = new ImageShape({
            style: {
                image: this.image,
                x: -baseRadius,
                y: -baseRadius,
                width: baseRadius * 2,
                height: baseRadius * 2
            },
            hoverable: false,
            z: 1,
            zlevel: 1
        });

        if (this.label) {
            var labelShape = new RectShape({
                style: {
                    width: baseRadius * 2,
                    height: 30,
                    x: -baseRadius,
                    y: baseRadius - 30,
                    color: this.labelColor,
                    brushType: 'fill',
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    brushType: 'both',
                    textColor: 'white',
                    textFont: '12px 微软雅黑'
                },
                hoverable: false,
                z: 1,
                zlevel: 1
            });
        }

        contentGroup.addChild(imageShape);

        if (labelShape) {
            contentGroup.addChild(labelShape);
        }

        this.el.addChild(contentGroup);

        this._imageShape = imageShape;
        this._labelShape = labelShape;
        this._outlineShape = outlineShape;
        this._clipShape = clipShape;

        this.el.scale[0] = this.el.scale[1] = this.radius / baseRadius;
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});