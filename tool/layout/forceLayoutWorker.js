
var vec2 = require('../common/vector');
var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

/****************************
 * Class: Graph Node
 ***************************/
function GraphNode() {
    this.position = vec2.create();

    this.force = vec2.create();

    // If repulsionByDegree is true
    //  mass = inDegree + outDegree + 1
    // Else
    //  mass is manually set
    this.mass = 1;

    this.inDegree = 0;
    this.outDegree = 0;
}

/****************************
 * Class: Graph Edge
 ***************************/
function GraphEdge(node1, node2) {
    this.node1 = node1;
    this.node2 = node2;

    this.weight = 1;
}

/****************************
 * Class: ForceLayout
 ***************************/
function ForceLayout() {
    this.repulsionByDegree = false;

    this.preventNodeOverlap = false;
    this.preventNodeEdgeOverlap = false;

    this.strongGravity = true;

    this.scaling = 1.0;

    this.edgeWeightInfluence = 1.0;

    this.width = 500;
    this.height = 500;

    this.maxSpeedIncrease = 1;

    this.nodes = [];
    this.edges = [];

    this.bbox = new ArrayCtor(4);

    this.layerDistance = [0];
    this.layerConstraint = 0;

    this.edgeLength = 150;

    this._k = 0;
}

ForceLayout.prototype.nodeToNodeRepulsionFactor = function (mass, d, k) {
    return k * k * mass / d;
};

ForceLayout.prototype.edgeToNodeRepulsionFactor = function (mass, d, k) {
    return k * mass / Math.sqrt(d);
};

ForceLayout.prototype.attractionFactor = function (w, d, k) {
    return w * d / k * d / this.edgeLength;
};

ForceLayout.prototype.initNodes = function(nodes) {

    this.temperature = 1.0;

    var nNodes = nodes.length;
    this.nodes.length = 0;

    for (var i = 0; i < nNodes; i++) {
        var node = new GraphNode();
        node.mass = nodes[i].mass;
        node.size = nodes[i].size;
        node.layer = nodes[i].layer;
        node.fixed = nodes[i].fixed || false;
        vec2.copy(node.position, nodes[i].position);
        this.nodes.push(node);
    }
};

ForceLayout.prototype.initEdges = function(edges) {
    var nEdges = edges.length;
    this.edges.length = 0;

    for (var i = 0; i < nEdges; i++) {
        var e = edges[i];
        var sIdx = e.node1Index;
        var tIdx = e.node2Index;
        var sNode = this.nodes[sIdx];
        var tNode = this.nodes[tIdx];

        if (!sNode || !tNode) {
            continue;
        }
        sNode.outDegree++;
        tNode.inDegree++;
        var edge = new GraphEdge(sNode, tNode);
        edge.weight = e.weight;

        this.edges.push(edge);
    }
};

ForceLayout.prototype.update = function() {

    var nNodes = this.nodes.length;

    this._k = 0.4 * this.scaling * Math.sqrt(this.width * this.height / nNodes);

    this.updateForce();

    this.updatePosition();
};

ForceLayout.prototype.updateForce = function () {
    var nNodes = this.nodes.length;
    // Reset forces
    for (var i = 0; i < nNodes; i++) {
        var node = this.nodes[i];
        vec2.set(node.force, 0, 0);
    }

    this.updateNodeNodeForce();

    if (this.layerConstraint > 0) {
        this.updateLayerConstraintForce();
    }

    this.updateEdgeForce();

    if (this.preventNodeEdgeOverlap) {
        this.updateNodeEdgeForce();
    }
};

ForceLayout.prototype.updatePosition = function () {
    var nNodes = this.nodes.length;
    // Apply forces
    // var speed = vec2.create();
    var v = vec2.create();
    for (var i = 0; i < nNodes; i++) {
        var node = this.nodes[i];
        if (node.fixed) {
            continue;
        }

        var len = vec2.len(node.force);

        var scale = Math.min(len / 5, 1) * 5 / len;
        vec2.scale(node.force, node.force, scale)

        vec2.add(node.position, node.position, node.force);
    }
};

ForceLayout.prototype.updateNodeNodeForce = function () {
    var nNodes = this.nodes.length;
    // Compute forces
    // Repulsion
    for (var i = 0; i < nNodes; i++) {
        var na = this.nodes[i];
        if (this.barnesHutOptimize) {
            this.applyRegionToNodeRepulsion(this._rootRegion, na);
        }
        else {
            for (var j = i + 1; j < nNodes; j++) {
                var nb = this.nodes[j];
                this.applyNodeToNodeRepulsion(na, nb, false);
            }
        }
    }
};

ForceLayout.prototype.updateLayerConstraintForce = function () {
    for (var i = 0; i < this.nodes.length; i++) {
        this.applyNodeLayerConstraint(this.nodes[i]);
    }
};

