define(function (require) {

    var vec2 =  require('zrender/tool/vector');

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

    var lineRect = function (line, rect, out) {
        var x0 = line.xStart;
        var y0 = line.yStart;
        var x1 = line.xEnd;
        var y1 = line.yEnd;

        // Intersect with top
        var x = lineXAtY(x0, y0, x1, y1, rect.y);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y;
            return 'top';
        }
        // Intersect with left
        var y = lineYAtX(x0, y0, x1, y1, rect.x);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x;
            out[1] = y;
            return 'left';
        }
        // Intersect with bottom
        var x = lineXAtY(x0, y0, x1, y1, rect.y + rect.height);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y + rect.height;
            return 'bottom';
        }
        // Intersect with right
        var y = lineYAtX(x0, y0, x1, y1, rect.x + rect.width);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x + rect.width;
            out[1] = y;
            return 'right';
        }
    };

    return {
        lineRect: lineRect
    }
});