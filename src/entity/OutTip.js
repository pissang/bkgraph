/**
 * 屏外提示形状
 */
define(function (require) {

    var Entity = require('./Entity');
    var zrUtil = require('zrender/tool/util');
    var RectShape = require('zrender/shape/Rectangle');
    
    var OutTip = function (opts) {
        
        Entity.call(this);

        this.label = opts.label || '';

        this.color = opts.color || '#f9dd05';

        this.el = new RectShape({
            style: {
                x: -25,
                y: 0,
                width: 50,
                height: 25,
                radius: 5,
                textPosition: 'inside',
                textColor: 'black',
                textFont: '12px 微软雅黑',
                opacity: 0.7
            },
            highlightStyle: {
                opacity: 0
            },
            hoverable: false,
            zlevel: 3,
            z: 100
        });
    }

    OutTip.prototype.initialize = function (zr) {
        this.el.style.color = this.color;
        this.el.style.text = this.label;
    }

    zrUtil.inherits(OutTip, Entity);

    return OutTip;
});