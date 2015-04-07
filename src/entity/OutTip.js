/**
 * 屏外提示形状
 */
define(function (require) {

    var Entity = require('./Entity');
    var zrUtil = require('zrender/core/util');
    var RectShape = require('zrender/graphic/shape/Rectangle');
    
    var OutTip = function (opts) {
        
        Entity.call(this);

        this.label = opts.label || '';

        this.color = opts.color || '#85b6ff';

        this.el = new RectShape({
            shape: {
                x: -25,
                y: 0,
                width: 55,
                height: 25,
                radius: 5
            },
            style: {
                textPosition: 'inside',
                textColor: 'white',
                textFont: '12px 微软雅黑',
                opacity: 0.9
            },
            hoverable: false,
            zlevel: 2,
            z: 100
        });
    }

    OutTip.prototype.initialize = function (zr) {
        this.el.style.fill = this.color;
        this.el.style.text = this.label;
    }

    zrUtil.inherits(OutTip, Entity);

    return OutTip;
});