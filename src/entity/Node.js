define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var RectShape = require('zrender/shape/Rectangle');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');

    var baseRadius = 50;

    var defaultImage = new Image;
    defaultImage.src = 'img/default-avatar.png';

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

        this._animatingCircles = [];
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
            z: 10,
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

        // var image = new Image();
        // image.onload = function () {
        //     imageShape.style.image = image;
        //     zr.refreshNextFrame();
        // }
        // image.src = this.image;

        var imageShape = new ImageShape({
            style: {
                image: defaultImage,
                x: -baseRadius,
                y: -baseRadius,
                width: baseRadius * 2,
                height: baseRadius * 2
            },
            z: 10,
            hoverable: false,
            zlevel: 1
        });

        if (this.label) {
            var labelShape = new RectShape({
                style: {
                    width: baseRadius * 2,
                    height: 25,
                    x: -baseRadius,
                    y: baseRadius - 25,
                    color: zrColor.alpha(this.style.color, 0.8),
                    brushType: 'fill',
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    brushType: 'both',
                    textColor: this.style.labelColor,
                    textFont: '14px 微软雅黑'
                },
                z: 10,
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

    NodeEntity.prototype.setRadius = function (r) {
        this.radius = r;
        this.el.scale[0] = this.el.scale[1] = r / baseRadius;
        this.el.modSelf();
    }

    NodeEntity.prototype.highlight = function () {
        this._outlineShape.style.strokeColor = this.highlightStyle.color;
        this._outlineShape.style.lineWidth = this.highlightStyle.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.highlightStyle.color, 0.8);
        this._labelShape.style.textColor = this.highlightStyle.labelColor;

        this._outlineShape.zlevel = 3;
        this._labelShape.zlevel = 3;
        this._imageShape.zlevel = 3;

        this.el.modSelf();
    }

    NodeEntity.prototype.lowlight = function (zr) {
        this._outlineShape.style.strokeColor = this.style.color;
        this._outlineShape.style.lineWidth = this.style.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.style.color, 0.8);
        this._labelShape.style.textColor = this.style.labelColor;

        this._outlineShape.zlevel = 1;
        this._labelShape.zlevel = 1;
        this._imageShape.zlevel = 1;;

        this.el.modSelf();
    }

    NodeEntity.prototype.animateRadius = function (zr, r, time, cb) {
        var self = this;
        zr.animation.animate(this)
            .when(time || 1000, {
                radius: r
            })
            .during(function () {
                self.setRadius(self.radius);
                zr.refreshNextFrame();
            })
            .done(function () {
                cb && cb();
            })
            .start('ElasticOut');
    };

    NodeEntity.prototype.startActiveAnimation = function (zr) {

        if (this._animatingCircles.length) {
            return;
        }
        var phase = Math.random() * Math.PI * 2;
        for (var i = 0; i < 3; i++) {
            var rad = i / 3 * Math.PI * 2 + phase;
            var x0 = Math.cos(rad) * 8;
            var y0 = Math.sin(rad) * 8;
            var x1 = Math.cos(rad + Math.PI) * 8;
            var y1 = Math.sin(rad + Math.PI) * 8;
            var circle = new CircleShape({
                style: {
                    x: 0,
                    y: 0,
                    r: baseRadius + 5,
                    color: this.highlightStyle.color,
                    opacity: 0.5
                },
                hoverable: false,
                zlevel: 2
            });

            circle._animation = zr.animation.animate(circle.style, {loop: true})
                .when(1000, {
                    x: x1,
                    y: y1
                })
                .when(3000, {
                    x: x0,
                    y: y0
                })
                .when(4000, {
                    x: 0,
                    y: 0
                })
                .during(function () {
                    // mod一个就行了
                    circle.modSelf();
                    zr.refreshNextFrame();
                })
                .delay(-500 * i)
                .start();

            this.el.addChild(circle);
            this._animatingCircles.push(circle);
        }
    }

    NodeEntity.prototype.stopActiveAnimation = function (zr) {
        if (this._animatingCircles.length) {
            for (var i = 0; i < this._animatingCircles.length; i++) {
                var circle = this._animatingCircles[i];
                circle._animation.stop();
                this.el.removeChild(circle);
            }
            this._animatingCircles.length = 0;

            zr.refreshNextFrame();
        }
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});