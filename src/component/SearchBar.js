define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var renderPersonList = etpl.compile(require('text!../html/personList.html'));
    var renderSearchbar = etpl.compile(require('text!../html/searchBar.html'));

    var SearchBar = function () {

        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
    }

    SearchBar.prototype.type = 'SEARCHBAR';

    SearchBar.prototype.initialize = function (kg, data) {
        
        this._kgraph = kg;

        var el = this.el;
        el.className = 'bkg-searchbar hidden';

        // 使用空数据
        this.render(data);
    }

    SearchBar.prototype.setData = function (data) {
        this.render(data);
    }

    SearchBar.prototype.render = function (data) {
        this.el.innerHTML = renderSearchbar(data);

        this._$viewport = Sizzle('.bkg-person-list-viewport', this.el)[0];
        this._$prevPageBtn = Sizzle('.bkg-prev-page', this.el)[0];
        this._$nextPageBtn = Sizzle('.bkg-next-page', this.el)[0];
        this._$input = Sizzle('.bkg-search-input input', this.el)[0];
        this._$toggleBtn = Sizzle('.bkg-toggle', this.el)[0];

        this._viewportWidth = this._$viewport.clientWidth;

        this._itemWidth = Sizzle

        var self = this;
        util.addEventListener(this._$input, 'keydown', util.debounce(function () {
            self.filter(self._$input.value);
        }, 200));

        this._updateSlider();
    }

    SearchBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    /**
     * 显示搜索栏
     */
    SearchBar.prototype.hide = function () {
        util.addClass(this.el, 'hidden');
        this._$toggleBtn.innerHTML = '显 示';
    }

    /**
     * 隐藏搜索栏
     */
    SearchBar.prototype.show = function () {
        util.removeClass(this.el, 'hidden');
        this._$toggleBtn.innerHTML = '隐 藏';
    }

    /**
     * 切换搜索栏的显示隐藏
     */
    SearchBar.prototype.toggle = function () {
        if (util.hasClass(this.el, 'hidden')) {
            this.show();
        }
        else {
            this.hide();
        }
    }

    /**
     * 人物列表翻到下一页
     */
    SearchBar.prototype.nextPage = function () {
        if (this._isLastPage) {
            return;
        }

        this._left += this._viewportWidth;
        if (this._left + this._viewportWidth > this._width) {
            this._left = this._width - this._viewportWidth;
            this._isLastPage = true;

            util.addClass(this._$nextPageBtn, 'disable');
        }
        this._$list.style.left = -this._left + 'px';

        this._isFirstPage = false;
        util.removeClass(this._$prevPageBtn, 'disable');

        this._loadImage();
    }
    /**
     * 人物列表翻到上一页
     */
    SearchBar.prototype.prevPage = function () {
        if (this._isFirstPage) {
            return;
        }

        this._left -= this._viewportWidth;
        if (this._left < 0) {
            this._left = 0;
            this._isFirstPage = true;
            util.addClass(this._$prevPageBtn, 'disable');
        }

        this._$list.style.left = -this._left + 'px';

        this._isLastPage = false;
        util.removeClass(this._$nextPageBtn, 'disable');


        this._loadImage();
    }

    /**
     * 过滤人物
     */
    SearchBar.prototype.filter = function (name) {
        var data = this._kgraph.getRawData();
        var entities = [];
        if (!name) {
            entities = data.entities;
        } else {
            for (var i = 0; i < data.entities.length; i++) {
                if (data.entities[i].name.indexOf(name) >= 0) {
                    entities.push(data.entities[i]);
                }
            }
        }
        this._$viewport.innerHTML = renderPersonList({
            entities: entities
        });

        this._updateSlider();
    }

    /**
     * 点击人物
     */
    SearchBar.prototype.clickPerson = function (id) {
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        if (graphMain) {
            graphMain.highlightNodeToMain(id);
            graphMain.moveToEntity(id);
        }
    }

    SearchBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-prev-page')) {
            this.prevPage();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-next-page')) {
            this.nextPage();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-person *')) {
            var parent = target;
            while (parent) {
                if (parent.className.indexOf('bkg-person') >= 0) {
                    break;
                }
                parent = target.parentNode;
            }
            this.clickPerson(parent.getAttribute('data-bkg-entity-id'));
        }
    }

    SearchBar.prototype._updateSlider = function () {
        this._$list = Sizzle('ul', this._$viewport)[0];
        this._width = this._$list.clientWidth;
        
        this._isLastPage = false;
        this._isFirstPage = true;

        if (this._width < this._viewportWidth) {
            this._isLastPage = true;
        }
        this._isLastPage ? 
            util.addClass(this._$nextPageBtn, 'disable')
            : util.removeClass(this._$nextPageBtn, 'disable');
        this._isFirstPage ?
            util.addClass(this._$prevPageBtn, 'disable')
            : util.removeClass(this._$prevPageBtn, 'disable');

        this._left = 0;

        this._$imageList = Sizzle('li img', this._$list);
        var $img = this._$imageList[0];
        if ($img) {
            var $li = $img.parentNode;
            this._itemWidth = $li.clientWidth;
            var style = util.getStyle($li);
            this._itemWidth += parseInt(style['margin-left']) + parseInt(style['margin-right']);
        }

        this._loadImage();
    }

    SearchBar.prototype._loadImage = function () {
        var start = Math.floor(this._left / this._itemWidth);
        var end = Math.ceil((this._left + this._viewportWidth) / this._itemWidth);
        for (var i = start; i < end; i++) {
            var $item = this._$imageList[i];
            if ($item && !$item.getAttribute('src')) {
                $item.src = $item.getAttribute('data-src');
            }
        }
    }

    zrUtil.inherits(SearchBar, Component);

    return SearchBar;
});