define(function (require) {

    var util = require('./util');

    var ScrollList = function (content, btnPrevious, btnNext) {
        
        this._speed = 30;
        this._contentHeight = 125;
        this._stopscroll = false;
        this._lineHeight = 30;

        this._$nextButton = this.$(btnNext);
        this._$previousButton = this.$(btnPrevious);
        this._$scrollContent = this.$(content);

        this._mouseOver = util.bind(this._mouseOver, this);
        this._mouseOut = util.bind(this._mouseOut, this);
        this._mouseScroll = util.bind(this._mouseScroll, this);
        this._previous = util.bind(this._previous, this);
        this._next = util.bind(this._next, this);

        this._init();
    }

    ScrollList.prototype._init = function () {
        if(this._$previousButton) {
            util.addEventListener(this._$previousButton, 'click', this._previous);
            util.addEventListener(this._$previousButton, 'mouseover', this._mouseOver);
            util.addEventListener(this._$previousButton, 'mouseout', this._mouseOut);
        }
        if(this._$nextButton) {
            util.addEventListener(this._$nextButton, 'click', this._next);
            util.addEventListener(this._$nextButton, 'mouseover', this._mouseOver);
            util.addEventListener(this._$nextButton, 'mouseout', this._mouseOut);
        }
        // util.addEventListener(this._$scrollContent, 'mouseup', this._mouseUp);
        // util.addEventListener(this._$scrollContent, 'mousedown', this._mouseScroll);

        util.addEventListener(this._$scrollContent, 'mousewheel', this._mouseScroll);
        util.addEventListener(this._$scrollContent, 'DOMMouseScroll', this._mouseScroll);
    };

    ScrollList.prototype.$ = function (element) {
        return document.getElementById(element);
    };

    ScrollList.prototype._previous = function () {
        this._stopscroll = true;
        this._scroll("up");
    };

    ScrollList.prototype._next = function () {
        this._stopscroll = true;
        this._scroll("down");
    };

    ScrollList.prototype._mouseOver = function (e) {
        this._stopscroll = true;

        var target = e.target || e.srcElement;

        var self = this;

        if(util.hasClass(target, 'pre')) {
            this._scrollUp = setInterval(function() {
                self._scroll("up");
            }, 250);
        }
        else if(util.hasClass(target, 'next')) {
            this._scrollDown = setInterval(function() {
                self._scroll("down");
            }, 250);
        }

    };

    ScrollList.prototype._mouseOut = function (e) {
        this._stopscroll = false;

        var target = e.target || e.srcElement;

        var self = this;

        if(util.hasClass(target, 'pre')) {
            clearInterval(this._scrollUp);
        }
        else if(util.hasClass(target, 'next')) {
            clearInterval(this._scrollDown);
        }
    };

    ScrollList.prototype._mouseScroll = function (e) {
        e.stopPropagation && e.stopPropagation();
        e.cancelBubble = true;

        var delta = e.wheelDelta    // Webkit
            || -e.detail * 5;   // Firefox

        if(delta > 0) {
            this._scroll('up');
        }
        else {
            this._scroll('down');
        }
    };

    ScrollList.prototype._scroll = function (direction) {

        var max = parseInt(this._$scrollContent.scrollHeight) - this._contentHeight;
        var min = 0;

        if (direction == "up") {
            this._$scrollContent.scrollTop--;
        }
        else {
            this._$scrollContent.scrollTop++;
        }
        
        if (parseInt(this._$scrollContent.scrollTop) >= max) {
            this._$scrollContent.scrollTop = max;
            if(this._scrollDown) {
                clearInterval(this._scrollDown);
            }
            return;
        }
        else if (parseInt(this._$scrollContent.scrollTop) <= 0) {
            this._$scrollContent.scrollTop = min;
            if(this._scrollUp) {
                clearInterval(this._scrollUp);
            }
            return;
        }
        
        if (parseInt(this._$scrollContent.scrollTop) % this._lineHeight != 0) {
            this._scrollTimer = setTimeout(this._scroll.call(this, direction), this._speed);
        }
    }

    ScrollList.prototype.scrollTo = function (top) {

        var max = parseInt(this._$scrollContent.scrollHeight) - this._contentHeight;
        var min = 0;

        top = top > max ? max : top;
        top = top < min ? min : top;

        this._$scrollContent.scrollTop = top;

    };

    return ScrollList;
});