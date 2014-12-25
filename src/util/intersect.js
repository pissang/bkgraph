define(function (require) {

    var vec2 =  require('zrender/tool/vector');
    var curveTool = require('zrender/tool/curve');

    var EPSILON = 1e-4;

    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();

    function lineXAtY(x0, y0, x1, y1, y) {
        var t = (y - y0) / (y1 - y0);
        if (t > 1 || t < 0) {
            return -Infinity;
        }
        return t * (x1 - x0) + x0;
    }

    function lineYAtX(x0, y0, x1, y1, x) {
        var t = (x - x0) / (x1 - x0);
        if (t > 1 || t < 0) {
            return -Infinity;
        }
        return t * (y1 - y0) + y0;
    }

    var t = [];
    function curveXAtY(x0, y0, x1, y1, x2, y2, y) {
        var n = curveTool.quadraticRootAt(y0, y1, y2, y, t);
        if (n === 0) {
            return -Infinity;
        }
        return curveTool.quadraticAt(x0, x1, x2, t[0]);
    }

    function curveYAtX(x0, y0, x1, y1, x2, y2, x) {
        var n = curveTool.quadraticRootAt(x0, x1, x2, x, t);
        if (n === 0) {
            return -Infinity;
        }
        return curveTool.quadraticAt(y0, y1, y2, t[0]);
    }

    var lineRect = function (line, rect, out) {
        var x0 = line.xStart;
        var y0 = line.yStart;
        var x1 = line.xEnd;
        var y1 = line.yEnd;

        // Intersect with top
        var x = lineXAtY(x0, y0, x1, y1, rect.y);
        var out = [];
        if (x >= rect.x && x <= rect.x + rect.width) {
            out.push({
                point: [x, rect.y],
                side: 'top'
            });
        }
        // Intersect with left
        var y = lineYAtX(x0, y0, x1, y1, rect.x);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out.push({
                point: [rect.x, y],
                side: 'left'
            });
        }
        // Intersect with bottom
        var x = lineXAtY(x0, y0, x1, y1, rect.y + rect.height);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out.push({
                point: [x, rect.y + rect.height],
                side: 'bottom'
            });
        }
        // Intersect with right
        var y = lineYAtX(x0, y0, x1, y1, rect.x + rect.width);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out.push({
                point: [rect.x + rect.width, y],
                side: 'right'
            });
        }
        return out;
    };

    var curveRect = function (curve, rect) {
        var x0 = curve.xStart;
        var y0 = curve.yStart;
        var x1 = curve.cpX1;
        var y1 = curve.cpY1;
        var x2 = curve.xEnd;
        var y2 = curve.yEnd;

        // Intersect with top
        var x = curveXAtY(x0, y0, x1, y1, x2, y2, rect.y);
        var out = [];
        if (x >= rect.x && x <= rect.x + rect.width) {
            out.push({
                point: [x, rect.y],
                side: 'top'
            });
        }
        // Intersect with left
        var y = curveYAtX(x0, y0, x1, y1, x2, y2, rect.x);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out.push({
                point: [rect.x, y],
                side: 'left'
            });
        }
        // Intersect with bottom
        var x = curveXAtY(x0, y0, x1, y1, x2, y2, rect.y + rect.height);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out.push({
                point: [x, rect.y + rect.height],
                side: 'bottom'
            });
        }
        // Intersect with right
        var y = curveYAtX(x0, y0, x1, y1, x2, y2, rect.x + rect.width);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out.push({
                point: [rect.x + rect.width, y],
                side: 'right'
            });
        }
        return out;
    }

    var curveCircle = function(curve, center, radius) {
        var x0 = curve.xStart;
        var y0 = curve.yStart;
        var x1 = curve.cpX1;
        var y1 = curve.cpY1;
        var x2 = curve.xEnd;
        var y2 = curve.yEnd;
        var interval = 0.005;

        var d = Infinity;
        var t;
        for (var _t = 0; _t < 1; _t += 0.05) {
            v1[0] = curveTool.quadraticAt(x0, x1, x2, _t);
            v1[1] = curveTool.quadraticAt(y0, y1, y2, _t);
            var d2 = Math.abs(vec2.dist(center, v1) - radius);
            if (d2 < d) {
                d = d2;
                t = _t;
            }
        }

        d = Infinity;
        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            if (interval < EPSILON) {
                break;
            }
            var prev = t - interval;
            var next = t + interval;
            // t - interval
            v2[0] = curveTool.quadraticAt(x0, x1, x2, prev);
            v2[1] = curveTool.quadraticAt(y0, y1, y2, prev);

            var d2 = Math.abs(vec2.dist(center, v1) - radius);

            if (prev >= 0 && d2 < d) {
                t = prev;
                d = d2;
            }
            else {
                // t + interval
                v2[0] = curveTool.quadraticAt(x0, x1, x2, next);
                v2[1] = curveTool.quadraticAt(y0, y1, y2, next);
                var d2 = Math.abs(vec2.dist(center, v2) - radius);
                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }

        return [
            curveTool.quadraticAt(x0, x1, x2, t),
            curveTool.quadraticAt(y0, y1, y2, t)
        ];
    }

    return {
        lineRect: lineRect,

        curveRect: curveRect,

        curveCircle: curveCircle
    }
});