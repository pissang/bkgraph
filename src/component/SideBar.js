define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');

    var ScrollBar = require('../util/ScrollBar');

    etpl.compile(require('text!../html/sidebarmodule.html'));
    var renderEntityDetail = etpl.compile(require('text!../html/entitydetail.html'));
    var renderRelationDetail = etpl.compile(require('text!../html/relationdetail.html'));

    var SideBar = function () {
        
        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg, rawData) {
        this.el.className = 'bkg-sidebar';

        this._$viewport = document.createElement('div');
        this._$viewport.className = 'bkg-sidebar-viewport';

        this._$content = document.createElement('div');
        this._$content.className = 'bkg-sidebar-content';
        this._$viewport.appendChild(this._$content);

        this._$toggleBtn = document.createElement('div');
        this._$toggleBtn.className = 'bkg-toggle';
        this._$toggleBtn.innerHTML = '隐<br />藏<br />';

        this.el.appendChild(this._$viewport);
        this.el.appendChild(this._$toggleBtn);

        this._scrollbar = new ScrollBar(this._$content);

        this._kgraph = kg;

        // 默认显示主要实体
        var mainEntity;
        for (var i = 0; i < rawData.entities.length; i++) {
            if (+rawData.entities[i].layerCounter === 0) {
                mainEntity = rawData.entities[i];
            }
        }
        // 使用空数据
        this.render(mainEntity);

        this.hide();

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
        } else {
            this._$content.innerHTML = renderEntityDetail(data);
        }

        this._scrollbar.scrollTo(0);
        this._scrollbar.resize();
    };

    /**
     * 显示边栏
     */
    SideBar.prototype.show = function () {
        if (util.hasClass(this.el, 'hidden')) {
            util.removeClass(this.el, 'hidden');

            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.right = -this.el.clientWidth + 'px';
            }

            this._$toggleBtn.innerHTML = '隐<br />藏<br /><';
        }
    };

    /**
     * 隐藏边栏
     */
    SideBar.prototype.hide = function () {
        if (!util.hasClass(this.el, 'hidden')) {
            util.addClass(this.el, 'hidden');

            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.right = '0px';
            }

            this._$toggleBtn.innerHTML = '显<br />示<br />>';
        }
    };

    /**
     * 切换边栏的显示隐藏
     */
    SideBar.prototype.toggle = function () {
        if (util.hasClass(this.el, 'hidden')) {
            this.show();
        }
        else {
            this.hide();
        }
    };

    SideBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle();
        }
    };

    zrUtil.inherits(SideBar, Component);

    return SideBar;
});