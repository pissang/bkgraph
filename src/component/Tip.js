define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');
    var bkgLog = require('../util/log');

    // etpl.compile(require('text!../html/tip.html'));

    var Tip = function () {

        Component.call(this);

        this._isMouseenter = false;

        // 默认箭头指向
        this._direction = 'left';

        var self = this;
        // util.addEventListener(this.el, 'click', function (e) {
        //     self._dispatchClick(e);
        // });

        // util.addEventListener(this.el, 'mouseenter', function (e) {
        //     self._isMouseenter = true;
        //     self.show();
        //     bkgLog({
        //         type: 'zhishitupuhover',
        //         target: self._logParam,
        //         area: 'tip'
        //     });
        // });

        // util.addEventListener(this.el, 'mouseleave', function (e) {
        //     self._isMouseenter = false;
        //     self.hide();
        // });
    }

    Tip.prototype.type = 'TIP';

    Tip.prototype.initialize = function (kg, data) {

        this._kgraph = kg;

        this.el.className = 'bkg-tip-wrapper hidden';
        this._$arrow = document.createElement('div');
        this._$tip = document.createElement('div');
        this._$tip.className = 'bkg-tip';
        
        this._$content = document.createElement('div');
        this._$content.className = 'bkg-tip-content';
        
        this._$tip.appendChild(this._$content);

        this.el.appendChild(this._$arrow);
        this.el.appendChild(this._$tip);

        return this.el;
    }

    Tip.prototype.setData = function (data, n, isRelation, cb) {
        this.render(data, n, isRelation, cb);
    };

    Tip.prototype.render = function (data, n, isRelation, cb) {
        
        this._direction = this._getDirection(n, isRelation);
        data.arrowType = this._direction;

        this._$arrow.className = 'bkg-tip-arrow ' + this._direction;
        this._$content.innerHTML = data;
        
        this._setPosition(this._direction, n, isRelation);

        // if (isRelation) {
        //     var relationTipRenderer = etpl.getRenderer('relationTip');
        //     this.el.innerHTML = relationTipRenderer(data);
        //     this._logParam = [
        //                         // from entity
        //                         data.fromID,
        //                         data.fromEntity.layerCounter,
        //                         // to entity
        //                         data.toID,
        //                         data.toEntity.layerCounter,
        //                         data.id,
        //                         data.isExtra ? 1 : 0,
        //                         data.isSpecial ? 1 : 0
        //                     ].join(',');
        // } else {
        //     var entityTipRenderer = etpl.getRenderer('entityTip');
        //     this.el.innerHTML = entityTipRenderer(data);
        //     this._logParam = data.id + ',' + data.layerCounter;
        // }

        this.show();

        cb && cb();
    };

    Tip.prototype._getDirection = function (n, isRelation) {

        var position = n.entity.el.position;
        var leftPos = position[0];
        var topPos = position[1];

        if (isRelation) {
            leftPos = n.entity.getShape('labelLine').style.cx;
            topPos = n.entity.getShape('labelLine').style.cy;
        }

        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);
        leftPos += layer.position[0];
        topPos += layer.position[1];

        // 缩放
        var zoom = layer.__zoom || 1;
        leftPos *= zoom;
        topPos *= zoom;

        var windowWidth = document.body.clientWidth;
        var windowHeight = document.body.clientHeight;

        var direction = this._direction;

        if (leftPos > windowWidth * 0.75) {
            direction = 'right';
            if (topPos > windowHeight * 0.85) {
                direction = 'bottom';
            }
            if (topPos < windowHeight * 0.15) {
                direction = 'top';
            }
        }
        else {
            if (topPos > windowHeight * 0.85) {
                direction = 'bottom';
            }
            if (topPos < windowHeight * 0.15) {
                direction = 'top';
            }
        }

        return direction;
    };

    Tip.prototype._setPosition = function (direction, n, isRelation) {
        var position = n.entity.el.position;
        var leftPos = position[0];
        var topPos = position[1];

        if (isRelation) {
            leftPos = n.entity.getShape('labelLine').style.cx;
            topPos = n.entity.getShape('labelLine').style.cy;
        }

        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);

        // 缩放
        var zoom = layer.__zoom || 1;
        leftPos *= zoom;
        topPos *= zoom;

        leftPos += layer.position[0];
        topPos += layer.position[1];

        var style = util.getStyle(this.el);

        switch (direction) {
            case 'top':
                leftPos -= parseInt(style.width) / 2 + parseInt(style.paddingLeft);
                if (isRelation) {
                    topPos += n.entity.getShape('labelLine').style.r;
                }
                else {
                    topPos += (parseInt(style.paddingBottom) + 10) * zoom ;
                }
                break;

            case 'right':
                topPos -= parseInt(style.height) / 2 + parseInt(style.paddingTop);
                if (isRelation) {
                    leftPos -= parseInt(style.width) + n.entity.getShape('labelLine').style.r * 1.5;
                }
                else {
                    leftPos -= parseInt(style.width) + n.entity.radius + 10;
                }
                leftPos -= parseInt(style.paddingLeft) + 15;
                break;

            case 'bottom':
                leftPos -= parseInt(style.width) / 2 + parseInt(style.paddingLeft);
                if (isRelation) {
                    topPos -= parseInt(style.height) + n.entity.getShape('labelLine').style.r * 2;
                }
                else {
                    topPos -= parseInt(style.height) + n.entity.radius + 10;
                }
                topPos -= (parseInt(style.paddingBottom)) * zoom + 15;
                break;

            case 'left':
                topPos -= parseInt(style.height) / 2 + parseInt(style.paddingLeft);
                if (isRelation) {
                    leftPos += n.entity.getShape('labelLine').style.r * 1.5 * zoom;
                }
                else {
                    leftPos += n.entity.radius * zoom + 10;
                }
                leftPos -= (parseInt(style.paddingLeft) - 15) * zoom;
                break;
        }

        // sidebar展开时左移
        // var sideBar = this._kgraph.getComponentByType('SIDEBAR');
        // if (!util.hasClass(sideBar.el, 'hidden')) {
        //     leftPos -= sideBar.el.clientWidth / 2;
        // }
        
        this.el.style.left = leftPos + 'px';
        this.el.style.top = topPos + 'px';
    };

    /**
     * 显示
     */
    Tip.prototype.show = function () {
        if (util.hasClass(this.el, 'hidden')) {
            util.removeClass(this.el, 'hidden');

            bkgLog({
                type: 'zhishitupushow',
                target: this._logParam,
                area: 'tip'
            });
        }
    };

    /**
     * 隐藏
     */
    Tip.prototype.hide = function () {
        if (!util.hasClass(this.el, 'hidden') && !this._isMouseenter) {
            util.addClass(this.el, 'hidden');

            bkgLog({
                type: 'zhishitupuhide',
                target: this._logParam,
                area: 'tip'
            });
        }
    };

    /**
     * 切换显示隐藏
     */
    Tip.prototype.toggle = function () {
        if (util.hasClass(this.el, 'hidden')) {
            this.show(this._logParam);
        }
        else {
            this.hide(this._logParam);
        }
    };

    Tip.prototype._dispatchClick = function (e) {
        var target = e.target || e.srcElement;

        var current = target;
        while (current && current.nodeName.toLowerCase() !== 'a') {
            current = current.parentNode;
        }

        if (current) {
            var linkArea = current.getAttribute('data-area');
            bkgLog({
                type: 'zhishitupulink',
                target: [
                            this._logParam,
                            current.getAttribute('title'),
                            current.getAttribute('href')
                        ].join(','),
                area: 'tip-' + linkArea
            });
        }
    };

    Tip.prototype.getDirection = function () {
        return this._direction;
    };

    zrUtil.inherits(Tip, Component);

    return Tip;
});