// Parallax
define(function(require) {

    function Parallax(dom) {
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom)
        }
        var current = dom.firstChild;
        var bgLayers = [];

        while (current) {
            if (current.className && current.className.indexOf('bkg-bg-layer') >= 0) {
                bgLayers.push(current);
            }
            current = current.nextSibling;
        }
        for (var i = 0; i < bgLayers.length; i++) {
            var bgLayer = bgLayers[i];
            bgLayer._offsetX = bgLayer.clientWidth - dom.clientWidth;
            bgLayer._offsetY = bgLayer.clientWidth - dom.clientWidth;
        }
        this._root = dom;
        this._bgLayers = bgLayers;

        this._offsetX = 0;
        this._offsetY = 0;
    }

    Parallax.prototype.scaleBase = 0.5;
    Parallax.prototype.scaleStep = 0.5;

    Parallax.prototype.setOffset = function (x, y) {
        this._offsetX = -x;
        this._offsetY = -y;
        this.moveTo(0, 0);
    }

    Parallax.prototype.moveTo = function(x, y) {
        var scale = this.scaleBase;
        for (var i = 0; i < this._bgLayers.length; i++) {
            var bgLayer = this._bgLayers[i];
            var left = x * scale + this._offsetX;
            var top = y * scale + this._offsetY;
            scale *= this.scaleStep;

            left = -Math.max(Math.min(-left, bgLayer._offsetX), 0);
            top = -Math.max(Math.min(-top, bgLayer._offsetY), 0);

            // PENDING
            // Use translate3d to create layer
            var transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px, 0px)';
            bgLayer.style.WebkitTransform = transform;
            bgLayer.style.MozTransform = transform;
            bgLayer.style.transform = transform;
            // bgLayer.style.left = left + 'px';
            // bgLayer.style.top = top + 'px';
        }
    }

    return Parallax;
});