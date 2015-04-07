define(function (require) {

    var Path = require('zrender/graphic/Path');

    var CurveBundle = Path.extend({

        type: 'curvebundle',

        style: {
            fill: null,
            stroke: 'black'
        },

        buildPath: function (ctx, shape) {
            for (var i = 0; i < shape.segments.length; i++) {
                var points = shape.segments[i];
                ctx.moveTo(points[0], points[1]);
                ctx.quadraticCurveTo(
                    points[2], points[3],
                    points[4], points[5]
                );
            }
        }
    });

    return CurveBundle;
});