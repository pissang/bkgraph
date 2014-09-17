/**
 * 图形实体基类
 */
define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/tool/util');

    var Entity = function () {

        Eventful.call(this);
    }

    Entity.prototype.initialize = function () {}

    zrUtil.merge(Entity.prototype, Eventful.prototype, true);

    return Entity;
});