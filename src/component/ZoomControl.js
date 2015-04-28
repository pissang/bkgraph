define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/core/util');
    var zrEvent = require('zrender/core/event');
    var util = require('../util/util');

    var addEventListener = util.addEventListener;
    var removeEventListener = util.removeEventListener;

    function ZoomControl(dom, el) {
        Component.call(this);

        this.minZoom = 0.6;
        this.maxZoom = 1.4;

        this._zoom = 1;

        this._onMouseWheel = util.bind(this._onMouseWheel, this);
    }

    ZoomControl.prototype = {

        constructor: ZoomControl,

        type: 'ZOOMCONTROL',

        initialize: function (kg) {
            this._kgraph = kg;

            var graphMain = kg.getComponentByType('GRAPH');
            if (!graphMain) {
                return;
            }

            var el = graphMain.el;

            this._target = graphMain.getGraphRoot();

            addEventListener(el, 'mousewheel', this._onMouseWheel);
            addEventListener(el, 'DOMMouseScroll', this._onMouseWheel);
        },

        _onMouseWheel: function (e) {
            e = zrEvent.normalizeEvent(e);
            var mouseX = e.zrenderX;
            var mouseY = e.zrenderY;

            var delta = e.wheelDelta || -e.detail;
            var scale = delta > 0 ? 1.05 : 1 / 1.05;
            var zoom = Math.min(Math.max(this._zoom * scale, this.minZoom), this.maxZoom);
            scale = zoom / this._zoom;

            var panControl = this._kgraph.getComponentByType('PANCONTROL');
            var offset = panControl ? panControl.getOffset() : {x: 0, y: 0};
            var x = offset.x;
            var y = offset.y;
            x -= (mouseX - x) * (scale - 1);
            y -= (mouseY - y) * (scale - 1);

            panControl.setOffset(x, y);

            var target = this._target;

            this._zoom = zoom;
            target.scale = [zoom, zoom, 0, 0];

            target.dirty();
        },

        hasZoom: function () {
            return this._zoom !== 1;
        },

        getZoom: function () {
            return this._zoom;
        }
    };

    zrUtil.inherits(ZoomControl, Component);

    return ZoomControl;
});