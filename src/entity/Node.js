define(function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var zrUtil = require('zrender/tool/util');

    var NodeEntity = function (opts) {

        Entity.call(this);
        
        this.el = new Group();

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        this.color = opts.color || 'black';

        this.title = opts.title || '';
    }

    NodeEntity.prototype.initialize = function (zr) {

        var circle = new CircleShape({
            style: {
                x: 0,
                y: 0,
                r: this.radius,
                color: this.color
            }
        });

        this.el.addChild(circle);
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});