define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var RectShape = require('zrender/shape/Rectangle');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

    var baseRadius = 50;

    var NodeEntity = function (opts) {

        Entity.call(this);
        
        this.el = new Group();

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        this.label = opts.label || '';

        this.image = opts.image || '';

        this.style = {
            color: '#0e90fe',
            lineWidth: 3,
            labelColor: 'white'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            lineWidth: 5,
            labelColor: '#27408a'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }
    }

    NodeEntity.prototype.initialize = function (zr) {
        var self = this;
        var r = this.radius;

        var dragging = false;
        var outlineShape = new CircleShape({
            style: {
                strokeColor: this.style.color,
                brushType: 'stroke',
                r: baseRadius,
                x: 0,
                y: 0,
                lineWidth: this.style.lineWidth
            },
            highlightStyle: {
                opacity: 0
            },
            zlevel: 1,
            clickable: true,
            onmouseover: function () {
                self.dispatch('mouseover');
            },
            onmouseout: function () {
                self.dispatch('mouseout');
            },
            onclick: function () {
                self.dispatch('click');
            }
        });
        
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
            zlevel: 1
        });

        if (this.label) {
            var labelShape = new RectShape({
                style: {
                    width: baseRadius * 2,
                    height: 20,
                    x: -baseRadius,
                    y: baseRadius - 20,
                    color: zrColor.alpha(this.style.color, 0.8),
                    brushType: 'fill',
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    brushType: 'both',
                    textColor: this.style.labelColor,
                    textFont: '12px 微软雅黑'
                },
                hoverable: false,
                zlevel: 1
            });
        }

        contentGroup.addChild(imageShape);

        if (labelShape) {
            contentGroup.addChild(labelShape);
        }

        this.el.addChild(contentGroup);
        this.el.addChild(outlineShape);

        this._imageShape = imageShape;
        this._labelShape = labelShape;
        this._outlineShape = outlineShape;
        this._clipShape = clipShape;

        this.el.scale[0] = this.el.scale[1] = this.radius / baseRadius;
    }

    NodeEntity.prototype.highlight = function (zr) {
        this._outlineShape.style.strokeColor = this.highlightStyle.color;
        this._outlineShape.style.lineWidth = this.highlightStyle.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.highlightStyle.color, 0.8);
        this._labelShape.style.textColor = this.highlightStyle.labelColor;
        zr.modGroup(this.el.id);
    }

    NodeEntity.prototype.lowlight = function (zr) {
        this._outlineShape.style.strokeColor = this.style.color;
        this._outlineShape.style.lineWidth = this.style.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.style.color, 0.8);
        this._labelShape.style.textColor = this.style.labelColor;

        zr.modGroup(this.el.id);
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});