define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/core/util');
    var util = require('../util/util');

    var addEventListener = util.addEventListener;
    var removeEventListener = util.removeEventListener;

    function PanControl(dom, el) {
        Component.call(this);

        this._onMouseMove = util.bind(this._onMouseMove, this);
        this._onMouseDown = util.bind(this._onMouseDown, this);
        this._onMouseUp = util.bind(this._onMouseUp, this);

        this._x = 0;
        this._y = 0;
    }

    PanControl.prototype = {

        constructor: PanControl,

        type: 'PANCONTROL',

        initialize: function (kg) {

            this._kgraph = kg;

            var graphMain = kg.getComponentByType('GRAPH');
            if (!graphMain) {
                return;
            }

            var el = graphMain.el;

            this._target = graphMain.getGraphRoot();
            this._graphMain = graphMain;

            addEventListener(el, 'mousedown', this._onMouseDown);
        },

        getOffset: function () {
            return {
                x: this._x,
                y: this._y
            };
        },

        setOffset: function (x, y) {
            this._x = x;
            this._y = y;

            this._update();
        },

        _onMouseDown: function (e) {
            addEventListener(document.body, 'mousemove', this._onMouseMove);
            addEventListener(document.body, 'mouseup', this._onMouseUp);

            this._sx = e.screenX;
            this._sy = e.screenY;
        },

        _onMouseMove: function (e) {
            
            var x = e.screenX;
            var y = e.screenY;

            var dx = x - this._sx;
            var dy = y - this._sy;

            this._x += dx;
            this._y += dy;

            this._update();

            this._sx = x;
            this._sy = y;
        },

        _onMouseUp: function (e) {
            removeEventListener(document.body, 'mousemove', this._onMouseMove);
            removeEventListener(document.body, 'mouseup', this._onMouseUp);
        },

        _update: function () {
            var zr = this._graphMain.getZR();
            if (zr.painter.getVMLRoot) {
                // VML 优化
                var vmlRoot = zr.painter.getVMLRoot();
                vmlRoot.style.left = Math.round(this._x) + 'px';
                vmlRoot.style.top = Math.round(this._y) + 'px';
            }
            else {
                var target = this._target;
                target.position[0] = this._x;
                target.position[1] = this._y;
                target.dirty();
            }
        }
    };

    return PanControl;
});