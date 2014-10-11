/**
 * @namespace bkgraph
 */
// TODO Entity zlevel的管理
define(function (require) {

    var GraphMain = require('./component/GraphMain');
    var PanControl = require('./component/PanControl');
    var ZoomControl = require('./component/ZoomControl');
    var SearchBar = require('./component/SearchBar');
    var SideBar = require('./component/SideBar');
    var HeaderBar = require('./component/HeaderBar');
    var etpl = require('etpl');
    var jsonp = require('./util/jsonp');

    var http = require('zrender/tool/http');

    // etpl truncate
    etpl.addFilter('truncate', function (str, len, tail) {
        if (str.length > len) {
            tail = tail == null ? '…' : tail;
            return str.substring(0, len - tail.length) + tail;
        }
        return str;
    });
    // etpl trun
    etpl.addFilter('trim', function (str) {
        return str.replace(/^\s+|\s+$/g, '');
    });

    // var TUPU_URL = 'http://nj02-wd-knowledge45-ssd1l.nj02.baidu.com:8866/api/tupu';

    /**
     * @alias bkgraph~BKGraph
     * @param {HTMLElement} dom
     */
    var BKGraph = function (dom, data, onsuccess) {

        this._container = dom;

        this._components = [];

        this._width = 0;

        this._height = 0;

        this._root = null;


        if (typeof(data) === 'string') {
                
            var self = this;

            // jsonp(TUPU_URL, {
            //     query: data
            // }, 'callback', function (res) {
            //     if (res.errorCode === 200) {             
            //         self._rawData = res.data;

            //         self.initialize(res.data);

            //         onsuccess && onsuccess(this);
            //     }
            // });
            http.get('../mock/person/' + data, function (data) {
                data = JSON.parse(data);
                self._rawData = data;
                self.initialize(data);
                onsuccess && onsuccess(self);
            });
        } else {
            this._rawData = data;

            this.initialize(data);

            onsuccess && onsuccess(this);
        }
    }

    BKGraph.prototype.getRawData = function () {
        return this._rawData;
    }

    BKGraph.prototype.initialize = function (data) {
        this._root = document.createElement('div');
        this._root.className = 'bkg-viewport';
        this._root.style = {
            position: 'relative',
            overflow: 'hidden'
        }

        this._container.appendChild(this._root);
        this.resize();

        // Graph Component is defaultly included
        var graphMain = new GraphMain();
        this.addComponent(graphMain);

        if (data) {
            graphMain.setData(data);
        }
    }

    BKGraph.prototype.addComponent = function (component) {
        this._components.push(component);
        
        if (component.el && component.el.nodeType === 1) {
            this._root.appendChild(component.el);
        }
        
        component.initialize(this, this._rawData);
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
     * @param {Object} [data]
     * @param {Function} onsuccess
     * @memberOf bkgraph
     * @return {bkgraph~BKGraph}
     */
    function init(dom, data, onsuccess) {
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom);
        }
        var graph = new BKGraph(dom, data, onsuccess);

        return graph;
    }


    var bkgraph = {
        SearchBar: SearchBar,
        SideBar: SideBar,
        ZoomControl: ZoomControl,
        PanControl: PanControl,

        HeaderBar: HeaderBar,

        init: init
    };

    return bkgraph;
});