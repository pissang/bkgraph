define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');

    var renderSidebar = etpl.compile(require('text!../html/sidebar.html'));

    var SideBar = function () {
        
        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg) {
        
        var el = this.el;
        el.className = 'bkg-sidebar';

        this._kgraph = kg;

        // 使用空数据
        this.render({});

        this.hide();
        
        return el;
    }

    SideBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    SideBar.prototype.setData = function (data) {
        this.render(data);
    }

    SideBar.prototype.render = function (data) {
        this.el.innerHTML = renderSidebar(data);
        this._$toggleBtn = Sizzle('.bkg-toggle', this.el)[0];
    }

    /**
     * 显示边栏
     */
    SideBar.prototype.show = function () {
        util.removeClass(this.el, 'hidden');

        var graphMain = this._kgraph.getComponentByType('GRAPH');
        if (graphMain) {
            graphMain.el.style.right = -this.el.clientWidth + 'px';
        }

        this._$toggleBtn.innerHTML = '隐<br />藏<br /><';
    }

    /**
     * 隐藏边栏
     */
    SideBar.prototype.hide = function () {
        util.addClass(this.el, 'hidden');

        var graphMain = this._kgraph.getComponentByType('GRAPH');
        if (graphMain) {
            graphMain.el.style.right = '0px';
        }

        this._$toggleBtn.innerHTML = '显<br />示<br />>';
    }

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
    }

    SideBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle();
        }
    }
    zrUtil.inherits(SideBar, Component);

    return SideBar;
});