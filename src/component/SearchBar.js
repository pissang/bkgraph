define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var style = require('../config/style');

    var renderSearchbar = etpl.compile(require('text!../html/searchbar.html'));

    var SearchBar = function () {

        Component.call(this);
    }

    SearchBar.prototype.type = 'SEARCHBAR';

    SearchBar.prototype.initialize = function (kg) {
        
        var el = this.el;
        el.className = 'bkg-searchbar';

        // 使用空数据
        this.render({});
    }

    SearchBar.prototype.setData = function (data) {
        this.render(data);
    }

    SearchBar.prototype.render = function (data) {
        this.el.innerHTML = renderSearchbar(data);
    }

    SearchBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    SearchBar.prototype.show = function () {

    }

    SearchBar.prototype.hide = function () {
        
    }

    zrUtil.inherits(SearchBar, Component);

    return SearchBar;
});