/**
 * 图形实体基类
 */
define(function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/core/util');
    var Group = require('zrender/graphic/Group');

    var Entity = function () {

        this.el = new Group();

        Eventful.call(this);

        // {
        //  stateA: {
        //      // Shapes must be added through addShape method first
        //      shapeStyle: {
        //          shapeA: {
        //              style: {},
        //              zlevel: 1     
        //          },
        //          shapeB: {
        //              style: {}
        //              zlevel: 1
        //          }
        //      },
        //      zlevel: 1,
        //      z: 1,
        //      invisible: false,
        //      onenter: function () {},
        //      onleave: function () {}
        //  }
        // }
        this.states = {};

        this.defaultState = '';

        // States transition table
        // {
        //  stateA: ['stateB', 'stateC', 'stateD']
        // }
        this.statesTransition = {};

        this._animations = {};

        this._shapes = {};

        this._currentState = this.defaultState;
    }

    Entity.prototype.hidden = false;

    Entity.prototype.initialize = function (zr) {
        this.zr = zr;

        // Processing states
        if (this.defaultState) {
            var defaultState = this.states[this.defaultState];
            if (defaultState) {
                // All other states are extended from default state
                for (var name in this.states) {
                    var state = this.states[name];
                    if (state !== defaultState) {
                        zrUtil.merge(state, defaultState);
                    }
                }
            }
        }
    };

    Entity.prototype.addElement = function (name, shape) {
        this._shapes[name] = shape;
        this.el.addElement(shape);
    };

    Entity.prototype.getElement = function (name) {
        return this._shapes[name];
    };

    Entity.prototype.setState = function (sName) {
        if (this._currentState === sName) {
            return;
        }
        var previousState = this.states[this._currentState];
        if (this._currentState) {
            var transitionList = this.statesTransition[this._currentState];
            if (!transitionList || zrUtil.indexOf(transitionList, sName) < 0) {
                return;
            }
        }

        var state = this.states[sName];
        if (! state) {
            return;
        }

        if (state.shapeStyle) {
            for (var shapeName in state.shapeStyle) {
                var shape = this._shapes[shapeName];
                if (shape) {
                    zrUtil.merge(
                        shape.style, state.shapeStyle[shapeName], true
                    );
                    shape.dirty(false);
                }
            }
        }
        this._setAllShapeState(state, 'zlevel');
        this._setAllShapeState(state, 'z');

        if (previousState) {
            previousState.onleave && previousState.onleave.call(this, previousState, state);
            this.trigger('state:leave', previousState, state);
        }
        state.onenter && state.onenter.call(this, state, previousState);
        this.trigger('state:enter', state, previousState);

        this._currentState = sName;
    };

    Entity.prototype.getState = function () {
        return this._currentState;
    };

    Entity.prototype._setAllShapeState = function (state, propName) {
        if (state[propName] != null) {
            for (var shapeName in this._shapes) {
                this._shapes[shapeName][propName] = state[propName];
            }
        }
    }

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