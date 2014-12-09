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
    var PanControl = require('./component/PanControl');
    var ZoomControl = require('./component/ZoomControl');
    var SearchBar = require('./component/SearchBar');
    var SideBar = require('./component/SideBar');
    var HeaderBar = require('./component/HeaderBar');
    var KeyboardControl = require('./component/KeyboardControl');
    var Loading = require('./component/Loading');
    var Intro = require('./component/Intro');
    var etpl = require('etpl');
    var jsonp = require('./util/jsonp');
    var util = require('./util/util');

    var http = require('zrender/tool/http');

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

        // 加载界面
        var loading = new Loading();
        this.addComponent(loading);

        var self = this;

        // if (typeof(url) === 'string' && url.indexOf('http') == 0) {

            jsonp(url, 'callback', function (data) {
                data = self._fixData(data);
                self._rawData = data;

                self.initialize(data);

                onsuccess && onsuccess(self);
            });
        // }
        // else if (typeof(url) === 'string' && url !== '') {
                
        //     http.get(url, function (data) {
        //         if (typeof(JSON) !== 'undefined' && JSON.parse) {
        //             data = JSON.parse(data);
        //         } else {
        //             data = eval('(' + data + ')');
        //         }
        //         data = self._fixData(data);
        //         self._rawData = data;

        //         self.initialize(data);
        //         onsuccess && onsuccess(self);
        //     });
        // } else {
        //     var data = url;
        //     data = this._fixData(data);

        //     this._rawData = data;

        //     this.initialize(data);

        //     onsuccess && onsuccess(this);
        // }
    }

    BKGraph.prototype._fixData = function (data) {
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            // 数据修正
            entity.layerCounter = entity.layerCounter || 0;
            entity.layerCounter = parseInt(entity.layerCounter);

            if (entity.layerCounter === 0) {
                data.mainEntity = entity;
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

        var params = util.getURLSearch();

        if (data) {
            if (params['relation']) {
                graphMain.enableEntryAnimation = false;
            }
            graphMain.setData(data);
        }

        if (params['relation']) {
            setTimeout(function () {
                graphMain.highlightEdge(params['relation']);
                graphMain.moveToRelation(params['relation']);
                graphMain.showRelationDetail(params['relation']);
            });
        }
        else if (params['entity']) {
            setTimeout(function () {
                graphMain.highlightNode(params['entity']);
                graphMain.moveToEntity(params['entity']);
                graphMain.showEntityDetail(params['entity'], true);
            });
        }
        else {
            // 默认高亮中心节点权重最高的边
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
            setTimeout(function () {
                graphMain.highlightEdge(mainRelations[0].id);
                graphMain.showRelationDetail(mainRelations[0].id);
            });
        }

        // Intro Component is defaultly included (except location has releation param)
        // if (!params['relation']) {
        //     var intro = new Intro();
        //     this.addComponent(intro);
        // }
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
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom);
        }
        var graph = new BKGraph(dom, url, onsuccess);

        return graph;
    }


    var bkgraph = {
        SearchBar: SearchBar,
        SideBar: SideBar,
        ZoomControl: ZoomControl,
        PanControl: PanControl,
        KeyboardControl: KeyboardControl,
        HeaderBar: HeaderBar,
        Intro: Intro,

        init: init
    };

    return bkgraph;
});