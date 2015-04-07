define(function (require) {

    var Entity = require('./Entity');
    var curveTool = require('zrender/core/curve');
    var zrUtil = require('zrender/core/util');

    var CurveBundleShape = require('../shape/CurveBundle');
    var config = require('../config');

    var intersect = require('../util/intersect');

    var vec2 = require('zrender/core/vector');

    var ExtraEdgeBundleEntity = function (opts) {
        opts = opts || {};

        Entity.call(this);

        this.el = new CurveBundleShape({
            shape: {
                segments: []
            },
            hoverable: false
        });

        this.edges = [];
    }

    ExtraEdgeBundleEntity.prototype.initialize = function (zr) {
        var shapeStyleConfig = config.extraEdgeStates.normal.shapeStyle.curve;
        var elStyle = this.el.style;
        elStyle.stroke = shapeStyleConfig.stroke;
        elStyle.opacity = shapeStyleConfig.opacity;
        elStyle.lineWidth = shapeStyleConfig.lineWidth;

        this.update(zr);
    }

    ExtraEdgeBundleEntity.prototype.update = function (zr) {

        var len = 0;
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            var sourceEntity = e.node1.entity;
            var targetEntity = e.node2.entity;
            var layerCounter = Math.max(e.node1.data.layerCounter, e.node2.data.layerCounter);

            var segs = this.el.shape.segments;
            var seg = segs[i];
            if (!seg) {
                seg = segs[i] = [];
            }
            if (sourceEntity && targetEntity) {
                this._calCurvePoints(
                    sourceEntity,
                    targetEntity,
                    layerCounter,
                    seg
                );

                len++;
            }
        }

        this.el.shape.segments.length = len;

        this.el.dirty();
    }

    ExtraEdgeBundleEntity.prototype.addEdge = function (e) {
        var sourceEntity = e.node1.entity;
        var targetEntity = e.node2.entity;
        var layerCounter = Math.max(e.node1.data.layerCounter, e.node2.data.layerCounter);

        var seg = [];
        if (sourceEntity && targetEntity) {
            this._calCurvePoints(
                sourceEntity,
                targetEntity,
                layerCounter,
                seg
            );

            this.edges.push(e);
            this.el.shape.segments.push(seg);

            this.el.dirty();
        }
    }

    ExtraEdgeBundleEntity.prototype.removeEdge = function (e) {
        var idx = this.edges.indexOf(e);
        if (idx > 0) {
            this.edges.splice(idx, 1);
            this.el.shape.segments.splice(idx, 1);
        }
    }

    ExtraEdgeBundleEntity.prototype._calCurvePoints = function (sourceEntity, targetEntity, layerCounter, out) {

        var inv = 1.3;
        var curve = this.el;
        var p1 = sourceEntity.el.position;
        var p2 = targetEntity.el.position;

        var curveStyle = {
            x1: p1[0],
            y1: p1[1],
            x3: p2[0],
            y3: p2[1]
        };

        inv *= (layerCounter % 2 == 0) ? 1 : -1;
        curveStyle.x2 = (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) / 4;
        curveStyle.y2 = (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) / 4;

        p1 = intersect.curveCircle(curveStyle, p1, sourceEntity.originalRadius);
        p2 = intersect.curveCircle(curveStyle, p2, targetEntity.originalRadius);

        out[0] = p1[0];
        out[1] = p1[1];
        out[2] = (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) / 4;
        out[3] = (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) / 4;
        out[4] = p2[0];
        out[5] = p2[1];
    }


    zrUtil.inherits(ExtraEdgeBundleEntity, Entity);

    return ExtraEdgeBundleEntity;
});