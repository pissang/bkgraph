define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var util = require('../util/util');

    var Loading = function () {
        Component.call(this);

        this._frameNumber = 2;
        this._currentFrame = 0;

        this._frameWidth = 180;
    }

    Loading.prototype.type = 'LOADING';

    Loading.prototype.initialize = function (kg, data) {
        
        this._kgraph = kg;

        this.el.className = 'bkg-loading';

        this._$animationEl = document.createElement('div');
        this._$animationEl.className = 'bkg-loading-animation';

        var loadingTip = document.createElement('div');
        loadingTip.className = 'bkg-loading-tip';
        loadingTip.innerHTML = '努力加载中';

        this.el.appendChild(this._$animationEl);
        this._$animationEl.appendChild(loadingTip);

        var self = this;
        this._interval = setInterval(function () {
            self._animationFrame();
        }, 500);
    };

    Loading.prototype._animationFrame = function () {
        this._currentFrame = (this._currentFrame + 1) % this._frameNumber;

        var left = this._frameWidth * this._currentFrame;
        this._$animationEl.style.backgroundPosition = -left + 'px 0px';
    };

    Loading.prototype.dispose = function () {
        clearInterval(this._interval);
    }

    zrUtil.inherits(Loading, Component);

    return Loading;
});