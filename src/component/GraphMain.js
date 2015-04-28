define(function (require) {

    var zrender = require('zrender');
    var Graph = require('../core/Graph');
    var Component = require('./Component');
    var zrUtil = require('zrender/core/util');
    var vec2 = require('zrender/core/vector');
    var Group = require('zrender/graphic/Group');

    var NodeEntity = require('../entity/Node');
    var CurveEdgeEntity = require('../entity/CurveEdge');
    var OutTipEntity = require('../entity/OutTip');
    var ExtraEdgeBundleEntity = require('../entity/ExtraEdgeBundle');

    var bkgLog = require('../util/log');
    var util = require('../util/util');
    var intersect = require('../util/intersect');
    var jsonp = require('../util/jsonp');
    var cookies = require('../util/cookies');

    var config = require('../config');

    var arraySlice = Array.prototype.slice;

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

        this.draggable = false;

        this.enableEntryAnimation = true;

        this._kgraph = null;
        
        this._zr = null;

        // Graph for rendering
        // 包含补边
        this._graph = null;

        this._layouting = false;

        this._animating = false;

        this._root = null;

        this._graphRoot = null;

        // 中心节点
        this._mainNode = null;

        this._lastHoverNode = null;

        this._lastHoverEdge = null;

        this._currentActiveNode = null;

        // 图中所有的节点数
        this._nodeEntityCount = 0;
        // 第一次展现的节点数，用于计算用户探索的百分比
        this._baseEntityCount = 0;

        // 默认展开层数
        this._defaultLayerCount = 1;

        // 是否是第一帧渲染
        this._isFirstFrame = true;
    };

    GraphMain.prototype = {

        constructor: GraphMain,

        type: 'GRAPH',

        initialize: function (kg) {
            this._kgraph = kg;

            var el = this.el;
            var elStyle = el.style;
            el.className = 'bkg-graph';

            elStyle.width = kg.getWidth() + 'px';
            elStyle.height = kg.getHeight() + 'px';

            this._initZR();

            var self = this;
            util.addEventListener(el, 'mousedown', function () {
                self._mouseDown = true;
                self.hideTip();
            });
            util.addEventListener(el, 'mouseup', function () {
                self._mouseDown = false;
            });
        },

        refresh: function () {
            this._zr.refreshNextFrame();
        },

        getGraph: function () {
            return this._graph;
        },

        getGraphRoot: function () {
            return this._graphRoot;
        },

        getZR: function () {
            return this._zr;
        },

        getMainNode: function () {
            return this._graph.getNodeById(this._mainNode.id);
        },

        _initZR: function () {
            $zrContainer = document.createElement('div');
            $zrContainer.className = 'bkg-graph-zr';

            this.el.appendChild($zrContainer);

            this._zr = zrender.init($zrContainer);
            var zr = this._zr;

            var zrRefresh = zr.painter.refresh;
            var self = this;

            this._min = [Infinity, Infinity];
            this._max = [zr.getWidth() / 2, zr.getHeight() / 2];
            var x0 = 0, y0 = 0, sx0 = 0, sy0 = 0;

            zr.painter.refresh = function () {
                self._culling();
                
                zrRefresh.apply(this, arguments);
            }
        },

        resize: function (w, h) {

            var elStyle = this.el.style;
            elStyle.width = w + 'px';
            elStyle.height = h + 'px';

            this._zr.resize();

            this._syncOutTipEntities();
        },

        setData: function (data) {
            var graph = new Graph(true);
            this._graph = graph;
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
                var n = graph.addNode(entity.id, entity);
                var r = diff > 0 ?
                    (entity.hotValue - min) * (this.maxRadius - this.minRadius) / diff + this.minRadius
                    : (this.maxRadius + this.minRadius) / 2;
                if (entity.layerCounter === 0) {
                    r = 70;
                    this._mainNode = n;
                }
                n.layout = {
                    position: entity.position,
                    size: r
                };
            }

            for (var i = 0; i < data.relations.length; i++) {
                var relation = data.relations[i];
                var e = graph.addEdge(relation.fromID, relation.toID, relation);
                e.isExtra = relation.isExtra;
            }

            // 平移所有节点，使得中心节点能够在屏幕中心
            var offsetX = width / 2 - this._mainNode.layout.position[0];
            var offsetY = height / 2 - this._mainNode.layout.position[1];

            this._graph.eachNode(function (n) {
                n.layout.position[0] += offsetX;
                n.layout.position[1] += offsetY;
            });

            this.render();

            this._loadStorage();

            // 发送首屏展现日志
            var title = [];
            this._graph.eachNode(function (node) {
                if (node.entity) {
                    title.push(node.id, node.data.layerCounter);
                }
            });

            var nodeNum = 200; // 每条日志中传的最大节点个数
            var sendLogTimes = Math.ceil(title.length / nodeNum); // 发送次数
            var logParam = [];
            var params = util.getURLSearch();
            for (var times = 0; times < sendLogTimes; times++) {
                logParam = [];
                var len = (times + 1) * nodeNum > title.length ? title.length : (times + 1) * nodeNum;
                for (var j = times * nodeNum; j < len; j++) {
                    logParam.push(title[j]);
                }

                bkgLog({
                    type: 'zhishitupuse',
                    target: logParam.join(','),
                    page: sendLogTimes + '-' + (times + 1),
                    extend: (params['srcid'] ? params['srcid'] : '')
                });
            }
        },

        render: function () {
            var zr = this._zr;
            var graph = this._graph;

            if (this._root) {
                zr.removeElement(this._root);
            }
            this._root = new Group();
            this._graphRoot = new Group();

            this._root.addElement(this._graphRoot);

            zr.addElement(this._root);

            // 补边使用bundle优化性能
            if (config.supportCanvas) {
                this._extraEdgeBundle = new ExtraEdgeBundleEntity();
                this._extraEdgeBundle.initialize(zr);
                this._graphRoot.addElement(this._extraEdgeBundle.el);
            }

            graph.eachEdge(function (e) {
                if (
                    e.node1.data.layerCounter <= this._defaultLayerCount &&
                    e.node2.data.layerCounter <= this._defaultLayerCount
                ) {
                    if (!e.isExtra) {
                        if (!e.node1.entity) {
                            this._baseEntityCount++;
                            this._createNodeEntity(e.node1);
                        }
                        if (!e.node2.entity) {
                            this._baseEntityCount++;
                            this._createNodeEntity(e.node2)
                        }
                    }
                    this._createEdgeEntity(e);
                }
            }, this);
        },

        /**
         * 低亮所有节点
         */
        unactiveAll: function () {
            var zr = this._zr;
            var graph = this._graph;
            for (var i = 0; i < graph.nodes.length; i++) {
                var n = graph.nodes[i];
                if (n.entity) {
                    n.entity.setState('normal');
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
                    e.entity.setState('normal');
                    if (e.isExtra) {
                        e.entity.hidden = true;
                    }
                }
            }

            this._currentActiveNode = null;
        },

        /**
         * 节点移除hover特效
         */
        unhoverNode: function () {
            var node = this._lastHoverNode;
            if (node && node.entity) {
                if (node.entity.getState() !== 'active') {
                    node.entity.setState('normal');
                }
                this._lastHoverNode = null;
            }
        },

        /**
         * 鼠标 hover 到节点上的特效
         */
        hoverNode: function (node) {
            this.unhoverEdge();

            this.unhoverNode();

            if (node.entity) {
                node.entity.setState('hover');

                this._lastHoverNode = node;
            }
        },

        /**
         * 边移除hover特效
         */
        unhoverEdge: function () {
            var edge = this._lastHoverEdge;
            if (edge && edge.entity) {
                if (edge.entity.getState() !== 'active') {
                    edge.entity.setState('normal');
                }
                this._lastHoverEdge = null;
            }
        },

        /**
         * 鼠标 hover 到边上的特效
         */
        hoverEdge: function (edge) {
            this.unhoverNode();

            this.unhoverEdge();

            if (edge.entity) {
                edge.entity.setState('hover');

                this._lastHoverEdge = edge;
            }
        },

        activeEdge: function (edge) {
            if (typeof(edge) === 'string') {
                edge = this._getEdgeByID(edge);
            }

            if (edge && edge.entity) {
                this.unactiveAll();
                edge.entity.setState('active');

                if (edge.isExtra) {
                    edge.entity.hidden = false;
                }

            }
        },

        activeNode: function (node) {
            if (typeof(node) === 'string') {
                node = this._graph.getNodeById(node);
            }
            var zr = this._zr;

            if (node && node.entity) {
                this.unactiveAll();

                node.entity.setState('active');

                this._currentActiveNode = node;
            }
        },

        /**
         * 高亮节点+显示邻接节点, 点击触发
         */
        activeNodeAndShowAdjacency: function (node) {
            if (typeof(node) === 'string') {
                node = this._graph.getNodeById(node);
            }
            var zr = this._zr;

            if (! node || ! node.entity) {
                return;
            }

            this.unactiveAll();

            node.entity.setState('active');

            this._currentActiveNode = node;

            for (var i = 0; i < node.edges.length; i++) {
                var e = node.edges[i];
                var other = e.node1 === node ? e.node2 : e.node1;

                //中心节点不出补边
                if (node.data.layerCounter === 0 && e.isExtra) {
                    continue;
                }

                var newNodeEntity = false;
                var newEdgeEntity = false;
                if (!other.entity) {
                    // 动态添加
                    this._createNodeEntity(other);
                    newNodeEntity = true;
                }

                if (!e.entity) {
                    // 动态添加
                    this._createEdgeEntity(e);
                    newEdgeEntity = true;
                }

                if (e.isExtra) {
                    e.entity.hidden = false;
                }

                if (newNodeEntity) {
                    this._growNodeAnimation(other, node, Math.random() * 500);
                }
                else if (newEdgeEntity) {
                    e.entity.animateLength(zr, 300, 0, node.entity);
                }

                this._syncOutTipEntities();
            }

            this._syncHeaderBarExplorePercent();
        },

        /**
         * 在边栏中显示实体详细信息
         */
        showEntityDetail: function (n, showSidebar) {
            var self = this;
            var graph = this._graphLayout;
            if (typeof(n) === 'string') {
                n = graph.getNodeById(n);
            }

            var sideBar = this._kgraph.getComponentByType('SIDEBAR');
            if (sideBar) {
                sideBar.hide();

                setTimeout(function () {
                    var detailData = self._loadDetailFromStorage(n.id);
                    var layerCounter = n.data ? n.data.layerCounter : n.layerCounter;
                    if (detailData) {
                        sideBar.setData(detailData);

                        showSidebar && sideBar.show(n.id + ',' + layerCounter);
                    }
                    else {
                        jsonp(self._kgraph.getDetailAPI(), { detail_id: n.id }, 'callback', function (data) {
                            data._datatype = 'entity'; // for ubs log
                            data.layerCounter = n.data ? n.data.layerCounter : n.layerCounter;
                            sideBar.setData(data);

                            showSidebar && sideBar.show(n.id + ',' + layerCounter);

                            self._saveDetailToStorage(n.id, data);
                        });
                    }
                }, 300);
            }
        },

        /**
         * 在边栏中显示关系的详细信息
         */
         showRelationDetail: function (e) {
            if (typeof(e) === 'string') {
                e = this._getEdgeByID(e);
            }
            if (!e) {
                return;
            }
            var sideBar = this._kgraph.getComponentByType('SIDEBAR');
            if (sideBar) {
                sideBar.hide();
                // var data = {};
                // for (var name in e.data) {
                //     data[name] = e.data[name];
                // }
                var self = this;

                setTimeout(function () {
                    var detailData = self._loadDetailFromStorage(e.data.id);
                    var logParam = [
                            // from entity
                            e.node1.id,
                            e.node1.data.layerCounter,
                            // to entity
                            e.node2.id,
                            e.node2.data.layerCounter,
                            e.data.id,
                            e.isExtra ? 1 : 0,
                            e.isSpecial ? 1 : 0
                        ].join(',');
                    if (detailData) {
                        sideBar.setData(detailData, true);
                        sideBar.show(logParam);
                    }
                    else {
                        jsonp(self._kgraph.getDetailAPI(), { detail_id: e.data.id }, 'callback', function (data) {

                            data.fromEntity = self._graph.getNodeById(data.fromID).data;
                            data.toEntity = self._graph.getNodeById(data.toID).data;
                            data._datatype = 'relation'; // for ubs log

                            sideBar.setData(data, true);
                            sideBar.show(logParam);

                            self._saveDetailToStorage(e.data.id, data);
                        });
                    }
                }, 300);
            }
        },

        hideSidebar: function () {
            var sideBar = this._kgraph.getComponentByType('SIDEBAR');
            if (sideBar) {
                sideBar.hide();
            }
        },

        showNodeEndTip: function (n) {
            if (typeof(n) === 'string') {
                n = graph.getNodeById(n);
            }

            var tip = this._kgraph.getComponentByType('TIP');
            tip.setData(config.tip.nodeEnd, n);
        },

        showNodeHoverTip: function (n) {
            if (typeof(n) === 'string') {
                n = graph.getNodeById(n);
            }

            var isClicked = cookies.get('BKGraph_node_click_0') || 0;

            if (!isClicked) {
                var tip = this._kgraph.getComponentByType('TIP');
                tip.setData(config.tip.node, n);
            }
        },

        showEdgeClickTip: function (e, isOther) {
            if (typeof(e) === 'string') {
                e = this._getEdgeByID(e);
            }
            if (!e) {
                return;
            }

            var isClicked = cookies.get('BKGraph_edge_click_0') || 0;
            if (!isClicked) {
                this.activeEdge(e);

                var tip = this._kgraph.getComponentByType('TIP');
                var tipData = isOther ? config.tip.edgeOther : config.tip.edge;
                tip.setData(tipData, e, true);
            }
        },

        hideTip: function () {
            var tip = this._kgraph.getComponentByType('TIP');
            tip && tip.hide();
        },

        /**
         * 移动视图到指定的实体位置
         */
        moveToEntity: function (n, cb) {
            var graph = this._graph;
            if (typeof(n) === 'string') {
                n = graph.getNodeById(n);
            }
            var zr = this._zr;
            if (!n) {
                return;
            }
            var entity = n.entity;
            var graphRoot = zr._graphRoot;
            var pos = arraySlice.call(entity.el.position);
            vec2.mul(pos, pos, graphRoot.scale);
            vec2.sub(pos, [zr.getWidth() / 2, zr.getHeight() / 2], pos);

            this.moveTo(pos[0], pos[1], cb);
        },

        moveToRelation: function (e, cb) {
            if (typeof(e) === 'string') {
                e = this._getEdgeByID(e);
            }

            if (!e) {
                return;
            }
            var zr = this._zr;
            var pos1 = e.node1.entity.el.position;
            var pos2 = e.node2.entity.el.position;

            var pos = vec2.add([], pos1, pos2);
            pos[0] /= 2;
            pos[1] /= 2;

            var graphRoot = zr._graphRoot;
            vec2.mul(pos, pos, graphRoot.scale);
            vec2.sub(pos, [zr.getWidth() / 2, zr.getHeight() / 2], pos);

            this.moveTo(pos[0], pos[1], cb);
        },

        /**
         * 移动视图到指定的位置
         */
        moveTo: function (x, y, cb) {
            var zr = this._zr;

            if (config.supportCanvas) {
                var self = this;
                self._animating = true;
                this._graphRoot.animate()
                    .when(800, {
                        position: [x, y]
                    })
                    .done(function () {
                        self._animating = false;
                        cb && cb();
                    })
                    .start('CubicInOut');   
            } else {
                var pos = this._graphRoot.position;
                pos[0] = x;
                pos[1] = y;
                zr.refreshNextFrame();
                cb && cb();
            }

            this.hideTip();
        },

        moveLeft: function (cb) {
            var zr = this._zr;
            var newPos = arraySlice.call(this._graphRoot.position);
            newPos[0] += zr.getWidth() * 0.6;

            this.moveTo(newPos[0], newPos[1], cb);
        },

        moveRight: function (cb) {
            var zr = this._zr;
            var newPos = arraySlice.call(this._graphRoot.position);
            newPos[0] -= zr.getWidth() * 0.6;

            this.moveTo(newPos[0], newPos[1], cb);
        },

        moveTop: function (cb) {
            var zr = this._zr;
            var newPos = arraySlice.call(this._graphRoot.position);
            newPos[1] += zr.getHeight() * 0.6;

            this.moveTo(newPos[0], newPos[1], cb);
        },

        moveDown: function (cb) {
            var zr = this._zr;
            var newPos = arraySlice.call(this._graphRoot.position);
            newPos[1] -= zr.getHeight() * 0.6;

            this.moveTo(newPos[0], newPos[1], cb);
        },

        zoomIn: function () {
            var zr = this._zr;
            layer.__zoom = layer.__zoom || 1;
            this.zoomTo(layer.__zoom * 1.3);
        },

        zoomOut: function () {
            var zr = this._zr;
            var layer = zr.painter.getLayer(0);
            layer.__zoom = layer.__zoom || 1;
            this.zoomTo(layer.__zoom / 1.3);
        },

        zoomTo: function (zoom, cb) {
            var zr = this._zr;
            var cx = zr.getWidth() / 2;
            var cy = zr.getHeight() / 2;
            var layer = zr.painter.getLayer(0);
            layer.__zoom = layer.__zoom || 1;
            zoom = Math.min(Math.max(zoom, 0.5), 1.5);

            var zoomScale = zoom / layer.__zoom;

            var newScale = arraySlice.call(layer.scale);
            var newPos = arraySlice.call(layer.position);
            newPos[0] -= (cx - newPos[0]) * (zoomScale - 1);
            newPos[1] -= (cy - newPos[1]) * (zoomScale - 1);
            newScale[0] *= zoomScale;
            newScale[1] *= zoomScale;

            zr.animation.clear();
            zr.animation.animate(layer)
                .when(800, {
                    position: newPos,
                    scale: newScale,
                    __zoom: zoom
                })
                .during(function() {
                    layer.dirty = true;
                    zr.refreshNextFrame();
                })
                .done(function() {
                    cb && cb();
                })
                .start('CubicInOut');

            this.hideTip();
        },

        uncollapse: function () {
            var graph = this._graph;
            graph.eachNode(function (n) {
                if (!n.entity) {
                    this._createNodeEntity(n);
                    n.canCollapse = true;
                }
            }, this);
            graph.eachEdge(function (e) {
                if (!e.entity) {
                    this._createEdgeEntity(e);
                    e.canCollapse = true;
                }
            }, this);

            this._syncHeaderBarExplorePercent();
        },

        collapse: function () {
            var graph = this._graph;
            graph.eachNode(function (n) {
                if (n.canCollapse) {
                    n.entity.stopAnimationAll();
                    this._root.removeChild(n.entity.el);
                    n.canCollapse = false;
                    n.entity = null;
                    this._nodeEntityCount--;
                }
            }, this);
            graph.eachEdge(function (e) {
                if (e.canCollapse) {
                    e.entity.stopAnimationAll();
                    this._root.removeChild(e.entity.el);
                    e.canCollapse = false;
                    e.entity = null;
                    if (config.supportCanvas) {
                        this._extraEdgeBundle.removeEdge(e);
                    }
                }
            }, this);

            this._syncHeaderBarExplorePercent();
        },

        /**
         * hover节点的时候展开未展开的节点
         */
        expandNode: function (node) {
            var logTitle = [];
            for (var i = 0; i < node.edges.length; i++) {
                var e = node.edges[i];
                var other = e.node1 === node ? e.node2 : e.node1;

                // 不出补边
                if (e.isExtra) {
                    continue;
                }
                var newNodeEntity = false;
                if (!other.entity) {
                    newNodeEntity = true;
                    this._createNodeEntity(other);

                    logTitle.push(other.id, other.data.layerCounter);

                    for (var j = 0, inEdgesLen = other.inEdges.length; j < inEdgesLen; j++) {
                        var inEdge = other.inEdges[j];
                        if (inEdge.node1 === node) {
                            logTitle.push(inEdge.data.id);
                        }
                    }
                }
                if (!e.entity) {
                    this._createEdgeEntity(e);
                }
                // 在节点是新展开的情况下才显示展开动画
                // 有可能节点在其它节点展开的时候已经绘制，但是边没补上
                if (newNodeEntity) {
                    this._growNodeAnimation(other, node, Math.random() * 500);
                }
            }

            var expandedSum = [];
            this._graph.eachNode(function (n, index) {
                var layerCounter = n.data.layerCounter;
                if (expandedSum[layerCounter]) {
                    expandedSum[layerCounter] ++;
                }
                else {
                    expandedSum[layerCounter] = 1;
                }
            });

            if (logTitle.length) {
                bkgLog({
                    type: 'zhishitupuexpand',
                    target: logTitle.join(','),
                    area: 'entity',
                    extend: expandedSum.join(',')
                });
            }

            this._syncHeaderBarExplorePercent();

            // if (node.outEdges || node.outEdges.length == 0) {
            //     this.showNodeEndTip(node);
            // }
        },

        /**
         * 计算返回当前用户探索百分比
         */
        getExplorePercent: function () {
            var nodes = this._graph.nodes;
            return (this._nodeEntityCount - this._baseEntityCount) / (nodes.length - this._baseEntityCount);
        },

        _getEdgeByID: function (e) {
            var graph = this._graph;
            for (var i = 0; i < graph.edges.length; i++) {
                if (graph.edges[i].data.id === e) {
                    e = graph.edges[i];
                    return e;
                }
            }
        },

        // 保存已展开的节点到localStorage
        _loadStorage: function () {
            if (!window.localStorage) {
                return;
            }
            var id = this._mainNode.id;
            var graph = this._graph;

            var bkg = localStorage['BKGraph_expanded'];
            if (!bkg) {
                return;
            }
            bkg = JSON.parse(bkg);
            if (bkg[id]) {
                var obj = bkg[id];
                for (var i = 0; i < obj.entities.length; i++) {
                    var node = graph.getNodeById(obj.entities[i]);
                    if (node && !node.entity) {
                        this._createNodeEntity(node);
                    }
                }
                for (var i = 0; i < obj.relations.length; i++) {
                    var relation = obj.relations[i].split(',');
                    var edge = graph.getEdge(relation[0], relation[1]);
                    if (edge && !edge.entity) {
                        this._createEdgeEntity(edge);
                    }
                }
            }

            this._syncHeaderBarExplorePercent();
        },

        // 保存已展开的节点到localStorage
        _saveStorage: function () {
            if (!window.localStorage) {
                return;
            }
            var id = this._mainNode.id;
            var entities = [];
            var relations = [];
            var graph = this._graph;
            graph.eachNode(function (n) {
                if (n.entity) {
                    entities.push(n.id);
                }
            });
            graph.eachEdge(function (e) {
                if (e.entity) {
                    relations.push(e.node1.id + ',' + e.node2.id);
                }
            });
            var bkg = localStorage['BKGraph_expanded'];
            if (!bkg) {
                bkg = {};
            } else {
                bkg = JSON.parse(bkg);
            }
            bkg[id] = {
                entities: entities,
                relations: relations
            };

            localStorage['BKGraph_expanded'] = JSON.stringify(bkg);
        },

        // 从sessionStorage获取浮层数据
        _loadDetailFromStorage: function (key) {
            if (!window.sessionStorage) {
                return;
            }

            var detailData = sessionStorage['BKGraph_detail_data'];
            var result = null;
            if (!detailData) {
                return;
            }
            detailData = JSON.parse(detailData);
            if (detailData[key]) {
                result = detailData[key];
            }

            return result;
        },

        // 保存浮层数据到sessionStorage
        _saveDetailToStorage: function (key, val) {
            if (!window.sessionStorage) {
                return;
            }

            var detailData = sessionStorage['BKGraph_detail_data'];
            if (!detailData) {
                detailData = {};
            }
            else {
                detailData = JSON.parse(detailData);
            }
            detailData[key] = val;

            try {
                sessionStorage['BKGraph_detail_data'] = JSON.stringify(detailData);
            } catch (oException) {
                if(oException.name == 'QuotaExceededError'){
                    sessionStorage.removeItem('BKGraph_detail_data');
                }
            }
        },

        /**
         * 同步节点的屏外提示
         */
        _syncOutTipEntities: function () {
            var zr = this._zr;
            var node = this._currentActiveNode;
            if (!node) {
                return;
            }
            var headerBar = this._kgraph.getComponentByType('HEADERBAR');
            var searchBar = this._kgraph.getComponentByType('SEARCHBAR');
            var top = 0;
            var bottom = 0;
            if (headerBar) {
                top = headerBar.el.clientHeight;
            }
            if (searchBar) {
                var bottom = parseInt(util.getStyle(searchBar.el, 'bottom'));
                bottom += searchBar.el.clientHeight;
            }
            var left = -parseInt(util.getStyle(this.el, 'left'));

            var layer0 = this._graphRoot;
            var rect = {
                x: (-layer0.position[0] + left) / layer0.scale[0],
                y: (-layer0.position[1] + top)/ layer0.scale[1],
                width: (zr.getWidth() - 2 * left) / layer0.scale[0],
                height: (zr.getHeight() - top - bottom) / layer0.scale[1]
            };

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
                    // 找出边与屏幕边缘的所有相交点，然后取于other最近的相交点
                    var points = e.entity.intersectRect(rect);
                    var min = Infinity;
                    var point;
                    var side;
                    for (var k = 0; k < points.length; k++) {
                        var dist = vec2.dist(points[k].point, other.entity.el.position)
                        if (dist < min) {
                            dist = min;
                            point = points[k].point;
                            side = points[k].side;
                        }
                    }
                    if (side) {
                        if (!other._outTipEntity) {
                            other._outTipEntity = new OutTipEntity({
                                label: other.data.name
                            });
                            other._outTipEntity.initialize(zr);
                            this._root.addElement(other._outTipEntity.el);   
                        }
                        var p = other._outTipEntity.el.position;
                        vec2.copy(p, point);
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
                        other._outTipEntity.el.dirty();
                    } else if (other._outTipEntity) {
                        // 边与屏幕边缘没有交点
                        this._root.removeChild(other._outTipEntity.el);
                        other._outTipEntity = null;
                    }
                } else if (other._outTipEntity) {
                    this._root.removeChild(other._outTipEntity.el);
                    other._outTipEntity = null;
                }
            }
        },

        _growNodeAnimation: function (toNode, fromNode, delay) {
            var zr = this._zr;
            var e = this._graph.getEdge(fromNode.id, toNode.id) || this._graph.getEdge(toNode.id, fromNode.id);
            var self = this;

            var radius = toNode.entity.radius;
            toNode.entity.setRadius(1);
            this._animating = true;
            e.entity.animateLength(zr, 300, 0, fromNode.entity, function () {
                toNode.entity.animateRadius(radius, 500, function () {
                    self._animating = false;
                    // 方便计算边的顶点
                    fromNode.entity.radius = fromNode.layout.size;
                    toNode.entity.radius = toNode.layout.size;
                    e.entity.update();
                })
            });
        },

        _createNodeEntity: function (node) {
            var zr = this._zr;
            var nodeEntity = new NodeEntity({
                radius: node.layout.size,
                label: node.data.name,
                image: node.data.image,
                draggable: this.draggable,
                states: node === this.getMainNode() ? config.mainNodeStates : config.nodeStates
            });
            nodeEntity.initialize(this._zr);

            vec2.copy(nodeEntity.el.position, node.layout.position);
            var self = this;
            nodeEntity.on('mouseover', function () {
                if (self._animating) {
                    return;
                }
                if (self._lastHoverNode !== node) {

                    self.trigger('mouseover:entity', node.data);

                    self.expandNode(node);

                    self.showNodeHoverTip(node);

                    self.hoverNode(node);

                    bkgLog({
                        type: 'zhishitupuhover',
                        target: [node.id, node.data.layerCounter].join(','),
                        area: 'entity'
                    });
                }
            });
            nodeEntity.on('mouseout', function () {
                self.unhoverNode();
            });
            nodeEntity.on('click', function () {
                self.trigger('click:entity', node);

                self.hideTip();
                var isClicked = cookies.get('BKGraph_node_click_0') || 0;

                if (!isClicked) {
                    cookies.set('BKGraph_node_click_0', node.id, {
                        // 10 years
                        expires: 360 * 24 * 3600 * 10
                    });
                }

                bkgLog({
                    type: 'zhishitupuclick',
                    target: node.id + ',' + node.data.layerCounter,
                    area: 'entity'
                });

                if (nodeEntity.getState() !== 'active') {
                    self._syncOutTipEntities();
                    self.activeNodeAndShowAdjacency(node);
                }
                else {
                    self._currentActiveNode = null;
                    self.unactiveAll();
                    self.hideSidebar();
                    return;
                }

                self.showEntityDetail(node, true);
            });

            node.entity = nodeEntity;
            this._graphRoot.addElement(nodeEntity.el);

            this._nodeEntityCount++;
            return nodeEntity;
        },

        _createEdgeEntity: function (e) {
            var self = this;
            var zr = this._zr;
            if (e.node1.entity && e.node2.entity) {
                var edgeEntity = new CurveEdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName,
                    layerCounter: Math.max(e.node1.data.layerCounter, e.node2.data.layerCounter),
                    isExtra: e.isExtra,
                    states: e.isExtra ? config.extraEdgeStates : config.edgeStates
                });
                if (e.isExtra) {
                    if (config.supportCanvas) {
                        this._extraEdgeBundle.addEdge(e);
                    }
                    edgeEntity.hidden = true;
                }

                edgeEntity.initialize(this._zr);

                edgeEntity.on('click', function () {
                    self.trigger('click:relation', e);

                    bkgLog({
                        type: 'zhishitupuclick',
                        target: [
                                    // from entity
                                    e.node1.id,
                                    e.node1.data.layerCounter,
                                    // to entity
                                    e.node2.id,
                                    e.node2.data.layerCounter,
                                    e.data.id,
                                    e.isExtra ? 1 : 0,
                                    e.isSpecial ? 1 : 0
                                ].join(','),
                        area: 'relation'
                    });

                    if (edgeEntity.getState() != 'active') {
                        this.activeEdge(e);

                        var isClicked = cookies.get('BKGraph_edge_click_0') || 0;
                        if (!isClicked) {
                            self.hideTip();
                            cookies.set('BKGraph_edge_click_0', e.data.id, {
                                // 10 years
                                expires: 360 * 24 * 3600 * 10
                            });
                        }
                    }
                    else {
                        self.unactiveAll();
                        self.hideSidebar();
                        return;
                    }

                    this.showRelationDetail(e);

                }, this);
                edgeEntity.on('mouseover', function () {

                    if (self._lastHoverEdge !== e) {
                        self.trigger('mouseover:relation', e.data);

                        self.hoverEdge(e);
                    }

                });
                edgeEntity.on('mouseout', function () {
                    self.unhoverEdge();
                });

                e.entity = edgeEntity;

                this._graphRoot.addElement(edgeEntity.el);

                return edgeEntity;
            }
        },

        _updateNodePositions: function () {
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

            if (config.supportCanvas) {
                this._extraEdgeBundle.update(zr);
            }

            zr.refreshNextFrame();
        },

        _syncHeaderBarExplorePercent: function () {
            if (!config.isPlat) {
                this._saveStorage();
            }
        },

        _culling: function () {
            var graph = this._graph;
            var zr = this._zr;
            if (!graph) {
                return;
            }

            var width = zr.getWidth();
            var height = zr.getHeight();

            var panControl = this._kgraph.getComponentByType('PANCONTROL');
            var offset = panControl ? panControl.getOffset() : {x: 0, y: 0};

            var rect = {
                x: -offset.x,
                y: -offset.y,
                width: width,
                height: height
            }

            var imageLoadingCount = 0;
            var imageLoadedCount = 0;

            for (var i = 0; i < graph.nodes.length; i++) {
                var n = graph.nodes[i];
                if (n.entity) {
                    var ignore = n.entity.hidden || !n.entity.isInsideRect(rect);
                    if (config.supportCanvas) {
                        n.entity.el.ignore = ignore;
                    }
                    if (! ignore) {
                        // 需要统计第一帧中所有图片加载完成的时间
                        if (this._isFirstFrame) {
                            imageLoadingCount++;
                            n.entity.loadImage(
                                // Success
                                function () {
                                    imageLoadingCount--;
                                    imageLoadedCount++;
                                    if (imageLoadingCount === 0) {
                                        bkgLog({
                                            // 首屏渲染完成日志
                                            type: 'zhishitupuscreenrendered',
                                            imageCount: imageLoadedCount
                                        });
                                    }
                                },
                                // Error
                                function () {
                                    imageLoadingCount--;
                                    if (imageLoadingCount === 0) {
                                        bkgLog({
                                            // 首屏渲染完成日志
                                            type: 'zhishitupuscreenrendered',
                                            imageCount: imageLoadedCount
                                        });
                                    }
                                }
                            );
                        } else {
                            n.entity.loadImage();
                        }
                    }
                    var pos = n.entity.el.position;
                    pos = n.entity.el.transformCoordToGlobal(pos[0], pos[1]);

                    vec2.min(this._min, this._min, pos);
                    vec2.max(this._max, this._max, pos);
                }
            }

            if (config.supportCanvas) {
                for (var i = 0; i < graph.edges.length; i++) {
                    var e = graph.edges[i];
                    if (e.entity) {
                        e.entity.el.ignore = e.entity.hidden || !e.entity.isInsideRect(rect);
                    }
                }
            }

            this._isFirstFrame = false;
        }
    };

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