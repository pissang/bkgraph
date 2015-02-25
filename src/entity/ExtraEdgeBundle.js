define(function (require) {

    var Entity = require('./Entity');
    var curveTool = require('zrender/tool/curve');
    var zrUtil = require('zrender/tool/util');

    var CurveBundleShape = require('../shape/CurveBundle');
    var config = require('../config');

    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');

    var ExtraEdgeBundleEntity = function (opts) {
        opts = opts || {};

        Entity.call(this);

        this.el = new CurveBundleShape({
            style: {
                segments: []
            },
            hoverable: false
        });

        this.edges = [];
    }

    ExtraEdgeBundleEntity.prototype.initialize = function (zr) {
        var shapeStyleConfig = config.extraEdgeStates.normal.shapeStyle.labelLine;
        this.el.style.strokeColor = shapeStyleConfig.strokeColor;
        this.el.style.opacity = shapeStyleConfig.opacity;
        this.el.style.lineWidth = shapeStyleConfig.lineWidth;

        this.update(zr);
    }

    ExtraEdgeBundleEntity.prototype.update = function (zr) {

        var len = 0;
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            var sourceEntity = e.node1.entity;
            var targetEntity = e.node2.entity;
            var layerCounter = Math.max(e.node1.data.layerCounter, e.node2.data.layerCounter);

            var segs = this.el.style.segments;
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

        this.el.style.segments.length = len;

        this.el.modSelf();
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

    ExtraEdgeBundleEntity.prototype._calCurvePoints = function (sourceEntity, targetEntity, layerCounter, out) {

        var inv = 1.3;
        var curve = this.el;
        var p1 = sourceEntity.el.position;
        var p2 = targetEntity.el.position;

        var curveStyle = {
            xStart: p1[0],
            yStart: p1[1],
            xEnd: p2[0],
            yEnd: p2[1]
        };

        inv *= (layerCounter % 2 == 0) ? 1 : -1;
        curveStyle.cpX1 = (p1[0] + p2[0]) / 2 - inv * (p1[1] - p2[1]) / 4;
        curveStyle.cpY1 = (p1[1] + p2[1]) / 2 - inv * (p2[0] - p1[0]) / 4;

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