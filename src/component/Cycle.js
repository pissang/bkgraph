define (function (require) {

    var Cycle = function () {

        this.nodes = [];
    }

    // TODO 会有重复的
    Cycle.findFromGraph = function (graph, maxCycleDepth) {

        for (var i = 0; i < graph.nodes.length; i++) {
            graph.nodes[i].__visited = false;
        }

        var stack = [];
        var cycles = [];

        var depthFirstTraverse = function (current, mainNode, depth) {
            if (depth + 1 > maxCycleDepth) {
                return;
            }
            stack.push(current);
            for (var i = 0; i < current.edges.length; i++) {
                var e = current.edges[i];
                var other = e.node1 === current ? e.node2 : e.node1;
                if (other.__visited) {
                    if (other === mainNode && stack.length > 2 && stack.length <= maxCycleDepth) {
                        // Have a cycle
                        var cycle = new Cycle();
                        cycle.nodes = stack.slice();
                        cycles.push(cycle);
                    }
                } else {
                    other.__visited = true;
                    depthFirstTraverse(other, mainNode, depth + 1);
                }
            }
            stack.pop();
        }

        for (var i = 0; i < graph.nodes.length; i++) {
            for (var j = 0; j < graph.nodes.length; j++) {
                graph.nodes[j].__visited = false;
            }
            stack = [];
            graph.nodes[i].__visited = true;
            depthFirstTraverse(graph.nodes[i], graph.nodes[i], 0);
        }

        return cycles;
    }

    return Cycle;
});