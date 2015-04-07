define(function (require) {

    var Path = require('zrender/graphic/Path');

    Cresent = Path.extend({
        
        type: 'cresent',

        shape: {
            cx: 0, cy: 0, r: 0, height: 0
        },

        buildPath: function (ctx, shape) {
            var r = shape.r;
            var cx = shape.cx;
            var cy = shape.cy;

            var rad1 = Math.PI / 2;
            var angle = Math.acos((r - shape.height) / r);
            var rad0 = rad1 - angle;
            var rad2 = rad1 + angle;

            var x0 = cx + Math.cos(rad0) * r;
            var y0 = cy + Math.sin(rad0) * r;
            ctx.moveTo(x0, y0);
            ctx.arc(cx, cy, r, rad0, rad2);
            ctx.closePath();
        }
    });

    return Cresent;
});