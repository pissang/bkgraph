define (function (require) {
    
    var util = require('../util/util');

    var Cycle = function () {

        this.nodes = [];

        this.edges = [];
    }

    // TODO
    // http://www.me.utexas.edu/~bard/IP/Handouts/cycles.pdf
    Cycle.findFromGraph = function (graph, maxCycleDepth) {
        var stack = [];
        var cycles = [];

        var depthFirstTraverse = function (current, startNode, depth) {
            if (depth + 1 > maxCycleDepth) {
                return;
            }
            stack.push(current);
            for (var i = 0; i < current.edges.length; i++) {
                var e = current.edges[i];
                var other = e.node1 === current ? e.node2 : e.node1;
                if (util.indexOf(stack, other) >= 0) {    // Back edge
                    if (other === startNode && stack.length > 2 && stack.length <= maxCycleDepth) {
                        // Have a cycle
                        var cycle = new Cycle();
                        cycle.nodes = stack.slice();
                        cycles.push(cycle);
                        var len = cycle.nodes.length;
                        for (var k = 0; k < len; k++) {
                            var n1 = cycle.nodes[k];
                            var n2 = cycle.nodes[(k + 1) % len];
                            var e = graph.getEdge(n1, n2) || graph.getEdge(n2, n1);
                            cycle.edges.push(e);
                        }
                    }
                } else {
                    // other.__visited = true;
                    depthFirstTraverse(other, startNode, depth + 1);
                }
            }
            stack.pop();
        }

        for (var i = 0; i < graph.nodes.length; i++) {
            stack = [];
            depthFirstTraverse(graph.nodes[i], graph.nodes[i], 0);
        }

        return cycles;
    }

    return Cycle;
});