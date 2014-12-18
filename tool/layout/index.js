var ForceLayout = require('./ForceLayout');
var TreeLayout = require('./TreeLayout');
var Graph = require('../common/Graph');
var Tree = require('../common/Tree');
var vec2 = require('../common/vector');
var config = require('./config');

function layout(data, opts) {
    opts = opts || {};
    for (var name in config) {
        if (!(name in opts)) {
            opts[name] = config[name];
        }
    }
    opts.width = opts.width || 1280;
    opts.height = opts.height || 800;
    opts.layerDistance = opts.layerDistance || [];

    var noPosition = data.entities.filter(function (entity) {
        return entity.position == null;
    }).length > 0;

    var graph = getGraph(data, opts);

    if (noPosition) {
        radialTreeLayout(graph, opts);
    }
    forceLayout(graph, opts);

    graph.eachNode(function (node) {
        node.data.position = node.layout.position;
    });
}

function radialTreeLayout(graph, opts) {
    var cx = opts.width / 2;
    var cy = opts.height / 2;
    var tree = Tree.fromGraph(graph)[0];
    tree.traverse(function (treeNode) {
        var graphNode = graph.getNodeById(treeNode.id);
        treeNode.layout = {
            width: graphNode.layout.size * 2,
            height: graphNode.layout.size * 2
        };
    }, this);
    var layout = new TreeLayout();

    layout.layerPadding = function (level) {
        return opts.layerDistance[level] || 200;
    };
    layout.run(tree);

    var min = [Infinity, Infinity];
    var max = [-Infinity, -Infinity];
    tree.traverse(function (treeNode) {
        vec2.min(min, min, treeNode.layout.position);
        vec2.max(max, max, treeNode.layout.position);
    });
    var width = max[0] - min[0] + 0.1;
    var height = max[1] - min[1];

    tree.traverse(function (treeNode) {
        var graphNode = graph.getNodeById(treeNode.id);
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

function forceLayout(graph, opts) {

    var forceLayout = new ForceLayout();
    forceLayout.maxSpeedIncrease = 100;
    forceLayout.scaling = opts.scaling || 12;
    forceLayout.preventNodeOverlap = true;
    forceLayout.preventNodeEdgeOverlap = true;
    forceLayout.center = [opts.width / 2, opts.height / 2];

    var layerDistance = opts.layerDistance.slice();
    for (var i = 1; i < layerDistance.length; i++) {
        layerDistance[i] = layerDistance[i - 1] + layerDistance[i];
    }
    forceLayout.layerConstraint = opts.layerConstraint;
    forceLayout.layerDistance = layerDistance;

    forceLayout.init(graph);

    var count = 0;
    while (count < 20 && !forceLayout.isStable()) {
        forceLayout.step(10);
        count++;
    }
}

function getGraph(data, opts) {
    var graph = new Graph(true);
    // 映射数据
    var max = -Infinity;
    var min = Infinity;
    var minRadius = opts.minRadius || 30;
    var maxRadius = opts.maxRadius || 40;

    data.entities.forEach(function (entity) {
        min = Math.min(min, entity.hotValue);
        max = Math.max(max, entity.hotValue);
    });
    var diff = max - min;

    data.entities.forEach(function (entity) {
        var n = graph.addNode(entity.id, entity);
        var r = diff > 0 ?
            (entity.hotValue - min) * (maxRadius - minRadius) / diff + minRadius
            : (maxRadius + minRadius) / 2;
        n.layout = {
            position: entity.position,
            mass: 10,
            size: r,
            layer: +entity.layerCounter
        };

        if (+entity.layerCounter === 0) {
            n.layout.position = [opts.width / 2, opts.height / 2];
        }
    });

    data.relations.forEach(function (relation) {
        if (!relation.isExtra) {
            var e = graph.addEdge(relation.fromID, relation.toID, relation);
            if (e) {
                e.layout = {
                    weight: 20
                }
            }
        }
    });

    return graph;
}

module.exports = layout;