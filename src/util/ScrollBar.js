define(function (require) {

    var util = require('./util');
    var Sizzle = require('Sizzle');

    var addEventListener = util.addEventListener;
    var removeEventListener = util.removeEventListener;

    var ScrollBar = function (content) {

        this._$viewport = content.parentNode;

        this._$content = content;

        this._$dim = Sizzle('.bkg-sidebar-dimup', this._$viewport)[0];

        this._$scrollButton = null;

        this._$scrollBar = null;

        this._scroll = 0;

        this._onMouseDown = util.bind(this._onMouseDown, this);
        this._onMouseMove = util.bind(this._onMouseMove, this);
        this._onMouseUp = util.bind(this._onMouseUp, this);
        this._onMouseScroll = util.bind(this._onMouseScroll, this);
        this._onKeyDown = util.bind(this._onKeyDown, this);

        this._init();

        this._sx = 0;
        this._sy = 0;
        this._thumbTop = 0;
    };

    ScrollBar.prototype._init = function () {
        var $viewport = this._$viewport;
        var $scrollBar = this._$scrollBar;
        var $scrollButton = this._$scrollButton;
        if (util.getStyle($viewport, 'position') !== 'absolute') {
            $viewport.style.position = 'relative';
        }
        util.addClass($viewport, 'bkg-scrollbar-viewport');
        util.addClass(this._$content, 'bkg-scrollbar-content');

        $viewport.setAttribute('tabindex', 0);

        $scrollButton = document.createElement('div');
        $scrollButton.className = 'bkg-scrollbar-button';
        $scrollBar = document.createElement('div');
        $scrollBar.className = 'bkg-scrollbar-bar-y';

        $viewport.appendChild($scrollBar);
        $scrollBar.appendChild($scrollButton);

        addEventListener(this._$scrollButton, 'mousedown', this._onMouseDown);

        addEventListener($viewport, 'mousewheel', this._onMouseScroll);
        addEventListener($viewport, 'DOMMouseScroll', this._onMouseScroll);
        addEventListener($viewport, 'keydown', this._onKeyDown);

        this.resize();
    };

    ScrollBar.prototype._onMouseDown = function (e) {
        addEventListener(document.body, 'mousemove', this._onMouseMove);
        addEventListener(document.body, 'mouseup', this._onMouseUp);

        this._sx = e.screenX;
        this._sy = e.screenY;
    };

    ScrollBar.prototype._onMouseUp = function () {
        removeEventListener(document.body, 'mouseup', this._onMouseUp);
        removeEventListener(document.body, 'mousemove', this._onMouseMove);
    };

    ScrollBar.prototype._onMouseMove = function (e) {
        e.preventDefault && e.preventDefault();

        this._thumbTop += e.screenY - this._sy;

        this._thumbTop = Math.max(this._thumbTop, 0);

        var max = this._scrollBarHeight - this._scrollButtonHeight;
        this._thumbTop = Math.min(max, this._thumbTop);

        this._$scrollButton.style.top = this._thumbTop + 'px';
        this._scroll = (this._contentHeight - this._viewportHeight) * this._thumbTop / max;
        this._$content.style.top = -this._scroll + 'px';

        this._sy = e.screenY;
        this._sx = e.screenX;

        this._dim(this._scroll);
    };

    ScrollBar.prototype._onMouseScroll = function (e) {
        var delta = e.wheelDelta    // Webkit
            || -e.detail * 5;   // Firefox

        this.scrollTo(this._scroll - delta);
    }

    ScrollBar.prototype._onKeyDown = function (e) {
        switch(e.keyCode) {
            case 38: //up arrow
                this.scrollTo(this._scroll - 100);
                break;
            case 40: //down arrow
                this.scrollTo(this._scroll + 100);
                break;
        }
    }

    ScrollBar.prototype.scrollTo = function (scroll) {
        scroll = Math.max(0, scroll);

        var max = Math.max(this._contentHeight - this._viewportHeight, 0);
        scroll = Math.min(scroll, max);

        this._scroll = scroll;

        this._$content.style.top = -scroll + 'px';

        this._thumbTop = (this._scrollBarHeight - this._scrollButtonHeight) * scroll / max;
        this._$scrollButton.style.top = (this._thumbTop || 0) + 'px';

        this._dim(scroll);
    };

    ScrollBar.prototype.resize = function () {
        this._contentHeight = parseInt(this._$content.clientHeight);
        this._viewportHeight = parseInt(this._$viewport.clientHeight);

        this.scrollTo(0);
        if (this._viewportHeight > this._contentHeight) {
            this._$scrollBar.style.display = 'none';
            return;
        } else {
            this._$scrollBar.style.display = 'block';
        }

        this._scrollBarHeight = parseInt(this._$scrollBar.clientHeight);
        var thumbHeight = this._scrollBarHeight * this._viewportHeight / this._contentHeight;
        if (thumbHeight == this._viewportHeight) {
            thumbHeight = 0;
        }

        this._scrollButtonHeight = thumbHeight;

        this._$scrollButton.style.height = thumbHeight + 'px';
    }

    ScrollBar.prototype.destory = function(first_argument) {
        this._$viewport.removeChild(this._$scrollBar);
        removeEventListener(this._$scrollButton, 'mousedown', this._onMouseDown);
        removeEventListener(this._$viewport, 'mousewheel', this._onMouseScroll);
        removeEventListener(this._$viewport, 'DOMMouseScroll', this._onMouseScroll);
        removeEventListener(this._$viewport, 'keydown', this._onKeyDown);
    };

    ScrollBar.prototype._dim = function (scroll) {
        if (scroll > 10) {
            util.removeClass(this._$dim, 'bkg-hidden');
        }
        else {
            util.addClass(this._$dim, 'bkg-hidden');
        }
    };

    return ScrollBar;
});