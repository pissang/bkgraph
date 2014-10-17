define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var util = require('../util/util');

    var KeyboardControl = function () {

        Component.call(this);
    }

    KeyboardControl.prototype.type = 'SEARCHBAR';

    KeyboardControl.prototype.initialize = function (kg, data) {

        this._kgraph = kg;

        var $root = kg.getRoot();
        var self = this;
        // 为了支持keydown事件
        $root.setAttribute('tabindex', 0);
        util.addEventListener($root, 'keydown', function (e) {
            var graphMain = kg.getComponentByType('GRAPH');
            switch(e.keyCode) {
                case 87: //w
                case 38: //up arrow
                    // log('zhishitupumovetop', 'keyboard');
                    graphMain.moveTop();
                    break;
                case 83: //s
                case 40: //down arrow
                    // log('zhishitupumovedown', 'keyboard');
                    graphMain.moveDown();
                    break;
                case 65: //a
                case 37: //left arrow
                    // log('zhishitupumoveleft', 'keyboard');
                    graphMain.moveLeft();
                    break;
                case 68: //d
                case 39: //right arrow
                    // log('zhishitupumoveright', 'keyboard');
                    graphMain.moveRight();
                    break;

                case 81: //Q
                    graphMain.zoomOut();
                    break;
                case 69: //E
                    graphMain.zoomIn();
                    break;
            }
        });
    }

    zrUtil.inherits(KeyboardControl, Component);

    return KeyboardControl;
});