ForceLayout.prototype.updateEdgeForce = function () {
    // Attraction
    for (var i = 0; i < this.edges.length; i++) {
        this.applyEdgeAttraction(this.edges[i]);
    }
};

ForceLayout.prototype.updateNodeEdgeForce = function () {
    for (var i = 0; i < this.nodes.length; i++) {
        for (var j = 0; j < this.edges.length; j++) {
            this.applyEdgeToNodeRepulsion(this.edges[j], this.nodes[i]);
        }
    }
};

ForceLayout.prototype.applyNodeToNodeRepulsion = (function() {
    var v = vec2.create();
    return function applyNodeToNodeRepulsion(na, nb, oneWay) {
        if (na === nb) {
            return;
        }
        // Two static node
        if (na.mass === 0 && nb.mass === 0) {
            return;
        }
        
        vec2.sub(v, na.position, nb.position);
        var d2 = v[0] * v[0] + v[1] * v[1];

        // PENDING
        if (d2 === 0) {
            return;
        }

        var factor;
        var mass = na.mass + nb.mass;
        var d = Math.sqrt(d2);

        // Normalize v
        vec2.scale(v, v, 1 / d);

        if (this.preventNodeOverlap) {
            d = d - na.size - nb.size;
            if (d > 0) {
                factor = this.nodeToNodeRepulsionFactor(
                    mass, d, this._k
                );
            }
            else if (d <= 0) {
                // A stronger repulsion if overlap
                factor = this._k * this._k * 10 * mass;
            }
        }
        else {
            factor = this.nodeToNodeRepulsionFactor(
                mass, d, this._k
            );
        }

        if (!oneWay) {
            vec2.scaleAndAdd(na.force, na.force, v, factor * 2);
        }
        vec2.scaleAndAdd(nb.force, nb.force, v, -factor * 2);
    };
})();

ForceLayout.prototype.applyEdgeAttraction = (function() {
    var v = vec2.create();
    return function applyEdgeAttraction(edge) {
        var na = edge.node1;
        var nb = edge.node2;

        vec2.sub(v, na.position, nb.position);
        var d = vec2.len(v);

        var w;
        if (this.edgeWeightInfluence === 0) {
            w = 1;
        }
        else if (this.edgeWeightInfluence == 1) {
            w = edge.weight;
        }
        else {
            w = Math.pow(edge.weight, this.edgeWeightInfluence);
        }

        var factor;

        if (this.preventOverlap) {
            d = d - na.size - nb.size;
            if (d <= 0) {
                // No attraction
                return;
            }
        }

        var factor = this.attractionFactor(w, d, this._k);

        vec2.scaleAndAdd(na.force, na.force, v, -factor);
        vec2.scaleAndAdd(nb.force, nb.force, v, factor);
    };
})();

ForceLayout.prototype.applyNodeLayerConstraint = (function () {
    var v = vec2.create();
    return function (node) {
        vec2.sub(v, this.center, node.position);
        var d = vec2.len(v) + 1e-3;
        vec2.scale(v, v, 1 / d);
        d -= this.layerDistance[node.layer];
        vec2.scaleAndAdd(node.force, node.force, v, d * d * this.layerConstraint * node.mass);
    }
}) ();

ForceLayout.prototype.applyEdgeToNodeRepulsion = (function () {
    var v12 = vec2.create();
    var v13 = vec2.create();
    var p = vec2.create();
    return function (e, n3) {
        var n1 = e.node1;
        var n2 = e.node2;

        if (n1 === n3 || n2 === n3) {
            return;
        }

        vec2.sub(v12, n2.position, n1.position);
        vec2.sub(v13, n3.position, n1.position);

        var len12 = vec2.len(v12);
        if (len12 === 0) {
            return;
        }
        
        vec2.scale(v12, v12, 1 / len12);
        var len = vec2.dot(v12, v13);

        // n3 can't project on line n1-n2
        if (len < 0 || len > len12) {
            return;
        }

        // Project point
        vec2.scaleAndAdd(p, n1.position, v12, len);

        // n3 distance to line n1-n2
        var dist = vec2.dist(p, n3.position) - n3.size;
        var factor = this.edgeToNodeRepulsionFactor(
            n3.mass, Math.max(dist, 0.1), 500
        );
        // Use v12 as normal vector
        vec2.sub(v12, n3.position, p);
        vec2.normalize(v12, v12);
        vec2.scaleAndAdd(n3.force, n3.force, v12, factor);

        // PENDING
        vec2.scaleAndAdd(n1.force, n1.force, v12, -factor);
        vec2.scaleAndAdd(n2.force, n2.force, v12, -factor);
    };
})();

ForceLayout.prototype.setToken = function(token) {
    this._token = token;
};

ForceLayout.prototype.tokenMatch = function(token) {
    return token === this._token;
};

module.exports = ForceLayout;