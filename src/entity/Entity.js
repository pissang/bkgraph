/**
 * 图形实体基类
 */
define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/tool/util');

    var Entity = function () {

        Eventful.call(this);

        this._animations = {};
    }

    Entity.prototype.initialize = function () {};

    Entity.prototype.addAnimation = function (scope, animator) {
        if (this._animations[scope] == null) {
            this._animations[scope] = [];
        }
        if (zrUtil.indexOf(this._animations[scope], animator) < 0) {
            this._animations[scope].push(animator);
        }
        var self = this;
        animator.done(function () {
            var animations = self._animations[scope];
            animations.splice(zrUtil.indexOf(animator), 1);
        });
        return animator;
    };

    Entity.prototype.stopAnimation = function (scope) {
        var animations = this._animations[scope];
        if (animations) {
            for (var i = 0; i < animations.length; i++) {
                animations[i].stop();
            }
            this._animations[scope] = null;
        }
    };

    Entity.prototype.haveAnimation = function (scope) {
        return this._animations[scope] != null;
    }

    Entity.prototype.stopAnimationAll = function () {
        for (var scope in this._animations) {
            this.stopAnimation(scope);
        }
        this._animations = {};
    };

    zrUtil.merge(Entity.prototype, Eventful.prototype, true);

    return Entity;
});