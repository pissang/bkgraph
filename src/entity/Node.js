define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var CrescentShape = require('../shape/Crescent');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var vec2 = require('zrender/tool/vector');

    var util = require('../util/util');
    var config = require('../config');

    var baseRadius = 50;

    var defaultImage = new Image;
    defaultImage.src = config.defaultNodeImage;

    var NodeEntity = function (opts) {

        Entity.call(this);
        
        this.el = new Group();

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        // radius的值会因为hover动画等发生改变，计算连线的两个端点的时候需要使用originalRadius
        this.originalRadius = opts.originalRadius || opts.radius || 20;

        this.label = opts.label || '';

        this.image = opts.image || '';

        this.draggable = opts.draggable || false;

        this.style = zrUtil.clone(config.nodeStyle['default']);
        this.highlightStyle = zrUtil.clone(config.nodeStyle.highlight);

        if (opts.style) {
            zrUtil.merge(this.style, opts.style, true)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        this._animatingCircles = [];
    }

    var events = ['mouseover', 'mouseout', 'click', 'dragstart', 'dragend', 'dragenter', 'dragover'];

    NodeEntity.prototype.initialize = function (zr) {
        var self = this;
        var r = this.radius;

        var dragging = false;
        var outlineShape = new CircleShape({
            style: {
                strokeColor: this.style.borderColor,
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
            draggable: this.draggable,
            drift: function (dx, dy) {
                self.el.position[0] += dx;
                self.el.position[1] += dy;
            }
        });

        function createEventHandler(name) {
            return function () {
                self.dispatch(name);
            }
        }
        for (var i = 0; i < events.length; i++) {
            outlineShape['on' + events[i]] = createEventHandler(events[i]);
        }

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
            var labelShape = new CrescentShape({
                style: {
                    height: 27,
                    x: 0,
                    y: 0,
                    r: baseRadius,
                    color: zrColor.alpha(this.style.color, this.style.alpha),
                    brushType: 'fill',
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    brushType: 'both',
                    textColor: this.style.labelColor,
                    textFont: '15px 微软雅黑'
                },
                z: 10,
                hoverable: false,
                zlevel: 1
            });
        }

        this.el.addChild(imageShape);

        if (labelShape) {
            this.el.addChild(labelShape);
        }

        this.el.addChild(outlineShape);

        this._imageShape = imageShape;
        this._labelShape = labelShape;
        this._outlineShape = outlineShape;

        this.el.scale[0] = this.el.scale[1] = this.radius / baseRadius;

        // 加载头像图片
        // this.loadImage(zr);
    }

    NodeEntity.prototype.loadImage = function (zr, success, error) {
        if (this._imageLoaded) {
            return;
        }
        this._imageLoaded = true;

        var self = this;
        var image = new Image();
        image.onload = function () {
            self._imageShape.style.image = image;
            self._imageShape.modSelf();
            zr.refreshNextFrame();

            success && success();
        }
        image.onerror = function () {
            error && error();
        }
        image.src = this.image;
    };

    NodeEntity.prototype.setDraggable = function (draggable) {
        this.draggable = draggable;
        this._outlineShape.draggable = draggable;
    };

    NodeEntity.prototype.setRadius = function (r) {
        this.radius = r;
        this.el.scale[0] = this.el.scale[1] = r / baseRadius;
        this.el.modSelf();
    };

    // TODO STYLE BINDING
    NodeEntity.prototype.setStyle = function (name, value) {
        this.style[name] = value;
        switch (name) {
            case 'color':
                this._outlineShape.style.strokeColor = value;
                this._labelShape.style.color = zrColor.alpha(this.style.color, this.style.alpha);
                break;
            case 'lineWidth':
                this._outlineShape.style.lineWidth = value;
                break;
        }

        this.el.modSelf();
    };

    NodeEntity.prototype.setZLevel = function (zlevel) {
        this._outlineShape.zlevel = zlevel;
        this._imageShape.zlevel = zlevel;
        this._labelShape.zlevel = zlevel;
        this.el.modSelf();
    };

    NodeEntity.prototype.highlight = function () {
        this._outlineShape.style.strokeColor = this.highlightStyle.borderColor;
        this._outlineShape.style.lineWidth = this.highlightStyle.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.highlightStyle.color, this.highlightStyle.alpha);
        this._labelShape.style.textColor = this.highlightStyle.labelColor;

        this.setZLevel(3);

        this.el.modSelf();
    };

    NodeEntity.prototype.lowlight = function () {
        this._outlineShape.style.strokeColor = this.style.borderColor;
        this._outlineShape.style.lineWidth = this.style.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.style.color, this.style.alpha);
        this._labelShape.style.textColor = this.style.labelColor;

        this.setZLevel(1);

        this.el.modSelf();
    };

    NodeEntity.prototype.animateRadius = function (zr, r, time, cb) {
        this.stopAnimation('radius');

        var self = this;
        this.addAnimation('radius', zr.animation.animate(this)
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
        )
        .start('ElasticOut')
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

            this.addAnimation('glowcircle', zr.animation.animate(circle.style, {loop: true})
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
                .start()
            );

            this.el.addChild(circle);
            this._animatingCircles.push(circle);
        }
    }

    NodeEntity.prototype.stopActiveAnimation = function (zr) {
        if (this._animatingCircles.length) {
            for (var i = 0; i < this._animatingCircles.length; i++) {
                var circle = this._animatingCircles[i];
                this.el.removeChild(circle);
            }
            this._animatingCircles.length = 0;

            this.stopAnimation('glowcircle');

            zr.refreshNextFrame();
        }
    }

    var min = [0, 0];
    var max = [0, 0];
    NodeEntity.prototype.isInsideRect = function (rect) {
        var r = this.radius + this.style.lineWidth;

        min[0] = this.el.position[0] - r;
        min[1] = this.el.position[1] - r;
        max[0] = this.el.position[0] + r;
        max[1] = this.el.position[1] + r;

        return !(
            min[0] > rect.x + rect.width
            || min[1] > rect.y + rect.height
            || max[0] < rect.x
            || max[1] < rect.y
        );
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});