define(function (require) {

    var Entity = require('./Entity');
    var curveTool = require('zrender/tool/curve');
    var zrUtil = require('zrender/tool/util');

    var CurveBundleShape = require('../shape/CurveBundle');

    var vec2 = require('zrender/tool/vector');

    var ExtraEdgeBundleEntity = function (opts) {
        opts = opts || {};

        Entity.call(this);

        this.el = new CurveBundleShape({
            style: {
                segments: [],
                lineWidth: 1
            },
            hoverable: false
        });

        this.style = {
            color: '#0e90fe',
            opacity: 0.2
        }
        if (opts.style) {
            zrUtil.merge(this.style, opts.style);
        }

        this.edges = [];
    }

    ExtraEdgeBundleEntity.prototype.initialize = function (zr) {
        this.el.style.strokeColor = this.style.color;
        this.el.style.opacity = this.style.opacity;

        this.update(zr);
    }

    ExtraEdgeBundleEntity.prototype.update = function (zr) {

        var len = 0;
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            var sourceEntity = e.node1.entity;
            var targetEntity = e.node2.entity;

            var segs = this.el.style.segments;
            var seg = segs[i];
            if (!seg) {
                seg = segs[i] = [];
            }
            if (sourceEntity && targetEntity) {
                this._calCurvePoints(
                    sourceEntity.el.position,
                    targetEntity.el.position,
                    seg
                );

                len++;
            }
        }

        this.el.style.segments.length = len;

        this.el.modSelf();
    }

    ExtraEdgeBundleEntity.prototype.addEdge = function (e) {
        var sourceEntity = e.node1.entity;
        var targetEntity = e.node2.entity;

        var seg = [];
        if (sourceEntity && targetEntity) {
            this._calCurvePoints(
                sourceEntity.el.position,
                targetEntity.el.position,
                seg
            );

            this.edges.push(e);
            this.el.style.segments.push(seg);

            this.el.modSelf();
        }
    }

    ExtraEdgeBundleEntity.prototype.removeEdge = function (e) {
        var idx = this.edges.indexOf(e);
        if (idx > 0) {
            this.edges.splice(idx, 1);
            this.el.style.segments.splice(idx, 1);
        }
    }

    ExtraEdgeBundleEntity.prototype._calCurvePoints = function (p1, p2, out) {
        out[0] = p1[0];
        out[1] = p1[1];
        out[2] = (p1[0] + p2[0]) / 2 - (p2[1] - p1[1]) / 4;
        out[3] = (p1[1] + p2[1]) / 2 - (p1[0] - p2[0]) / 4;
        out[4] = p2[0];
        out[5] = p2[1];
    }


    zrUtil.inherits(ExtraEdgeBundleEntity, Entity);

    return ExtraEdgeBundleEntity;
});