define(function (require) {

    var Path = require('zrender/graphic/Path');
    var curve = require('zrender/core/curve');

    var LabelCurve = Path.extend({
        
        type: 'labelcurve',

        shape: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            x3: 0,
            y3: 0
        },

        style: {
            fill: null,
            stroke: 'black'
        },

        buildPath: function (ctx, shape) {
            var x1 = shape.x1;
            var y1 = shape.y1;
            var x2 = shape.x2;
            var y2 = shape.y2;
            var x3 = shape.x3;
            var y3 = shape.y3;
            var cx = shape.cx;
            var cy = shape.cy;
            var r = shape.r || 8;

            // Build curve path
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(x2, y2, x3, y3);

            // Build circle path
            if (cx == null) {
                cx = curve.quadraticAt(x1, x2, x3, 0.5);
                cy = curve.quadraticAt(y1, y2, y3, 0.5);
            }
            ctx.moveTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
    });

    return LabelCurve;
});