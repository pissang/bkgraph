define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');
    var bkgLog = require('../util/log');

    var ScrollBar = require('../util/ScrollBar');

    etpl.compile(require('text!../html/sideBarModule.html'));
    var renderEntityDetail = etpl.compile(require('text!../html/entityDetail.html'));
    var renderRelationDetail = etpl.compile(require('text!../html/relationDetail.html'));

    var SideBar = function () {

        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });

        util.addEventListener(this.el, 'mouseenter', function (e) {
            bkgLog({
                type: 'zhishitupuhover',
                target: self._logParam,
                area: 'sidebar'
            });
        });
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg, rawData) {
        this.el.className = 'bkg-sidebar hidden';

        this._$viewport = document.createElement('div');
        this._$viewport.className = 'bkg-sidebar-viewport';
        this.el.appendChild(this._$viewport);

        this._$content = document.createElement('div');
        this._$content.className = 'bkg-sidebar-content';
        this._$viewport.appendChild(this._$content);

        this._$toggleBtn = document.createElement('div');
        this._$toggleBtn.className = 'bkg-toggle';
        this._$toggleBtn.innerHTML = '显<br />示<br /><';
        this.el.appendChild(this._$toggleBtn);

        this._scrollbar = new ScrollBar(this._$content);

        this._kgraph = kg;

        // 默认显示主要实体
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        graphMain.showEntityDetail(rawData.mainEntity, false);

        var headerBar = kg.getComponentByType('HEADERBAR');
        if (headerBar) {
            this.el.style.top = headerBar.el.clientHeight + 'px';
        }
        
        return this.el;
    }

    SideBar.prototype.resize = function (w, h) {
        this._scrollbar.resize();
    };

    SideBar.prototype.setData = function (data, isRelation) {
        this.render(data, isRelation);
    };

    SideBar.prototype.render = function (data, isRelation) {
        if (isRelation) {
            this._$content.innerHTML = renderRelationDetail(data);
            this._logParam = [
                                // from entity
                                data.fromID,
                                data.fromEntity.layerCounter,
                                // to entity
                                data.toID,
                                data.toEntity.layerCounter,
                                data.id,
                                data.isExtra ? 1 : 0,
                                data.isSpecial ? 1 : 0
                            ].join(',');
        } else {
            this._$content.innerHTML = renderEntityDetail(data);
            this._logParam = data.id + ',' + data.layerCounter;
        }

        this._scrollbar.scrollTo(0);
        this._scrollbar.resize();

        // TODO
        var $relationName = Sizzle('.bkg-relation-name span', this.el)[0];
        if ($relationName) {
            $relationName.style.top = - $relationName.clientHeight - 10 + 'px';
        }
    };

    /**
     * 显示边栏
     */
    SideBar.prototype.show = function (logParam) {
        if (util.hasClass(this.el, 'hidden')) {
            util.removeClass(this.el, 'hidden');

            // 图谱部分右移
            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.left = -(this.el.clientWidth / 2) + 'px';
            }

            this._$toggleBtn.innerHTML = '隐<br />藏<br />>';

            // 搜索栏自动隐藏
            var searchBar = this._kgraph.getComponentByType('SEARCHBAR');
            if (searchBar) {
                searchBar.hide(logParam);
            }
        }

        bkgLog({
            type: 'zhishitupushow',
            target: logParam,
            area: 'sidebar'
        });
    };

    /**
     * 隐藏边栏
     */
    SideBar.prototype.hide = function (logParam) {
        if (!util.hasClass(this.el, 'hidden')) {
            util.addClass(this.el, 'hidden');

            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.left = '0px';
            }

            bkgLog({
                type: 'zhishitupuhide',
                target: logParam,
                area: 'sidebar'
            });

            this._$toggleBtn.innerHTML = '显<br />示<br /><';
        }
    };

    /**
     * 切换边栏的显示隐藏
     */
    SideBar.prototype.toggle = function (logParam) {
        if (util.hasClass(this.el, 'hidden')) {
            this.show(logParam);
        }
        else {
            this.hide(logParam);
        }
    };

    SideBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle(this._logParam);
        }

        var current = target;
        while (current && current.nodeName.toLowerCase() !== 'a') {
            current = current.parentNode;
        }

        if (current) {
            var linkArea = current.getAttribute('data-area');
            bkgLog({
                type: 'zhishitupulink',
                target: [
                            this._logParam,
                            current.getAttribute('title'),
                            current.getAttribute('href')
                        ].join(','),
                area: 'sidebar-' + linkArea
            });
        }
    };

    zrUtil.inherits(SideBar, Component);

    return SideBar;
});