/**
 * 组件基类
 */
define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/core/util');

    var Component = function () {
        Eventful.call(this);

        this.el = document.createElement('div');
    };

    Component.prototype.type = 'COMPONENT';

    /**
     * 初始化组件，在 addComponent 时调用
     * @param  {bkgraph~BKGraph} kg
     */
    Component.prototype.initialize = function (kg) {};

    /**
     * 组件缩放，在 BKGraph
     * @param  {number} w
     * @param  {number} h
     */
    Component.prototype.resize = function (w, h) {
        // Not implemented
    };

    Component.prototype.setData = function (data) {};

    Component.prototype.dispose = function () {};

    zrUtil.merge(Component.prototype, Eventful.prototype, true);

    return Component;
});