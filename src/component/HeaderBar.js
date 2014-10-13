define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var renderHeaderBar = etpl.compile(require('text!../html/headerbar.html'));

    var levels = [
        {
            position: 0,
            title: '僵尸粉'
        },
        {
            position: 8,
            title: '初级粉'
        },
        {
            position: 20,
            title: '中级粉'
        },
        {
            position: 40,
            title: '高级粉'
        },
        {
            position: 60,
            title: '顶级粉'
        },
        {
            position: 90,
            title: '私生粉'
        },
        {
            position: 100,
            title: '',
            interval: 0
        }
    ];

    var HeaderBar = function () {

        Component.call(this);

        this._graphCollapsed = true;
    };

    HeaderBar.prototype.type = 'HEADERBAR';

    HeaderBar.prototype.initialize = function (kg, rawData) {

        var el = this.el;
        el.className = 'bkg-headerbar';

        this._kgraph = kg;

        this.setData(rawData);

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
        var mainEntity = data.mainEntity;
        for (var i = 0; i < levels.length - 1; i++) {
            levels[i].interval = levels[i + 1].position - levels[i].position;
        }
        this.render({
            name: mainEntity.name,
            levels: levels
        });
    };

    HeaderBar.prototype.render = function (data) {
        this.el.innerHTML = renderHeaderBar(data);

        this._$levels = Sizzle('.bkg-level', this.el);
    };

    HeaderBar.prototype.setExplorePercent = function (percent) {
        percent = Math.max(percent * 100, 1);
        Sizzle('.bkg-explore-percent-bar-inner', this.el)[0].style.width = percent + '%';

        for (var i = 0; i < levels.length; i++) {
            util.removeClass(this._$levels[i], 'bkg-active');
        }
        for (var i = 0; i < levels.length; i++) {
            if (levels[i].position <= percent && levels[i + 1].position > percent) {
                util.addClass(this._$levels[i], 'bkg-active');
            }
        }
    }

    zrUtil.inherits(HeaderBar, Component);

    return HeaderBar;
});