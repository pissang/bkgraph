/**
 * @namespace bkgraph
 */
// TODO Entity zlevel的管理
define(function (require) {
    if (typeof(console) !== 'undefined' && console.log) {
        console.log(require('text!./util/asciiEcharts'));
        console.log('\n\n\n%chttp://echarts.baidu.com', 'font-size:14px;');
    }

    var GraphMain = require('./component/GraphMain');
    var SideBar = require('./component/SideBar');
    var HeaderBar = require('./component/HeaderBar');
    var KeyboardControl = require('./component/KeyboardControl');
    var PanControl = require('./component/PanControl');
    var ZoomControl = require('./component/ZoomControl');
    var Loading = require('./component/Loading');
    var Tip = require('./component/Tip');
    var etpl = require('etpl');
    var jsonp = require('./util/jsonp');
    var util = require('./util/util');
    var bkgLog = require('./util/log');

    // etpl truncate
    etpl.addFilter('truncate', util.truncate);
    // etpl trim
    etpl.addFilter('trim', util.trim);

    /**
     * @alias bkgraph~BKGraph
     * @param {HTMLElement} dom
     */
    var BKGraph = function (dom, url, onsuccess) {

        this._container = dom;

        this._components = [];

        this._detailAPI = url;

        this._width = 0;

        this._height = 0;

        this._root = document.createElement('div');
        this._root.className = 'bkg-viewport';
        this._root.style.position = 'relative';
        this._root.style.overflow = 'hidden';

        this._container.appendChild(this._root);

        this.resize();

        var headerBar = new HeaderBar();
        this.addComponent(headerBar);

        // 加载界面
        var loading = new Loading();
        this.addComponent(loading);

        var self = this;

        bkgLog({
            type: 'zhishitupuapistart'
        });
        jsonp(url, 'callback', function (data) {

            bkgLog({
                type: 'zhishitupuapiend'
            });
            if (!data) {
                self.removeComponent(loading);
                return;
            }
            data = self._fixData(data);
            self._rawData = data;

            self.initialize(data);

            onsuccess && onsuccess(self);
        });
    }

    BKGraph.prototype._fixData = function (data) {
        if (!data.entities || !data.relations) {
            return;
        }
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            // 数据修正
            entity.layerCounter = entity.layerCounter || 0;
            entity.layerCounter = parseInt(entity.layerCounter);

            if (entity.layerCounter === 0) {
                data.mainEntity = entity;
            }
        }

        var isExtraRelation = {};
        for (var j = 0; j < data.relations.length; j++) {
            // 每个实体最多2条补边
            var relation = data.relations[j];
            if (relation.isExtra) {
                if (!isExtraRelation[relation.fromID]) {
                    isExtraRelation[relation.fromID] = [];
                }
                if (!isExtraRelation[relation.toID]) {
                    isExtraRelation[relation.toID] = [];
                }
                if (isExtraRelation[relation.fromID].length >= 2
                    || isExtraRelation[relation.toID].length >= 2
                ) {
                    data.relations.splice(j--, 1);
                }
                else {
                    isExtraRelation[relation.fromID].push(relation.id);
                    isExtraRelation[relation.toID].push(relation.id);
                }
            }
        }

        return data;
    }

    BKGraph.prototype.getRawData = function () {
        return this._rawData;
    }

    BKGraph.prototype.initialize = function (data) {
        var loading = this.getComponentByType('loading');
        if (loading) {
            this.removeComponent(loading);
        }
        // Graph Component is defaultly included
        var graphMain = new GraphMain();
        this.addComponent(graphMain);

        var tip = new Tip();
        this.addComponent(tip);

        var params = util.getURLSearch();

        if (data) {
            if (params['relation']) {
                graphMain.enableEntryAnimation = false;
            }
            graphMain.setData(data);
        }

        // 关系边权重排序
        var mainRelations = [];
        var mainEntity = data.mainEntity;
        for (var i = 0, len = data.relations.length; i < len; i++) {
            if (data.relations[i].fromID == mainEntity.id) {
                mainRelations.push(data.relations[i]);
            }
        }
        mainRelations.sort(function (a, b) {
            return b.relationWeight - a.relationWeight;
        });

        if (params['relation']) {
            setTimeout(function () {
                graphMain.activeEdge(params['relation']);
                graphMain.moveToRelation(params['relation']);
                graphMain.showRelationDetail(params['relation'], true);
            });
        }
        else if (params['entity']) {
            setTimeout(function () {
                graphMain.activeNode(params['entity']);
                graphMain.moveToEntity(params['entity']);
                graphMain.showEntityDetail(params['entity'], true);
            });
        }
        else {
            // 默认显示主要实体
            setTimeout(function () {
                graphMain.showEntityDetail(data.mainEntity, false);

                // 关系点击引导
                graphMain.showEdgeClickTip(mainRelations[0].id);
            });
        }
    }

    BKGraph.prototype.addComponent = function (component) {
        this._components.push(component);
        
        if (component.el && component.el.nodeType === 1) {
            this._root.appendChild(component.el);
        }
        
        component.initialize(this, this._rawData);
    }

    BKGraph.prototype.removeComponent = function (component) {
        this._components.splice(util.indexOf(this._components, component), 1);
        if (component.el && component.el.nodeType === 1) {
            this._root.removeChild(component.el);
        }

        component.dispose();
    }

    BKGraph.prototype.getComponentsAllByType = function (type) {
        var components = [];
        for (var i = 0; i < this._components.length; i++) {
            if (this._components[i].type.toUpperCase() === type.toUpperCase()) {
                components.push(this._components[i]);
            }
        }
        return components;
    }

    BKGraph.prototype.getComponentByType = function (type) {
        for (var i = 0; i < this._components.length; i++) {
            if (this._components[i].type.toUpperCase() === type.toUpperCase()) {
                return this._components[i];
            }
        }
        return null;
    }

    BKGraph.prototype.resize = function () {
        var container = this._container;
        var style = container.currentStyle
            || window.getComputedStyle(container);
        this._width = container.clientWidth || parseInt(style.width);
        this._height = container.clientHeight || parseInt(style.height);

        this._root.style.width = this._width + 'px';
        this._root.style.height = this._height + 'px';

        for (var i = 0; i < this._components.length; i++) {
            this._components[i].resize(this._width, this._height);
        }
    }

    BKGraph.prototype.getWidth = function () {
        return this._width;
    }

    BKGraph.prototype.getHeight = function () {
        return this._height;
    }

    BKGraph.prototype.getRoot = function () {
        return this._root;
    }

    BKGraph.prototype.getDetailAPI = function () {
        return this._detailAPI;
    };

    /**
     * 初始化图
     * @param {string|HTMLElement} dom
     * @param {string} url
     * @param {string|Object} data
     * @param {Function} onsuccess
     * @memberOf bkgraph
     * @return {bkgraph~BKGraph}
     */
    function init(dom, url, onsuccess) {
        bkgLog({
            type: 'zhishitupuopen'
        });
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom);
        }
        var graph = new BKGraph(dom, url, onsuccess);

        return graph;
    }


    var bkgraph = {
        SideBar: SideBar,
        KeyboardControl: KeyboardControl,
        PanControl: PanControl,
        ZoomControl: ZoomControl,
        HeaderBar: HeaderBar,

        init: init
    };

    return bkgraph;
});