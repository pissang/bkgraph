define(function (require) {

    var Entity = require('./Entity');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();

    var EdgeEntity = function (opts) {
        
        Entity.call(this);

        this.el = new LineShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                lineWidth: 2,
                strokeColor: 'black'
            }
        });

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;
    }

    EdgeEntity.prototype.initialize = function (zr) {
        this.update(zr);
    }

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

            var line = this.el;
            line.style.xStart = v1[0];
            line.style.yStart = v1[1];
            line.style.xEnd = v2[0];
            line.style.yEnd = v2[1];

            zr.modShape(line.id);
        }
    }

    zrUtil.inherits(EdgeEntity, Entity);

    return EdgeEntity;
});