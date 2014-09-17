define(function (require) {

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

        var cx = this._kgraph.getWidth() / 2;
        var cy = this._kgraph.getHeight() / 2;

        for (var i = 0; i < data.nodes.length; i++) {
            var n = graph.addNode(data.nodes[i].name, data.nodes[i]);
            n.layout = {
                position: _randomInSquare(cx, cy, 800),
                // TODO
                mass: 1,
                radius: data.nodes[i].radius
            };
            if (data.nodes[i].position) {
                n.layout.position = data.nodes[i].position;
            }
        }

        for (var i = 0; i < data.links.length; i++) {
            var e = graph.addEdge(data.links[i].source, data.links[i].target, data.links[i]);
            e.layout = {
                weight: e.weight
            }
        }

        this.runLayout(graph, function () {
            this.render(graph);
        });
    }

    GraphMain.prototype.render = function (graph) {
        var zr = this._zr;
        graph.eachNode(function (n) {
            var nodeEntity = new NodeEntity({
                radius: n.data.radius
            });
            nodeEntity.initialize(zr);

            nodeEntity.el.position = n.layout.position;
            zr.addGroup(nodeEntity.el);
            n.entity = nodeEntity;
        });

        graph.eachEdge(function (e) {
            var edgeEntity = new EdgeEntity({
                sourceEntity: e.node1.entity,
                targetEntity: e.node2.entity
            });
            edgeEntity.initialize(zr);
            e.entity = edgeEntity;

            zr.addShape(edgeEntity.el);
        });

        zr.render();
    }

    GraphMain.prototype.runLayout = function (graph, cb) {
        var forceLayout = new ForceLayout();
        forceLayout.center = [
            this._kgraph.getWidth() / 2,
            this._kgraph.getHeight() / 2
        ];
        forceLayout.gravity = 0.3;
        forceLayout.scaling = 2;

        forceLayout.init(graph, true);
        this._layout = forceLayout;
        var self = this;
        forceLayout.onupdate = function () {
            if (forceLayout.temperature < 0.01) {
                cb && cb.call(self);
            } else {
                forceLayout.step(10);
            }
        }
        this._layout.step(10);
    }

    zrUtil.inherits(GraphMain, Component);

    function _randomInSquare(x, y, size) {
        var v = vec2.create();
        v[0] = (Math.random() - 0.5) * size + x;
        v[1] = (Math.random() - 0.5) * size + y;
        return v;
    }

    return GraphMain;
});