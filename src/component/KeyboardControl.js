define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/core/util');
    var util = require('../util/util');
    var bkgLog = require('../util/log');

    var KeyboardControl = function () {

        Component.call(this);
    }

    KeyboardControl.prototype.type = 'KEYBOARDCONTROL';

    KeyboardControl.prototype.initialize = function (kg) {

        this._kgraph = kg;

        var graphMain = kg.getComponentByType('GRAPH');
        if (!graphMain) {
            return;
        }
        var self = this;
        // 为了支持keydown事件
        graphMain.el.setAttribute('tabindex', 0);
        util.addEventListener(graphMain.el, 'keydown', function (e) {
            var graphMain = kg.getComponentByType('GRAPH');
            switch(e.keyCode) {
                case 87: //w
                case 38: //up arrow
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'up'
                    });
                    graphMain.moveTop();
                    break;
                case 83: //s
                case 40: //down arrow
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'down'
                    });
                    graphMain.moveDown();
                    break;
                case 65: //a
                case 37: //left arrow
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'left'
                    });
                    graphMain.moveLeft();
                    break;
                case 68: //d
                case 39: //right arrow
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'right'
                    });
                    graphMain.moveRight();
                    break;
                case 81: //Q
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'zoomout'
                    });
                    graphMain.zoomOut();
                    break;
                case 69: //E
                    bkgLog({
                        type: 'zhishitupukeyboard',
                        target: 'zoomin'
                    });
                    graphMain.zoomIn();
                    break;
            }
        });
    }

    zrUtil.inherits(KeyboardControl, Component);

    return KeyboardControl;
});