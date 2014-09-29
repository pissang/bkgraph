define(function (require) {

    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    var CurveBundle = function (opts) {
        Base.call(this, opts);
    }

    CurveBundle.prototype = {

        type: 'curvebundle',

        brushTypeOnly: 'stroke',

        buildPath: function (ctx, style) {
            for (var i = 0; i < style.segments.length; i++) {
                var points = style.segments[i];
                ctx.moveTo(points[0], points[1]);
                ctx.quadraticCurveTo(
                    points[2], points[3],
                    points[4], points[5]
                );
            }
        }
    };

    zrUtil.inherits(CurveBundle, Base);

    return CurveBundle;
});