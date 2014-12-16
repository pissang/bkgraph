/**
 * 力导向布局
 * @author pissang(http://github.com/pissang)
 */
var ForceLayoutWorker = require('./forceLayoutWorker');
var vec2 = require('../common/vector');

var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

var workerUrl;

function getToken() {
    return Math.round((new Date()).getTime() / 100) % 10000000;
}
var ForceLayout = function(opts) {
    opts = opts || {};
    // 配置项
    this.width = opts.width || 500;
    this.height = opts.height || 500;
    this.center = opts.center || [this.width / 2, this.height / 2];
    this.ratioScaling = opts.ratioScaling || false;
    this.scaling = opts.scaling || 1;

    this.large = opts.large || false;
    this.preventNodeOverlap = opts.preventNodeOverlap || false;
    this.preventNodeEdgeOverlap = opts.preventNodeEdgeOverlap || false;

    this.layerConstraint = 0;
    this.layerDistance = [0];

    this.onupdate = opts.onupdate || function () {};
    this.onstable = opts.onstable || function () {};

    this.stableThreshold = 1;

    this._layout = null;

    this._token = 0;

    var self = this;
    var _$onupdate = this._$onupdate;
    this._$onupdate = function(e) {
        _$onupdate.call(self, e);
    };
};

ForceLayout.prototype.updateConfig = function () {
    var width = this.width;
    var height = this.height;
    var size = Math.min(width, height);

    var config = {
        center: this.center,
        width: this.ratioScaling ? width : size,
        height: this.ratioScaling ? height : size,
        scaling: this.scaling || 1.0,
        barnesHutOptimize: this.large,
        preventNodeOverlap: this.preventNodeOverlap,
        preventNodeEdgeOverlap: this.preventNodeEdgeOverlap,
        layerConstraint: this.layerConstraint,
        layerDistance: this.layerDistance
    };

    for (var name in config) {
        this._layout[name] = config[name];
    }
};

ForceLayout.prototype.init = function (graph) {
    if (!this._layout) {
        this._layout = new ForceLayoutWorker();
    }

    this._isStable = false;

    this.graph = graph;

    // 节点数据
    var len = graph.nodes.length;

    for (var i = 0; i < len; i++) {
        var n = graph.nodes[i];
        n.layout.mass = n.layout.mass == null
            ? 1 : n.layout.mass;
        n.layout.size = n.layout.size == null
            ? 1 : n.layout.size;
        n.layout.layer = n.layout.layer == null
            ? 1 : n.layout.layer;

        n.layout.__index = i;
    }
    // 边数据
    len = graph.edges.length;
    for (var i = 0; i < len; i++) {
        var edge = graph.edges[i];
        edge.layout.node1Index = edge.node1.layout.__index;
        edge.layout.node2Index = edge.node2.layout.__index;
        edge.layout.weight = edge.layout.weight || 1;
    }

    this._token = getToken();

    if (this._layoutWorker) {

        this._layoutWorker.postMessage({
            cmd: 'init',
            nodes: graph.nodes.map(function (n) {
                return n.layout;
            }),
            edges: graph.edges.map(function (e) {
                return e.layout;
            }),
            token: this._token
        });
    }
    else {
        this._layout.setToken(this._token);
        this._layout.initNodes(graph.nodes.map(function (n) {
            return n.layout;
        }));
        this._layout.initEdges(graph.edges.map(function (e) {
            return e.layout;
        }));   
    }

    this.updateConfig();
};

ForceLayout.prototype.step = function (steps) {
    var nodes = this.graph.nodes;

    for (var i = 0; i < steps; i++) {
        this._layout.update();
    }

    this._$onupdate();
};

ForceLayout.prototype._$onupdate = function (e) {
    if (this._layout.tokenMatch(this._token)) {
        var energy = 0;
        var len = this._layout.nodes.length;
        for (var i = 0; i < this.graph.nodes.length; i++) {
            var n = this.graph.nodes[i];
            energy += vec2.dist(n.layout.position, this._layout.nodes[i].position);
            vec2.copy(n.layout.position, this._layout.nodes[i].position);
        }
        if (energy < this.stableThreshold) {
            this._isStable = true;
        }

        this.onupdate && this.onupdate();
    }
};

ForceLayout.prototype.isStable = function () {
    return this._isStable;
}

ForceLayout.prototype.dispose = function() {
    this._layout = null;
    this._token = 0;
};

module.exports = ForceLayout;