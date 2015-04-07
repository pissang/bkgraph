define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/graphic/Group');
    var ZImage = require('zrender/graphic/Image');
    var Circle = require('zrender/graphic/shape/Circle');
    var CrescentShape = require('../shape/Crescent');
    var zrUtil = require('zrender/core/util');
    var vec2 = require('zrender/core/vector');
    var zrColor = require('zrender/tool/color');

    var util = require('../util/util');
    var config = require('../config');

    var baseRadius = 50;

    var defaultImage = new Image;
    defaultImage.src = config.defaultNodeImage;

    var NodeEntity = function (opts) {

        Entity.call(this);

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        // radius的值会因为hover动画等发生改变，计算连线的两个端点的时候需要使用originalRadius
        this.originalRadius = opts.originalRadius || opts.radius || 20;

        this.label = opts.label || '';

        this.image = opts.image || '';

        this.draggable = opts.draggable || false;

        this.states = {
            normal: {
                name: 'normal',
                z: 1,
                // 自定义属性
                labelAlpha: 0.6,
                zlevel: 0
            },
            hover: {
                name: 'hover',
                zlevel: 2,
                onenter: function () {
                    this.animateRadius(this.originalRadius * 1.2, 500);
                    this.startActiveAnimation();
                },
                onleave: function (state, nextState) {
                    if (nextState.name !== 'active') {
                        this.animateRadius(this.originalRadius, 500);
                        this.stopActiveAnimation();
                    }
                },
                labelAlpha: 0.9
            },
            active: {
                name: 'active',
                zlevel: 2,
                onenter: function (state, previousState) {
                    if (previousState.name !== 'hover') {
                        this.animateRadius(this.originalRadius * 1.2, 500);
                        this.startActiveAnimation();
                    }
                },
                onleave: function (state, nextState) {
                    this.animateRadius(this.originalRadius, 500);
                    this.stopActiveAnimation();
                },
                labelAlpha: 0.9
            }
        };

        zrUtil.merge(this.states, opts.states || {}, true);

        this.defaultState = opts.defaultState != null ? opts.defaultState : 'normal';

        this.statesTransition = {
            normal: ['hover', 'active'],
            hover: ['normal', 'active'],
            active: ['normal']
        };

        this._animatingCircles = [];
    }

    var events = ['mouseover', 'mouseout', 'click', 'dragstart', 'dragend', 'dragenter', 'dragover'];

    NodeEntity.prototype.initialize = function (zr) {

        Entity.prototype.initialize.call(this, zr);

        var self = this;
        var r = this.radius;

        var outline = new Circle({
            shape: {
                r: baseRadius,
                cx: 0,
                cy: 0
            },
            style: {
                stroke: 'black',
                fill: 'rgba(0, 0, 0, 0)'
            },
            z: 10,
            draggable: this.draggable,
            drift: function (dx, dy) {
                self.el.position[0] += dx;
                self.el.position[1] += dy;
            }
        });

        function createEventHandler(name) {
            return function () {
                self.trigger(name);
            }
        }
        for (var i = 0; i < events.length; i++) {
            outline['on' + events[i]] = createEventHandler(events[i]);
        }

        var zImage = new ZImage({
            style: {
                image: defaultImage,
                x: -baseRadius,
                y: -baseRadius,
                width: baseRadius * 2,
                height: baseRadius * 2
            },
            z: 10,
            hoverable: false
        });

        if (this.label) {
            var labelEl = new CrescentShape({
                shape: {
                    cx: 0,
                    cy: 0,
                    height: 25,
                    r: baseRadius
                },
                style: {
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    textFont: '15px 微软雅黑'
                },
                z: 10,
                hoverable: false
            });
        }

        this.addElement('image', zImage);
        if (labelEl) {
            this.addElement('label', labelEl);
        }
        this.addElement('outline', outline);

        this.el.scale[0] = this.el.scale[1] = this.radius / baseRadius;

        // 设置标签透明度
        this.on('state:enter', function (state) {
            if (labelEl) {
                labelEl.style.fill = zrColor.alpha(
                    state.shapeStyle.label.fill, state.labelAlpha
                );
            }
        });

        if (this.defaultState) {
            this.setState(this.defaultState);
        }
    }

    NodeEntity.prototype.loadImage = function (success, error) {
        if (this._imageLoaded) {
            return;
        }
        this._imageLoaded = true;

        var self = this;
        var image = new Image();
        image.onload = function () {
            var zImage = self.getElement('image');
            zImage.style.image = image;
            zImage.dirty();

            success && success();
        }
        image.onerror = function () {
            error && error();
        }
        image.src = this.image;
    };

    NodeEntity.prototype.setDraggable = function (draggable) {
        this.draggable = draggable;
        this.getElement('outline').draggable = draggable;
    };

    NodeEntity.prototype.setRadius = function (r) {
        this.radius = r;
        this.el.scale[0] = this.el.scale[1] = r / baseRadius;
        this.el.dirty();
    };

    NodeEntity.prototype.animateRadius = function (r, time, cb) {

        var zr = this.zr;

        this.stopAnimation('radius');

        var self = this;
        this.addAnimation('radius', zr.animation.animate(this)
            .when(time || 1000, {
                radius: r
            })
            .during(function () {
                self.setRadius(self.radius);
            })
            .done(function () {
                cb && cb();
            })
        )
        .start('ElasticOut')
    };

    NodeEntity.prototype.startActiveAnimation = function () {
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
            var circle = new Circle({
                shape: {
                    cx: 0,
                    cy: 0,
                    r: baseRadius + 5
                },
                style: {
                    fill: this.states.hover.shapeStyle.outline.stroke,
                    opacity: 0.5
                },
                hoverable: false,
                z: -1,
                zlevel: 2
            });

            this.el.addElement(circle);

            this.addAnimation('glowcircle', circle.animate('shape', true))
                .when(1000, {
                    cx: x1,
                    cy: y1
                })
                .when(3000, {
                    cx: x0,
                    cy: y0
                })
                .when(4000, {
                    cx: 0,
                    cy: 0
                })
                .delay(-500 * i)
                .start();

            this._animatingCircles.push(circle);
        }
    }

    NodeEntity.prototype.stopActiveAnimation = function () {
        var zr = this.zr;
        var animatingCircles = this._animatingCircles;
        if (animatingCircles.length) {
            for (var i = 0; i < animatingCircles.length; i++) {
                var circle = animatingCircles[i];
                this.el.removeElement(circle);
            }
            animatingCircles.length = 0;

            this.stopAnimation('glowcircle');
        }
    }

    var min = [0, 0];
    var max = [0, 0];
    NodeEntity.prototype.isInsideRect = function (rect) {
        var r = this.radius;
        var elPosition = this.el.position;

        min[0] = elPosition[0] - r;
        min[1] = elPosition[1] - r;
        max[0] = elPosition[0] + r;
        max[1] = elPosition[1] + r;

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