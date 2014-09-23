define(function (require) {

    require('./forceLayoutWorkerExt');

    var zrender = require('zrender');
    var ForceLayout = require('echarts/layout/Force');
    var Graph = require('echarts/data/Graph');
    var zrUtil = require('zrender/tool/util');
    var Component = require('./Component');
    var vec2 = require('zrender/tool/vector');

    var NodeEntity = require('../entity/Node');
    var EdgeEntity = require('../entity/Edge');

    var GraphMain = function () {

        Component.call(this);

        this.minRadius = 20;
        this.maxRadius = 50;

        this.minRelationWeight = 30;
        this.maxRelationWeight = 40;

        this._kgraph = null;
        
        this._zr = null;

        this._graph = null;

        this._layout = null;
    }

    GraphMain.prototype.type = 'GRAPH';

    GraphMain.prototype.initialize = function (kg) {
        this._kgraph = kg;

        var el = this.el;

        el.style.width = kg.getWidth() + 'px';
        el.style.height = kg.getHeight() + 'px';

        this._zr = zrender.init(el);
    }

    GraphMain.prototype.resize = function (w, h) {

        this.el.style.width = w + 'px';
        this.el.style.height = h + 'px';

        this._zr.resize();
    }

    GraphMain.prototype.setData = function (data) {
        var graph = new Graph();
        this._graph = graph;
        var zr = this._zr;

        var cx = this._kgraph.getWidth() / 2;
        var cy = this._kgraph.getHeight() / 2;

        // 映射数据
        var max = -Infinity;
        var min = Infinity;
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            min = Math.min(min, entity.hotValue);
            max = Math.max(max, entity.hotValue);
        }
        var diff = max - min;

        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            // 数据修正
            entity.layerCounter = +entity.layerCounter;
            var n = graph.addNode(entity.ID, entity);
            var r = diff > 0 ?
                entity.hotValue * (this.maxRadius - this.minRadius) / diff + this.minRadius
                : (this.maxRadius + this.minRadius) / 2;
            n.layout = {
                position: _randomInCircle(cx, cy, 600 * (+entity.layerCounter)),
                // TODO
                mass: 0.4,
                radius: r,
                fixed: entity.layerCounter === 0
            };
            if (data.entities[i].position) {
                n.layout.position = data.entities[i].position;
            } else if (entity.layerCounter === 0) {
                n.layout.position = [
                    zr.getWidth() / 2,
                    zr.getHeight() / 2
                ];
            }
            n.position = Array.prototype.slice.call(n.layout.position);
        }

        max = -Infinity;
        min = Infinity;
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            min = Math.min(min, relation.relationWeight);
            max = Math.max(max, relation.relationWeight);
        }
        diff = max - min;
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            var w = diff > 0 ? 
                relation.relationWeight / diff * (this.maxRelationWeight - this.minRelationWeight) + this.minRelationWeight
                : (this.maxRelationWeight + this.minRelationWeight) / 2;
            var e = graph.addEdge(relation.fromID, relation.toID, relation);
            e.layout = {
                weight: w
            };
        }

        this.runLayout(graph, function () {
            this.render(graph);
        });
    }

    GraphMain.prototype.render = function (graph) {
        var zr = this._zr;
        // 所有实体都在 zlevel-1 层
        graph.eachNode(function (n) {
            var nodeEntity = new NodeEntity({
                radius: n.layout.radius,
                label: n.data.name,
                // image: n.data.image
                image: '../mock/avatar.jpg'
            });
            nodeEntity.initialize(zr);

            nodeEntity.el.position = n.layout.position;
            zr.addGroup(nodeEntity.el);
            n.entity = nodeEntity;
        });

        // 所有边都在 zlevel-0 层
        graph.eachEdge(function (e) {
            var edgeEntity = new EdgeEntity({
                sourceEntity: e.node1.entity,
                targetEntity: e.node2.entity,
                label: e.data.relationName
            });
            edgeEntity.initialize(zr);
            e.entity = edgeEntity;

            zr.addGroup(edgeEntity.el);
        });

        zr.modLayer(1, {
            panable: true,
            zoomable: true
        });
        zr.modLayer(0, {
            panable: true,
            zoomable: true
        });

        zr.render();
    }

    GraphMain.prototype.runLayout = function (graph, cb) {
        var forceLayout = new ForceLayout();
        forceLayout.center = [
            this._kgraph.getWidth() / 2,
            this._kgraph.getHeight() / 2
        ];
        forceLayout.gravity = 0.6;
        forceLayout.scaling = 15;
        forceLayout.coolDown = 0.995;
        forceLayout.preventOverlap = true;

        graph.eachNode(function(n) {
            n.layout.mass = n.degree() / 5;
        })

        forceLayout.init(graph, false);
        this._layout = forceLayout;
        var self = this;
        forceLayout.onupdate = function () {
            for (var i = 0; i < graph.nodes.length; i++) {
                if (graph.nodes[i].layout.fixed) {
                    vec2.copy(graph.nodes[i].layout.position, graph.nodes[i].position);
                }
            }
            if (forceLayout.temperature < 0.01) {
                cb && cb.call(self);
            } else {
                forceLayout.step(10);
            }
        }
        this._layout.step(10);
    }

    zrUtil.inherits(GraphMain, Component);

    function _randomInCircle(x, y, radius) {
        var v = vec2.create();
        var angle = Math.random() * Math.PI * 2;
        v[0] = Math.cos(angle) * radius + x;
        v[1] = Math.sin(angle) * radius + y;
        return v;
    }

    return GraphMain;
});