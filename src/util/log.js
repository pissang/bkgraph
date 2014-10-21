define(function() {
    return function(fm, title, href){
        var url = 'http://nsclick.baidu.com/v.gif?pid=201&pj=www';
        var data = {
            fm: fm,
            path: document.location.href,
            title: title,
            url: href || "",
            refer: document.referrer
        };
        for(var i in data){
            if(data.hasOwnProperty(i)){
                url += '&' + i + '=' + encodeURIComponent(data[i]);
            }
        }
        var img = window["BD_PS_C" + (new Date()).getTime()] = new Image();
        img.src = url;
    };
});