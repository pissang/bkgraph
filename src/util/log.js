define(function(require) {

    var cookie = require('./cookies');
    var config = require('../config');
    var zrUtil = require('zrender/tool/util');

    return function(data){

        if(config.isPlat) {
            return;
        }

        var url = 'http://nsclick.baidu.com/v.gif?pid=201&pj=www';
        var tm = (new Date()).getTime();
        var common = {
            path: document.location.href,
            referrer: document.referrer
        };

        data = zrUtil.merge(data, common);
        for(var i in data){
            if(data.hasOwnProperty(i)){
                url += '&' + i + '=' + encodeURIComponent(data[i]);
            }
        }
        var img = window['BD_PS_C' + tm] = new Image();
        img.src = url;
    };
});