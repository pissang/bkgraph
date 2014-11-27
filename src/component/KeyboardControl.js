define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var util = require('../util/util');
    var bkgLog = require('../util/log');

    var KeyboardControl = function () {

        Component.call(this);
    }

    KeyboardControl.prototype.type = 'KEYBOARDCONTROL';

    KeyboardControl.prototype.initialize = function (kg, data) {

        this._kgraph = kg;

        // PENDING
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
                        type: 'keyboard',
                        target: 'up'
                    });
                    graphMain.moveTop();
                    break;
                case 83: //s
                case 40: //down arrow
                    bkgLog({
                        type: 'keyboard',
                        target: 'down'
                    });
                    graphMain.moveDown();
                    break;
                case 65: //a
                case 37: //left arrow
                    bkgLog({
                        type: 'keyboard',
                        target: 'left'
                    });
                    graphMain.moveLeft();
                    break;
                case 68: //d
                case 39: //right arrow
                    bkgLog({
                        type: 'keyboard',
                        target: 'right'
                    });
                    graphMain.moveRight();
                    break;
                case 81: //Q
                    bkgLog({
                        type: 'keyboard',
                        target: 'zoomout'
                    });
                    graphMain.zoomOut();
                    break;
                case 69: //E
                    bkgLog({
                        type: 'keyboard',
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