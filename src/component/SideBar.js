define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');

    var renderSidebar = etpl.compile(require('text!../html/sidebar.html'));

    var SideBar = function () {
        Component.call(this);
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg) {
        
        var el = this.el;
        el.className = 'bkg-sidebar';

        // 使用空数据
        this.render({});

        return el;
    }

    SideBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    SideBar.prototype.render = function (data) {
        this.el.innerHTML = renderSidebar(data);
    }

    SideBar.prototype.show = function () {

    }

    SideBar.prototype.hide = function () {

    }

    zrUtil.inherits(SideBar, Component);

    return SideBar;
});