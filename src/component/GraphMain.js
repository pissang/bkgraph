define(function (require) {

    var zrender = require('zrender');
    var ForceLayout = require('echarts/layout/Force');
    var Graph = require('echarts/data/Graph');
    var Tree = require('echarts/data/Tree');
    var TreeLayout = require('echarts/layout/Tree');
    var zrUtil = require('zrender/tool/util');
    var Group = require('zrender/Group');
    var Component = require('./Component');
    var vec2 = require('zrender/tool/vector');

    var NodeEntity = require('../entity/Node');
    var EdgeEntity = require('../entity/Edge');
    var ExtraEdgeEntity = require('../entity/ExtraEdge');
    var OutTipEntity = require('../entity/OutTip');
    var ExtraEdgeBundleEntity = require('../entity/ExtraEdgeBundle');

    var CircleShape = require('zrender/shape/Circle');

    var Cycle = require('./Cycle');

    var util = require('../util/util');
    var intersect = require('../util/intersect');

    var EPSILON = 1e-2;
    var isAroundZero = function (val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }

    var GraphMain = function () {

        Component.call(this);

        this.minRadius = 30;
        this.maxRadius = 40;

        this.minRelationWeight = 30;
        this.maxRelationWeight = 40;

        this._kgraph = null;
        
        this._zr = null;

        // Graph for rendering
        this._graph = null;

        // Graph for layouting
        this._graphLayout = null;

        this._layouting = false;

        this._animating = false;

        this._root = null;

        this._mainNode = null;

        this._lastClickNode = null;

        this._lastHoverNode = null;

        this._nodeEntityCount = 0;
        this._baseEntityCount = 0;

        this._firstShowEntityDetail = true;
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
        var zr = this._zr;

        this._min = [Infinity, Infinity];
        this._max = [zr.getWidth() / 2, zr.getHeight() / 2];
        var x0 = 0, y0 = 0, sx0 = 0, sy0 = 0;
        zr.painter.refresh = function () {
            self._culling();
            // 同步所有层的位置
            var layers = zr.painter.getLayers();
            var layer0 = layers[0];
            if (layer0) {
                var position = layer0.position;
                var scale = layer0.scale;
                position[0] = Math.max(-self._max[0] * scale[0] + zr.getWidth() - 500, position[0]);
                position[1] = Math.max(-self._max[1] * scale[1] + zr.getHeight() - 300, position[1]);
                position[0] = Math.min(-self._min[0] * scale[0] + 300, position[0]);
                position[1] = Math.min(-self._min[1] * scale[1] + 300, position[1]);

                if (
                    isNotAroundZero(position[0] - x0) || isNotAroundZero(position[1] - y0)
                    || isNotAroundZero(scale[0] - sx0) || isNotAroundZero(scale[1] - sy0)
                ) {
                    for (var z in layers) {
                        if (z !== 'hover') {
                            vec2.copy(layers[z].position, layers[0].position);
                            vec2.copy(layers[z].scale, layers[0].scale);
                            layers[z].dirty = true;   
                        }
                    }

                    self._syncOutTipEntities();
                }
                x0 = position[0];
                y0 = position[1];
                sx0 = scale[0];
                sy0 = scale[1];
            }

            zrRefresh.apply(this, arguments);
        }

        // 不显示hover层
        var layers = zr.painter.getLayers();
        for (var z in layers) {
            if (z === 'hover') {
                layers[z].dom.parentNode.removeChild(layers[z].dom);
            }
        }
    };

    GraphMain.prototype.resize = function (w, h) {

        this.el.style.width = w + 'px';
        this.el.style.height = h + 'px';

        this._zr.resize();
    };

    GraphMain.prototype.setData = function (data) {
        var graph = new Graph(true);
        this._graphLayout = graph;
        var zr = this._zr;

        var cx = this._kgraph.getWidth() / 2;
        var cy = this._kgraph.getHeight() / 2;

        // var vWidth, vHeight;
        var width = zr.getWidth();
        var height = zr.getHeight();

        // 映射数据
        var max = -Infinity;
        var min = Infinity;
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            min = Math.min(min, entity.hotValue);
            max = Math.max(max, entity.hotValue);
        }
        var diff = max - min;

        var noPosition = false;
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            var n = graph.addNode(entity.ID, entity);
            var r = diff > 0 ?
                (entity.hotValue - min) * (this.maxRadius - this.minRadius) / diff + this.minRadius
                : (this.maxRadius + this.minRadius) / 2;
            if (entity.layerCounter === 0) {
                r = 70;
                this._mainNode = n;
            }
            n.layout = {
                position: entity.position,
                mass: 1,
                size: r
            };
            if (!entity.position) {
                noPosition = true;
                if (entity.layerCounter === 0) {
                    n.layout.fixed = true;
                    n.layout.position = [
                        width / 2,
                        height / 2
                    ];
                    n.position = Array.prototype.slice.call(n.layout.position);
                }
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
                weight: w * 8 / Math.pow(e.node1.data.layerCounter + 1, 1)
                // weight: e.node1.data.layerCounter === 0 ? 200 : w
            };
        }

        // 加入补边
        this._graph = this._graphLayout.clone();
        this._graph.eachNode(function (n) {
            // 共用布局
            n.layout = this._graphLayout.getNodeById(n.id).layout;
        }, this);
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            if (!relation.isExtra) {
                continue;
            }
            var e = this._graph.addEdge(relation.fromID, relation.toID, relation);
            e.isExtra = true;
        }

        var layer0 = this._zr.painter.getLayer(0);
        var layer1 = this._zr.painter.getLayer(1, layer0);
        var layer2 = this._zr.painter.getLayer(2, layer1);
        var layer3 = this._zr.painter.getLayer(3, layer2);

        if (noPosition) {
            this.radialTreeLayout();
        } else {
            // 平移所有节点，使得中心节点能够在屏幕中心
            var offsetX = width / 2 - this._mainNode.layout.position[0];
            var offsetY = height / 2 - this._mainNode.layout.position[1];

            this._graph.eachNode(function (n) {
                n.layout.position[0] += offsetX;
                n.layout.position[1] += offsetY;
            })
        }


        this.render();
        
        var circles = this._findCircles('男友,女友,前男友,前女友,妻子,老婆,丈夫,老公,绯闻,暧昧,情敌'.split(','));
        for (var i = 0; i < circles.length; i++) {
            this.highlightCircle(circles[i]);
        }

        // 刚打开时的展开动画
        if (util.supportCanvas()) {
            this._entryAnimation();
        }
    };

    GraphMain.prototype.render = function () {
        var zr = this._zr;
        var graph = this._graph;

        if (this._root) {
            zr.delGroup(this._root);
        }
        this._root = new Group();
        zr.addGroup(this._root);

        // 补边使用bundle优化性能, IE8不使用
        if (util.supportCanvas()) {
            this._extraEdgeBundle = new ExtraEdgeBundleEntity();
            this._extraEdgeBundle.initialize(zr);
            this._root.addChild(this._extraEdgeBundle.el);
        }

        // 所有实体都在 zlevel-1 层
        graph.eachNode(function (n) {
            if (n.data.layerCounter > 2) {
                return;
            }
            this._baseEntityCount++;
            this._createNodeEntity(n);
        }, this);

        // 所有边都在 zlevel-0 层
        graph.eachEdge(function (e) {
            if (
                e.node1.data.layerCounter > 2 ||
                e.node2.data.layerCounter > 2
            ) {
                return;
            }
            this._createEdgeEntity(e);
        }, this);

        zr.render();

        zr.modLayer(0, {
            panable: true,
            zoomable: true,
            maxZoom: 1.5,
            minZoom: 0.5
        });
    };

    /**
     * 简单的摆放成放射状
     */
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

    /**
     * 放射树状布局
     */
    GraphMain.prototype.radialTreeLayout = function () {
        var cx = this._zr.getWidth() / 2;
        var cy = this._zr.getHeight() / 2;
        var tree = Tree.fromGraph(this._graphLayout)[0];
        tree.traverse(function (treeNode) {
            var graphNode = this._graphLayout.getNodeById(treeNode.id);
            treeNode.layout = {
                width: graphNode.layout.size * 2,
                height: graphNode.layout.size * 2
            };
        }, this);
        var layout = new TreeLayout();
        var layerPadding = [100, 400, 200, 200, 200, 200, 200];
        layout.layerPadding = function (level) {
            return layerPadding[level] || 200;
        };
        layout.run(tree);

        var min = [Infinity, Infinity];
        var max = [-Infinity, -Infinity];
        tree.traverse(function (treeNode) {
            vec2.min(min, min, treeNode.layout.position);
            vec2.max(max, max, treeNode.layout.position);
        });
        var width = max[0] - min[0];
        var height = max[1] - min[1];
        tree.traverse(function (treeNode) {
            var graphNode = this._graphLayout.getNodeById(treeNode.id);
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

    /**
     * 开始力导向布局
     */
    GraphMain.prototype.startForceLayout = function (cb) {
        var graph = this._graphLayout;
        var forceLayout = new ForceLayout();
        forceLayout.center = [
            this._kgraph.getWidth() / 2,
            this._kgraph.getHeight() / 2
        ];
        // forceLayout.gravity = 0.8;
        forceLayout.scaling = 12;
        forceLayout.coolDown = 0.99;
        // forceLayout.enableAcceleration = false;
        forceLayout.maxSpeedIncrease = 100;
        // 这个真是不好使
        forceLayout.preventOverlap = true;

        graph.eachNode(function (n) {
            n.layout.mass = n.degree() * 3;
        });

        // 在边上加入顶点防止重叠实体与边发生重叠
        var edgeNodes = [];
        // graph.eachEdge(function (e) {
        //     var n = graph.addNode(e.id, e);
        //     var p = vec2.create();
        //     vec2.add(p, e.node1.layout.position, e.node2.layout.position);
        //     vec2.scale(p, p, 0.5);
        //     n.layout = {
        //         position: p,
        //         mass: 0,
        //         radius: 10
        //     };
        //     edgeNodes.push(n);
        //     n.isEdgeNode = true;
        // });
        
        forceLayout.init(graph, false);
        this._layouting = true;
        var self = this;

        forceLayout.onupdate = function () {
            for (var i = 0; i < graph.nodes.length; i++) {
                if (graph.nodes[i].layout.fixed) {
                    vec2.copy(graph.nodes[i].layout.position, graph.nodes[i].position);
                }
            }
            for (var i = 0; i < edgeNodes.length; i++) {
                var n = edgeNodes[i];
                var e = n.data;
                var p = n.layout.position;
                vec2.add(p, e.node1.layout.position, e.node2.layout.position);
                vec2.scale(p, p, 0.5);
            }
            self._updateNodePositions();   

            if (forceLayout.temperature < 0.01) {
                self.stopForceLayout();
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

    /**
     * 停止力导向布局
     */
    GraphMain.prototype.stopForceLayout = function () {
        var graph = this._graphLayout;
        var edgeNodes = [];
        graph.eachNode(function (n) {
            if (n.isEdgeNode) {
                edgeNodes.push(n);
            }
        });
        for (var i = 0; i < edgeNodes.length; i++) {
            graph.removeNode(edgeNodes[i]);
        }

        this._layouting = false;
    }

    GraphMain.prototype.unhoverAll = function () {
        var zr = this._zr;
        var graph = this._graph;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity && n !== this._lastClickNode) {
                this.unhoverNode(n);
                if (n._isHighlight) {
                    n.entity.highlight(zr);
                }
            }
        }
    }

    /**
     * 低亮所有节点
     */
    GraphMain.prototype.lowlightAll = function () {
        var zr = this._zr;
        var graph = this._graph;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                this.unhoverNode(n);
                this.lowlightNode(n);
            }
            // 移除屏外提示
            if (n._outTipEntity) {
                this._root.removeChild(n._outTipEntity.el);
                n._outTipEntity = null;
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.lowlight();
            }
        }

        zr.refreshNextFrame();
    }

    /**
     * 节点移除hover特效
     */
    GraphMain.prototype.unhoverNode = function (node) {
        if (node._isHover) {
            if (util.supportCanvas()) {
                node.entity.stopActiveAnimation(this._zr);
                node.entity.animateRadius(
                    this._zr, node.layout.size, 500
                );
            } else {
                node.entity.setRadius(node.layout.size);
            }

            node.entity.lowlight();

            node._isHover = false;
        }
    }

    /**
     * 鼠标 hover 到节点上的特效
     */
    GraphMain.prototype.hoverNode = function (node) {
        if (node._isHover) {
            return;
        }

        node._isHover = true;

        // Hover 实体放大
        if (util.supportCanvas()) {
            node.entity.animateRadius(
                this._zr, node.layout.size * 1.2, 500
            );
            node.entity.startActiveAnimation(this._zr);
        } else {
            node.entity.setRadius(node.layout.size * 1.2);
        }

        node.entity.highlight();
    }

    /**
     * 低亮指定节点
     */
    GraphMain.prototype.lowlightNode = function (node) {
        if (node.entity && node._isHighlight) {
            node.entity.lowlight();
            node._isHighlight = false;
        }
    }

    /**
     * 高亮指定节点
     */
    GraphMain.prototype.highlightNode = function (node) {
        if (node.entity && !node._isHighlight) {
            node.entity.highlight();
            node._isHighlight = true;
        }
    }

    /**
     * 高亮节点与邻接节点, 点击的时候出发
     */
    GraphMain.prototype.highlightNodeAndAdjeceny = function (node) {
        if (typeof(node) === 'string') {
            node = this._graph.getNodeById(node);
        }
        var zr = this._zr;

        this.lowlightAll();

        this.hoverNode(node);
        node._isHighlight = true;

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            //中心节点不出补边
            if (node.data.layerCounter === 0 && e.isExtra) {
                continue;
            }

            var newEntity = false;
            if (!other.entity) {
                // 动态添加
                this._createNodeEntity(other);
                newEntity = true;
            }
            other.entity.highlight();

            if (!e.entity) {
                // 动态添加
                this._createEdgeEntity(e);
            }

            e.entity.highlight();
            if (newEntity && util.supportCanvas()) {
                this._growNodeAnimation(other, node, Math.random() * 500);
            }

            other._isHighlight = true;

            this._syncOutTipEntities();
        }

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    };

    /**
     * 高亮节点与主节点的关系路径
     */
    GraphMain.prototype.highlightNodeToMain = function (node) {
        if (typeof(node) === 'string') {
            node = this._graphLayout.getNodeById(node);
        }

        var graphLayout = this._graphLayout;
        var graph = this._graph;
        var zr = this._zr;
        node = graphLayout.getNodeById(node.id);

        this.lowlightAll();

        // 这里把图当做树来做了
        var current = node;
        var nodes = [current];
        while (current) {
            var n = graph.getNodeById(current.id);
            if (!n.entity) {
                this._createNodeEntity(n);
            }
            if (node === current) {
                this.hoverNode(n);
                n._isHighlight = true;
            } else {
                n.entity.highlight();
                n._isHighlight = true;   
            }

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
            var e = graph.getEdge(n1.id, n2.id);

            if (!e.entity) {
                this._createEdgeEntity(e);
            }
            e.entity.highlight();
        }

        this._syncHeaderBarExplorePercent();

        zr.refreshNextFrame();
    }

    /**
     * 
     */
    GraphMain.prototype.highlightCircle = function (cycle) {
        var len = cycle.nodes.length;
        for (var i = 0; i < len; i++) {
            var n1 = cycle.nodes[i];
            var n2 = cycle.nodes[(i + 1) % len];

            var e = this._graph.getEdge(n1, n2) || this._graph.getEdge(n2, n1);
            if (!n1.entity) {
                this._createNodeEntity(n1);
            }
            if (!n2.entity) {
                this._createNodeEntity(n2);
            }
            if (!e.entity) {
                this._createEdgeEntity(e);
            }

            this.highlightNode(n1);
            this.highlightNode(n2);
            e.entity.highlight();
        }
        this._zr.refreshNextFrame();
        this._syncHeaderBarExplorePercent();
    }

    /**
     * 在边栏中显示实体详细信息
     */
    GraphMain.prototype.showEntityDetail = function (n) {
        var graph = this._graphLayout;
        if (typeof(n) === 'string') {
            n = graph.getNodeById(n);
        }

        var sideBar = this._kgraph.getComponentByType('SIDEBAR');
        if (sideBar) {
            sideBar.setData(n.data);
            if (this._firstShowEntityDetail) {
                sideBar.show();
            }
            this._firstShowEntityDetail = false;
        }
    }

    /**
     * 在边栏中显示关系的详细信息
     */
     GraphMain.prototype.showRelationDetail = function (e) {
        var sideBar = this._kgraph.getComponentByType('SIDEBAR');
        if (sideBar) {
            var data = {};
            for (var name in e.data) {
                data[name] = e.data[name];
            }
            data.fromEntity = this._graph.getNodeById(data.fromID).data;
            data.toEntity = this._graph.getNodeById(data.toID).data;

            sideBar.setData(data, true);
            sideBar.show();
        }
    }

    /**
     * 移动视图到指定的实体位置
     */
    GraphMain.prototype.moveToEntity = function (n) {
        var graph = this._graph;
        if (typeof(n) === 'string') {
            n = graph.getNodeById(n);
        }
        var zr = this._zr;
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
        var self = this;
        self._animating = true;
        zr.animation.animate(layers[0])
            .when(800, {
                position: [x, y]
            })
            .during(function () {
                zr.refreshNextFrame();
            })
            .done(function () {
                self._animating = false;
                cb && cb();
            })
            .start('CubicInOut');
    };

    GraphMain.prototype.moveLeft = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[0] += zr.getWidth() * 0.6;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveRight = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[0] -= zr.getWidth() * 0.6;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveTop = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[1] += zr.getHeight() * 0.3;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveDown = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[1] -= zr.getHeight() * 0.3;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.uncollapse = function () {
        var zr = this._zr;
        this._graph.eachNode(function (n) {
            if (!n.entity) {
                this._createNodeEntity(n);
                n.canCollapse = true;
            }
        }, this);
        this._graph.eachEdge(function (e) {
            if (!e.entity) {
                this._createEdgeEntity(e);
                e.canCollapse = true;
            }
        }, this);

        this._syncHeaderBarExplorePercent();

        zr.refreshNextFrame();
    };

    GraphMain.prototype.collapse = function () {
        var zr = this._zr;
        this._graph.eachNode(function (n) {
            if (n.canCollapse) {
                n.entity.stopAnimationAll();
                this._root.removeChild(n.entity.el);
                n.canCollapse = false;
                n.entity = null;
                this._nodeEntityCount--;
            }
        }, this);
        this._graph.eachEdge(function (e) {
            if (e.canCollapse) {
                e.entity.stopAnimationAll();
                this._root.removeChild(e.entity.el);
                e.canCollapse = false;
                e.entity = null;

                if (util.supportCanvas()) {
                    this._extraEdgeBundle.removeEdge(e);
                }
            }
        }, this);

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    }

    GraphMain.prototype.expandNode = function (node) {
        var zr = this._zr;

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            // 不出补边
            if (e.isExtra || other.entity) {
                continue;
            }

            this._createNodeEntity(other);
            this._createEdgeEntity(e);

            if (util.supportCanvas()) {
                this._growNodeAnimation(other, node, Math.random() * 500);
            }
        }

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    }

    GraphMain.prototype.toJSON = function () {
        var graph = this._graph;
        var res = {
            viewport: {
                x: 0,
                y: 0,
                width: this._zr.getWidth(),
                height: this._zr.getHeight()
            },
            entities: [],
            relations: []
        };
        graph.eachNode(function (n) {
            n.data.position = n.layout.position;
            res.entities.push(n.data);
        });
        graph.eachEdge(function (e) {
            res.relations.push(e.data);
        });
        return res;
    };

    GraphMain.prototype.getExplorePercent = function () {
        var nodes = this._graph.nodes;
        return (this._nodeEntityCount - this._baseEntityCount) / (nodes.length - this._baseEntityCount);
    };

    GraphMain.prototype._findCircles = function (keywords) {
        function matchRelation (name) {
            for (var i = 0; i < keywords.length; i++) {
                if (name.indexOf(keywords[i]) >= 0) {
                    return true;
                }
            }
            return false;
        }

        var cycles = Cycle.findFromGraph(this._graph);
        var matchCircles = [];

        for (var j = 0; j < cycles.length; j++) {
            var cycle = cycles[j];

            // 最多三条边
            if (cycle.nodes.length > 3) {
                continue;
            }
            // var len = cycle.nodes.length;
            // for (var i = 0; i < len; i++) {
            //     var n1 = cycle.nodes[i];
            //     var n2 = cycle.nodes[(i + 1) % len];

            //     var e = this._graph.getEdge(n1, n2) || this._graph.getEdge(n2, n1);
            //     if (e && matchRelation(e.data.relationName)) {
            //         continue;
            //     }
            //     break;
            // }
            // // 环中所有边都符合关键词
            // if (i == cycle.nodes.length) {
            //     matchCircles.push(cycle);
            // }

            matchCircles.push(cycle);
            // console.log(cycle.nodes.map(function (a) {return a.data.name}));
        }

        return matchCircles;
    }

    /**
     * 刚进入时的动画效果
     */
    GraphMain.prototype._entryAnimation = function (cb) {
        var zr = this._zr;
        var self = this;
        var clipShape = new CircleShape({
            style: {
                x: zr.getWidth() / 2,
                y: zr.getHeight() / 2,
                r: 70
            }
        });
        this._root.clipShape = clipShape;
        this._root.modSelf();
        zr.refreshNextFrame();

        zr.animation.animate(clipShape.style)
            .when(3000, {
                r: 1500
            })
            .during(function () {
                self._root.modSelf();
                zr.refreshNextFrame();
            })
            .done(function () {
                self._root.clipShape = null;
                cb && cb();
            })
            .delay(500)
            .start();
    }

    /**
     * 同步节点的屏外提示
     */
    GraphMain.prototype._syncOutTipEntities = function () {
        var zr = this._zr;
        var node = this._lastClickNode;
        if (!node) {
            return;
        }
        var headerBar = this._kgraph.getComponentByType('HEADERBAR');
        var top = headerBar.el.clientHeight;
        var right = -parseInt(this.el.style.right);

        var lineRectIntersectPoint = vec2.create();
        var layer0 = this._zr.painter.getLayer(0);
        var rect = {
            x: -layer0.position[0] / layer0.scale[0],
            y: (-layer0.position[1] + top)/ layer0.scale[1],
            width: (zr.getWidth() - right) / layer0.scale[0],
            height: (zr.getHeight() - top) / layer0.scale[1]
        }

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            //中心节点不出补边
            if (node.data.layerCounter === 0 && e.isExtra) {
                continue;
            }
            if (!e.entity || !other.entity) {
                continue;
            }
            if (!other.entity.isInsideRect(rect)) {
                var side = e.entity.intersectRect(rect, lineRectIntersectPoint);
                if (side) {
                    if (!other._outTipEntity) {
                        other._outTipEntity = new OutTipEntity({
                            label: other.data.name
                        });
                        other._outTipEntity.initialize(zr);
                        this._root.addChild(other._outTipEntity.el);   
                    }
                    var p = other._outTipEntity.el.position;
                    vec2.copy(p, lineRectIntersectPoint);
                    switch (side) {
                        case 'top':
                            break;
                        case 'left':
                            p[0] += 25;
                            break;
                        case 'bottom':
                            p[1] -= 25;
                            break;
                        case 'right':
                            p[0] -= 25;
                            break;
                    }
                    other._outTipEntity.el.modSelf();
                }
            } else if (other._outTipEntity) {
                this._root.removeChild(other._outTipEntity.el);
                other._outTipEntity = null;
            }
        }
    }

    GraphMain.prototype._growNodeAnimation = function (toNode, fromNode, delay) {
        var zr = this._zr;
        var e = this._graph.getEdge(fromNode.id, toNode.id);
        var self = this;

        var radius = toNode.entity.radius;
        toNode.entity.setRadius(1);
        this._animating = true;
        zr.refreshNextFrame();
        e.entity.animateLength(zr, 300, Math.random() * 300, fromNode.entity, function () {
            toNode.entity.animateRadius(zr, radius, 500, function () {
                self._animating = false;
            })
        });
    };

    GraphMain.prototype._createNodeEntity = function (node) {
        var nodeEntity = new NodeEntity({
            radius: node.layout.size,
            label: node.data.name,
            image: node.data.image
        });
        nodeEntity.initialize(this._zr);

        vec2.min(this._min, this._min, node.layout.position);
        vec2.max(this._max, this._max, node.layout.position);
        
        vec2.copy(nodeEntity.el.position, node.layout.position);
        var self = this;
        nodeEntity.bind('mouseover', function () {
            if (self._animating) {
                return;
            }
            if (self._lastHoverNode !== node) {
                self.hoverNode(node);
                self.expandNode(node);
            }
            self._lastHoverNode = node;
        });
        nodeEntity.bind('mouseout', function () {
            if (node !== self._lastClickNode) {
                self.unhoverNode(node);
                //  回复到高亮状态
                if (node._isHighlight) {
                    node.entity.highlight(self._zr);
                }
            }
            self._lastHoverNode = null;
        })

        nodeEntity.bind('click', function () {
            self.showEntityDetail(node);
            if (self._lastClickNode !== node) {
                self._lastClickNode = node;
                self._syncOutTipEntities();
                self.highlightNodeAndAdjeceny(node);
            }
        })

        node.entity = nodeEntity;
        this._root.addChild(nodeEntity.el);

        this._nodeEntityCount++;
        return nodeEntity;
    };

    GraphMain.prototype._createEdgeEntity = function (e) {
        var edgeEntity;
        var zr = this._zr;
        if (e.node1.entity && e.node2.entity) {
            if (e.isExtra) {
                edgeEntity = new ExtraEdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
                if (util.supportCanvas()) {
                    this._extraEdgeBundle.addEdge(e);
                }
            } else {
                edgeEntity = new EdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
            }
            edgeEntity.initialize(this._zr);

            edgeEntity.bind('click', function () {
                this.showRelationDetail(e);
            }, this);
            edgeEntity.bind('mouseover', function () {
                if (util.supportCanvas()) {
                    edgeEntity.animateTextPadding(zr, 300, 12);
                }
                edgeEntity.highlightLabel();
            });
            edgeEntity.bind('mouseout', function () {
                if (util.supportCanvas()) {
                    edgeEntity.animateTextPadding(zr, 300, 5);
                }
                edgeEntity.lowlightLabel();
            });

            e.entity = edgeEntity;

            this._root.addChild(edgeEntity.el);

            return edgeEntity;
        }
    };

    GraphMain.prototype._updateNodePositions = function () {
        var zr = this._zr;
        // PENDING
        var graph = this._graph;
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

    GraphMain.prototype._syncHeaderBarExplorePercent = function () {
        var headerBarComponent = this._kgraph.getComponentByType('HEADERBAR');
        if (headerBarComponent) {
            headerBarComponent.setExplorePercent(this.getExplorePercent());
        }
    }

    GraphMain.prototype._culling = function () {
        var graph = this._graph;
        var zr = this._zr;
        if (!graph) {
            return;
        }
        var right = -parseInt(this.el.style.right);

        var nodeLayer = zr.painter.getLayer(1);
        var width = zr.getWidth();
        var height = zr.getHeight();
        var min = [0, 0];
        var max = [0, 0];
        nodeLayer.updateTransform();

        var layer0 = this._zr.painter.getLayer(0);
        var rect = {
            x: -layer0.position[0] / layer0.scale[0],
            y: -layer0.position[1] / layer0.scale[1],
            width: (zr.getWidth() - right) / layer0.scale[0],
            height: zr.getHeight() / layer0.scale[1]
        }

        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                n.entity.el.ignore = !n.entity.isInsideRect(rect);
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.el.ignore = e.entity.hidden || !e.entity.isInsideRect(rect);
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