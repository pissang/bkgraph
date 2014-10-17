define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/tool/util');

    var Component = function () {
        Eventful.call(this);

        this.el = document.createElement('div');
    };

    Component.prototype.type = 'COMPONENT';

    Component.prototype.initialize = function (kg) {};

    Component.prototype.resize = function (w, h) {
        // Not implemented
    };

    Component.prototype.setData = function (data) {};

    zrUtil.merge(Component.prototype, Eventful.prototype, true);

    return Component;
});