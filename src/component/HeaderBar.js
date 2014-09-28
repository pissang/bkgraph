define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var renderHeaderBar = etpl.compile(require('text!../html/headerbar.html'));

    var HeaderBar = function () {

        Component.call(this);

        this._graphCollapsed = true;
    };

    HeaderBar.prototype.type = 'HEADERBAR';

    HeaderBar.prototype.initialize = function (kg) {

        var el = this.el;
        el.className = 'bkg-headerbar';

        this._kgraph = kg;

        this.setData(kg.getRawData());

        var graphMain = kg.getComponentByType('GRAPH');
        if (graphMain) {
            this.setExplorePercent(graphMain.getExplorePercent());
        }

        var sideBar = kg.getComponentByType('SIDEBAR');
        if (sideBar) {
            sideBar.el.style.top = this.el.clientHeight + 'px';
        }
    };

    HeaderBar.prototype.setData = function (data) {
        var mainEntity;
        for (var i = 0; i < data.entities.length; i++) {
            if (+data.entities[i].layerCounter === 0) {
                mainEntity = data.entities[i];
            }
        }
        this.render({
            name: mainEntity.name
        });
    };

    HeaderBar.prototype.render = function (data) {
        this.el.innerHTML = renderHeaderBar(data);
        var self = this;
        util.addEventListener(Sizzle('.bkg-collapse', this.el)[0], 'click', function () {
            self.toggleGraphCollapse();
        });
    };

    HeaderBar.prototype.toggleGraphCollapse = function () {
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        if (graphMain) {
            var buttonInner = Sizzle('.bkg-collapse-checkbox-inner', this.el)[0];
            var label = Sizzle('.bkg-collapse-label', this.el)[0];
            if (this._graphCollapsed) {
                buttonInner.style.left = '17px';
                label.innerHTML = '全部收拢';
                graphMain.uncollapse();
            } else {
                buttonInner.style.left = '0px';
                label.innerHTML = '全部展开';
                graphMain.collapse();
            }
            this._graphCollapsed = !this._graphCollapsed;
        }
    }

    HeaderBar.prototype.setExplorePercent = function (percent) {
        percent = percent * 100;
        Sizzle('.bkg-explore-percent-bar-inner', this.el)[0].style.width = percent + '%';
        var tipDom = Sizzle('.bkg-explore-percent-tip', this.el)[0];
        if (percent === 100) {
            tipDom.style.fontSize = '12px';
        } else {
            tipDom.style.fontSize = '14px';
        }
        tipDom.innerHTML = Math.round(percent);
        tipDom.style.left = percent + '%';
    }

    return HeaderBar;
});