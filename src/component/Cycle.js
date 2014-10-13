define (function (require) {

    var Cycle = function () {

        this.nodes = [];
    }

    Cycle.findFromGraph = function (graph) {

        for (var i = 0; i < graph.nodes.length; i++) {
            graph.nodes[i].__visited = false;
        }
        var node0 = graph.nodes[0];
        node0.__stack = [node0];

        var cycles = [];
        var depthFirstTraverse = function (current, fromNode) {
            for (var i = 0; i < current.edges.length; i++) {
                var e = current.edges[i];
                var other = e.node1 === current ? e.node2 : e.node1;
                if (other === fromNode) {
                    continue;
                }
                if (other.__visited) { // Have a cycle
                    var cycle = new Cycle();
                    // Find Least common ancestor
                    for (var k = 0; k < Math.min(other.__stack.length, current.__stack.length); k++) {
                        var n1 = other.__stack[i];
                        var n2 = current.__stack[i];
                        if (n1 !== n2) {
                            break;
                        }
                    }
                    k --;
                    for (var j = k; j < other.__stack.length; j++) {
                        cycle.nodes.push(other.__stack[j]);
                    }
                    for (var j = current.__stack.length - 1; j >= k + 1; j--) {
                        cycle.nodes.push(current.__stack[j]);
                    }
                    if (cycle.nodes.length > 2) {
                        cycles.push(cycle);
                    }
                } else {
                    other.__stack = current.__stack.slice();
                    other.__stack.push(other);

                    other.__visited = true;
                    depthFirstTraverse(other, current);
                }

            }
        }

        depthFirstTraverse(node0);

        // 清理数据
        for (var i = 0; i < graph.nodes.length; i++) {
            graph.nodes[i].__stack = null;
        }
        return cycles;
    }

    return Cycle;
});