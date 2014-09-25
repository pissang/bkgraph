define(function (require) {

    var zrender = require('zrender');
    var ForceLayout = require('echarts/layout/Force');
    var Graph = require('echarts/data/Graph');
    var Tree = require('echarts/data/Tree');
    var TreeLayout = require('echarts/layout/Tree');
    var zrUtil = require('zrender/tool/util');
    var Component = require('./Component');
    var vec2 = require('zrender/tool/vector');

    var NodeEntity = require('../entity/Node');
    var EdgeEntity = require('../entity/Edge');
    var ExtraEdgeEntity = require('../entity/ExtraEdge');

    var GraphMain = function () {

        Component.call(this);

        this.minRadius = 30;
        this.maxRadius = 40;

        this.minRelationWeight = 30;
        this.maxRelationWeight = 40;

        this._kgraph = null;
        
        this._zr = null;

        // Graph for rendering
        this._graphRendering = null;

        // Graph for layouting
        this._graph = null

        this._layouting = false;
    };

    GraphMain.prototype.type = 'GRAPH';

    GraphMain.prototype.initialize = function (kg) {
        this._kgraph = kg;

        var el = this.el;
        this.el.className = 'bkg-graph';

        el.style.width = kg.getWidth() + 'px';
        el.style.height = kg.getHeight() + 'px';

        this._zr = zrender.init(el);

        var zrRefresh = this._zr.painter.refresh;
        var self = this;
        this._zr.painter.refresh = function () {
            self._culling();
            zrRefresh.call(this);
        }
    };

    GraphMain.prototype.resize = function (w, h) {

        this.el.style.width = w + 'px';
        this.el.style.height = h + 'px';

        this._zr.resize();
    };

    GraphMain.prototype.setData = function (data) {
        var graph = new Graph(true);
        this._graph = graph;
        var zr = this._zr;

        var cx = this._kgraph.getWidth() / 2;
        var cy = this._kgraph.getHeight() / 2;
        var mainNode;

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
                (entity.hotValue - min) * (this.maxRadius - this.minRadius) / diff + this.minRadius
                : (this.maxRadius + this.minRadius) / 2;
            if (entity.layerCounter === 0) {
                r = 70;
                mainNode = n;
            }
            n.layout = {
                position: entity.position,
                mass: 1,
                radius: r
            };
            if (entity.layerCounter === 0) {
                n.layout.fixed = true;
                n.layout.position = [
                    zr.getWidth() / 2,
                    zr.getHeight() / 2
                ];
                n.position = Array.prototype.slice.call(n.layout.position);
            }
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
            if (relation.isExtra) {
                continue;
            }
            var w = diff > 0 ? 
                (relation.relationWeight - min) / diff * (this.maxRelationWeight - this.minRelationWeight) + this.minRelationWeight
                : (this.maxRelationWeight + this.minRelationWeight) / 2;
            var e = graph.addEdge(relation.fromID, relation.toID, relation);
            e.layout = {
                // 边权重
                weight: w * 8 / Math.pow(e.node1.data.layerCounter + 1, 2)
                // weight: e.node1.data.layerCounter === 0 ? 200 : w
            };
        }

        this.radialTreeLayout(zr.getWidth() / 2, zr.getHeight() / 2);

        // 加入补边
        this._graphRendering = this._graph.clone();
        this._graphRendering.eachNode(function (n) {
            // 共用布局
            n.layout = this._graph.getNodeById(n.id).layout;
        }, this);
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            if (!relation.isExtra) {
                continue;
            }
            var e = this._graphRendering.addEdge(relation.fromID, relation.toID, relation);
            e.isExtra = true;
        }

        this.render();
    };

    GraphMain.prototype.render = function () {
        var zr = this._zr;
        var graph = this._graphRendering;

        // 所有实体都在 zlevel-1 层
        graph.eachNode(function (n) {
            if (n.data.layerCounter > 2) {
                return;
            }
            if (this._createNodeEntity(n)) {
                zr.addGroup(n.entity.el);
            }
        }, this);

        // 所有边都在 zlevel-0 层
        graph.eachEdge(function (e) {
            if (
                e.node1.data.layerCounter > 2 ||
                e.node2.data.layerCounter > 2
            ) {
                return;
            }
            if (this._createEdgeEntity(e)) {
                zr.addGroup(e.entity.el);
            }
        }, this);

        zr.render();

        zr.modLayer(0, {
            panable: true,
            zoomable: true
        });
        zr.modLayer(1, {
            panable: true,
            zoomable: true
        });
    };

    GraphMain.prototype.naiveLayout = function (mainNode) {
        graph.breadthFirstTraverse(function (n2, n1) {
            if (n1) {
                if (!n2.layout.position) {
                    var cx = n1.layout.position[0];
                    var cy = n1.layout.position[1];
                    var r = 1000 / Math.pow(n1.data.layerCounter + 1, 2);
                    n1.__count = n1.__count || 0;
                    var angle = Math.PI * 2 * n1.__count / n1.outDegree();
                    n1.__count ++;
                    if (n1.__count === n1.outDegree()) {
                        // 置零
                        n1.__count = 0;
                    }
                    n2.layout.position = [
                        Math.cos(angle) * r + cx,
                        Math.sin(angle) * r + cy
                    ];
                }
            }
        }, mainNode, 'out');
    };

    GraphMain.prototype.radialTreeLayout = function (cx, cy) {
        var tree = Tree.fromGraph(this._graph)[0];
        tree.traverse(function (treeNode) {
            var graphNode = this._graph.getNodeById(treeNode.id);
            treeNode.layout = {
                width: graphNode.layout.radius * 2,
                height: graphNode.layout.radius * 2
            };
        }, this);
        var layout = new TreeLayout(tree);
        var layerPadding = [100, 400, 200, 200, 200, 200, 200];
        layout.layerPadding = function (level) {
            return layerPadding[level] || 200;
        };
        layout.run();

        var min = [Infinity, Infinity];
        var max = [-Infinity, -Infinity];
        tree.traverse(function (treeNode) {
            vec2.min(min, min, treeNode.layout.position);
            vec2.max(max, max, treeNode.layout.position);
        });
        var width = max[0] - min[0];
        var height = max[1] - min[1];
        tree.traverse(function (treeNode) {
            var graphNode = this._graph.getNodeById(treeNode.id);
            var x = treeNode.layout.position[0];
            var y = treeNode.layout.position[1];
            var r = y;
            var rad = x / width * Math.PI * 2;

            graphNode.layout.position = [
                // 以中心节点为圆心
                r * Math.cos(rad) + cx,
                r * Math.sin(rad) + cy
            ];
        }, this);
    }

    GraphMain.prototype.startForceLayout = function (cb) {
        var graph = this._graph;
        var forceLayout = new ForceLayout();
        forceLayout.center = [
            this._kgraph.getWidth() / 2,
            this._kgraph.getHeight() / 2
        ];
        // forceLayout.gravity = 0.8;
        forceLayout.scaling = 12;
        forceLayout.coolDown = 0.99;
        // forceLayout.enableAcceleration = false;
        forceLayout.maxSpeedIncrease = 1;
        // 这个真是不好使
        // forceLayout.preventOverlap = true;

        graph.eachNode(function(n) {
            n.layout.mass = n.degree() * 3;
        });

        forceLayout.init(graph, false);
        var self = this;

        this._layouting = true;
        forceLayout.onupdate = function () {
            for (var i = 0; i < graph.nodes.length; i++) {
                if (graph.nodes[i].layout.fixed) {
                    vec2.copy(graph.nodes[i].layout.position, graph.nodes[i].position);
                }
            }
            self._updateNodePositions();   

            if (forceLayout.temperature < 0.01) {
                cb && cb.call(self);
            }
            else {
                if (self._layouting) {
                    forceLayout.step(10);
                }
            }
        }
       forceLayout.step(10);
    };

    GraphMain.prototype.stopForceLayout = function () {
        this._layouting = false;
    }

    GraphMain.prototype.lowlightAll = function () {
        var zr = this._zr;

        this._graphRendering.eachNode(function (n) {
            if (n.entity) {
                n.entity.lowlight(zr);
            }
        });
        this._graphRendering.eachEdge(function (e) {
            if (e.entity) {
                e.entity.lowlight(zr);
            }
        });

        zr.refreshNextFrame();
    }

    GraphMain.prototype.highlightNodeAndAdjeceny = function (node) {
        if (typeof(node) === 'string') {
            node = this._graphRendering.getNodeById(node);
        }
        var zr = this._zr;

        this.lowlightAll();

        node.entity.highlight(zr);
        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;
            if (!other.entity) {
                // 动态添加
                this._createNodeEntity(other);
                zr.addGroup(other.entity.el);
            }
            other.entity.highlight(zr);

            if (!e.entity) {
                // 动态添加
                this._createEdgeEntity(e);
                zr.addGroup(e.entity.el);
            }
            e.entity.highlight(zr);
        }

        zr.refreshNextFrame();
    };

    GraphMain.prototype.highlightNodeToMain = function (node) {
        if (typeof(node) === 'string') {
            node = this._graph.getNodeById(node);
        }

        var graph = this._graph;
        var graphRendering = this._graphRendering;
        var zr = this._zr;
        node = graph.getNodeById(node.id);

        this.lowlightAll();

        // 这里把图当做树来做了
        var current = node;
        var nodes = [current];
        while (current) {
            var n = graphRendering.getNodeById(current.id);
            if (!n.entity) {
                this._createNodeEntity(n);
                zr.addGroup(n.entity.el);
            }
            n.entity.highlight(zr);

            var inEdge = current.inEdges[0];
            if (!inEdge) {
                break;
            }
            current = inEdge.node1;

            nodes.push(current);
        }

        for (var i = 0; i < nodes.length - 1; i++) {
            var n2 = nodes[i];
            var n1 = nodes[i + 1];
            var e = graphRendering.getEdge(n1.id, n2.id);

            if (!e.entity) {
                this._createEdgeEntity(e);
                zr.addGroup(e.entity.el);
            }
            e.entity.highlight(zr);
        }

        zr.refreshNextFrame();
    }

    /**
     * 移动视图到指定的实体位置
     */
    GraphMain.prototype.moveToEntity = function (id) {
        var zr = this._zr;
        var graph = this._graphRendering;
        var n = graph.getNodeById(id);
        if (!n) {
            return;
        }
        var entity = n.entity;
        var layer = zr.painter.getLayer(0);
        var pos = Array.prototype.slice.call(entity.el.position);
        vec2.mul(pos, pos, layer.scale);
        vec2.sub(pos, [zr.getWidth() / 2, zr.getHeight() / 2], pos);

        this.moveTo(pos[0], pos[1]);
    };

    /**
     * 移动视图到指定的位置
     */
    GraphMain.prototype.moveTo = function (x, y, cb) {
        var zr = this._zr;
        var layers = zr.painter.getLayers();
        zr.animation.animate(layers[0])
            .when(800, {
                position: [x, y]
            })
            .during(function () {
                for (var z in layers) {
                    if (z !== 'hover') {
                        vec2.copy(layers[z].position, layers[0].position);
                        layers[z].dirty = true;   
                    }
                }
                zr.refreshNextFrame();
            })
            .start('CubicInOut');
    };

    GraphMain.prototype.showAll = function () {
        this._graphRendering.eachNode(function (n) {
            if (!n.entity) {
                this._createNodeEntity(n);
                this._zr.addGroup(n.entity.el);
            }
        }, this);
        this._graphRendering.eachEdge(function (e) {
            if (!e.entity) {
                this._createEdgeEntity(e);
                this._zr.addGroup(e.entity.el);
            }
        }, this);
    };

    GraphMain.prototype._createNodeEntity = function (n) {
        var nodeEntity = new NodeEntity({
            radius: n.layout.radius,
            label: n.data.name,
            // image: n.data.image
            image: '../mock/avatar.jpg'
        });
        nodeEntity.initialize(this._zr);

        nodeEntity.el.position = n.layout.position;
        var self = this;
        nodeEntity.bind('mouseover', function () {
            self.highlightNodeAndAdjeceny(n);
        });

        n.entity = nodeEntity;
        return nodeEntity;
    };

    GraphMain.prototype._createEdgeEntity = function (e) {
        var edgeEntity;
        if (e.node1.entity && e.node2.entity) {
            if (e.isExtra) {
                edgeEntity = new ExtraEdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
            } else {
                edgeEntity = new EdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
            }
            edgeEntity.initialize(this._zr);

            e.entity = edgeEntity;
            return edgeEntity;
        }
    };

    GraphMain.prototype._updateNodePositions = function () {
        var zr = this._zr;
        // PENDING
        var graph = this._graphRendering;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                if (n.layout.fixed) {
                    vec2.copy(n.layout.position, n.entity.el.position);
                } else {
                    vec2.copy(n.entity.el.position, n.layout.position);
                }
                zr.modGroup(n.entity.el.id);
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.update(zr);
            }
        }

        zr.refreshNextFrame();
    };

    GraphMain.prototype._culling = function () {
        var graph = this._graphRendering;
        if (!graph) {
            return;
        }
        var edgeLayer = this._zr.painter.getLayer(0);
        var nodeLayer = this._zr.painter.getLayer(1, edgeLayer);
        var width = this._zr.getWidth();
        var height = this._zr.getHeight();
        var min = [0, 0];
        var max = [0, 0];
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                var r = n.entity.radius + n.entity.style.lineWidth;
                min[0] = n.entity.el.position[0] - r;
                min[1] = n.entity.el.position[1] - r;
                max[0] = n.entity.el.position[0] + r;
                max[1] = n.entity.el.position[1] + r;
                nodeLayer.updateTransform();
                if (nodeLayer.transform) {
                    vec2.applyTransform(min, min, nodeLayer.transform);
                    vec2.applyTransform(max, max, nodeLayer.transform);
                }
                var ignore = min[0] > width || min[1] > height || max[0] < 0 || max[1] < 0;
                n.entity.el.ignore = ignore;
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.el.ignore = e.node1.entity.el.ignore && e.node2.entity.el.ignore;
            }
        }
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