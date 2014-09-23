define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var style = require('../config/style');
    var util = require('../util/util');

    var renderSearchbar = etpl.compile(require('text!../html/searchbar.html'));

    var SearchBar = function () {

        Component.call(this);

        this._dispatchClick = util.bind(this._dispatchClick, this);

        util.addEventListener(this.el, 'click', this._dispatchClick);
    }

    SearchBar.prototype.type = 'SEARCHBAR';

    SearchBar.prototype.initialize = function (kg, data) {
        
        var el = this.el;
        el.className = 'bkg-searchbar';

        // 使用空数据
        this.render(data);

        this._isLastPage = false;
        this._isFirstPage = true;

        this._$viewport = this.el.querySelector('.bkg-person-list-viewport');
        this._$list = this._$viewport.querySelector('ul');
        this._$prevPageBtn = this.el.querySelector('.bkg-prev-page');
        this._$nextPageBtn = this.el.querySelector('.bkg-next-page');

        this._width = this._$list.clientWidth;
        this._viewportWidth = this._$viewport.clientWidth;
        this._left = 0;

        if (this._width < this._viewportWidth) {
            this._isLastPage = true;
            util.addClass(this._$nextPageBtn, 'disable');
        }
    }

    SearchBar.prototype.setData = function (data) {
        this.render(data);
    }

    SearchBar.prototype.render = function (data) {
        this.el.innerHTML = renderSearchbar(data);
    }

    SearchBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    /**
     * 显示搜索栏
     */
    SearchBar.prototype.show = function () {

    }

    /**
     * 隐藏搜索栏
     */
    SearchBar.prototype.hide = function () {
        
    }
    /**
     * 人物列表翻到下一页
     */
    SearchBar.prototype.nextPage = function () {
        if (this._isLastPage) {
            return;
        }

        var left = this._left;
        left += this._viewportWidth;
        if (left + this._viewportWidth > this._width) {
            left = this._width - this._viewportWidth;
            this._isLastPage = true;

            util.addClass(this._$nextPageBtn, 'disable');
        }
        this._$list.style.left = -left + 'px';

        this._isFirstPage = false;
        util.removeClass(this._$prevPageBtn, 'disable');
    }
    /**
     * 人物列表翻到上一页
     */
    SearchBar.prototype.prevPage = function () {
        if (this._isFirstPage) {
            return;
        }

        var left = this._left
        left -= this._viewportWidth;
        if (left < 0) {
            left = 0;
            this._isFirstPage = true;
            util.addClass(this._$prevPageBtn, 'disable');
        }

        this._$list.style.left = -left + 'px';

        this._isLastPage = false;
        util.removeClass(this._$nextPageBtn, 'disable');
    }

    SearchBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (target.className.match(/bkg-prev-page/)) {
            this.prevPage();
        } else if (target.className.match(/bkg-next-page/)) {
            this.nextPage();
        }
    }

    zrUtil.inherits(SearchBar, Component);

    return SearchBar;
});