define(function (require) {

    var forceLayoutWorker = require('echarts/layout/forceLayoutWorker');
    var vec2 = require('zrender/tool/vector');

    forceLayoutWorker.prototype.applyNodeToNodeRepulsion = (function() {
        var v = vec2.create();
        return function applyNodeToNodeRepulsion(na, nb, oneWay) {
            if (na == nb) {
                return;
            }
            vec2.sub(v, na.position, nb.position);
            var d2 = v[0] * v[0] + v[1] * v[1];

            // PENDING
            if (d2 === 0) {
                return;
            }

            var factor;
            var k2 = this._k * this._k;
            var mass = na.mass + nb.mass;

            if (this.preventOverlap) {
                var d = Math.sqrt(d2);
                d = d - na.size - nb.size;
                if (d > 0) {
                    factor = k2 * mass / (d * d);
                }
                else if (d <= 0) {
                    // A stronger repulsion if overlap
                    factor = k2 * 10 * mass;
                }
            }
            else {
                // Divide factor by an extra `d` to normalize the `v`
                factor = k2 * mass / d2;
            }

            // 叶子节点之间排斥更大
            // if (
            //     (na.inDegree + na.outDegree === 1)
            //     && (nb.inDegree + nb.outDegree === 1)
            // ) {
            //     factor *= 20;
            // }

            if (!oneWay) {
                vec2.scaleAndAdd(na.force, na.force, v, factor * 2);
            }
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor * 2);
        };
    })();

    return forceLayoutWorker;
});