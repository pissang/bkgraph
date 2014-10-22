// https://github.com/OscarGodson/JSONP/blob/master/JSONP.js
define(function (require) {
    return function(url, data, method, callback) {
        //Set the defaults
        url = url || '';
        data = data || {};
        method = method || '';
        callback = callback || function(){};
        
        //Gets all the keys that belong
        //to an object
        var getKeys = function(obj){
          var keys = [];
          for(var key in obj){
            if (obj.hasOwnProperty(key)) {
              keys.push(key);
            }
            
          }
          return keys;
        }

        //Turn the data object into a query string.
        //Add check to see if the second parameter is indeed
        //a data object. If not, keep the default behaviour
        if(typeof data == 'object'){
          var queryString = '';
          var keys = getKeys(data);
          for(var i = 0; i < keys.length; i++){
            queryString += encodeURIComponent(keys[i]) + '=' + encodeURIComponent(data[keys[i]])
            if(i != keys.length - 1){ 
              queryString += '&';
            }
          }
          url += '?' + queryString;
        } else if(typeof data == 'function'){
          method = data;
          callback = method;
        }

        //If no method was set and they used the callback param in place of
        //the method param instead, we say method is callback and set a
        //default method of "callback"
        if(typeof method == 'function'){
          callback = method;
          method = 'callback';
        }
      
        //Check to see if we have Date.now available, if not shim it for older browsers
        if(!Date.now){
          Date.now = function() { return new Date().getTime(); };
        }

        //Use timestamp + a random factor to account for a lot of requests in a short time
        //e.g. jsonp1394571775161 
        var timestamp = Date.now();
        var generatedFunction = 'jsonp'+Math.round(timestamp+Math.random()*1000001)

        //Generate the temp JSONP function using the name above
        //First, call the function the user defined in the callback param [callback(json)]
        //Then delete the generated function from the window [delete window[generatedFunction]]
        window[generatedFunction] = function(json){
          callback(json);
          window[generatedFunction] = undefined;
          try { // IE8
            delete window[generatedFunction];
          } catch(e) {}
        };  

        //Check if the user set their own params, and if not add a ? to start a list of params
        //If in fact they did we add a & to add onto the params
        //example1: url = http://url.com THEN http://url.com?callback=X
        //example2: url = http://url.com?example=param THEN http://url.com?example=param&callback=X
        if(url.indexOf('?') === -1){ url = url+'?'; }
        else{ url = url+'&'; }
      
        //This generates the <script> tag
        var jsonpScript = document.createElement('script');
        jsonpScript.setAttribute("src", url+method+'='+generatedFunction);
        document.getElementsByTagName("head")[0].appendChild(jsonpScript)
    };
})