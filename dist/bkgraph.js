 (function (factory){
 	// AMD
 	if (typeof define !== "undefined" && define["amd"]) {
 		define(["exports"], factory.bind(window));
 	// No module loader
 	}
    else {
 		factory(window["bkgraph"] = {});
 	}
})(function (_exports) {

/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns only support repeat.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Non uniform scaling does not correctly scale strokes.
// * Optimize. There is always room for speed improvements.

// AMD by kener.linfeng@gmail.com
define('zrender/dep/excanvas',['require'],function(require) {
    
// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var IE_VERSION = +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1];

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  function encodeHtmlAttribute(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function addNamespace(doc, prefix, urn) {
    if (!doc.namespaces[prefix]) {
      doc.namespaces.add(prefix, urn, '#default#VML');
    }
  }

  function addNamespacesAndStylesheet(doc) {
    addNamespace(doc, 'g_vml_', 'urn:schemas-microsoft-com:vml');
    addNamespace(doc, 'g_o_', 'urn:schemas-microsoft-com:office:office');

    // Setup default CSS.  Only add one style sheet per document
    if (!doc.styleSheets['ex_canvas_']) {
      var ss = doc.createStyleSheet();
      ss.owningElement.id = 'ex_canvas_';
      ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
          // default size is 300x150 in Gecko and Opera
          'text-align:left;width:300px;height:150px}';
    }
  }

  // Add namespaces and stylesheet at startup.
  addNamespacesAndStylesheet(document);

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      var doc = opt_doc || document;
      // Create a dummy element so that IE will allow canvas elements to be
      // recognized.
      doc.createElement('canvas');
      doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
    },

    init_: function(doc) {
      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {
        el.getContext = getContext;

        // Add namespaces and stylesheet to document of the element.
        addNamespacesAndStylesheet(el.ownerDocument);

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue + 'px';
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue + 'px';
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.getContext().clearRect();
        el.style.width = el.attributes.width.nodeValue + 'px';
        // In IE8 this does not trigger onresize.
        el.firstChild.style.width =  el.clientWidth + 'px';
        break;
      case 'height':
        el.getContext().clearRect();
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.firstChild.style.height = el.clientHeight + 'px';
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var decToHex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      decToHex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.arcScaleX_    = o1.arcScaleX_;
    o2.arcScaleY_    = o1.arcScaleY_;
    o2.lineScale_    = o1.lineScale_;
  }

  var colorData = {
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgreen: '#006400',
    darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    grey: '#808080',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgreen: '#90EE90',
    lightgrey: '#D3D3D3',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    oldlace: '#FDF5E6',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    whitesmoke: '#F5F5F5',
    yellowgreen: '#9ACD32'
  };


  function getRgbHslContent(styleString) {
    var start = styleString.indexOf('(', 3);
    var end = styleString.indexOf(')', start + 1);
    var parts = styleString.substring(start + 1, end).split(',');
    // add alpha if needed
    if (parts.length != 4 || styleString.charAt(3) != 'a') {
      parts[3] = 1;
    }
    return parts;
  }

  function percent(s) {
    return parseFloat(s) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hslToRgb(parts){
    var r, g, b, h, s, l;
    h = parseFloat(parts[0]) / 360 % 360;
    if (h < 0)
      h++;
    s = clamp(percent(parts[1]), 0, 1);
    l = clamp(percent(parts[2]), 0, 1);
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return '#' + decToHex[Math.floor(r * 255)] +
        decToHex[Math.floor(g * 255)] +
        decToHex[Math.floor(b * 255)];
  }

  function hueToRgb(m1, m2, h) {
    if (h < 0)
      h++;
    if (h > 1)
      h--;

    if (6 * h < 1)
      return m1 + (m2 - m1) * 6 * h;
    else if (2 * h < 1)
      return m2;
    else if (3 * h < 2)
      return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    else
      return m1;
  }

  var processStyleCache = {};

  function processStyle(styleString) {
    if (styleString in processStyleCache) {
      return processStyleCache[styleString];
    }

    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.charAt(0) == '#') {
      str = styleString;
    } else if (/^rgb/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      var str = '#', n;
      for (var i = 0; i < 3; i++) {
        if (parts[i].indexOf('%') != -1) {
          n = Math.floor(percent(parts[i]) * 255);
        } else {
          n = +parts[i];
        }
        str += decToHex[clamp(n, 0, 255)];
      }
      alpha = +parts[3];
    } else if (/^hsl/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      str = hslToRgb(parts);
      alpha = parts[3];
    } else {
      str = colorData[styleString] || styleString;
    }
    return processStyleCache[styleString] = {color: str, alpha: alpha};
  }

  var DEFAULT_STYLE = {
    style: 'normal',
    variant: 'normal',
    weight: 'normal',
    size: 12,           //10
    family: '微软雅黑'     //'sans-serif'
  };

  // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
    if (fontStyleCache[styleString]) {
      return fontStyleCache[styleString];
    }

    var el = document.createElement('div');
    var style = el.style;
    var fontFamily;
    try {
      style.font = styleString;
      fontFamily = style.fontFamily.split(',')[0];
    } catch (ex) {
      // Ignore failures to set to invalid font.
    }

    return fontStyleCache[styleString] = {
      style: style.fontStyle || DEFAULT_STYLE.style,
      variant: style.fontVariant || DEFAULT_STYLE.variant,
      weight: style.fontWeight || DEFAULT_STYLE.weight,
      size: style.fontSize || DEFAULT_STYLE.size,
      family: fontFamily || DEFAULT_STYLE.family
    };
  }

  function getComputedStyle(style, element) {
    var computedStyle = {};

    for (var p in style) {
      computedStyle[p] = style[p];
    }

    // Compute the size
    var canvasFontSize = parseFloat(element.currentStyle.fontSize),
        fontSize = parseFloat(style.size);

    if (typeof style.size == 'number') {
      computedStyle.size = style.size;
    } else if (style.size.indexOf('px') != -1) {
      computedStyle.size = fontSize;
    } else if (style.size.indexOf('em') != -1) {
      computedStyle.size = canvasFontSize * fontSize;
    } else if(style.size.indexOf('%') != -1) {
      computedStyle.size = (canvasFontSize / 100) * fontSize;
    } else if (style.size.indexOf('pt') != -1) {
      computedStyle.size = fontSize / .75;
    } else {
      computedStyle.size = canvasFontSize;
    }

    // Different scaling between normal text and VML text. This was found using
    // trial and error to get the same size as non VML text.
    //computedStyle.size *= 0.981;

    return computedStyle;
  }

  function buildStyle(style) {
    return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
        style.size + "px '" + style.family + "'";
  }

  var lineCapMap = {
    'butt': 'flat',
    'round': 'round'
  };

  function processLineCap(lineCap) {
    return lineCapMap[lineCap] || 'square';
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} canvasElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(canvasElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    // this.font = '10px sans-serif';
    this.font = '12px 微软雅黑';        // 决定还是改这吧，影响代价最小
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = canvasElement;

    var cssText = 'width:' + canvasElement.clientWidth + 'px;height:' +
        canvasElement.clientHeight + 'px;overflow:hidden;position:absolute';
    var el = canvasElement.ownerDocument.createElement('div');
    el.style.cssText = cssText;
    canvasElement.appendChild(el);

    var overlayEl = el.cloneNode(false);
    // Use a non transparent background.
    overlayEl.style.backgroundColor = '#fff'; //red, I don't know why, it work! 
    overlayEl.style.filter = 'alpha(opacity=0)';
    canvasElement.appendChild(overlayEl);

    this.element_ = el;
    this.arcScaleX_ = 1;
    this.arcScaleY_ = 1;
    this.lineScale_ = 1;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    if (this.textMeasureEl_) {
      this.textMeasureEl_.removeNode(true);
      this.textMeasureEl_ = null;
    }
    this.element_.innerHTML = '';
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = getCoords(this, aX, aY);
    var cp1 = getCoords(this, aCP1x, aCP1y);
    var cp2 = getCoords(this, aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = getCoords(this, aCPx, aCPy);
    var p = getCoords(this, aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = getCoords(this, aX, aY);
    var pStart = getCoords(this, xStart, yStart);
    var pEnd = getCoords(this, xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  contextPrototype.drawImage = function(image, var_args) {
    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var d = getCoords(this, dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;

    var scaleX = scaleY = 1;
    
    // For some reason that I've now forgotten, using divs didn't work
    vmlStr.push(' <g_vml_:group',
                ' coordsize="', Z * W, ',', Z * H, '"',
                ' coordorigin="0,0"' ,
                ' style="width:', W, 'px;height:', H, 'px;position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.

    if (this.m_[0][0] != 1 || this.m_[0][1] ||
        this.m_[1][1] != 1 || this.m_[1][0]) {
      var filter = [];

      scaleX = Math.sqrt(this.m_[0][0] * this.m_[0][0] + this.m_[0][1] * this.m_[0][1]);
      scaleY = Math.sqrt(this.m_[1][0] * this.m_[1][0] + this.m_[1][1] * this.m_[1][1]);

      // Note the 12/21 reversal
      filter.push('M11=', this.m_[0][0] / scaleX, ',',
                  'M12=', this.m_[1][0] / scaleY, ',',
                  'M21=', this.m_[0][1] / scaleX, ',',
                  'M22=', this.m_[1][1] / scaleY, ',',
                  'Dx=', mr(d.x / Z), ',',
                  'Dy=', mr(d.y / Z), '');

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = getCoords(this, dx + dw, dy);
      var c3 = getCoords(this, dx, dy + dh);
      var c4 = getCoords(this, dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push('padding:0 ', mr(max.x / Z), 'px ', mr(max.y / Z),
                  'px 0;filter:progid:DXImageTransform.Microsoft.Matrix(',
                  filter.join(''), ", sizingmethod='clip');");

    } else {
      vmlStr.push('top:', mr(d.y / Z), 'px;left:', mr(d.x / Z), 'px;');
    }

    vmlStr.push(' ">');

    // Draw a special cropping div if needed
    if (sx || sy) {
      // Apply scales to width and height
      vmlStr.push('<div style="overflow: hidden; width:', Math.ceil((dw + sx * dw / sw) * scaleX), 'px;',
                  ' height:', Math.ceil((dh + sy * dh / sh) * scaleY), 'px;',
                  ' filter:progid:DxImageTransform.Microsoft.Matrix(Dx=',
                  -sx * dw / sw * scaleX, ',Dy=', -sy * dh / sh * scaleY, ');">');
    }
    
      
    // Apply scales to width and height
    vmlStr.push('<div style="width:', Math.round(scaleX * w * dw / sw), 'px;',
                ' height:', Math.round(scaleY * h * dh / sh), 'px;',
                ' filter:');
   
    // If there is a globalAlpha, apply it to image
    if(this.globalAlpha < 1) {
      vmlStr.push(' progid:DXImageTransform.Microsoft.Alpha(opacity=' + (this.globalAlpha * 100) + ')');
    }
    
    vmlStr.push(' progid:DXImageTransform.Microsoft.AlphaImageLoader(src=', image.src, ',sizingMethod=scale)">');
    
    // Close the crop div if necessary            
    if (sx || sy) vmlStr.push('</div>');
    
    vmlStr.push('</div></div>');
    
    this.element_.insertAdjacentHTML('BeforeEnd', vmlStr.join(''));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' filled="', !!aFill, '"',
                 ' style="position:absolute;width:', W, 'px;height:', H, 'px;"',
                 ' coordorigin="0,0"',
                 ' coordsize="', Z * W, ',', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          lineStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          lineStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          lineStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          lineStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          lineStr.push(' ', p.type, ' ',
                       mr(p.x - this.arcScaleX_ * p.radius), ',',
                       mr(p.y - this.arcScaleY_ * p.radius), ' ',
                       mr(p.x + this.arcScaleX_ * p.radius), ',',
                       mr(p.y + this.arcScaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }
    lineStr.push(' ">');

    if (!aFill) {
      appendStroke(this, lineStr);
    } else {
      appendFill(this, lineStr, min, max);
    }

    lineStr.push('</g_vml_:shape>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  function appendStroke(ctx, lineStr) {
    var a = processStyle(ctx.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * ctx.globalAlpha;
    var lineWidth = ctx.lineScale_ * ctx.lineWidth;

    // VML cannot correctly render a line if the width is less than 1px.
    // In that case, we dilute the color to make the line look thinner.
    if (lineWidth < 1) {
      opacity *= lineWidth;
    }

    lineStr.push(
      '<g_vml_:stroke',
      ' opacity="', opacity, '"',
      ' joinstyle="', ctx.lineJoin, '"',
      ' miterlimit="', ctx.miterLimit, '"',
      ' endcap="', processLineCap(ctx.lineCap), '"',
      ' weight="', lineWidth, 'px"',
      ' color="', color, '" />'
    );
  }

  function appendFill(ctx, lineStr, min, max) {
    var fillStyle = ctx.fillStyle;
    var arcScaleX = ctx.arcScaleX_;
    var arcScaleY = ctx.arcScaleY_;
    var width = max.x - min.x;
    var height = max.y - min.y;
    if (fillStyle instanceof CanvasGradient_) {
      // TODO: Gradients transformed with the transformation matrix.
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / arcScaleX;
        var y0 = fillStyle.y0_ / arcScaleY;
        var x1 = fillStyle.x1_ / arcScaleX;
        var y1 = fillStyle.y1_ / arcScaleY;
        var p0 = getCoords(ctx, x0, y0);
        var p1 = getCoords(ctx, x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width  /= arcScaleX * Z;
        height /= arcScaleY * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * ctx.globalAlpha;
      var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      // When colors attribute is used, the meanings of opacity and o:opacity2
      // are reversed.
      lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                   ' method="none" focus="100%"',
                   ' color="', color1, '"',
                   ' color2="', color2, '"',
                   ' colors="', colors.join(','), '"',
                   ' opacity="', opacity2, '"',
                   ' g_o_:opacity2="', opacity1, '"',
                   ' angle="', angle, '"',
                   ' focusposition="', focus.x, ',', focus.y, '" />');
    } else if (fillStyle instanceof CanvasPattern_) {
      if (width && height) {
        var deltaLeft = -min.x;
        var deltaTop = -min.y;
        lineStr.push('<g_vml_:fill',
                     ' position="',
                     deltaLeft / width * arcScaleX * arcScaleX, ',',
                     deltaTop / height * arcScaleY * arcScaleY, '"',
                     ' type="tile"',
                     // TODO: Figure out the correct size to fit the scale.
                     //' size="', w, 'px ', h, 'px"',
                     ' src="', fillStyle.src_, '" />');
       }
    } else {
      var a = processStyle(ctx.fillStyle);
      var color = a.color;
      var opacity = a.alpha * ctx.globalAlpha;
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                   '" />');
    }
  }

  contextPrototype.fill = function() {
    this.stroke(true);
  };

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  function getCoords(ctx, aX, aY) {
    var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    };
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    if (this.aStack_.length) {
      copyState(this.aStack_.pop(), this);
      this.m_ = this.mStack_.pop();
    }
  };

  function matrixIsFinite(m) {
    return isFinite(m[0][0]) && isFinite(m[0][1]) &&
        isFinite(m[1][0]) && isFinite(m[1][1]) &&
        isFinite(m[2][0]) && isFinite(m[2][1]);
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    this.arcScaleX_ *= aX;
    this.arcScaleY_ *= aY;
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };

  /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function(text, x, y, maxWidth, stroke) {
    var m = this.m_,
        delta = 1000,
        left = 0,
        right = delta,
        offset = {x: 0, y: 0},
        lineStr = [];

    var fontStyle = getComputedStyle(processFontStyle(this.font),
                                     this.element_);

    var fontStyleString = buildStyle(fontStyle);

    var elementStyle = this.element_.currentStyle;
    var textAlign = this.textAlign.toLowerCase();
    switch (textAlign) {
      case 'left':
      case 'center':
      case 'right':
        break;
      case 'end':
        textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
        break;
      case 'start':
        textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
        break;
      default:
        textAlign = 'left';
    }

    // 1.75 is an arbitrary number, as there is no info about the text baseline
    switch (this.textBaseline) {
      case 'hanging':
      case 'top':
        offset.y = fontStyle.size / 1.75;
        break;
      case 'middle':
        break;
      default:
      case null:
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        offset.y = -fontStyle.size / 2.25;
        break;
    }

    switch(textAlign) {
      case 'right':
        left = delta;
        right = 0.05;
        break;
      case 'center':
        left = right = delta / 2;
        break;
    }

    var d = getCoords(this, x + offset.x, y + offset.y);

    lineStr.push('<g_vml_:line from="', -left ,' 0" to="', right ,' 0.05" ',
                 ' coordsize="100 100" coordorigin="0 0"',
                 ' filled="', !stroke, '" stroked="', !!stroke,
                 '" style="position:absolute;width:1px;height:1px;">');

    if (stroke) {
      appendStroke(this, lineStr);
    } else {
      // TODO: Fix the min and max params.
      appendFill(this, lineStr, {x: -left, y: 0},
                 {x: right, y: fontStyle.size});
    }

    var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
                m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

    var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);

    lineStr.push('<g_vml_:skew on="t" matrix="', skewM ,'" ',
                 ' offset="', skewOffset, '" origin="', left ,' 0" />',
                 '<g_vml_:path textpathok="true" />',
                 '<g_vml_:textpath on="true" string="',
                 encodeHtmlAttribute(text),
                 '" style="v-text-align:', textAlign,
                 ';font:', encodeHtmlAttribute(fontStyleString),
                 '" /></g_vml_:line>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fillText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function(text) {
    if (!this.textMeasureEl_) {
      var s = '<span style="position:absolute;' +
          'top:-20000px;left:0;padding:0;margin:0;border:none;' +
          'white-space:pre;"></span>';
      this.element_.insertAdjacentHTML('beforeEnd', s);
      this.textMeasureEl_ = this.element_.lastChild;
    }
    var doc = this.element_.ownerDocument;
    this.textMeasureEl_.innerHTML = '';
    this.textMeasureEl_.style.font = this.font;
    // Don't use innerHTML or innerText because they allow markup/whitespace.
    this.textMeasureEl_.appendChild(doc.createTextNode(text));
    return {width: this.textMeasureEl_.offsetWidth};
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function(image, repetition) {
    return new CanvasPattern_(image, repetition);
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_(image, repetition) {
    assertImageIsValid(image);
    switch (repetition) {
      case 'repeat':
      case null:
      case '':
        this.repetition_ = 'repeat';
        break
      case 'repeat-x':
      case 'repeat-y':
      case 'no-repeat':
        this.repetition_ = repetition;
        break;
      default:
        throwException('SYNTAX_ERR');
    }

    this.src_ = image.src;
    this.width_ = image.width;
    this.height_ = image.height;
  }

  function throwException(s) {
    throw new DOMException_(s);
  }

  function assertImageIsValid(img) {
    if (!img || img.nodeType != 1 || img.tagName != 'IMG') {
      throwException('TYPE_MISMATCH_ERR');
    }
    if (img.readyState != 'complete') {
      throwException('INVALID_STATE_ERR');
    }
  }

  function DOMException_(s) {
    this.code = this[s];
    this.message = s +': DOM Exception ' + this.code;
  }
  var p = DOMException_.prototype = new Error;
  p.INDEX_SIZE_ERR = 1;
  p.DOMSTRING_SIZE_ERR = 2;
  p.HIERARCHY_REQUEST_ERR = 3;
  p.WRONG_DOCUMENT_ERR = 4;
  p.INVALID_CHARACTER_ERR = 5;
  p.NO_DATA_ALLOWED_ERR = 6;
  p.NO_MODIFICATION_ALLOWED_ERR = 7;
  p.NOT_FOUND_ERR = 8;
  p.NOT_SUPPORTED_ERR = 9;
  p.INUSE_ATTRIBUTE_ERR = 10;
  p.INVALID_STATE_ERR = 11;
  p.SYNTAX_ERR = 12;
  p.INVALID_MODIFICATION_ERR = 13;
  p.NAMESPACE_ERR = 14;
  p.INVALID_ACCESS_ERR = 15;
  p.VALIDATION_ERR = 16;
  p.TYPE_MISMATCH_ERR = 17;

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;
  DOMException = DOMException_;
})();

} // if
else { // make the canvas test simple by kener.linfeng@gmail.com
    G_vmlCanvasManager = false;
}
return G_vmlCanvasManager;
}); // define;
/**
 * zrender: 公共辅助函数
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *
 * clone：深度克隆
 * merge：合并源对象的属性到目标对象
 * getContext：获取一个自由使用的canvas 2D context，使用原生方法，如isPointInPath，measureText等
 */
define(
    'zrender/tool/util',['require','../dep/excanvas'],function(require) {
        // 用于处理merge时无法遍历Date等对象的问题
        var BUILTIN_OBJECT = {
            '[object Function]': 1,
            '[object RegExp]': 1,
            '[object Date]': 1,
            '[object Error]': 1,
            '[object CanvasGradient]': 1
        };

        /**
         * 对一个object进行深度拷贝
         *
         * @param {Any} source 需要进行拷贝的对象
         * @return {Any} 拷贝后的新对象
         */
        function clone(source) {
            if (typeof source == 'object' && source !== null) {
                var result = source;
                if (source instanceof Array) {
                    result = [];
                    for (var i = 0, len = source.length; i < len; i++) {
                        result[i] = clone(source[i]);
                    }
                }
                else if (!BUILTIN_OBJECT[Object.prototype.toString.call(source)]) {
                    result = {};
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            result[key] = clone(source[key]);
                        }
                    }
                }

                return result;
            }

            return source;
        }

        function mergeItem(target, source, key, overwrite) {
            if (source.hasOwnProperty(key)) {
                if (typeof target[key] == 'object'
                    && !BUILTIN_OBJECT[ Object.prototype.toString.call(target[key]) ]
                ) {
                    // 如果需要递归覆盖，就递归调用merge
                    merge(
                        target[key],
                        source[key],
                        overwrite
                    );
                }
                else if (overwrite || !(key in target)) {
                    // 否则只处理overwrite为true，或者在目标对象中没有此属性的情况
                    target[key] = source[key];
                }
            }
        }

        /**
         * 合并源对象的属性到目标对象
         * modify from Tangram
         * @param {*} target 目标对象
         * @param {*} source 源对象
         * @param {boolean} overwrite 是否覆盖
         */
        function merge(target, source, overwrite) {
            for (var i in source) {
                mergeItem(target, source, i, overwrite);
            }
            
            return target;
        }

        var _ctx;

        function getContext() {
            if (!_ctx) {
                require('../dep/excanvas');
                /* jshint ignore:start */
                if (G_vmlCanvasManager) {
                    var _div = document.createElement('div');
                    _div.style.position = 'absolute';
                    _div.style.top = '-1000px';
                    document.body.appendChild(_div);

                    _ctx = G_vmlCanvasManager.initElement(_div)
                               .getContext('2d');
                }
                else {
                    _ctx = document.createElement('canvas').getContext('2d');
                }
                /* jshint ignore:end */
            }
            return _ctx;
        }

        var _canvas;
        var _pixelCtx;
        var _width;
        var _height;
        var _offsetX = 0;
        var _offsetY = 0;

        /**
         * 获取像素拾取专用的上下文
         * @return {Object} 上下文
         */
        function getPixelContext() {
            if (!_pixelCtx) {
                _canvas = document.createElement('canvas');
                _width = _canvas.width;
                _height = _canvas.height;
                _pixelCtx = _canvas.getContext('2d');
            }
            return _pixelCtx;
        }

        /**
         * 如果坐标处在_canvas外部，改变_canvas的大小
         * @param {number} x : 横坐标
         * @param {number} y : 纵坐标
         * 注意 修改canvas的大小 需要重新设置translate
         */
        function adjustCanvasSize(x, y) {
            // 每次加的长度
            var _v = 100;
            var _flag;

            if (x + _offsetX > _width) {
                _width = x + _offsetX + _v;
                _canvas.width = _width;
                _flag = true;
            }

            if (y + _offsetY > _height) {
                _height = y + _offsetY + _v;
                _canvas.height = _height;
                _flag = true;
            }

            if (x < -_offsetX) {
                _offsetX = Math.ceil(-x / _v) * _v;
                _width += _offsetX;
                _canvas.width = _width;
                _flag = true;
            }

            if (y < -_offsetY) {
                _offsetY = Math.ceil(-y / _v) * _v;
                _height += _offsetY;
                _canvas.height = _height;
                _flag = true;
            }

            if (_flag) {
                _pixelCtx.translate(_offsetX, _offsetY);
            }
        }

        /**
         * 获取像素canvas的偏移量
         * @return {Object} 偏移量
         */
        function getPixelOffset() {
            return {
                x : _offsetX,
                y : _offsetY
            };
        }

        /**
         * 查询数组中元素的index
         */
        function indexOf(array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * 构造类继承关系
         * 
         * @param {Function} clazz 源类
         * @param {Function} baseClazz 基类
         */
        function inherits(clazz, baseClazz) {
            var clazzPrototype = clazz.prototype;
            function F() {}
            F.prototype = baseClazz.prototype;
            clazz.prototype = new F();

            for (var prop in clazzPrototype) {
                clazz.prototype[prop] = clazzPrototype[prop];
            }
            clazz.constructor = clazz;
        }

        return {
            inherits: inherits,
            clone : clone,
            merge : merge,
            getContext : getContext,
            getPixelContext : getPixelContext,
            getPixelOffset : getPixelOffset,
            adjustCanvasSize : adjustCanvasSize,
            indexOf : indexOf
        };
    }
);

define('zrender/config',[],function () {
    /**
     * config默认配置项
     * @exports zrender/config
     * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
     */
    var config = {
        /**
         * @namespace module:zrender/config.EVENT
         */
        EVENT : {
            /**
             * 窗口大小变化
             * @type {string}
             */
            RESIZE : 'resize',
            /**
             * 鼠标按钮被（手指）按下，事件对象是：目标图形元素或空
             * @type {string}
             */
            CLICK : 'click',
            /**
             * 双击事件
             * @type {string}
             */
            DBLCLICK : 'dblclick',
            /**
             * 鼠标滚轮变化，事件对象是：目标图形元素或空
             * @type {string}
             */
            MOUSEWHEEL : 'mousewheel',
            /**
             * 鼠标（手指）被移动，事件对象是：目标图形元素或空
             * @type {string}
             */
            MOUSEMOVE : 'mousemove',
            /**
             * 鼠标移到某图形元素之上，事件对象是：目标图形元素
             * @type {string}
             */
            MOUSEOVER : 'mouseover',
            /**
             * 鼠标从某图形元素移开，事件对象是：目标图形元素
             * @type {string}
             */
            MOUSEOUT : 'mouseout',
            /**
             * 鼠标按钮（手指）被按下，事件对象是：目标图形元素或空
             * @type {string}
             */
            MOUSEDOWN : 'mousedown',
            /**
             * 鼠标按键（手指）被松开，事件对象是：目标图形元素或空
             * @type {string}
             */
            MOUSEUP : 'mouseup',
            /**
             * 全局离开，MOUSEOUT触发比较频繁，一次离开优化绑定
             * @type {string}
             */
            GLOBALOUT : 'globalout',    // 

            // 一次成功元素拖拽的行为事件过程是：
            // dragstart > dragenter > dragover [> dragleave] > drop > dragend
            /**
             * 开始拖拽时触发，事件对象是：被拖拽图形元素
             * @type {string}
             */
            DRAGSTART : 'dragstart',
            /**
             * 拖拽完毕时触发（在drop之后触发），事件对象是：被拖拽图形元素
             * @type {string}
             */
            DRAGEND : 'dragend',
            /**
             * 拖拽图形元素进入目标图形元素时触发，事件对象是：目标图形元素
             * @type {string}
             */
            DRAGENTER : 'dragenter',
            /**
             * 拖拽图形元素在目标图形元素上移动时触发，事件对象是：目标图形元素
             * @type {string}
             */
            DRAGOVER : 'dragover',
            /**
             * 拖拽图形元素离开目标图形元素时触发，事件对象是：目标图形元素
             * @type {string}
             */
            DRAGLEAVE : 'dragleave',
            /**
             * 拖拽图形元素放在目标图形元素内时触发，事件对象是：目标图形元素
             * @type {string}
             */
            DROP : 'drop',
            /**
             * touch end - start < delay is click
             * @type {number}
             */
            touchClickDelay : 300
        },

        // 是否异常捕获
        catchBrushException: false,

        /**
         * debug日志选项：catchBrushException为true下有效
         * 0 : 不生成debug数据，发布用
         * 1 : 异常抛出，调试用
         * 2 : 控制台输出，调试用
         */
        debugMode: 0
    };
    return config;
});


define(
    'zrender/tool/log',['require','../config'],function (require) {
        var config = require('../config');

        /**
         * @exports zrender/tool/log
         * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
         */
        return function() {
            if (config.debugMode === 0) {
                return;
            }
            else if (config.debugMode == 1) {
                for (var k in arguments) {
                    throw new Error(arguments[k]);
                }
            }
            else if (config.debugMode > 1) {
                for (var k in arguments) {
                    console.log(arguments[k]);
                }
            }
        };

        /* for debug
        return function(mes) {
            document.getElementById('wrong-message').innerHTML =
                mes + ' ' + (new Date() - 0)
                + '<br/>' 
                + document.getElementById('wrong-message').innerHTML;
        };
        */
    }
);

/**
 * zrender: 生成唯一id
 *
 * @author errorrik (errorrik@gmail.com)
 */

define(
    'zrender/tool/guid',[],function() {
        var idStart = 0x0907;

        return function () {
            return 'zrender__' + (idStart++);
        };
    }
);

/**
 * echarts设备环境识别
 *
 * @desc echarts基于Canvas，纯Javascript图表库，提供直观，生动，可交互，可个性化定制的数据统计图表。
 * @author firede[firede@firede.us]
 * @desc thanks zepto.
 */
define('zrender/tool/env',[],function() {
    // Zepto.js
    // (c) 2010-2013 Thomas Fuchs
    // Zepto.js may be freely distributed under the MIT license.

    function detect(ua) {
        var os = this.os = {};
        var browser = this.browser = {};
        var webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/);
        var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
        var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
        var iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
        var webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/);
        var touchpad = webos && ua.match(/TouchPad/);
        var kindle = ua.match(/Kindle\/([\d.]+)/);
        var silk = ua.match(/Silk\/([\d._]+)/);
        var blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/);
        var bb10 = ua.match(/(BB10).*Version\/([\d.]+)/);
        var rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/);
        var playbook = ua.match(/PlayBook/);
        var chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/);
        var firefox = ua.match(/Firefox\/([\d.]+)/);
        var ie = ua.match(/MSIE ([\d.]+)/);
        var safari = webkit && ua.match(/Mobile\//) && !chrome;
        var webview = ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/) && !chrome;
        var ie = ua.match(/MSIE\s([\d.]+)/);

        // Todo: clean this up with a better OS/browser seperation:
        // - discern (more) between multiple browsers on android
        // - decide if kindle fire in silk mode is android or not
        // - Firefox on Android doesn't specify the Android version
        // - possibly devide in os, device and browser hashes

        if (browser.webkit = !!webkit) browser.version = webkit[1];

        if (android) os.android = true, os.version = android[2];
        if (iphone && !ipod) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.');
        if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.');
        if (ipod) os.ios = os.ipod = true, os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
        if (webos) os.webos = true, os.version = webos[2];
        if (touchpad) os.touchpad = true;
        if (blackberry) os.blackberry = true, os.version = blackberry[2];
        if (bb10) os.bb10 = true, os.version = bb10[2];
        if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2];
        if (playbook) browser.playbook = true;
        if (kindle) os.kindle = true, os.version = kindle[1];
        if (silk) browser.silk = true, browser.version = silk[1];
        if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true;
        if (chrome) browser.chrome = true, browser.version = chrome[1];
        if (firefox) browser.firefox = true, browser.version = firefox[1];
        if (ie) browser.ie = true, browser.version = ie[1];
        if (safari && (ua.match(/Safari/) || !!os.ios)) browser.safari = true;
        if (webview) browser.webview = true;
        if (ie) browser.ie = true, browser.version = ie[1];

        os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) ||
            (firefox && ua.match(/Tablet/)) || (ie && !ua.match(/Phone/) && ua.match(/Touch/)));
        os.phone  = !!(!os.tablet && !os.ipod && (android || iphone || webos || blackberry || bb10 ||
            (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) ||
            (firefox && ua.match(/Mobile/)) || (ie && ua.match(/Touch/))));

        return {
            browser: browser,
            os: os,
            // 原生canvas支持
            canvasSupported : document.createElement('canvas').getContext 
                              ? true : false 
        };
    }

    return detect(navigator.userAgent);
});
/**
 * 事件扩展
 * @module zrender/mixin/Eventful
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         pissang (https://www.github.com/pissang)
 */
define('zrender/mixin/Eventful',['require'],function (require) {

    /**
     * 事件分发器
     * @alias module:zrender/mixin/Eventful
     * @constructor
     */
    var Eventful = function () {
        this._handlers = {};
    };
    /**
     * 单次触发绑定，dispatch后销毁
     * 
     * @param {string} event 事件名
     * @param {Function} handler 响应函数
     * @param {Object} context
     */
    Eventful.prototype.one = function (event, handler, context) {
        var _h = this._handlers;

        if (!handler || !event) {
            return this;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h : handler,
            one : true,
            ctx: context || this
        });

        return this;
    };

    /**
     * 绑定事件
     * @param {string} event 事件名
     * @param {Function} handler 事件处理函数
     * @param {Object} context
     */
    Eventful.prototype.bind = function (event, handler, context) {
        var _h = this._handlers;

        if (!handler || !event) {
            return this;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h : handler,
            one : false,
            ctx: context || this
        });

        return this;
    };

    /**
     * 解绑事件
     * @param {string} event 事件名
     * @param {Function} [handler] 事件处理函数
     */
    Eventful.prototype.unbind = function (event, handler) {
        var _h = this._handlers;

        if (!event) {
            this._handlers = {};
            return this;
        }

        if (handler) {
            if (_h[event]) {
                var newList = [];
                for (var i = 0, l = _h[event].length; i < l; i++) {
                    if (_h[event][i]['h'] != handler) {
                        newList.push(_h[event][i]);
                    }
                }
                _h[event] = newList;
            }

            if (_h[event] && _h[event].length === 0) {
                delete _h[event];
            }
        }
        else {
            delete _h[event];
        }

        return this;
    };

    /**
     * 事件分发
     * 
     * @param {string} type 事件类型
     */
    Eventful.prototype.dispatch = function (type) {
        if (this._handlers[type]) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 3) {
                args = Array.prototype.slice.call(args, 1);
            }
            
            var _h = this._handlers[type];
            var len = _h.length;
            for (var i = 0; i < len;) {
                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        _h[i]['h'].call(_h[i]['ctx']);
                        break;
                    case 2:
                        _h[i]['h'].call(_h[i]['ctx'], args[1]);
                        break;
                    case 3:
                        _h[i]['h'].call(_h[i]['ctx'], args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        _h[i]['h'].apply(_h[i]['ctx'], args);
                        break;
                }
                
                if (_h[i]['one']) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        return this;
    };

    /**
     * 带有context的事件分发, 最后一个参数是事件回调的context
     * @param {string} type 事件类型
     */
    Eventful.prototype.dispatchWithContext = function (type) {
        if (this._handlers[type]) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 4) {
                args = Array.prototype.slice.call(args, 1, args.length - 1);
            }
            var ctx = args[args.length - 1];

            var _h = this._handlers[type];
            var len = _h.length;
            for (var i = 0; i < len;) {
                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        _h[i]['h'].call(ctx);
                        break;
                    case 2:
                        _h[i]['h'].call(ctx, args[1]);
                        break;
                    case 3:
                        _h[i]['h'].call(ctx, args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        _h[i]['h'].apply(ctx, args);
                        break;
                }
                
                if (_h[i]['one']) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        return this;
    };

    // 对象可以通过 onxxxx 绑定事件
    /**
     * @event module:zrender/mixin/Eventful#onclick
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseover
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseout
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousemove
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousewheel
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousedown
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseup
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragstart
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragend
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragenter
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragleave
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragover
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondrop
     * @type {Function}
     * @default null
     */
    
    return Eventful;
});

/**
 * 事件辅助类
 * @module zrender/tool/event
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 */
define(
    'zrender/tool/event',['require','../mixin/Eventful'],function(require) {

        

        var Eventful = require('../mixin/Eventful');

        /**
        * 提取鼠标（手指）x坐标
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 鼠标（手指）x坐标.
        */
        function getX(e) {
            return typeof e.zrenderX != 'undefined' && e.zrenderX
                   || typeof e.offsetX != 'undefined' && e.offsetX
                   || typeof e.layerX != 'undefined' && e.layerX
                   || typeof e.clientX != 'undefined' && e.clientX;
        }

        /**
        * 提取鼠标y坐标
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 鼠标（手指）y坐标.
        */
        function getY(e) {
            return typeof e.zrenderY != 'undefined' && e.zrenderY
                   || typeof e.offsetY != 'undefined' && e.offsetY
                   || typeof e.layerY != 'undefined' && e.layerY
                   || typeof e.clientY != 'undefined' && e.clientY;
        }

        /**
        * 提取鼠标滚轮变化
        * @memberOf module:zrender/tool/event
        * @param  {Event} e 事件.
        * @return {number} 滚轮变化，正值说明滚轮是向上滚动，如果是负值说明滚轮是向下滚动
        */
        function getDelta(e) {
            return typeof e.zrenderDelta != 'undefined' && e.zrenderDelta
                   || typeof e.wheelDelta != 'undefined' && e.wheelDelta
                   || typeof e.detail != 'undefined' && -e.detail;
        }

        /**
         * 停止冒泡和阻止默认行为
         * @memberOf module:zrender/tool/event
         * @method
         * @param {Event} e : event对象
         */
        var stop = typeof window.addEventListener === 'function'
            ? function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.cancelBubble = true;
            }
            : function (e) {
                e.returnValue = false;
                e.cancelBubble = true;
            };
        
        return {
            getX : getX,
            getY : getY,
            getDelta : getDelta,
            stop : stop,
            // 做向上兼容
            Dispatcher : Eventful
        };
    }
);

define(
    'zrender/tool/vector',[],function () {
        var ArrayCtor = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;

        /**
         * @typedef {Float32Array|Array.<number>} Vector2
         */
        /**
         * 二维向量类
         * @exports zrender/tool/vector
         */
        var vector = {
            /**
             * 创建一个向量
             * @param {number} [x=0]
             * @param {number} [y=0]
             * @return {Vector2}
             */
            create: function (x, y) {
                var out = new ArrayCtor(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },

            /**
             * 复制一个向量
             * @return {Vector2} out
             * @return {Vector2} v
             */
            copy: function (out, v) {
                out[0] = v[0];
                out[1] = v[1];
                return out;
            },

            /**
             * 设置向量的两个项
             * @param {Vector2} out
             * @param {number} a
             * @param {number} b
             * @return {Vector2} 结果
             */
            set: function (out, a, b) {
                out[0] = a;
                out[1] = b;
                return out;
            },

            /**
             * 向量相加
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            add: function (out, v1, v2) {
                out[0] = v1[0] + v2[0];
                out[1] = v1[1] + v2[1];
                return out;
            },

            /**
             * 向量缩放后相加
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @param {number} a
             */
            scaleAndAdd: function (out, v1, v2, a) {
                out[0] = v1[0] + v2[0] * a;
                out[1] = v1[1] + v2[1] * a;
                return out;
            },

            /**
             * 向量相减
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            sub: function (out, v1, v2) {
                out[0] = v1[0] - v2[0];
                out[1] = v1[1] - v2[1];
                return out;
            },

            /**
             * 向量长度
             * @param {Vector2} v
             * @return {number}
             */
            len: function (v) {
                return Math.sqrt(this.lenSquare(v));
            },

            /**
             * 向量长度平方
             * @param {Vector2} v
             * @return {number}
             */
            lenSquare: function (v) {
                return v[0] * v[0] + v[1] * v[1];
            },

            /**
             * 向量乘法
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            mul: function (out, v1, v2) {
                out[0] = v1[0] * v2[0];
                out[1] = v1[1] * v2[1];
                return out;
            },

            /**
             * 向量除法
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            div: function (out, v1, v2) {
                out[0] = v1[0] / v2[0];
                out[1] = v1[1] / v2[1];
                return out;
            },

            /**
             * 向量点乘
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            dot: function (v1, v2) {
                return v1[0] * v2[0] + v1[1] * v2[1];
            },

            /**
             * 向量缩放
             * @param {Vector2} out
             * @param {Vector2} v
             * @param {number} s
             */
            scale: function (out, v, s) {
                out[0] = v[0] * s;
                out[1] = v[1] * s;
                return out;
            },

            /**
             * 向量归一化
             * @param {Vector2} out
             * @param {Vector2} v
             */
            normalize: function (out, v) {
                var d = vector.len(v);
                if (d === 0) {
                    out[0] = 0;
                    out[1] = 0;
                }
                else {
                    out[0] = v[0] / d;
                    out[1] = v[1] / d;
                }
                return out;
            },

            /**
             * 计算向量间距离
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            distance: function (v1, v2) {
                return Math.sqrt(
                    (v1[0] - v2[0]) * (v1[0] - v2[0])
                    + (v1[1] - v2[1]) * (v1[1] - v2[1])
                );
            },

            /**
             * 向量距离平方
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            distanceSquare: function (v1, v2) {
                return (v1[0] - v2[0]) * (v1[0] - v2[0])
                    + (v1[1] - v2[1]) * (v1[1] - v2[1]);
            },

            /**
             * 求负向量
             * @param {Vector2} out
             * @param {Vector2} v
             */
            negate: function (out, v) {
                out[0] = -v[0];
                out[1] = -v[1];
                return out;
            },

            /**
             * 插值两个点
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @param {number} t
             */
            lerp: function (out, v1, v2, t) {
                // var ax = v1[0];
                // var ay = v1[1];
                out[0] = v1[0] + t * (v2[0] - v1[0]);
                out[1] = v1[1] + t * (v2[1] - v1[1]);
                return out;
            },
            
            /**
             * 矩阵左乘向量
             * @param {Vector2} out
             * @param {Vector2} v
             * @param {Vector2} m
             */
            applyTransform: function (out, v, m) {
                var x = v[0];
                var y = v[1];
                out[0] = m[0] * x + m[2] * y + m[4];
                out[1] = m[1] * x + m[3] * y + m[5];
                return out;
            },
            /**
             * 求两个向量最小值
             * @param  {Vector2} out
             * @param  {Vector2} v1
             * @param  {Vector2} v2
             */
            min: function (out, v1, v2) {
                out[0] = Math.min(v1[0], v2[0]);
                out[1] = Math.min(v1[1], v2[1]);
                return out;
            },
            /**
             * 求两个向量最大值
             * @param  {Vector2} out
             * @param  {Vector2} v1
             * @param  {Vector2} v2
             */
            max: function (out, v1, v2) {
                out[0] = Math.max(v1[0], v2[0]);
                out[1] = Math.max(v1[1], v2[1]);
                return out;
            }
        };

        vector.length = vector.len;
        vector.lengthSquare = vector.lenSquare;
        vector.dist = vector.distance;
        vector.distSquare = vector.distanceSquare;
        
        return vector;
    }
);

define(
    'zrender/tool/matrix',[],function () {

        var ArrayCtor = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;
        /**
         * 3x2矩阵操作类
         * @exports zrender/tool/matrix
         */
        var matrix = {
            /**
             * 创建一个单位矩阵
             * @return {Float32Array|Array.<number>}
             */
            create : function() {
                var out = new ArrayCtor(6);
                matrix.identity(out);
                
                return out;
            },
            /**
             * 设置矩阵为单位矩阵
             * @param {Float32Array|Array.<number>} out
             */
            identity : function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
                return out;
            },
            /**
             * 复制矩阵
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} m
             */
            copy: function(out, m) {
                out[0] = m[0];
                out[1] = m[1];
                out[2] = m[2];
                out[3] = m[3];
                out[4] = m[4];
                out[5] = m[5];
                return out;
            },
            /**
             * 矩阵相乘
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} m1
             * @param {Float32Array|Array.<number>} m2
             */
            mul : function (out, m1, m2) {
                out[0] = m1[0] * m2[0] + m1[2] * m2[1];
                out[1] = m1[1] * m2[0] + m1[3] * m2[1];
                out[2] = m1[0] * m2[2] + m1[2] * m2[3];
                out[3] = m1[1] * m2[2] + m1[3] * m2[3];
                out[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
                out[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
                return out;
            },
            /**
             * 平移变换
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {Float32Array|Array.<number>} v
             */
            translate : function(out, a, v) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4] + v[0];
                out[5] = a[5] + v[1];
                return out;
            },
            /**
             * 旋转变换
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {number} rad
             */
            rotate : function(out, a, rad) {
                var aa = a[0];
                var ac = a[2];
                var atx = a[4];
                var ab = a[1];
                var ad = a[3];
                var aty = a[5];
                var st = Math.sin(rad);
                var ct = Math.cos(rad);

                out[0] = aa * ct + ab * st;
                out[1] = -aa * st + ab * ct;
                out[2] = ac * ct + ad * st;
                out[3] = -ac * st + ct * ad;
                out[4] = ct * atx + st * aty;
                out[5] = ct * aty - st * atx;
                return out;
            },
            /**
             * 缩放变换
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {Float32Array|Array.<number>} v
             */
            scale : function(out, a, v) {
                var vx = v[0];
                var vy = v[1];
                out[0] = a[0] * vx;
                out[1] = a[1] * vy;
                out[2] = a[2] * vx;
                out[3] = a[3] * vy;
                out[4] = a[4] * vx;
                out[5] = a[5] * vy;
                return out;
            },
            /**
             * 求逆矩阵
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             */
            invert : function(out, a) {
            
                var aa = a[0];
                var ac = a[2];
                var atx = a[4];
                var ab = a[1];
                var ad = a[3];
                var aty = a[5];

                var det = aa * ad - ab * ac;
                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] = ad * det;
                out[1] = -ab * det;
                out[2] = -ac * det;
                out[3] = aa * det;
                out[4] = (ac * aty - ad * atx) * det;
                out[5] = (ab * atx - aa * aty) * det;
                return out;
            },

            /**
             * 矩阵左乘向量
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {Float32Array|Array.<number>} v
             */
            mulVector : function(out, a, v) {
                var aa = a[0];
                var ac = a[2];
                var atx = a[4];
                var ab = a[1];
                var ad = a[3];
                var aty = a[5];

                out[0] = v[0] * aa + v[1] * ac + atx;
                out[1] = v[0] * ab + v[1] * ad + aty;

                return out;
            }
        };

        return matrix;
    }
);

/**
 * Handler控制模块
 * @module zrender/Handler
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 */

define(
    'zrender/Handler',['require','./config','./tool/env','./tool/event','./tool/util','./tool/vector','./tool/matrix','./mixin/Eventful'],function (require) {

        

        var config = require('./config');
        var env = require('./tool/env');
        var eventTool = require('./tool/event');
        var util = require('./tool/util');
        var vec2 = require('./tool/vector');
        var mat2d = require('./tool/matrix');
        var EVENT = config.EVENT;

        var Eventful = require('./mixin/Eventful');

        var domHandlerNames = [
            'resize', 'click', 'dblclick',
            'mousewheel', 'mousemove', 'mouseout', 'mouseup', 'mousedown',
            'touchstart', 'touchend', 'touchmove'
        ];

        var domHandlers = {
            /**
             * 窗口大小改变响应函数
             * @inner
             * @param {Event} event
             */
            resize: function (event) {
                event = event || window.event;
                this._lastHover = null;
                this._isMouseDown = 0;
                
                // 分发config.EVENT.RESIZE事件，global
                this.dispatch(EVENT.RESIZE, event);
            },

            /**
             * 点击响应函数
             * @inner
             * @param {Event} event
             */
            click: function (event) {
                event = this._zrenderEventFixed(event);

                // 分发config.EVENT.CLICK事件
                var _lastHover = this._lastHover;
                if ((_lastHover && _lastHover.clickable)
                    || !_lastHover
                ) {

                    // 判断没有发生拖拽才触发click事件
                    if (this._clickThreshold < 5) {
                        this._dispatchAgency(_lastHover, EVENT.CLICK, event);
                    }
                }

                this._mousemoveHandler(event);
            },
            
            /**
             * 双击响应函数
             * @inner
             * @param {Event} event
             */
            dblclick: function (event) {
                event = this._zrenderEventFixed(event);

                // 分发config.EVENT.DBLCLICK事件
                var _lastHover = this._lastHover;
                if ((_lastHover && _lastHover.clickable)
                    || !_lastHover
                ) {

                    // 判断没有发生拖拽才触发dblclick事件
                    if (this._clickThreshold < 5) {
                        this._dispatchAgency(_lastHover, EVENT.DBLCLICK, event);
                    }
                }

                this._mousemoveHandler(event);
            },
            

            /**
             * 鼠标滚轮响应函数
             * @inner
             * @param {Event} event
             */
            mousewheel: function (event) {
                event = this._zrenderEventFixed(event);

                // http://www.sitepoint.com/html5-javascript-mouse-wheel/
                // https://developer.mozilla.org/en-US/docs/DOM/DOM_event_reference/mousewheel
                var delta = event.wheelDelta // Webkit
                            || -event.detail; // Firefox
                var scale = delta > 0 ? 1.1 : 1 / 1.1;

                var layers = this.painter.getLayers();

                var needsRefresh = false;
                for (var z in layers) {
                    if (z !== 'hover') {
                        var layer = layers[z];
                        var pos = layer.position;
                        if (layer.zoomable) {
                            layer.__zoom = layer.__zoom || 1;
                            var newZoom = layer.__zoom;
                            newZoom *= scale;
                            newZoom = Math.max(
                                Math.min(layer.maxZoom, newZoom),
                                layer.minZoom
                            );
                            scale = newZoom / layer.__zoom;
                            layer.__zoom = newZoom;
                            // Keep the mouse center when scaling
                            pos[0] -= (this._mouseX - pos[0]) * (scale - 1);
                            pos[1] -= (this._mouseY - pos[1]) * (scale - 1);
                            layer.scale[0] *= scale;
                            layer.scale[1] *= scale;
                            layer.dirty = true;
                            needsRefresh = true;
                        }
                    }
                }
                if (needsRefresh) {
                    this.painter.refresh();
                }

                // 分发config.EVENT.MOUSEWHEEL事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEWHEEL, event);
                this._mousemoveHandler(event);
            },

            /**
             * 鼠标（手指）移动响应函数
             * @inner
             * @param {Event} event
             */
            mousemove: function (event) {
                if (this.painter.isLoading()) {
                    return;
                }
                // 拖拽不触发click事件
                this._clickThreshold++;

                event = this._zrenderEventFixed(event);
                this._lastX = this._mouseX;
                this._lastY = this._mouseY;
                this._mouseX = eventTool.getX(event);
                this._mouseY = eventTool.getY(event);
                var dx = this._mouseX - this._lastX;
                var dy = this._mouseY - this._lastY;

                // 可能出现config.EVENT.DRAGSTART事件
                // 避免手抖点击误认为拖拽
                // if (this._mouseX - this._lastX > 1 || this._mouseY - this._lastY > 1) {
                this._processDragStart(event);
                // }
                this._hasfound = 0;
                this._event = event;

                this._iterateAndFindHover();

                // 找到的在迭代函数里做了处理，没找到得在迭代完后处理
                if (!this._hasfound) {
                    // 过滤首次拖拽产生的mouseout和dragLeave
                    if (!this._draggingTarget
                        || (this._lastHover && this._lastHover != this._draggingTarget)
                    ) {
                        // 可能出现config.EVENT.MOUSEOUT事件
                        this._processOutShape(event);

                        // 可能出现config.EVENT.DRAGLEAVE事件
                        this._processDragLeave(event);
                    }

                    this._lastHover = null;
                    this.storage.delHover();
                    this.painter.clearHover();
                }

                // set cursor for root element
                var cursor = 'default';

                // 如果存在拖拽中元素，被拖拽的图形元素最后addHover
                if (this._draggingTarget) {
                    this.storage.drift(this._draggingTarget.id, dx, dy);
                    this._draggingTarget.modSelf();
                    this.storage.addHover(this._draggingTarget);
                }
                else if (this._isMouseDown) {
                    // Layer dragging
                    var layers = this.painter.getLayers();

                    var needsRefresh = false;
                    for (var z in layers) {
                        if (z !== 'hover') {
                            var layer = layers[z];
                            if (layer.panable) {
                                // PENDING
                                cursor = 'move';
                                // Keep the mouse center when scaling
                                layer.position[0] += dx;
                                layer.position[1] += dy;
                                needsRefresh = true;
                                layer.dirty = true;
                            }
                        }
                    }
                    if (needsRefresh) {
                        this.painter.refresh();
                    }
                }

                if (this._draggingTarget || (this._hasfound && this._lastHover.draggable)) {
                    cursor = 'move';
                }
                else if (this._hasfound && this._lastHover.clickable) {
                    cursor = 'pointer';
                }
                this.root.style.cursor = cursor;

                // 分发config.EVENT.MOUSEMOVE事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEMOVE, event);

                if (this._draggingTarget || this._hasfound || this.storage.hasHoverShape()) {
                    this.painter.refreshHover();
                }
            },

            /**
             * 鼠标（手指）离开响应函数
             * @inner
             * @param {Event} event
             */
            mouseout: function (event) {
                event = this._zrenderEventFixed(event);

                var element = event.toElement || event.relatedTarget;
                if (element != this.root) {
                    while (element && element.nodeType != 9) {
                        // 忽略包含在root中的dom引起的mouseOut
                        if (element == this.root) {
                            this._mousemoveHandler(event);
                            return;
                        }

                        element = element.parentNode;
                    }
                }

                event.zrenderX = this._lastX;
                event.zrenderY = this._lastY;
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;

                this._processOutShape(event);
                this._processDrop(event);
                this._processDragEnd(event);
                if (!this.painter.isLoading()) {
                    this.painter.refreshHover();
                }
                
                this.dispatch(EVENT.GLOBALOUT, event);
            },

            /**
             * 鼠标（手指）按下响应函数
             * @inner
             * @param {Event} event
             */
            mousedown: function (event) {
                // 重置 clickThreshold
                this._clickThreshold = 0;

                if (this._lastDownButton == 2) {
                    this._lastDownButton = event.button;
                    this._mouseDownTarget = null;
                    // 仅作为关闭右键菜单使用
                    return;
                }

                this._lastMouseDownMoment = new Date();
                event = this._zrenderEventFixed(event);
                this._isMouseDown = 1;

                // 分发config.EVENT.MOUSEDOWN事件
                this._mouseDownTarget = this._lastHover;
                this._dispatchAgency(this._lastHover, EVENT.MOUSEDOWN, event);
                this._lastDownButton = event.button;
            },

            /**
             * 鼠标（手指）抬起响应函数
             * @inner
             * @param {Event} event
             */
            mouseup: function (event) {
                event = this._zrenderEventFixed(event);
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;
                this._mouseDownTarget = null;

                // 分发config.EVENT.MOUSEUP事件
                this._dispatchAgency(this._lastHover, EVENT.MOUSEUP, event);
                this._processDrop(event);
                this._processDragEnd(event);
            },

            /**
             * Touch开始响应函数
             * @inner
             * @param {Event} event
             */
            touchstart: function (event) {
                // eventTool.stop(event);// 阻止浏览器默认事件，重要
                event = this._zrenderEventFixed(event, true);
                this._lastTouchMoment = new Date();

                // 平板补充一次findHover
                this._mobildFindFixed(event);
                this._mousedownHandler(event);
            },

            /**
             * Touch移动响应函数
             * @inner
             * @param {Event} event
             */
            touchmove: function (event) {
                event = this._zrenderEventFixed(event, true);
                this._mousemoveHandler(event);
                if (this._isDragging) {
                    eventTool.stop(event);// 阻止浏览器默认事件，重要
                }
            },

            /**
             * Touch结束响应函数
             * @inner
             * @param {Event} event
             */
            touchend: function (event) {
                // eventTool.stop(event);// 阻止浏览器默认事件，重要
                event = this._zrenderEventFixed(event, true);
                this._mouseupHandler(event);
                
                var now = new Date();
                if (now - this._lastTouchMoment < EVENT.touchClickDelay) {
                    this._mobildFindFixed(event);
                    this._clickHandler(event);
                    if (now - this._lastClickMoment < EVENT.touchClickDelay / 2) {
                        this._dblclickHandler(event);
                        if (this._lastHover && this._lastHover.clickable) {
                            eventTool.stop(event);// 阻止浏览器默认事件，重要
                        }
                    }
                    this._lastClickMoment = now;
                }
                this.painter.clearHover();
            }
        };

        /**
         * bind一个参数的function
         * 
         * @inner
         * @param {Function} handler 要bind的function
         * @param {Object} context 运行时this环境
         * @return {Function}
         */
        function bind1Arg(handler, context) {
            return function (e) {
                return handler.call(context, e);
            };
        }
        /**function bind2Arg(handler, context) {
            return function (arg1, arg2) {
                return handler.call(context, arg1, arg2);
            };
        }*/

        function bind3Arg(handler, context) {
            return function (arg1, arg2, arg3) {
                return handler.call(context, arg1, arg2, arg3);
            };
        }
        /**
         * 为控制类实例初始化dom 事件处理函数
         * 
         * @inner
         * @param {module:zrender/Handler} instance 控制类实例
         */
        function initDomHandler(instance) {
            var len = domHandlerNames.length;
            while (len--) {
                var name = domHandlerNames[len];
                instance['_' + name + 'Handler'] = bind1Arg(domHandlers[name], instance);
            }
        }

        /**
         * @alias module:zrender/Handler
         * @constructor
         * @extends module:zrender/mixin/Eventful
         * @param {HTMLElement} root 绘图区域
         * @param {module:zrender/Storage} storage Storage实例
         * @param {module:zrender/Painter} painter Painter实例
         */
        var Handler = function(root, storage, painter) {
            // 添加事件分发器特性
            Eventful.call(this);

            this.root = root;
            this.storage = storage;
            this.painter = painter;

            // 各种事件标识的私有变量
            // this._hasfound = false;              //是否找到hover图形元素
            // this._lastHover = null;              //最后一个hover图形元素
            // this._mouseDownTarget = null;
            // this._draggingTarget = null;         //当前被拖拽的图形元素
            // this._isMouseDown = false;
            // this._isDragging = false;
            // this._lastMouseDownMoment;
            // this._lastTouchMoment;
            // this._lastDownButton;

            this._lastX = 
            this._lastY = 
            this._mouseX = 
            this._mouseY = 0;

            this._findHover = bind3Arg(findHover, this);
            this._domHover = painter.getDomHover();
            initDomHandler(this);

            // 初始化，事件绑定，支持的所有事件都由如下原生事件计算得来
            if (window.addEventListener) {
                window.addEventListener('resize', this._resizeHandler);
                
                if (env.os.tablet || env.os.phone) {
                    // mobile支持
                    root.addEventListener('touchstart', this._touchstartHandler);
                    root.addEventListener('touchmove', this._touchmoveHandler);
                    root.addEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobile的click/move/up/down自己模拟
                    root.addEventListener('click', this._clickHandler);
                    root.addEventListener('dblclick', this._dblclickHandler);
                    root.addEventListener('mousewheel', this._mousewheelHandler);
                    root.addEventListener('mousemove', this._mousemoveHandler);
                    root.addEventListener('mousedown', this._mousedownHandler);
                    root.addEventListener('mouseup', this._mouseupHandler);
                } 
                root.addEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.addEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.attachEvent('onresize', this._resizeHandler);

                root.attachEvent('onclick', this._clickHandler);
                root.attachEvent('ondblclick ', this._dblclickHandler);
                root.attachEvent('onmousewheel', this._mousewheelHandler);
                root.attachEvent('onmousemove', this._mousemoveHandler);
                root.attachEvent('onmouseout', this._mouseoutHandler);
                root.attachEvent('onmousedown', this._mousedownHandler);
                root.attachEvent('onmouseup', this._mouseupHandler);
            }
        };

        /**
         * 自定义事件绑定
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {Function} handler 响应函数
         */
        Handler.prototype.on = function (eventName, handler) {
            this.bind(eventName, handler);
            return this;
        };

        /**
         * 自定义事件解绑
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {Function} handler 响应函数
         */
        Handler.prototype.un = function (eventName, handler) {
            this.unbind(eventName, handler);
            return this;
        };

        /**
         * 事件触发
         * @param {string} eventName 事件名称，resize，hover，drag，etc~
         * @param {event=} eventArgs event dom事件对象
         */
        Handler.prototype.trigger = function (eventName, eventArgs) {
            switch (eventName) {
                case EVENT.RESIZE:
                case EVENT.CLICK:
                case EVENT.DBLCLICK:
                case EVENT.MOUSEWHEEL:
                case EVENT.MOUSEMOVE:
                case EVENT.MOUSEDOWN:
                case EVENT.MOUSEUP:
                case EVENT.MOUSEOUT:
                    this['_' + eventName + 'Handler'](eventArgs);
                    break;
            }
        };

        /**
         * 释放，解绑所有事件
         */
        Handler.prototype.dispose = function () {
            var root = this.root;

            if (window.removeEventListener) {
                window.removeEventListener('resize', this._resizeHandler);

                if (env.os.tablet || env.os.phone) {
                    // mobile支持
                    root.removeEventListener('touchstart', this._touchstartHandler);
                    root.removeEventListener('touchmove', this._touchmoveHandler);
                    root.removeEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobile的click自己模拟
                    root.removeEventListener('click', this._clickHandler);
                    root.removeEventListener('dblclick', this._dblclickHandler);
                    root.removeEventListener('mousewheel', this._mousewheelHandler);
                    root.removeEventListener('mousemove', this._mousemoveHandler);
                    root.removeEventListener('mousedown', this._mousedownHandler);
                    root.removeEventListener('mouseup', this._mouseupHandler);
                }
                root.removeEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.removeEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.detachEvent('onresize', this._resizeHandler);

                root.detachEvent('onclick', this._clickHandler);
                root.detachEvent('dblclick', this._dblclickHandler);
                root.detachEvent('onmousewheel', this._mousewheelHandler);
                root.detachEvent('onmousemove', this._mousemoveHandler);
                root.detachEvent('onmouseout', this._mouseoutHandler);
                root.detachEvent('onmousedown', this._mousedownHandler);
                root.detachEvent('onmouseup', this._mouseupHandler);
            }

            this.root =
            this._domHover =
            this.storage =
            this.painter = null;
            
            this.un();
        };

        /**
         * 拖拽开始
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragStart = function (event) {
            var _lastHover = this._lastHover;

            if (this._isMouseDown
                && _lastHover
                && _lastHover.draggable
                && !this._draggingTarget
                && this._mouseDownTarget == _lastHover
            ) {
                // 拖拽点击生效时长阀门，某些场景需要降低拖拽敏感度
                if (_lastHover.dragEnableTime && 
                    new Date() - this._lastMouseDownMoment < _lastHover.dragEnableTime
                ) {
                    return;
                }

                var _draggingTarget = _lastHover;
                this._draggingTarget = _draggingTarget;
                this._isDragging = 1;

                _draggingTarget.invisible = true;
                this.storage.mod(_draggingTarget.id);

                // 分发config.EVENT.DRAGSTART事件
                this._dispatchAgency(
                    _draggingTarget,
                    EVENT.DRAGSTART,
                    event
                );
                this.painter.refresh();
            }
        };

        /**
         * 拖拽进入目标元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragEnter = function (event) {
            if (this._draggingTarget) {
                // 分发config.EVENT.DRAGENTER事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGENTER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽在目标元素上移动
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragOver = function (event) {
            if (this._draggingTarget) {
                // 分发config.EVENT.DRAGOVER事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGOVER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽离开目标元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragLeave = function (event) {
            if (this._draggingTarget) {
                // 分发config.EVENT.DRAGLEAVE事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGLEAVE,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽在目标元素上完成
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDrop = function (event) {
            if (this._draggingTarget) {
                this._draggingTarget.invisible = false;
                this.storage.mod(this._draggingTarget.id);
                this.painter.refresh();

                // 分发config.EVENT.DROP事件
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DROP,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * 拖拽结束
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processDragEnd = function (event) {
            if (this._draggingTarget) {
                // 分发config.EVENT.DRAGEND事件
                this._dispatchAgency(
                    this._draggingTarget,
                    EVENT.DRAGEND,
                    event
                );

                this._lastHover = null;
            }

            this._isDragging = 0;
            this._draggingTarget = null;
        };

        /**
         * 鼠标在某个图形元素上移动
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processOverShape = function (event) {
            // 分发config.EVENT.MOUSEOVER事件
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOVER, event);
        };

        /**
         * 鼠标离开某个图形元素
         * 
         * @private
         * @param {Object} event 事件对象
         */
        Handler.prototype._processOutShape = function (event) {
            // 分发config.EVENT.MOUSEOUT事件
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOUT, event);
        };

        /**
         * 事件分发代理
         * 
         * @private
         * @param {Object} targetShape 目标图形元素
         * @param {string} eventName 事件名称
         * @param {Object} event 事件对象
         * @param {Object=} draggedShape 拖拽事件特有，当前被拖拽图形元素
         */
        Handler.prototype._dispatchAgency = function (targetShape, eventName, event, draggedShape) {
            var eventHandler = 'on' + eventName;
            var eventPacket = {
                type : eventName,
                event : event,
                target : targetShape,
                cancelBubble: false
            };

            var el = targetShape;

            if (draggedShape) {
                eventPacket.dragged = draggedShape;
            }

            while (el) {
                el[eventHandler] 
                && (eventPacket.cancelBubble = el[eventHandler](eventPacket));
                el.dispatch(eventName, eventPacket);

                el = el.parent;
                
                if (eventPacket.cancelBubble) {
                    break;
                }
            }

            if (targetShape) {
                // 冒泡到顶级 zrender 对象
                if (!eventPacket.cancelBubble) {
                    this.dispatch(eventName, eventPacket);
                }
            }
            else if (!draggedShape) {
                // 无hover目标，无拖拽对象，原生事件分发
                this.dispatch(eventName, {
                    type: eventName,
                    event: event
                });
            }
        };

        /**
         * 迭代寻找hover shape
         * @private
         * @method
         */
        Handler.prototype._iterateAndFindHover = (function() {
            var invTransform = mat2d.create();
            return function() {
                var list = this.storage.getShapeList();
                var currentZLevel;
                var currentLayer;
                var tmp = [ 0, 0 ];
                for (var i = list.length - 1; i >= 0 ; i--) {
                    var shape = list[i];

                    if (currentZLevel !== shape.zlevel) {
                        currentLayer = this.painter.getLayer(shape.zlevel, currentLayer);
                        tmp[0] = this._mouseX;
                        tmp[1] = this._mouseY;

                        if (currentLayer.needTransform) {
                            mat2d.invert(invTransform, currentLayer.transform);
                            vec2.applyTransform(tmp, tmp, invTransform);
                        }
                    }

                    if (this._findHover(shape, tmp[0], tmp[1])) {
                        break;
                    }
                }
            };
        })();
        
        // touch指尖错觉的尝试偏移量配置
        var MOBILE_TOUCH_OFFSETS = [
            { x: 10 },
            { x: -20 },
            { x: 10, y: 10 },
            { y: -20 }
        ];

        // touch有指尖错觉，四向尝试，让touch上的点击更好触发事件
        Handler.prototype._mobildFindFixed = function (event) {
            this._lastHover = null;
            this._mouseX = event.zrenderX;
            this._mouseY = event.zrenderY;

            this._event = event;

            this._iterateAndFindHover();

            for (var i = 0; !this._lastHover && i < MOBILE_TOUCH_OFFSETS.length ; i++) {
                var offset = MOBILE_TOUCH_OFFSETS[ i ];
                offset.x && (this._mouseX += offset.x);
                offset.y && (this._mouseX += offset.y);

                this._iterateAndFindHover();
            }

            if (this._lastHover) {
                event.zrenderX = this._mouseX;
                event.zrenderY = this._mouseY;
            }
        };

        /**
         * 迭代函数，查找hover到的图形元素并即时做些事件分发
         * 
         * @inner
         * @param {Object} shape 图形元素
         * @param {number} x
         * @param {number} y
         */
        function findHover(shape, x, y) {
            if (
                (this._draggingTarget && this._draggingTarget.id == shape.id) // 迭代到当前拖拽的图形上
                || shape.isSilent() // 打酱油的路过，啥都不响应的shape~
            ) {
                return false;
            }

            var event = this._event;
            if (shape.isCover(x, y)) {
                if (shape.hoverable) {
                    this.storage.addHover(shape);
                }
                // 查找是否在 clipShape 中
                var p = shape.parent;
                while (p) {
                    if (p.clipShape && !p.clipShape.isCover(this._mouseX, this._mouseY))  {
                        // 已经被祖先 clip 掉了
                        return false;
                    }
                    p = p.parent;
                }

                if (this._lastHover != shape) {
                    this._processOutShape(event);

                    // 可能出现config.EVENT.DRAGLEAVE事件
                    this._processDragLeave(event);

                    this._lastHover = shape;

                    // 可能出现config.EVENT.DRAGENTER事件
                    this._processDragEnter(event);
                }

                this._processOverShape(event);

                // 可能出现config.EVENT.DRAGOVER
                this._processDragOver(event);

                this._hasfound = 1;

                return true;    // 找到则中断迭代查找
            }

            return false;
        }

        /**
         * 如果存在第三方嵌入的一些dom触发的事件，或touch事件，需要转换一下事件坐标
         * 
         * @private
         */
        Handler.prototype._zrenderEventFixed = function (event, isTouch) {
            if (event.zrenderFixed) {
                return event;
            }

            if (!isTouch) {
                event = event || window.event;
                // 进入对象优先~
                var target = event.toElement
                              || event.relatedTarget
                              || event.srcElement
                              || event.target;

                if (target && target != this._domHover) {
                    event.zrenderX = (typeof event.offsetX != 'undefined'
                                        ? event.offsetX
                                        : event.layerX)
                                      + target.offsetLeft;
                    event.zrenderY = (typeof event.offsetY != 'undefined'
                                        ? event.offsetY
                                        : event.layerY)
                                      + target.offsetTop;
                }
            }
            else {
                var touch = event.type != 'touchend'
                                ? event.targetTouches[0]
                                : event.changedTouches[0];
                if (touch) {
                    var rBounding = this.root.getBoundingClientRect();
                    // touch事件坐标是全屏的~
                    event.zrenderX = touch.clientX - rBounding.left;
                    event.zrenderY = touch.clientY - rBounding.top;
                }
            }

            event.zrenderFixed = 1;
            return event;
        };

        util.merge(Handler.prototype, Eventful.prototype, true);

        return Handler;
    }
);

/**
 * @module zrender/tool/curve
 * @author pissang(https://www.github.com/pissang)
 */
define('zrender/tool/curve',['require','./vector'],function(require) {

    var vector = require('./vector');

    

    var EPSILON = 1e-4;

    var THREE_SQRT = Math.sqrt(3);
    var ONE_THIRD = 1 / 3;

    // 临时变量
    var _v0 = vector.create();
    var _v1 = vector.create();
    var _v2 = vector.create();
    // var _v3 = vector.create();

    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }
    /*
    function evalCubicCoeff(a, b, c, d, t) {
        return ((a * t + b) * t + c) * t + d;
    }
    */

    /** 
     * 计算三次贝塞尔值
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @return {number}
     */
    function cubicAt(p0, p1, p2, p3, t) {
        var onet = 1 - t;
        return onet * onet * (onet * p0 + 3 * t * p1)
             + t * t * (t * p3 + 3 * onet * p2);
    }

    /** 
     * 计算三次贝塞尔导数值
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @return {number}
     */
    function cubicDerivativeAt(p0, p1, p2, p3, t) {
        var onet = 1 - t;
        return 3 * (
            ((p1 - p0) * onet + 2 * (p2 - p1) * t) * onet
            + (p3 - p2) * t * t
        );
    }

    /**
     * 计算三次贝塞尔方程根，使用盛金公式
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} val
     * @param  {Array.<number>} roots
     * @return {number} 有效根数目
     */
    function cubicRootAt(p0, p1, p2, p3, val, roots) {
        // Evaluate roots of cubic functions
        var a = p3 + 3 * (p1 - p2) - p0;
        var b = 3 * (p2 - p1 * 2 + p0);
        var c = 3 * (p1  - p0);
        var d = p0 - val;

        var A = b * b - 3 * a * c;
        var B = b * c - 9 * a * d;
        var C = c * c - 3 * b * d;

        var n = 0;

        if (isAroundZero(A) && isAroundZero(B)) {
            if (isAroundZero(b)) {
                roots[0] = 0;
            }
            else {
                var t1 = -c / b;  //t1, t2, t3, b is not zero
                if (t1 >=0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            var disc = B * B - 4 * A * C;

            if (isAroundZero(disc)) {
                var K = B / A;
                var t1 = -b / a + K;  // t1, a is not zero
                var t2 = -K / 2;  // t2, t3
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var Y1 = A * b + 1.5 * a * (-B + discSqrt);
                var Y2 = A * b + 1.5 * a * (-B - discSqrt);
                if (Y1 < 0) {
                    Y1 = -Math.pow(-Y1, ONE_THIRD);
                }
                else {
                    Y1 = Math.pow(Y1, ONE_THIRD);
                }
                if (Y2 < 0) {
                    Y2 = -Math.pow(-Y2, ONE_THIRD);
                }
                else {
                    Y2 = Math.pow(Y2, ONE_THIRD);
                }
                var t1 = (-b - (Y1 + Y2)) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else {
                var T = (2 * A * b - 3 * a * B) / (2 * Math.sqrt(A * A * A));
                var theta = Math.acos(T) / 3;
                var ASqrt = Math.sqrt(A);
                var tmp = Math.cos(theta);
                
                var t1 = (-b - 2 * ASqrt * tmp) / (3 * a);
                var t2 = (-b + ASqrt * (tmp + THREE_SQRT * Math.sin(theta))) / (3 * a);
                var t3 = (-b + ASqrt * (tmp - THREE_SQRT * Math.sin(theta))) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
                if (t3 >= 0 && t3 <= 1) {
                    roots[n++] = t3;
                }
            }
        }
        return n;
    }

    /**
     * 计算三次贝塞尔方程极限值的位置
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {Array.<number>} extrema
     * @return {number} 有效数目
     */
    function cubicExtrema(p0, p1, p2, p3, extrema) {
        var b = 6 * p2 - 12 * p1 + 6 * p0;
        var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
        var c = 3 * p1 - 3 * p0;

        var n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                var t1 = -c / b;
                if (t1 >= 0 && t1 <=1) {
                    extrema[n++] = t1;
                }
            }
        }
        else {
            var disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                extrema[0] = -b / (2 * a);
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var t1 = (-b + discSqrt) / (2 * a);
                var t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    extrema[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    extrema[n++] = t2;
                }
            }
        }
        return n;
    }

    /**
     * 细分三次贝塞尔曲线
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @param  {Array.<number>} out
     */
    function cubicSubdivide(p0, p1, p2, p3, t, out) {
        var p01 = (p1 - p0) * t + p0;
        var p12 = (p2 - p1) * t + p1;
        var p23 = (p3 - p2) * t + p2;

        var p012 = (p12 - p01) * t + p01;
        var p123 = (p23 - p12) * t + p12;

        var p0123 = (p123 - p012) * t + p012;
        // Seg0
        out[0] = p0;
        out[1] = p01;
        out[2] = p012;
        out[3] = p0123;
        // Seg1
        out[4] = p0123;
        out[5] = p123;
        out[6] = p23;
        out[7] = p3;
    }

    /**
     * 投射点到三次贝塞尔曲线上，返回投射距离。
     * 投射点有可能会有一个或者多个，这里只返回其中距离最短的一个。
     * @param {number} x0
     * @param {number} y0
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} x3
     * @param {number} y3
     * @param {number} x
     * @param {number} y
     * @param {Array.<number>} [out] 投射点
     * @return {number}
     */
    function cubicProjectPoint(
        x0, y0, x1, y1, x2, y2, x3, y3,
        x, y, out
    ) {
        // http://pomax.github.io/bezierinfo/#projections
        var t;
        var interval = 0.005;
        var d = Infinity;

        _v0[0] = x;
        _v0[1] = y;

        // 先粗略估计一下可能的最小距离的 t 值
        // PENDING
        for (var _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = cubicAt(x0, x1, x2, x3, _t);
            _v1[1] = cubicAt(y0, y1, y2, y3, _t);
            var d1 = vector.distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;

        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            if (interval < EPSILON) {
                break;
            }
            var prev = t - interval;
            var next = t + interval;
            // t - interval
            _v1[0] = cubicAt(x0, x1, x2, x3, prev);
            _v1[1] = cubicAt(y0, y1, y2, y3, prev);

            var d1 = vector.distSquare(_v1, _v0);

            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                // t + interval
                _v2[0] = cubicAt(x0, x1, x2, x3, next);
                _v2[1] = cubicAt(y0, y1, y2, y3, next);
                var d2 = vector.distSquare(_v2, _v0);

                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        // t
        if (out) {
            out[0] = cubicAt(x0, x1, x2, x3, t);
            out[1] = cubicAt(y0, y1, y2, y3, t);   
        }
        // console.log(interval, i);
        return Math.sqrt(d);
    }

    /**
     * 计算二次方贝塞尔值
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @return {number}
     */
    function quadraticAt(p0, p1, p2, t) {
        var onet = 1 - t;
        return onet * (onet * p0 + 2 * t * p1) + t * t * p2;
    }

    /**
     * 计算二次方贝塞尔导数值
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @return {number}
     */
    function quadraticDerivativeAt(p0, p1, p2, t) {
        return 2 * ((1 - t) * (p1 - p0) + t * (p2 - p1));
    }

    /**
     * 计算二次方贝塞尔方程根
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @param  {Array.<number>} roots
     * @return {number} 有效根数目
     */
    function quadraticRootAt(p0, p1, p2, val, roots) {
        var a = p0 - 2 * p1 + p2;
        var b = 2 * (p1 - p0);
        var c = p0 - val;

        var n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                var t1 = -c / b;
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            var disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                var t1 = -b / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var t1 = (-b + discSqrt) / (2 * a);
                var t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
        }
        return n;
    }

    /**
     * 计算二次贝塞尔方程极限值
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @return {number}
     */
    function quadraticExtremum(p0, p1, p2) {
        var divider = p0 + p2 - 2 * p1;
        if (divider === 0) {
            // p1 is center of p0 and p2 
            return 0.5;
        }
        else {
            return (p0 - p1) / divider;
        }
    }

    /**
     * 投射点到二次贝塞尔曲线上，返回投射距离。
     * 投射点有可能会有一个或者多个，这里只返回其中距离最短的一个。
     * @param {number} x0
     * @param {number} y0
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} x
     * @param {number} y
     * @param {Array.<number>} out 投射点
     * @return {number}
     */
    function quadraticProjectPoint(
        x0, y0, x1, y1, x2, y2,
        x, y, out
    ) {
        // http://pomax.github.io/bezierinfo/#projections
        var t;
        var interval = 0.005;
        var d = Infinity;

        _v0[0] = x;
        _v0[1] = y;

        // 先粗略估计一下可能的最小距离的 t 值
        // PENDING
        for (var _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = quadraticAt(x0, x1, x2, _t);
            _v1[1] = quadraticAt(y0, y1, y2, _t);
            var d1 = vector.distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;

        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            if (interval < EPSILON) {
                break;
            }
            var prev = t - interval;
            var next = t + interval;
            // t - interval
            _v1[0] = quadraticAt(x0, x1, x2, prev);
            _v1[1] = quadraticAt(y0, y1, y2, prev);

            var d1 = vector.distSquare(_v1, _v0);

            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                // t + interval
                _v2[0] = quadraticAt(x0, x1, x2, next);
                _v2[1] = quadraticAt(y0, y1, y2, next);
                var d2 = vector.distSquare(_v2, _v0);
                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        // t
        if (out) {
            out[0] = quadraticAt(x0, x1, x2, t);
            out[1] = quadraticAt(y0, y1, y2, t);   
        }
        // console.log(interval, i);
        return Math.sqrt(d);
    }

    return {

        cubicAt: cubicAt,

        cubicDerivativeAt: cubicDerivativeAt,

        cubicRootAt: cubicRootAt,

        cubicExtrema: cubicExtrema,

        cubicSubdivide: cubicSubdivide,

        cubicProjectPoint: cubicProjectPoint,

        quadraticAt: quadraticAt,

        quadraticDerivativeAt: quadraticDerivativeAt,

        quadraticRootAt: quadraticRootAt,

        quadraticExtremum: quadraticExtremum,

        quadraticProjectPoint: quadraticProjectPoint
    };
});
/**
 * zrender: 图形空间辅助类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         pissang (https://www.github.com/pissang)
 *
 * isInside：是否在区域内部
 * isOutside：是否在区域外部
 * getTextWidth：测算单行文本宽度
 */
define(
    'zrender/tool/area',['require','./util','./curve'],function (require) {

        

        var util = require('./util');
        var curve = require('./curve');

        var _ctx;
        
        var _textWidthCache = {};
        var _textHeightCache = {};
        var _textWidthCacheCounter = 0;
        var _textHeightCacheCounter = 0;
        var TEXT_CACHE_MAX = 5000;
            
        var PI2 = Math.PI * 2;

        function normalizeRadian(angle) {
            angle %= PI2;
            if (angle < 0) {
                angle += PI2;
            }
            return angle;
        }
        /**
         * 包含判断
         *
         * @param {Object} shape : 图形
         * @param {Object} area ： 目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         */
        function isInside(shape, area, x, y) {
            if (!area || !shape) {
                // 无参数或不支持类型
                return false;
            }
            var zoneType = shape.type;

            _ctx = _ctx || util.getContext();

            // 未实现或不可用时(excanvas不支持)则数学运算，主要是line，brokenLine，ring
            var _mathReturn = _mathMethod(shape, area, x, y);
            if (typeof _mathReturn != 'undefined') {
                return _mathReturn;
            }

            if (shape.buildPath && _ctx.isPointInPath) {
                return _buildPathMethod(shape, _ctx, area, x, y);
            }

            // 上面的方法都行不通时
            switch (zoneType) {
                case 'ellipse': // Todo，不精确
                    return true;
                // 旋轮曲线  不准确
                case 'trochoid':
                    var _r = area.location == 'out'
                            ? area.r1 + area.r2 + area.d
                            : area.r1 - area.r2 + area.d;
                    return isInsideCircle(area, x, y, _r);
                // 玫瑰线 不准确
                case 'rose' :
                    return isInsideCircle(area, x, y, area.maxr);
                // 路径，椭圆，曲线等-----------------13
                default:
                    return false;   // Todo，暂不支持
            }
        }

        /**
         * 用数学方法判断，三个方法中最快，但是支持的shape少
         *
         * @param {Object} shape : 图形
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean=} true表示坐标处在图形中
         */
        function _mathMethod(shape, area, x, y) {
            var zoneType = shape.type;
            // 在矩形内则部分图形需要进一步判断
            switch (zoneType) {
                // 贝塞尔曲线
                case 'bezier-curve':
                    if (typeof(area.cpX2) === 'undefined') {
                        return isInsideQuadraticStroke(
                            area.xStart, area.yStart,
                            area.cpX1, area.cpY1, 
                            area.xEnd, area.yEnd,
                            area.lineWidth, x, y
                        );
                    }
                    return isInsideCubicStroke(
                        area.xStart, area.yStart,
                        area.cpX1, area.cpY1, 
                        area.cpX2, area.cpY2, 
                        area.xEnd, area.yEnd,
                        area.lineWidth, x, y
                    );
                // 线
                case 'line':
                    return isInsideLine(
                        area.xStart, area.yStart,
                        area.xEnd, area.yEnd,
                        area.lineWidth, x, y
                    );
                // 折线
                case 'broken-line':
                    return isInsideBrokenLine(
                        area.pointList, area.lineWidth, x, y
                    );
                // 圆环
                case 'ring':
                    return isInsideRing(
                        area.x, area.y, area.r0, area.r, x, y
                    );
                // 圆形
                case 'circle':
                    return isInsideCircle(
                        area.x, area.y, area.r, x, y
                    );
                // 扇形
                case 'sector':
                    var startAngle = area.startAngle * Math.PI / 180;
                    var endAngle = area.endAngle * Math.PI / 180;
                    if (!area.clockwise) {
                        startAngle = -startAngle;
                        endAngle = -endAngle;
                    }
                    return isInsideSector(
                        area.x, area.y, area.r0, area.r,
                        startAngle, endAngle,
                        !area.clockwise,
                        x, y
                    );
                // 多边形
                case 'path':
                    return isInsidePath(
                        area.pathArray, Math.max(area.lineWidth, 5),
                        area.brushType, x, y
                    );
                case 'polygon':
                case 'star':
                case 'isogon':
                    return isInsidePolygon(area.pointList, x, y);
                // 文本
                case 'text':
                    var rect =  area.__rect || shape.getRect(area);
                    return isInsideRect(
                        rect.x, rect.y, rect.width, rect.height, x, y
                    );
                // 矩形
                case 'rectangle':
                // 图片
                case 'image':
                    return isInsideRect(
                        area.x, area.y, area.width, area.height, x, y
                    );
            }
        }

        /**
         * 通过buildPath方法来判断，三个方法中较快，但是不支持线条类型的shape，
         * 而且excanvas不支持isPointInPath方法
         *
         * @param {Object} shape ： shape
         * @param {Object} context : 上下文
         * @param {Object} area ：目标区域
         * @param {number} x ： 横坐标
         * @param {number} y ： 纵坐标
         * @return {boolean} true表示坐标处在图形中
         */
        function _buildPathMethod(shape, context, area, x, y) {
            // 图形类实现路径创建了则用类的path
            context.beginPath();
            shape.buildPath(context, area);
            context.closePath();
            return context.isPointInPath(x, y);
        }

        /**
         * !isInside
         */
        function isOutside(shape, area, x, y) {
            return !isInside(shape, area, x, y);
        }

        /**
         * 线段包含判断
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideLine(x0, y0, x1, y1, lineWidth, x, y) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            var _a = 0;
            var _b = x0;
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l)
                || (y < y0 - _l && y < y1 - _l)
                || (x > x0 + _l && x > x1 + _l)
                || (x < x0 - _l && x < x1 - _l)
            ) {
                return false;
            }

            if (x0 !== x1) {
                _a = (y0 - y1) / (x0 - x1);
                _b = (x0 * y1 - x1 * y0) / (x0 - x1) ;
            }
            else {
                return Math.abs(x - x0) <= _l / 2;
            }
            var tmp = _a * x - y + _b;
            var _s = tmp * tmp / (_a * _a + 1);
            return _s <= _l / 2 * _l / 2;
        }

        /**
         * 三次贝塞尔曲线描边包含判断
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  x2
         * @param  {number}  y2
         * @param  {number}  x3
         * @param  {number}  y3
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideCubicStroke(
            x0, y0, x1, y1, x2, y2, x3, y3,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l && y > y2 + _l && y > y3 + _l)
                || (y < y0 - _l && y < y1 - _l && y < y2 - _l && y < y3 - _l)
                || (x > x0 + _l && x > x1 + _l && x > x2 + _l && x > x3 + _l)
                || (x < x0 - _l && x < x1 - _l && x < x2 - _l && x < x3 - _l)
            ) {
                return false;
            }
            var d =  curve.cubicProjectPoint(
                x0, y0, x1, y1, x2, y2, x3, y3,
                x, y, null
            );
            return d <= _l / 2;
        }

        /**
         * 二次贝塞尔曲线描边包含判断
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  x2
         * @param  {number}  y2
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideQuadraticStroke(
            x0, y0, x1, y1, x2, y2,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l && y > y2 + _l)
                || (y < y0 - _l && y < y1 - _l && y < y2 - _l)
                || (x > x0 + _l && x > x1 + _l && x > x2 + _l)
                || (x < x0 - _l && x < x1 - _l && x < x2 - _l)
            ) {
                return false;
            }
            var d =  curve.quadraticProjectPoint(
                x0, y0, x1, y1, x2, y2,
                x, y, null
            );
            return d <= _l / 2;
        }

        /**
         * 圆弧描边包含判断
         * @param  {number}  cx
         * @param  {number}  cy
         * @param  {number}  r
         * @param  {number}  startAngle
         * @param  {number}  endAngle
         * @param  {boolean}  anticlockwise
         * @param  {number} lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {Boolean}
         */
        function isInsideArcStroke(
            cx, cy, r, startAngle, endAngle, anticlockwise,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);

            x -= cx;
            y -= cy;
            var d = Math.sqrt(x * x + y * y);
            if ((d - _l > r) || (d + _l < r)) {
                return false;
            }
            if (Math.abs(startAngle - endAngle) >= PI2) {
                // Is a circle
                return true;
            }
            if (anticlockwise) {
                var tmp = startAngle;
                startAngle = normalizeRadian(endAngle);
                endAngle = normalizeRadian(tmp);
            } else {
                startAngle = normalizeRadian(startAngle);
                endAngle = normalizeRadian(endAngle);
            }
            if (startAngle > endAngle) {
                endAngle += PI2;
            }
            
            var angle = Math.atan2(y, x);
            if (angle < 0) {
                angle += PI2;
            }
            return (angle >= startAngle && angle <= endAngle)
                || (angle + PI2 >= startAngle && angle + PI2 <= endAngle);
        }

        function isInsideBrokenLine(points, lineWidth, x, y) {
            var lineWidth = Math.max(lineWidth, 10);
            for (var i = 0, l = points.length - 1; i < l; i++) {
                var x0 = points[i][0];
                var y0 = points[i][1];
                var x1 = points[i + 1][0];
                var y1 = points[i + 1][1];

                if (isInsideLine(x0, y0, x1, y1, lineWidth, x, y)) {
                    return true;
                }
            }

            return false;
        }

        function isInsideRing(cx, cy, r0, r, x, y) {
            var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            return (d < r * r) && (d > r0 * r0);
        }

        /**
         * 矩形包含判断
         */
        function isInsideRect(x0, y0, width, height, x, y) {
            return x >= x0 && x <= (x0 + width)
                && y >= y0 && y <= (y0 + height);
        }

        /**
         * 圆形包含判断
         */
        function isInsideCircle(x0, y0, r, x, y) {
            return (x - x0) * (x - x0) + (y - y0) * (y - y0)
                   < r * r;
        }

        /**
         * 扇形包含判断
         */
        function isInsideSector(
            cx, cy, r0, r, startAngle, endAngle, anticlockwise, x, y
        ) {
            return isInsideArcStroke(
                cx, cy, (r0 + r) / 2, startAngle, endAngle, anticlockwise,
                r - r0, x, y
            );
        }

        /**
         * 多边形包含判断
         * 与 canvas 一样采用 non-zero winding rule
         */
        function isInsidePolygon(points, x, y) {
            var N = points.length;
            var w = 0;

            for (var i = 0, j = N - 1; i < N; i++) {
                var x0 = points[j][0];
                var y0 = points[j][1];
                var x1 = points[i][0];
                var y1 = points[i][1];
                w += windingLine(x0, y0, x1, y1, x, y);
                j = i;
            }
            return w !== 0;
        }

        function windingLine(x0, y0, x1, y1, x, y) {
            if ((y > y0 && y > y1) || (y < y0 && y < y1)) {
                return 0;
            }
            if (y1 == y0) {
                return 0;
            }
            var dir = y1 < y0 ? 1 : -1;
            var t = (y - y0) / (y1 - y0);
            var x_ = t * (x1 - x0) + x0;

            return x_ > x ? dir : 0;
        }

        // 临时数组
        var roots = [-1, -1, -1];
        var extrema = [-1, -1];

        function swapExtrema() {
            var tmp = extrema[0];
            extrema[0] = extrema[1];
            extrema[1] = tmp;
        }
        function windingCubic(x0, y0, x1, y1, x2, y2, x3, y3, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2 && y > y3)
                || (y < y0 && y < y1 && y < y2 && y < y3)
            ) {
                return 0;
            }
            var nRoots = curve.cubicRootAt(y0, y1, y2, y3, y, roots);
            if (nRoots === 0) {
                return 0;
            }
            else {
                var w = 0;
                var nExtrema = -1;
                var y0_, y1_;
                for (var i = 0; i < nRoots; i++) {
                    var t = roots[i];
                    var x_ = curve.cubicAt(x0, x1, x2, x3, t);
                    if (x_ < x) { // Quick reject
                        continue;
                    }
                    if (nExtrema < 0) {
                        nExtrema = curve.cubicExtrema(y0, y1, y2, y3, extrema);
                        if (extrema[1] < extrema[0] && nExtrema > 1) {
                            swapExtrema();
                        }
                        y0_ = curve.cubicAt(y0, y1, y2, y3, extrema[0]);
                        if (nExtrema > 1) {
                            y1_ = curve.cubicAt(y0, y1, y2, y3, extrema[1]);
                        }
                    }
                    if (nExtrema == 2) {
                        // 分成三段单调函数
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else if (t < extrema[1]) {
                            w += y1_ < y0_ ? 1 : -1;
                        } 
                        else {
                            w += y3 < y1_ ? 1 : -1;
                        }
                    } 
                    else {
                        // 分成两段单调函数
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y3 < y0_ ? 1 : -1;
                        }
                    }
                }
                return w;
            }
        }

        function windingQuadratic(x0, y0, x1, y1, x2, y2, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2)
                || (y < y0 && y < y1 && y < y2)
            ) {
                return 0;
            }
            var nRoots = curve.quadraticRootAt(y0, y1, y2, y, roots);
            if (nRoots === 0) {
                return 0;
            } 
            else {
                var t = curve.quadraticExtremum(y0, y1, y2);
                if (t >=0 && t <= 1) {
                    var w = 0;
                    var y_ = curve.quadraticAt(y0, y1, y2, t);
                    for (var i = 0; i < nRoots; i++) {
                        var x_ = curve.quadraticAt(x0, x1, x2, roots[i]);
                        if (x_ > x) {
                            continue;
                        }
                        if (roots[i] < t) {
                            w += y_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y2 < y_ ? 1 : -1;
                        }
                    }
                    return w;
                } 
                else {
                    var x_ = curve.quadraticAt(x0, x1, x2, roots[0]);
                    if (x_ > x) {
                        return 0;
                    }
                    return y2 < y0 ? 1 : -1;
                }
            }
        }
        
        // TODO
        // Arc 旋转
        function windingArc(
            cx, cy, r, startAngle, endAngle, anticlockwise, x, y
        ) {
            y -= cy;
            if (y > r || y < -r) {
                return 0;
            }
            var tmp = Math.sqrt(r * r - y * y);
            roots[0] = -tmp;
            roots[1] = tmp;

            if (Math.abs(startAngle - endAngle) >= PI2) {
                // Is a circle
                startAngle = 0;
                endAngle = PI2;
                var dir = anticlockwise ? 1 : -1;
                if (x >= roots[0] + cx && x <= roots[1] + cx) {
                    return dir;
                } else {
                    return 0;
                }
            }

            if (anticlockwise) {
                var tmp = startAngle;
                startAngle = normalizeRadian(endAngle);
                endAngle = normalizeRadian(tmp);   
            } else {
                startAngle = normalizeRadian(startAngle);
                endAngle = normalizeRadian(endAngle);   
            }
            if (startAngle > endAngle) {
                endAngle += PI2;
            }

            var w = 0;
            for (var i = 0; i < 2; i++) {
                var x_ = roots[i];
                if (x_ + cx > x) {
                    var angle = Math.atan2(y, x_);
                    var dir = anticlockwise ? 1 : -1;
                    if (angle < 0) {
                        angle = PI2 + angle;
                    }
                    if (
                        (angle >= startAngle && angle <= endAngle)
                        || (angle + PI2 >= startAngle && angle + PI2 <= endAngle)
                    ) {
                        if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
                            dir = -dir;
                        }
                        w += dir;
                    }
                }
            }
            return w;
        }

        /**
         * 路径包含判断
         * 与 canvas 一样采用 non-zero winding rule
         */
        function isInsidePath(pathArray, lineWidth, brushType, x, y) {
            var w = 0;
            var xi = 0;
            var yi = 0;
            var x0 = 0;
            var y0 = 0;
            var beginSubpath = true;
            var firstCmd = true;

            brushType = brushType || 'fill';

            var hasStroke = brushType === 'stroke' || brushType === 'both';
            var hasFill = brushType === 'fill' || brushType === 'both';

            // var roots = [-1, -1, -1];
            for (var i = 0; i < pathArray.length; i++) {
                var seg = pathArray[i];
                var p = seg.points;
                // Begin a new subpath
                if (beginSubpath || seg.command === 'M') {
                    if (i > 0) {
                        // Close previous subpath
                        if (hasFill) {
                            w += windingLine(xi, yi, x0, y0, x, y);
                        }
                        if (w !== 0) {
                            return true;
                        }
                    }
                    x0 = p[p.length - 2];
                    y0 = p[p.length - 1];
                    beginSubpath = false;
                    if (firstCmd && seg.command !== 'A') {
                        // 如果第一个命令不是M, 是lineTo, bezierCurveTo
                        // 等绘制命令的话，是会从该绘制的起点开始算的
                        // Arc 会在之后做单独处理所以这里忽略
                        firstCmd = false;
                        xi = x0;
                        yi = y0;
                    }
                }
                switch (seg.command) {
                    case 'M':
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'L':
                        if (hasStroke) {
                            if (isInsideLine(
                                xi, yi, p[0], p[1], lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingLine(xi, yi, p[0], p[1], x, y);
                        }
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'C':
                        if (hasStroke) {
                            if (isInsideCubicStroke(
                                xi, yi, p[0], p[1], p[2], p[3], p[4], p[5],
                                lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingCubic(
                                xi, yi, p[0], p[1], p[2], p[3], p[4], p[5], x, y
                            );
                        }
                        xi = p[4];
                        yi = p[5];
                        break;
                    case 'Q':
                        if (hasStroke) {
                            if (isInsideQuadraticStroke(
                                xi, yi, p[0], p[1], p[2], p[3],
                                lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingQuadratic(
                                xi, yi, p[0], p[1], p[2], p[3], x, y
                            );
                        }
                        xi = p[2];
                        yi = p[3];
                        break;
                    case 'A':
                        // TODO Arc 旋转
                        // TODO Arc 判断的开销比较大
                        var cx = p[0];
                        var cy = p[1];
                        var rx = p[2];
                        var ry = p[3];
                        var theta = p[4];
                        var dTheta = p[5];
                        var x1 = Math.cos(theta) * rx + cx;
                        var y1 = Math.sin(theta) * ry + cy;
                        // 不是直接使用 arc 命令
                        if (!firstCmd) {
                            w += windingLine(xi, yi, x1, y1);
                        } else {
                            firstCmd = false;
                            // 第一个命令起点还未定义
                            x0 = x1;
                            y0 = y1;
                        }
                        // zr 使用scale来模拟椭圆, 这里也对x做一定的缩放
                        var _x = (x - cx) * ry / rx + cx;
                        if (hasStroke) {
                            if (isInsideArcStroke(
                                cx, cy, ry, theta, theta + dTheta, 1 - p[7],
                                lineWidth, _x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingArc(
                                cx, cy, ry, theta, theta + dTheta, 1 - p[7],
                                _x, y
                            );
                        }
                        xi = Math.cos(theta + dTheta) * rx + cx;
                        yi = Math.sin(theta + dTheta) * ry + cy;
                        break;
                    case 'z':
                        if (hasStroke) {
                            if (isInsideLine(
                                xi, yi, x0, y0, lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        beginSubpath = true;
                        break;
                }
            }
            if (hasFill) {
                w += windingLine(xi, yi, x0, y0, x, y);
            }
            return w !== 0;
        }

        /**
         * 测算多行文本宽度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextWidth(text, textFont) {
            var key = text + ':' + textFont;
            if (_textWidthCache[key]) {
                return _textWidthCache[key];
            }
            _ctx = _ctx || util.getContext();
            _ctx.save();

            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            var width = 0;
            for (var i = 0, l = text.length; i < l; i++) {
                width =  Math.max(
                    _ctx.measureText(text[i]).width,
                    width
                );
            }
            _ctx.restore();

            _textWidthCache[key] = width;
            if (++_textWidthCacheCounter > TEXT_CACHE_MAX) {
                // 内存释放
                _textWidthCacheCounter = 0;
                _textWidthCache = {};
            }
            
            return width;
        }
        
        /**
         * 测算多行文本高度
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextHeight(text, textFont) {
            var key = text + ':' + textFont;
            if (_textHeightCache[key]) {
                return _textHeightCache[key];
            }
            
            _ctx = _ctx || util.getContext();

            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            // 比较粗暴
            var height = (_ctx.measureText('国').width + 2) * text.length;

            _ctx.restore();

            _textHeightCache[key] = height;
            if (++_textHeightCacheCounter > TEXT_CACHE_MAX) {
                // 内存释放
                _textHeightCacheCounter = 0;
                _textHeightCache = {};
            }
            return height;
        }

        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth,
            getTextHeight : getTextHeight,

            isInsidePath: isInsidePath,
            isInsidePolygon: isInsidePolygon,
            isInsideSector: isInsideSector,
            isInsideCircle: isInsideCircle,
            isInsideLine: isInsideLine,
            isInsideRect: isInsideRect,
            isInsideBrokenLine: isInsideBrokenLine
        };
    }
);

/**
 * 提供变换扩展
 * @module zrender/mixin/Transformable
 * @author pissang (https://www.github.com/pissang)
 */
define('zrender/mixin/Transformable',['require','../tool/matrix','../tool/vector'],function (require) {

    

    var matrix = require('../tool/matrix');
    var vector = require('../tool/vector');
    var origin = [ 0, 0 ];

    var EPSILON = 5e-5;

    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }

    /**
     * @alias module:zrender/mixin/Transformable
     * @constructor
     */
    var Transformable = function () {

        if (!this.position) {
            /**
             * 平移
             * @type {Array.<number>}
             * @default [0, 0]
             */
            this.position = [ 0, 0 ];
        }
        if (typeof(this.rotation) == 'undefined') {
            /**
             * 旋转，可以通过数组二三项指定旋转的原点
             * @type {Array.<number>}
             * @default [0, 0, 0]
             */
            this.rotation = [ 0, 0, 0 ];
        }
        if (!this.scale) {
            /**
             * 缩放，可以通过数组三四项指定缩放的原点
             * @type {Array.<number>}
             * @default [1, 1, 0, 0]
             */
            this.scale = [ 1, 1, 0, 0 ];
        }

        this.needLocalTransform = false;

        /**
         * 是否有坐标变换
         * @type {boolean}
         * @readOnly
         */
        this.needTransform = false;
    };

    Transformable.prototype = {
        
        constructor: Transformable,

        updateNeedTransform: function () {
            this.needLocalTransform = isNotAroundZero(this.rotation[0])
                || isNotAroundZero(this.position[0])
                || isNotAroundZero(this.position[1])
                || isNotAroundZero(this.scale[0] - 1)
                || isNotAroundZero(this.scale[1] - 1);
        },

        /**
         * 判断是否需要有坐标变换，更新needTransform属性。
         * 如果有坐标变换, 则从position, rotation, scale以及父节点的transform计算出自身的transform矩阵
         */
        updateTransform: function () {
            
            this.updateNeedTransform();

            if (this.parent) {
                this.needTransform = this.needLocalTransform || this.parent.needTransform;
            }
            else {
                this.needTransform = this.needLocalTransform;
            }
            
            if (!this.needTransform) {
                return;
            }

            var m = this.transform || matrix.create();
            matrix.identity(m);

            if (this.needLocalTransform) {
                if (
                    isNotAroundZero(this.scale[0])
                 || isNotAroundZero(this.scale[1])
                ) {
                    origin[0] = -this.scale[2] || 0;
                    origin[1] = -this.scale[3] || 0;
                    var haveOrigin = isNotAroundZero(origin[0])
                                  || isNotAroundZero(origin[1]);
                    if (haveOrigin) {
                        matrix.translate(
                            m, m, origin
                        );
                    }
                    matrix.scale(m, m, this.scale);
                    if (haveOrigin) {
                        origin[0] = -origin[0];
                        origin[1] = -origin[1];
                        matrix.translate(
                            m, m, origin
                        );
                    }
                }

                if (this.rotation instanceof Array) {
                    if (this.rotation[0] !== 0) {
                        origin[0] = -this.rotation[1] || 0;
                        origin[1] = -this.rotation[2] || 0;
                        var haveOrigin = isNotAroundZero(origin[0])
                                      || isNotAroundZero(origin[1]);
                        if (haveOrigin) {
                            matrix.translate(
                                m, m, origin
                            );
                        }
                        matrix.rotate(m, m, this.rotation[0]);
                        if (haveOrigin) {
                            origin[0] = -origin[0];
                            origin[1] = -origin[1];
                            matrix.translate(
                                m, m, origin
                            );
                        }
                    }
                }
                else {
                    if (this.rotation !== 0) {
                        matrix.rotate(m, m, this.rotation);
                    }
                }

                if (
                    isNotAroundZero(this.position[0]) || isNotAroundZero(this.position[1])
                ) {
                    matrix.translate(m, m, this.position);
                }
            }

            // 保存这个变换矩阵
            this.transform = m;

            // 应用父节点变换
            if (this.parent && this.parent.needTransform) {
                if (this.needLocalTransform) {
                    matrix.mul(this.transform, this.parent.transform, this.transform);
                }
                else {
                    matrix.copy(this.transform, this.parent.transform);
                }
            }
        },
        /**
         * 将自己的transform应用到context上
         * @param {Context2D} ctx
         */
        setTransform: function (ctx) {
            if (this.needTransform) {
                var m = this.transform;
                ctx.transform(
                    m[0], m[1],
                    m[2], m[3],
                    m[4], m[5]
                );
            }
        },
        /**
         * 设置图形的朝向
         * @param  {Array.<number>|Float32Array} target
         * @method
         */
        lookAt: (function () {
            var v = vector.create();
            return function(target) {
                if (!this.transform) {
                    this.transform = matrix.create();
                }
                var m = this.transform;
                vector.sub(v, target, this.position);
                if (isAroundZero(v[0]) && isAroundZero(v[1])) {
                    return;
                }
                vector.normalize(v, v);
                // Y Axis
                // TODO Scale origin ?
                m[2] = v[0] * this.scale[1];
                m[3] = v[1] * this.scale[1];
                // X Axis
                m[0] = v[1] * this.scale[0];
                m[1] = -v[0] * this.scale[0];
                // Position
                m[4] = this.position[0];
                m[5] = this.position[1];

                this.decomposeTransform();
            };
        })(),
        /**
         * 分解`transform`矩阵到`position`, `rotation`, `scale`
         */
        decomposeTransform: function () {
            if (!this.transform) {
                return;
            }
            var m = this.transform;
            var sx = m[0] * m[0] + m[1] * m[1];
            var position = this.position;
            var scale = this.scale;
            var rotation = this.rotation;
            if (isNotAroundZero(sx - 1)) {
                sx = Math.sqrt(sx);
            }
            var sy = m[2] * m[2] + m[3] * m[3];
            if (isNotAroundZero(sy - 1)) {
                sy = Math.sqrt(sy);
            }
            position[0] = m[4];
            position[1] = m[5];
            scale[0] = sx;
            scale[1] = sy;
            scale[2] = scale[3] = 0;
            rotation[0] = Math.atan2(-m[1] / sy, m[0] / sx);
            rotation[1] = rotation[2] = 0;
        }
    };

    return Transformable;
});

/**
 * 颜色辅助类
 * @module zrender/tool/color
 * @author CrossDo (chenhuaimu@baidu.com)
 */
define('zrender/tool/color',['require','../tool/util'],function(require) {
    var util = require('../tool/util');

    var _ctx;

    // Color palette is an array containing the default colors for the chart's
    // series.
    // When all colors are used, new colors are selected from the start again.
    // Defaults to:
    // 默认色板
    var palette = [
        '#ff9277', ' #dddd00', ' #ffc877', ' #bbe3ff', ' #d5ffbb',
        '#bbbbff', ' #ddb000', ' #b0dd00', ' #e2bbff', ' #ffbbe3',
        '#ff7777', ' #ff9900', ' #83dd00', ' #77e3ff', ' #778fff',
        '#c877ff', ' #ff77ab', ' #ff6600', ' #aa8800', ' #77c7ff',
        '#ad77ff', ' #ff77ff', ' #dd0083', ' #777700', ' #00aa00',
        '#0088aa', ' #8400dd', ' #aa0088', ' #dd0000', ' #772e00'
    ];
    var _palette = palette;

    var highlightColor = 'rgba(255,255,0,0.5)';
    var _highlightColor = highlightColor;

    // 颜色格式
    /*jshint maxlen: 330 */
    var colorRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i;

    var _nameColors = {
        aliceblue : '#f0f8ff',
        antiquewhite : '#faebd7',
        aqua : '#0ff',
        aquamarine : '#7fffd4',
        azure : '#f0ffff',
        beige : '#f5f5dc',
        bisque : '#ffe4c4',
        black : '#000',
        blanchedalmond : '#ffebcd',
        blue : '#00f',
        blueviolet : '#8a2be2',
        brown : '#a52a2a',
        burlywood : '#deb887',
        cadetblue : '#5f9ea0',
        chartreuse : '#7fff00',
        chocolate : '#d2691e',
        coral : '#ff7f50',
        cornflowerblue : '#6495ed',
        cornsilk : '#fff8dc',
        crimson : '#dc143c',
        cyan : '#0ff',
        darkblue : '#00008b',
        darkcyan : '#008b8b',
        darkgoldenrod : '#b8860b',
        darkgray : '#a9a9a9',
        darkgrey : '#a9a9a9',
        darkgreen : '#006400',
        darkkhaki : '#bdb76b',
        darkmagenta : '#8b008b',
        darkolivegreen : '#556b2f',
        darkorange : '#ff8c00',
        darkorchid : '#9932cc',
        darkred : '#8b0000',
        darksalmon : '#e9967a',
        darkseagreen : '#8fbc8f',
        darkslateblue : '#483d8b',
        darkslategray : '#2f4f4f',
        darkslategrey : '#2f4f4f',
        darkturquoise : '#00ced1',
        darkviolet : '#9400d3',
        deeppink : '#ff1493',
        deepskyblue : '#00bfff',
        dimgray : '#696969',
        dimgrey : '#696969',
        dodgerblue : '#1e90ff',
        firebrick : '#b22222',
        floralwhite : '#fffaf0',
        forestgreen : '#228b22',
        fuchsia : '#f0f',
        gainsboro : '#dcdcdc',
        ghostwhite : '#f8f8ff',
        gold : '#ffd700',
        goldenrod : '#daa520',
        gray : '#808080',
        grey : '#808080',
        green : '#008000',
        greenyellow : '#adff2f',
        honeydew : '#f0fff0',
        hotpink : '#ff69b4',
        indianred : '#cd5c5c',
        indigo : '#4b0082',
        ivory : '#fffff0',
        khaki : '#f0e68c',
        lavender : '#e6e6fa',
        lavenderblush : '#fff0f5',
        lawngreen : '#7cfc00',
        lemonchiffon : '#fffacd',
        lightblue : '#add8e6',
        lightcoral : '#f08080',
        lightcyan : '#e0ffff',
        lightgoldenrodyellow : '#fafad2',
        lightgray : '#d3d3d3',
        lightgrey : '#d3d3d3',
        lightgreen : '#90ee90',
        lightpink : '#ffb6c1',
        lightsalmon : '#ffa07a',
        lightseagreen : '#20b2aa',
        lightskyblue : '#87cefa',
        lightslategray : '#789',
        lightslategrey : '#789',
        lightsteelblue : '#b0c4de',
        lightyellow : '#ffffe0',
        lime : '#0f0',
        limegreen : '#32cd32',
        linen : '#faf0e6',
        magenta : '#f0f',
        maroon : '#800000',
        mediumaquamarine : '#66cdaa',
        mediumblue : '#0000cd',
        mediumorchid : '#ba55d3',
        mediumpurple : '#9370d8',
        mediumseagreen : '#3cb371',
        mediumslateblue : '#7b68ee',
        mediumspringgreen : '#00fa9a',
        mediumturquoise : '#48d1cc',
        mediumvioletred : '#c71585',
        midnightblue : '#191970',
        mintcream : '#f5fffa',
        mistyrose : '#ffe4e1',
        moccasin : '#ffe4b5',
        navajowhite : '#ffdead',
        navy : '#000080',
        oldlace : '#fdf5e6',
        olive : '#808000',
        olivedrab : '#6b8e23',
        orange : '#ffa500',
        orangered : '#ff4500',
        orchid : '#da70d6',
        palegoldenrod : '#eee8aa',
        palegreen : '#98fb98',
        paleturquoise : '#afeeee',
        palevioletred : '#d87093',
        papayawhip : '#ffefd5',
        peachpuff : '#ffdab9',
        peru : '#cd853f',
        pink : '#ffc0cb',
        plum : '#dda0dd',
        powderblue : '#b0e0e6',
        purple : '#800080',
        red : '#f00',
        rosybrown : '#bc8f8f',
        royalblue : '#4169e1',
        saddlebrown : '#8b4513',
        salmon : '#fa8072',
        sandybrown : '#f4a460',
        seagreen : '#2e8b57',
        seashell : '#fff5ee',
        sienna : '#a0522d',
        silver : '#c0c0c0',
        skyblue : '#87ceeb',
        slateblue : '#6a5acd',
        slategray : '#708090',
        slategrey : '#708090',
        snow : '#fffafa',
        springgreen : '#00ff7f',
        steelblue : '#4682b4',
        tan : '#d2b48c',
        teal : '#008080',
        thistle : '#d8bfd8',
        tomato : '#ff6347',
        turquoise : '#40e0d0',
        violet : '#ee82ee',
        wheat : '#f5deb3',
        white : '#fff',
        whitesmoke : '#f5f5f5',
        yellow : '#ff0',
        yellowgreen : '#9acd32'
    };

    /**
     * 自定义调色板
     */
    function customPalette(userPalete) {
        palette = userPalete;
    }

    /**
     * 复位默认色板
     */
    function resetPalette() {
        palette = _palette;
    }

    /**
     * 获取色板颜色
     * @memberOf module:zrender/tool/color
     * @param {number} idx 色板位置
     * @param {Array.<string>} [userPalete] 自定义色板
     * @return {string} 颜色
     */
    function getColor(idx, userPalete) {
        idx = idx | 0;
        userPalete = userPalete || palette;
        return userPalete[idx % userPalete.length];
    }

    /**
     * 自定义默认高亮颜色
     */
    function customHighlight(userHighlightColor) {
        highlightColor = userHighlightColor;
    }

    /**
     * 重置默认高亮颜色
     */
    function resetHighlight() {
        _highlightColor = highlightColor;
    }

    /**
     * 获取默认高亮颜色
     */
    function getHighlightColor() {
        return highlightColor;
    }

    /**
     * 径向渐变
     * @memberOf module:zrender/tool/color
     * @param {number} x0 渐变起点
     * @param {number} y0
     * @param {number} r0
     * @param {number} x1 渐变终点
     * @param {number} y1
     * @param {number} r1
     * @param {Array} colorList 颜色列表
     * @return {CanvasGradient}
     */
    function getRadialGradient(x0, y0, r0, x1, y1, r1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        for (var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * 线性渐变
     * @param {Object} x0 渐变起点
     * @param {Object} y0
     * @param {Object} x1 渐变终点
     * @param {Object} y1
     * @param {Array} colorList 颜色列表
     */
    function getLinearGradient(x0, y0, x1, y1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createLinearGradient(x0, y0, x1, y1);
        for (var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * 获取两种颜色之间渐变颜色数组
     * @param {color} start 起始颜色
     * @param {color} end 结束颜色
     * @param {number} step 渐变级数
     * @return {Array}  颜色数组
     */
    function getStepColors(start, end, step) {
        start = toRGBA(start);
        end = toRGBA(end);
        start = getData(start);
        end = getData(end);

        var colors = [];
        var stepR = (end[0] - start[0]) / step;
        var stepG = (end[1] - start[1]) / step;
        var stepB = (end[2] - start[2]) / step;
        // 生成颜色集合
        // fix by linfeng 颜色堆积
        for (var i = 0, r = start[0], g = start[1], b = start[2]; i < step; i++
        ) {
            colors[i] = toColor([
                adjust(Math.floor(r), [ 0, 255 ]),
                adjust(Math.floor(g), [ 0, 255 ]), 
                adjust(Math.floor(b), [ 0, 255 ])
            ]);
            r += stepR;
            g += stepG;
            b += stepB;
        }
        r = end[0];
        g = end[1];
        b = end[2];
        colors[i] = toColor([ r, g, b ]);
        return colors;
    }

    /**
     * 获取指定级数的渐变颜色数组
     * @memberOf module:zrender/tool/color
     * @param {Array.<string>} colors 颜色组
     * @param {number} [step=20] 渐变级数
     * @return {Array.<string>}  颜色数组
     */
    function getGradientColors(colors, step) {
        var ret = [];
        var len = colors.length;
        if (step === undefined) {
            step = 20;
        }
        if (len === 1) {
            ret = getStepColors(colors[0], colors[0], step);
        }
        else if (len > 1) {
            for (var i = 0, n = len - 1; i < n; i++) {
                var steps = getStepColors(colors[i], colors[i + 1], step);
                if (i < n - 1) {
                    steps.pop();
                }
                ret = ret.concat(steps);
            }
        }
        return ret;
    }

    /**
     * 颜色值数组转为指定格式颜色,例如:<br/>
     * data = [60,20,20,0.1] format = 'rgba'
     * 返回：rgba(60,20,20,0.1)
     * @param {Array} data 颜色值数组
     * @param {string} format 格式,默认rgb
     * @return {string} 颜色
     */
    function toColor(data, format) {
        format = format || 'rgb';
        if (data && (data.length === 3 || data.length === 4)) {
            data = map(data,
                function(c) {
                    return c > 1 ? Math.ceil(c) : c;
                }
            );

            if (format.indexOf('hex') > -1) {
                return '#' + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + (+data[2])).toString(16).slice(1);
            }
            else if (format.indexOf('hs') > -1) {
                var sx = map(data.slice(1, 3),
                    function(c) {
                        return c + '%';
                    }
                );
                data[1] = sx[0];
                data[2] = sx[1];
            }

            if (format.indexOf('a') > -1) {
                if (data.length === 3) {
                    data.push(1);
                }
                data[3] = adjust(data[3], [ 0, 1 ]);
                return format + '(' + data.slice(0, 4).join(',') + ')';
            }

            return format + '(' + data.slice(0, 3).join(',') + ')';
        }
    }

    /**
     * 颜色字符串转换为rgba数组
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {Array.<number>} 颜色值数组
     */
    function toArray(color) {
        color = trim(color);
        if (color.indexOf('rgba') < 0) {
            color = toRGBA(color);
        }

        var data = [];
        var i = 0;
        color.replace(/[\d.]+/g, function (n) {
            if (i < 3) {
                n = n | 0;
            }
            else {
                // Alpha
                n = +n;
            }
            data[i++] = n;
        });
        return data;
    }

    /**
     * 颜色格式转化
     *
     * @param {string} color 颜色值数组
     * @param {string} format 格式,默认rgb
     * @return {string} 颜色
     */
    function convert(color, format) {
        var data = getData(color);
        var alpha = data[3];
        if (typeof alpha === 'undefined') {
            alpha = 1;
        }

        if (color.indexOf('hsb') > -1) {
            data = _HSV_2_RGB(data);
        }
        else if (color.indexOf('hsl') > -1) {
            data = _HSL_2_RGB(data);
        }

        if (format.indexOf('hsb') > -1 || format.indexOf('hsv') > -1) {
            data = _RGB_2_HSB(data);
        }
        else if (format.indexOf('hsl') > -1) {
            data = _RGB_2_HSL(data);
        }

        data[3] = alpha;

        return toColor(data, format);
    }

    /**
     * 转换为rgba格式的颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} rgba颜色，rgba(r,g,b,a)
     */
    function toRGBA(color) {
        return convert(color, 'rgba');
    }

    /**
     * 转换为rgb数字格式的颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} rgb颜色，rgb(0,0,0)格式
     */
    function toRGB(color) {
        return convert(color, 'rgb');
    }

    /**
     * 转换为16进制颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} 16进制颜色，#rrggbb格式
     */
    function toHex(color) {
        return convert(color, 'hex');
    }

    /**
     * 转换为HSV颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSVA颜色，hsva(h,s,v,a)
     */
    function toHSVA(color) {
        return convert(color, 'hsva');
    }

    /**
     * 转换为HSV颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSV颜色，hsv(h,s,v)
     */
    function toHSV(color) {
        return convert(color, 'hsv');
    }

    /**
     * 转换为HSBA颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSBA颜色，hsba(h,s,b,a)
     */
    function toHSBA(color) {
        return convert(color, 'hsba');
    }

    /**
     * 转换为HSB颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSB颜色，hsb(h,s,b)
     */
    function toHSB(color) {
        return convert(color, 'hsb');
    }

    /**
     * 转换为HSLA颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSLA颜色，hsla(h,s,l,a)
     */
    function toHSLA(color) {
        return convert(color, 'hsla');
    }

    /**
     * 转换为HSL颜色
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} HSL颜色，hsl(h,s,l)
     */
    function toHSL(color) {
        return convert(color, 'hsl');
    }

    /**
     * 转换颜色名
     * 
     * @param {string} color 颜色
     * @return {string} 颜色名
     */
    function toName(color) {
        for (var key in _nameColors) {
            if (toHex(_nameColors[key]) === toHex(color)) {
                return key;
            }
        }
        return null;
    }

    /**
     * 移除颜色中多余空格
     * 
     * @param {string} color 颜色
     * @return {string} 无空格颜色
     */
    function trim(color) {
        return String(color).replace(/\s+/g, '');
    }

    /**
     * 颜色规范化
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} 规范化后的颜色
     */
    function normalize(color) {
        // 颜色名
        if (_nameColors[color]) {
            color = _nameColors[color];
        }
        // 去掉空格
        color = trim(color);
        // hsv与hsb等价
        color = color.replace(/hsv/i, 'hsb');
        // rgb转为rrggbb
        if (/^#[\da-f]{3}$/i.test(color)) {
            color = parseInt(color.slice(1), 16);
            var r = (color & 0xf00) << 8;
            var g = (color & 0xf0) << 4;
            var b = color & 0xf;

            color = '#' + ((1 << 24) + (r << 4) + r + (g << 4) + g + (b << 4) + b).toString(16).slice(1);
        }
        // 或者使用以下正则替换，不过 chrome 下性能相对差点
        // color = color.replace(/^#([\da-f])([\da-f])([\da-f])$/i, '#$1$1$2$2$3$3');
        return color;
    }

    /**
     * 颜色加深或减淡，当level>0加深，当level<0减淡
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @param {number} level 升降程度,取值区间[-1,1]
     * @return {string} 加深或减淡后颜色值
     */
    function lift(color, level) {
        var direct = level > 0 ? 1 : -1;
        if (typeof level === 'undefined') {
            level = 0;
        }
        level = Math.abs(level) > 1 ? 1 : Math.abs(level);
        color = toRGB(color);
        var data = getData(color);
        for (var i = 0; i < 3; i++) {
            if (direct === 1) {
                data[i] = data[i] * (1 - level) | 0;
            }
            else {
                data[i] = ((255 - data[i]) * level + data[i]) | 0;
            }
        }
        return 'rgb(' + data.join(',') + ')';
    }

    /**
     * 颜色翻转,[255-r,255-g,255-b,1-a]
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @return {string} 翻转颜色
     */
    function reverse(color) {
        var data = getData(toRGBA(color));
        data = map(data,
            function(c) {
                return 255 - c;
            }
        );
        return toColor(data, 'rgb');
    }

    /**
     * 简单两种颜色混合
     * @memberOf module:zrender/tool/color
     * @param {string} color1 第一种颜色
     * @param {string} color2 第二种颜色
     * @param {number} weight 混合权重[0-1]
     * @return {string} 结果色,rgb(r,g,b)或rgba(r,g,b,a)
     */
    function mix(color1, color2, weight) {
        if (typeof weight === 'undefined') {
            weight = 0.5;
        }
        weight = 1 - adjust(weight, [ 0, 1 ]);

        var w = weight * 2 - 1;
        var data1 = getData(toRGBA(color1));
        var data2 = getData(toRGBA(color2));

        var d = data1[3] - data2[3];

        var weight1 = (((w * d === -1) ? w : (w + d) / (1 + w * d)) + 1) / 2;
        var weight2 = 1 - weight1;

        var data = [];

        for (var i = 0; i < 3; i++) {
            data[i] = data1[i] * weight1 + data2[i] * weight2;
        }

        var alpha = data1[3] * weight + data2[3] * (1 - weight);
        alpha = Math.max(0, Math.min(1, alpha));

        if (data1[3] === 1 && data2[3] === 1) {// 不考虑透明度
            return toColor(data, 'rgb');
        }
        data[3] = alpha;
        return toColor(data, 'rgba');
    }

    /**
     * 随机颜色
     * 
     * @return {string} 颜色值，#rrggbb格式
     */
    function random() {
        return '#' + Math.random().toString(16).slice(2, 8);
    }

    /**
     * 获取颜色值数组,返回值范围： <br/>
     * RGB 范围[0-255] <br/>
     * HSL/HSV/HSB 范围[0-1]<br/>
     * A透明度范围[0-1]
     * 支持格式：
     * #rgb
     * #rrggbb
     * rgb(r,g,b)
     * rgb(r%,g%,b%)
     * rgba(r,g,b,a)
     * hsb(h,s,b) // hsv与hsb等价
     * hsb(h%,s%,b%)
     * hsba(h,s,b,a)
     * hsl(h,s,l)
     * hsl(h%,s%,l%)
     * hsla(h,s,l,a)
     *
     * @param {string} color 颜色
     * @return {Array.<number>} 颜色值数组或null
     */
    function getData(color) {
        color = normalize(color);
        var r = color.match(colorRegExp);
        if (r === null) {
            throw new Error('The color format error'); // 颜色格式错误
        }
        var d;
        var a;
        var data = [];
        var rgb;

        if (r[2]) {
            // #rrggbb
            d = r[2].replace('#', '').split('');
            rgb = [ d[0] + d[1], d[2] + d[3], d[4] + d[5] ];
            data = map(rgb,
                function(c) {
                    return adjust(parseInt(c, 16), [ 0, 255 ]);
                }
            );

        }
        else if (r[4]) {
            // rgb rgba
            var rgba = (r[4]).split(',');
            a = rgba[3];
            rgb = rgba.slice(0, 3);
            data = map(
                rgb,
                function(c) {
                    c = Math.floor(
                        c.indexOf('%') > 0 ? parseInt(c, 0) * 2.55 : c
                    );
                    return adjust(c, [ 0, 255 ]);
                }
            );

            if (typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        else if (r[5] || r[6]) {
            // hsb hsba hsl hsla
            var hsxa = (r[5] || r[6]).split(',');
            var h = parseInt(hsxa[0], 0) / 360;
            var s = hsxa[1];
            var x = hsxa[2];
            a = hsxa[3];
            data = map([ s, x ],
                function(c) {
                    return adjust(parseFloat(c) / 100, [ 0, 1 ]);
                }
            );
            data.unshift(h);
            if (typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        return data;
    }

    /**
     * 设置颜色透明度
     * @memberOf module:zrender/tool/color
     * @param {string} color 颜色
     * @param {number} a 透明度,区间[0,1]
     * @return {string} rgba颜色值
     */
    function alpha(color, a) {
        if (a === null) {
            a = 1;
        }
        var data = getData(toRGBA(color));
        data[3] = adjust(Number(a).toFixed(4), [ 0, 1 ]);

        return toColor(data, 'rgba');
    }

    // 数组映射
    function map(array, fun) {
        if (typeof fun !== 'function') {
            throw new TypeError();
        }
        var len = array ? array.length : 0;
        for (var i = 0; i < len; i++) {
            array[i] = fun(array[i]);
        }
        return array;
    }

    // 调整值区间
    function adjust(value, region) {
        // < to <= & > to >=
        // modify by linzhifeng 2014-05-25 because -0 == 0
        if (value <= region[0]) {
            value = region[0];
        }
        else if (value >= region[1]) {
            value = region[1];
        }
        return value;
    }

    // 参见 http:// www.easyrgb.com/index.php?X=MATH
    function _HSV_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var V = data[2];
        // HSV from 0 to 1
        var R; 
        var G;
        var B;
        if (S === 0) {
            R = V * 255;
            G = V * 255;
            B = V * 255;
        }
        else {
            var h = H * 6;
            if (h === 6) {
                h = 0;
            }
            var i = h | 0;
            var v1 = V * (1 - S);
            var v2 = V * (1 - S * (h - i));
            var v3 = V * (1 - S * (1 - (h - i)));
            var r = 0;
            var g = 0;
            var b = 0;

            if (i === 0) {
                r = V;
                g = v3;
                b = v1;
            }
            else if (i === 1) {
                r = v2;
                g = V;
                b = v1;
            }
            else if (i === 2) {
                r = v1;
                g = V;
                b = v3;
            }
            else if (i === 3) {
                r = v1;
                g = v2;
                b = V;
            }
            else if (i === 4) {
                r = v3;
                g = v1;
                b = V;
            }
            else {
                r = V;
                g = v1;
                b = v2;
            }

            // RGB results from 0 to 255
            R = r * 255;
            G = g * 255;
            B = b * 255;
        }
        return [ R, G, B ];
    }

    function _HSL_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var L = data[2];
        // HSL from 0 to 1
        var R;
        var G;
        var B;
        if (S === 0) {
            R = L * 255;
            G = L * 255;
            B = L * 255;
        }
        else {
            var v2;
            if (L < 0.5) {
                v2 = L * (1 + S);
            }
            else {
                v2 = (L + S) - (S * L);
            }

            var v1 = 2 * L - v2;

            R = 255 * _HUE_2_RGB(v1, v2, H + (1 / 3));
            G = 255 * _HUE_2_RGB(v1, v2, H);
            B = 255 * _HUE_2_RGB(v1, v2, H - (1 / 3));
        }
        return [ R, G, B ];
    }

    function _HUE_2_RGB(v1, v2, vH) {
        if (vH < 0) {
            vH += 1;
        }
        if (vH > 1) {
            vH -= 1;
        }
        if ((6 * vH) < 1) {
            return (v1 + (v2 - v1) * 6 * vH);
        }
        if ((2 * vH) < 1) {
            return (v2);
        }
        if ((3 * vH) < 2) {
            return (v1 + (v2 - v1) * ((2 / 3) - vH) * 6);
        }
        return v1;
    }

    function _RGB_2_HSB(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value
        var V = vMax;
        var H;
        var S;

        // HSV results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        }
        else {
            S = delta / vMax;

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            }
            else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            }
            else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }
            if (H > 1) {
                H -= 1;
            }
        }
        H = H * 360;
        S = S * 100;
        V = V * 100;
        return [ H, S, V ];
    }

    function _RGB_2_HSL(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value

        var L = (vMax + vMin) / 2;
        var H;
        var S;
        // HSL results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        }
        else {
            if (L < 0.5) {
                S = delta / (vMax + vMin);
            }
            else {
                S = delta / (2 - vMax - vMin);
            }

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            }
            else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            }
            else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }

            if (H > 1) {
                H -= 1;
            }
        }

        H = H * 360;
        S = S * 100;
        L = L * 100;

        return [ H, S, L ];
    }

    return {
        customPalette : customPalette,
        resetPalette : resetPalette,
        getColor : getColor,
        getHighlightColor : getHighlightColor,
        customHighlight : customHighlight,
        resetHighlight : resetHighlight,
        getRadialGradient : getRadialGradient,
        getLinearGradient : getLinearGradient,
        getGradientColors : getGradientColors,
        getStepColors : getStepColors,
        reverse : reverse,
        mix : mix,
        lift : lift,
        trim : trim,
        random : random,
        toRGB : toRGB,
        toRGBA : toRGBA,
        toHex : toHex,
        toHSL : toHSL,
        toHSLA : toHSLA,
        toHSB : toHSB,
        toHSBA : toHSBA,
        toHSV : toHSV,
        toHSVA : toHSVA,
        toName : toName,
        toColor : toColor,
        toArray : toArray,
        alpha : alpha,
        getData : getData
    };
});


/**
 * shape基类
 * @module zrender/shape/Base
 * @author  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *          errorrik (errorrik@gmail.com)
 */

/**
 * @typedef {Object} IBaseShapeStyle
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */

/**
 * @typedef {Object} module:zrender/shape/Base~IBoundingRect
 * @property {number} x 左上角顶点x轴坐标 
 * @property {number} y 左上角顶点y轴坐标
 * @property {number} width 包围盒矩形宽度
 * @property {number} height 包围盒矩形高度
 */

define(
    'zrender/shape/Base',['require','../tool/matrix','../tool/guid','../tool/util','../tool/log','../mixin/Transformable','../mixin/Eventful','../tool/area','../tool/area','../tool/color','../tool/area'],function(require) {
        var vmlCanvasManager = window['G_vmlCanvasManager'];

        var matrix = require('../tool/matrix');
        var guid = require('../tool/guid');
        var util = require('../tool/util');
        var log = require('../tool/log');

        var Transformable = require('../mixin/Transformable');
        var Eventful = require('../mixin/Eventful');

        function _fillText(ctx, text, x, y, textFont, textAlign, textBaseline) {
            if (textFont) {
                ctx.font = textFont;
            }
            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            var rect = _getTextRect(
                text, x, y, textFont, textAlign, textBaseline
            );
            
            text = (text + '').split('\n');
            var lineHeight = require('../tool/area').getTextHeight('国', textFont);
            
            switch (textBaseline) {
                case 'top':
                    y = rect.y;
                    break;
                case 'bottom':
                    y = rect.y + lineHeight;
                    break;
                default:
                    y = rect.y + lineHeight / 2;
            }
            
            for (var i = 0, l = text.length; i < l; i++) {
                ctx.fillText(text[i], x, y);
                y += lineHeight;
            }
        }

        /**
         * 返回矩形区域，用于局部刷新和文字定位
         * @inner
         * @param {string} text
         * @param {number} x
         * @param {number} y
         * @param {string} textFont
         * @param {string} textAlign
         * @param {string} textBaseline
         */
        function _getTextRect(text, x, y, textFont, textAlign, textBaseline) {
            var area = require('../tool/area');
            var width = area.getTextWidth(text, textFont);
            var lineHeight = area.getTextHeight('国', textFont);
            
            text = (text + '').split('\n');
            
            switch (textAlign) {
                case 'end':
                case 'right':
                    x -= width;
                    break;
                case 'center':
                    x -= (width / 2);
                    break;
            }

            switch (textBaseline) {
                case 'top':
                    break;
                case 'bottom':
                    y -= lineHeight * text.length;
                    break;
                default:
                    y -= lineHeight * text.length / 2;
            }

            return {
                x : x,
                y : y,
                width : width,
                height : lineHeight * text.length
            };
        }

        /**
         * @alias module:zrender/shape/Base
         * @constructor
         * @extends module:zrender/mixin/Transformable
         * @extends module:zrender/mixin/Eventful
         * @param {Object} options 关于shape的配置项，可以是shape的自有属性，也可以是自定义的属性。
         */
        var Base = function(options) {
            
            options = options || {};
            
            /**
             * Shape id, 全局唯一
             * @type {string}
             */
            this.id = options.id || guid();

            for (var key in options) {
                this[key] = options[key];
            }

            /**
             * 基础绘制样式
             * @type {module:zrender/shape/Base~IBaseShapeStyle}
             */
            this.style = this.style || {};

            /**
             * 高亮样式
             * @type {module:zrender/shape/Base~IBaseShapeStyle}
             */
            this.highlightStyle = this.highlightStyle || null;

            /**
             * 父节点
             * @readonly
             * @type {module:zrender/Group}
             * @default null
             */
            this.parent = null;

            this.__dirty = true;

            this.__clipShapes = [];

            Transformable.call(this);
            Eventful.call(this);
        };
        /**
         * 图形是否可见，为true时不绘制图形，但是仍能触发鼠标事件
         * @name module:zrender/shape/Base#invisible
         * @type {boolean}
         * @default false
         */
        Base.prototype.invisible = false;

        /**
         * 图形是否忽略，为true时忽略图形的绘制以及事件触发
         * @name module:zrender/shape/Base#ignore
         * @type {boolean}
         * @default false
         */
        Base.prototype.ignore = false;

        /**
         * z层level，决定绘画在哪层canvas中
         * @name module:zrender/shape/Base#zlevel
         * @type {number}
         * @default 0
         */
        Base.prototype.zlevel = 0;

        /**
         * 是否可拖拽
         * @name module:zrender/shape/Base#draggable
         * @type {boolean}
         * @default false
         */
        Base.prototype.draggable = false;

        /**
         * 是否可点击
         * @name module:zrender/shape/Base#clickable
         * @type {boolean}
         * @default false
         */
        Base.prototype.clickable = false;

        /**
         * 是否可以hover
         * @name module:zrender/shape/Base#hoverable
         * @type {boolean}
         * @default true
         */
        Base.prototype.hoverable = true;
        
        /**
         * z值，跟zlevel一样影响shape绘制的前后顺序，z值大的shape会覆盖在z值小的上面，
         * 但是并不会创建新的canvas，所以优先级低于zlevel，而且频繁改动的开销比zlevel小很多。
         * 
         * @name module:zrender/shape/Base#z
         * @type {number}
         * @default 0
         */
        Base.prototype.z = 0;

        /**
         * 绘制图形
         * 
         * @param {CanvasRenderingContext2D} ctx
         * @param {boolean} [isHighlight=false] 是否使用高亮属性
         * @param {Function} [updateCallback]
         *        需要异步加载资源的shape可以通过这个callback(e), 
         *        让painter更新视图，base.brush没用，需要的话重载brush
         */
        Base.prototype.brush = function (ctx, isHighlight) {

            var style = this.beforeBrush(ctx, isHighlight);

            ctx.beginPath();
            this.buildPath(ctx, style);

            switch (style.brushType) {
                /* jshint ignore:start */
                case 'both':
                    ctx.fill();
                case 'stroke':
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                /* jshint ignore:end */
                default:
                    ctx.fill();
            }
            
            this.drawText(ctx, style, this.style);

            this.afterBrush(ctx);
        };

        /**
         * 具体绘制操作前的一些公共操作
         * @param {CanvasRenderingContext2D} ctx
         * @param {boolean} [isHighlight=false] 是否使用高亮属性
         * @return {Object} 处理后的样式
         */
        Base.prototype.beforeBrush = function (ctx, isHighlight) {
            var style = this.style;
            
            if (this.brushTypeOnly) {
                style.brushType = this.brushTypeOnly;
            }

            if (isHighlight) {
                // 根据style扩展默认高亮样式
                style = this.getHighlightStyle(
                    style,
                    this.highlightStyle || {},
                    this.brushTypeOnly
                );
            }

            if (this.brushTypeOnly == 'stroke') {
                style.strokeColor = style.strokeColor || style.color;
            }

            ctx.save();

            this.doClip(ctx);

            this.setContext(ctx, style);

            // 设置transform
            this.setTransform(ctx);

            return style;
        }

        /**
         * 绘制后的处理
         * @param {CanvasRenderingContext2D} ctx
         */
        Base.prototype.afterBrush = function (ctx) {
            ctx.restore();
        }

        var STYLE_CTX_MAP = [
            [ 'color', 'fillStyle' ],
            [ 'strokeColor', 'strokeStyle' ],
            [ 'opacity', 'globalAlpha' ],
            [ 'lineCap', 'lineCap' ],
            [ 'lineJoin', 'lineJoin' ],
            [ 'miterLimit', 'miterLimit' ],
            [ 'lineWidth', 'lineWidth' ],
            [ 'shadowBlur', 'shadowBlur' ],
            [ 'shadowColor', 'shadowColor' ],
            [ 'shadowOffsetX', 'shadowOffsetX' ],
            [ 'shadowOffsetY', 'shadowOffsetY' ]
        ];

        /**
         * 设置 fillStyle, strokeStyle, shadow 等通用绘制样式
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         */
        Base.prototype.setContext = function (ctx, style) {
            for (var i = 0, len = STYLE_CTX_MAP.length; i < len; i++) {
                var styleProp = STYLE_CTX_MAP[i][0];
                var styleValue = style[styleProp];
                var ctxProp = STYLE_CTX_MAP[i][1];

                if (typeof styleValue != 'undefined') {
                    ctx[ctxProp] = styleValue;
                }
            }
        };

        var clipShapeInvTransform = matrix.create();
        Base.prototype.doClip = function (ctx) {
            if (this.__clipShapes && !vmlCanvasManager) {
                for (var i = 0; i < this.__clipShapes.length; i++) {
                    var clipShape = this.__clipShapes[i];
                    if (clipShape.needTransform) {
                        var m = clipShape.transform;
                        matrix.invert(clipShapeInvTransform, m);
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                    ctx.beginPath();
                    clipShape.buildPath(ctx, clipShape.style);
                    ctx.clip();
                    // Transform back
                    if (clipShape.needTransform) {
                        var m = clipShapeInvTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }
            }
        }
    
        /**
         * 根据默认样式扩展高亮样式
         * 
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style 默认样式
         * @param {module:zrender/shape/Base~IBaseShapeStyle} highlightStyle 高亮样式
         * @param {string} brushTypeOnly
         */
        Base.prototype.getHighlightStyle = function (style, highlightStyle, brushTypeOnly) {
            var newStyle = {};
            for (var k in style) {
                newStyle[k] = style[k];
            }

            var color = require('../tool/color');
            var highlightColor = color.getHighlightColor();
            // 根据highlightStyle扩展
            if (style.brushType != 'stroke') {
                // 带填充则用高亮色加粗边线
                newStyle.strokeColor = highlightColor;
                newStyle.lineWidth = (style.lineWidth || 1)
                                      + this.getHighlightZoom();
                newStyle.brushType = 'both';
            }
            else {
                if (brushTypeOnly != 'stroke') {
                    // 描边型的则用原色加工高亮
                    newStyle.strokeColor = highlightColor;
                    newStyle.lineWidth = (style.lineWidth || 1)
                                          + this.getHighlightZoom();
                } 
                else {
                    // 线型的则用原色加工高亮
                    newStyle.strokeColor = highlightStyle.strokeColor
                                           || color.mix(
                                                 style.strokeColor,
                                                 color.toRGB(highlightColor)
                                              );
                }
            }

            // 可自定义覆盖默认值
            for (var k in highlightStyle) {
                if (typeof highlightStyle[k] != 'undefined') {
                    newStyle[k] = highlightStyle[k];
                }
            }

            return newStyle;
        };

        // 高亮放大效果参数
        // 当前统一设置为6，如有需要差异设置，通过this.type判断实例类型
        Base.prototype.getHighlightZoom = function () {
            return this.type != 'text' ? 6 : 2;
        };

        /**
         * 移动位置
         * @param {number} dx 横坐标变化
         * @param {number} dy 纵坐标变化
         */
        Base.prototype.drift = function (dx, dy) {
            this.position[0] += dx;
            this.position[1] += dy;
        };

        /**
         * 变换鼠标位置到 shape 的局部坐标空间
         * @method
         * @param {number} x
         * @param {number} y
         * @return {Array.<number>}
         */
        Base.prototype.getTansform = (function() {
            
            var invTransform = [];

            return function (x, y) {
                var originPos = [ x, y ];
                // 对鼠标的坐标也做相同的变换
                if (this.needTransform && this.transform) {
                    matrix.invert(invTransform, this.transform);

                    matrix.mulVector(originPos, invTransform, [ x, y, 1 ]);

                    if (x == originPos[0] && y == originPos[1]) {
                        // 避免外部修改导致的needTransform不准确
                        this.updateNeedTransform();
                    }
                }
                return originPos;
            };
        })();

        /**
         * 构建绘制的Path
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         */
        Base.prototype.buildPath = function (ctx, style) {
            log('buildPath not implemented in ' + this.type);
        };

        /**
         * 计算返回包围盒矩形
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         * @return {module:zrender/shape/Base~IBoundingRect}
         */
        Base.prototype.getRect = function (style) {
            log('getRect not implemented in ' + this.type);   
        };
        
        /**
         * 判断鼠标位置是否在图形内
         * @param {number} x
         * @param {number} y
         * @return {boolean}
         */
        Base.prototype.isCover = function (x, y) {
            var originPos = this.getTansform(x, y);
            x = originPos[0];
            y = originPos[1];

            // 快速预判并保留判断矩形
            var rect = this.style.__rect;
            if (!rect) {
                rect = this.style.__rect = this.getRect(this.style);
            }

            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                // 矩形内
                return require('../tool/area').isInside(this, this.style, x, y);
            }
            
            return false;
        };

        /**
         * 绘制附加文本
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style 样式
         * @param {module:zrender/shape/Base~IBaseShapeStyle} normalStyle 默认样式，用于定位文字显示
         */
        Base.prototype.drawText = function (ctx, style, normalStyle) {
            if (typeof(style.text) == 'undefined' || style.text === false) {
                return;
            }
            // 字体颜色策略
            var textColor = style.textColor || style.color || style.strokeColor;
            ctx.fillStyle = textColor;

            // 文本与图形间空白间隙
            var dd = 10;
            var al;         // 文本水平对齐
            var bl;         // 文本垂直对齐
            var tx;         // 文本横坐标
            var ty;         // 文本纵坐标

            var textPosition = style.textPosition       // 用户定义
                               || this.textPosition     // shape默认
                               || 'top';                // 全局默认

            switch (textPosition) {
                case 'inside': 
                case 'top': 
                case 'bottom': 
                case 'left': 
                case 'right': 
                    if (this.getRect) {
                        var rect = (normalStyle || style).__rect
                                   || this.getRect(normalStyle || style);

                        switch (textPosition) {
                            case 'inside':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height / 2;
                                al = 'center';
                                bl = 'middle';
                                if (style.brushType != 'stroke'
                                    && textColor == style.color
                                ) {
                                    ctx.fillStyle = '#fff';
                                }
                                break;
                            case 'left':
                                tx = rect.x - dd;
                                ty = rect.y + rect.height / 2;
                                al = 'end';
                                bl = 'middle';
                                break;
                            case 'right':
                                tx = rect.x + rect.width + dd;
                                ty = rect.y + rect.height / 2;
                                al = 'start';
                                bl = 'middle';
                                break;
                            case 'top':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y - dd;
                                al = 'center';
                                bl = 'bottom';
                                break;
                            case 'bottom':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height + dd;
                                al = 'center';
                                bl = 'top';
                                break;
                        }
                    }
                    break;
                case 'start':
                case 'end':
                    var xStart;
                    var xEnd;
                    var yStart;
                    var yEnd;
                    if (typeof style.pointList != 'undefined') {
                        var pointList = style.pointList;
                        if (pointList.length < 2) {
                            // 少于2个点就不画了~
                            return;
                        }
                        var length = pointList.length;
                        switch (textPosition) {
                            case 'start':
                                xStart = pointList[0][0];
                                xEnd = pointList[1][0];
                                yStart = pointList[0][1];
                                yEnd = pointList[1][1];
                                break;
                            case 'end':
                                xStart = pointList[length - 2][0];
                                xEnd = pointList[length - 1][0];
                                yStart = pointList[length - 2][1];
                                yEnd = pointList[length - 1][1];
                                break;
                        }
                    }
                    else {
                        xStart = style.xStart || 0;
                        xEnd = style.xEnd || 0;
                        yStart = style.yStart || 0;
                        yEnd = style.yEnd || 0;
                    }

                    switch (textPosition) {
                        case 'start':
                            al = xStart < xEnd ? 'end' : 'start';
                            bl = yStart < yEnd ? 'bottom' : 'top';
                            tx = xStart;
                            ty = yStart;
                            break;
                        case 'end':
                            al = xStart < xEnd ? 'start' : 'end';
                            bl = yStart < yEnd ? 'top' : 'bottom';
                            tx = xEnd;
                            ty = yEnd;
                            break;
                    }
                    dd -= 4;
                    if (xStart != xEnd) {
                        tx -= (al == 'end' ? dd : -dd);
                    } 
                    else {
                        al = 'center';
                    }

                    if (yStart != yEnd) {
                        ty -= (bl == 'bottom' ? dd : -dd);
                    } 
                    else {
                        bl = 'middle';
                    }
                    break;
                case 'specific':
                    tx = style.textX || 0;
                    ty = style.textY || 0;
                    al = 'start';
                    bl = 'middle';
                    break;
            }

            if (tx != null && ty != null) {
                _fillText(
                    ctx,
                    style.text, 
                    tx, ty, 
                    style.textFont,
                    style.textAlign || al,
                    style.textBaseline || bl
                );
            }
        };

        Base.prototype.modSelf = function() {
            this.__dirty = true;
            if (this.style) {
                this.style.__rect = null;
            }
        };

        /**
         * 图形是否会触发事件
         * @return {boolean}
         */
        // TODO, 通过 bind 绑定的事件
        Base.prototype.isSilent = function () {
            return !(
                this.hoverable || this.draggable || this.clickable
                || this.onmousemove || this.onmouseover || this.onmouseout
                || this.onmousedown || this.onmouseup || this.onclick
                || this.ondragenter || this.ondragover || this.ondragleave
                || this.ondrop
            );
        };

        util.merge(Base.prototype, Transformable.prototype, true);
        util.merge(Base.prototype, Eventful.prototype, true);

        return Base;
    }
);

/**
 * @module zrender/shape/Text
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 * @example
 *     var Text = require('zrender/shape/Text');
 *     var shape = new Text({
 *         style: {
 *             text: 'Label',
 *             x: 100,
 *             y: 100,
 *             textFont: '14px Arial'
 *         }
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} ITextStyle
 * @property {number} x 横坐标
 * @property {number} y 纵坐标
 * @property {string} text 文本内容
 * @property {number} [maxWidth=null] 最大宽度限制
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 */

define(
    'zrender/shape/Text',['require','../tool/area','./Base','../tool/util'],function (require) {
        var area = require('../tool/area');
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Text
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Text = function (options) {
            Base.call(this, options);
            /**
             * 文字绘制样式
             * @name module:zrender/shape/Text#style
             * @type {module:zrender/shape/Text~ITextStyle}
             */
            /**
             * 文字高亮绘制样式
             * @name module:zrender/shape/Text#highlightStyle
             * @type {module:zrender/shape/Text~ITextStyle}
             */
        };

        Text.prototype =  {
            type: 'text',

            brush : function (ctx, isHighlight) {
                var style = this.style;
                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style, this.highlightStyle || {}
                    );
                }
                
                if (typeof(style.text) == 'undefined' || style.text === false) {
                    return;
                }

                ctx.save();
                this.doClip(ctx);

                this.setContext(ctx, style);

                // 设置transform
                this.setTransform(ctx);

                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || 'start';
                ctx.textBaseline = style.textBaseline || 'middle';

                var text = (style.text + '').split('\n');
                var lineHeight = area.getTextHeight('国', style.textFont);
                var rect = this.getRect(style);
                var x = style.x;
                var y;
                if (style.textBaseline == 'top') {
                    y = rect.y;
                }
                else if (style.textBaseline == 'bottom') {
                    y = rect.y + lineHeight;
                }
                else {
                    y = rect.y + lineHeight / 2;
                }
                
                for (var i = 0, l = text.length; i < l; i++) {
                    if (style.maxWidth) {
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'stroke':
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'both':
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            default:
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                        }
                    }
                    else {
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(text[i], x, y);
                                break;
                            case 'stroke':
                                ctx.strokeText(text[i], x, y);
                                break;
                            case 'both':
                                ctx.fillText(text[i], x, y);
                                ctx.strokeText(text[i], x, y);
                                break;
                            default:
                                ctx.fillText(text[i], x, y);
                        }
                    }
                    y += lineHeight;
                }

                ctx.restore();
                return;
            },

            /**
             * 返回文字包围盒矩形
             * @param {module:zrender/shape/Text~ITextStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var width = area.getTextWidth(style.text, style.textFont);
                var height = area.getTextHeight(style.text, style.textFont);
                
                var textX = style.x;                 // 默认start == left
                if (style.textAlign == 'end' || style.textAlign == 'right') {
                    textX -= width;
                }
                else if (style.textAlign == 'center') {
                    textX -= (width / 2);
                }

                var textY;
                if (style.textBaseline == 'top') {
                    textY = style.y;
                }
                else if (style.textBaseline == 'bottom') {
                    textY = style.y - height;
                }
                else {
                    // middle
                    textY = style.y - height / 2;
                }

                style.__rect = {
                    x : textX,
                    y : textY,
                    width : width,
                    height : height
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Text, Base);
        return Text;
    }
);


/**
 * 矩形
 * @module zrender/shape/Rectangle
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com) , 
 *         strwind (@劲风FEI, yaofeifei@baidu.com)
 * @example
 *     var Rectangle = require('zrender/shape/Rectangle');
 *     var shape = new Rectangle({
 *         style: {
 *             x: 0,
 *             y: 0,
 *             width: 100,
 *             height: 100,
 *             radius: 20
 *         }
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} IRectangleStyle
 * @property {number} x 左上角x坐标
 * @property {number} y 左上角y坐标
 * @property {number} width 宽度
 * @property {number} height 高度
 * @property {number|Array.<number>} radius 矩形圆角，可以用数组分别指定四个角的圆角
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */
define(
    'zrender/shape/Rectangle',['require','./Base','../tool/util'],function (require) {
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Rectangle
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Rectangle = function (options) {
            Base.call(this, options);
            /**
             * 矩形绘制样式
             * @name module:zrender/shape/Rectangle#style
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
            /**
             * 矩形高亮绘制样式
             * @name module:zrender/shape/Rectangle#highlightStyle
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
        };

        Rectangle.prototype =  {
            type: 'rectangle',

            _buildRadiusPath: function (ctx, style) {
                // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
                // r缩写为1         相当于 [1, 1, 1, 1]
                // r缩写为[1]       相当于 [1, 1, 1, 1]
                // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
                // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
                var x = style.x;
                var y = style.y;
                var width = style.width;
                var height = style.height;
                var r = style.radius;
                var r1; 
                var r2; 
                var r3; 
                var r4;
                  
                if (typeof r === 'number') {
                    r1 = r2 = r3 = r4 = r;
                }
                else if (r instanceof Array) {
                    if (r.length === 1) {
                        r1 = r2 = r3 = r4 = r[0];
                    }
                    else if (r.length === 2) {
                        r1 = r3 = r[0];
                        r2 = r4 = r[1];
                    }
                    else if (r.length === 3) {
                        r1 = r[0];
                        r2 = r4 = r[1];
                        r3 = r[2];
                    }
                    else {
                        r1 = r[0];
                        r2 = r[1];
                        r3 = r[2];
                        r4 = r[3];
                    }
                }
                else {
                    r1 = r2 = r3 = r4 = 0;
                }
                
                var total;
                if (r1 + r2 > width) {
                    total = r1 + r2;
                    r1 *= width / total;
                    r2 *= width / total;
                }
                if (r3 + r4 > width) {
                    total = r3 + r4;
                    r3 *= width / total;
                    r4 *= width / total;
                }
                if (r2 + r3 > height) {
                    total = r2 + r3;
                    r2 *= height / total;
                    r3 *= height / total;
                }
                if (r1 + r4 > height) {
                    total = r1 + r4;
                    r1 *= height / total;
                    r4 *= height / total;
                }
                ctx.moveTo(x + r1, y);
                ctx.lineTo(x + width - r2, y);
                r2 !== 0 && ctx.quadraticCurveTo(
                    x + width, y, x + width, y + r2
                );
                ctx.lineTo(x + width, y + height - r3);
                r3 !== 0 && ctx.quadraticCurveTo(
                    x + width, y + height, x + width - r3, y + height
                );
                ctx.lineTo(x + r4, y + height);
                r4 !== 0 && ctx.quadraticCurveTo(
                    x, y + height, x, y + height - r4
                );
                ctx.lineTo(x, y + r1);
                r1 !== 0 && ctx.quadraticCurveTo(x, y, x + r1, y);
            },
            
            /**
             * 创建矩形路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {Object} style
             */
            buildPath : function (ctx, style) {
                if (!style.radius) {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                    // ctx.rect(style.x, style.y, style.width, style.height);
                }
                else {
                    this._buildRadiusPath(ctx, style);
                }
                ctx.closePath();
                return;
            },

            /**
             * 计算返回矩形包围盒矩阵
             * @param {module:zrender/shape/Rectangle~IRectangleStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - lineWidth / 2),
                    y : Math.round(style.y - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.height + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Rectangle, Base);
        return Rectangle;
    }
);

/**
 * zrender: loading特效类
 *
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 */

define(
    'zrender/loadingEffect/Base',['require','../tool/util','../shape/Text','../shape/Rectangle'],function(require) {
        var util = require('../tool/util');
        var TextShape = require('../shape/Text');
        var RectangleShape = require('../shape/Rectangle');


        var DEFAULT_TEXT = 'Loading...';
        var DEFAULT_TEXT_FONT = 'normal 16px Arial';

        /**
         * @constructor
         * 
         * @param {Object} options 选项
         * @param {color} options.backgroundColor 背景颜色
         * @param {Object} options.textStyle 文字样式，同shape/text.style
         * @param {number=} options.progress 进度参数，部分特效有用
         * @param {Object=} options.effect 特效参数，部分特效有用
         * 
         * {
         *     effect,
         *     //loading话术
         *     text:'',
         *     // 水平安放位置，默认为 'center'，可指定x坐标
         *     x:'center' || 'left' || 'right' || {number},
         *     // 垂直安放位置，默认为'top'，可指定y坐标
         *     y:'top' || 'bottom' || {number},
         *
         *     textStyle:{
         *         textFont: 'normal 20px Arial' || {textFont}, //文本字体
         *         color: {color}
         *     }
         * }
         */
        function Base(options) {
            this.setOptions(options);
        }

        /**
         * 创建loading文字图形
         * 
         * @param {Object} textStyle 文字style，同shape/text.style
         */
        Base.prototype.createTextShape = function (textStyle) {
            return new TextShape({
                highlightStyle : util.merge(
                    {
                        x : this.canvasWidth / 2,
                        y : this.canvasHeight / 2,
                        text : DEFAULT_TEXT,
                        textAlign : 'center',
                        textBaseline : 'middle',
                        textFont : DEFAULT_TEXT_FONT,
                        color: '#333',
                        brushType : 'fill'
                    },
                    textStyle,
                    true
                )
            });
        };
        
        /**
         * 获取loading背景图形
         * 
         * @param {color} color 背景颜色
         */
        Base.prototype.createBackgroundShape = function (color) {
            return new RectangleShape({
                highlightStyle : {
                    x : 0,
                    y : 0,
                    width : this.canvasWidth,
                    height : this.canvasHeight,
                    brushType : 'fill',
                    color : color
                }
            });
        };

        Base.prototype.start = function (painter) {
            this.canvasWidth = painter._width;
            this.canvasHeight = painter._height;

            function addShapeHandle(param) {
                painter.storage.addHover(param);
            }
            function refreshHandle() {
                painter.refreshHover();
            }
            this.loadingTimer = this._start(addShapeHandle, refreshHandle);
        };

        Base.prototype._start = function (/*addShapeHandle, refreshHandle*/) {
            return setInterval(function () {
            }, 10000);
        };

        Base.prototype.stop = function () {
            clearInterval(this.loadingTimer);
        };

        Base.prototype.setOptions = function (options) {
            this.options = options || {};
        };
        
        Base.prototype.adjust = function (value, region) {
            if (value <= region[0]) {
                value = region[0];
            }
            else if (value >= region[1]) {
                value = region[1];
            }
            return value;
        };
        
        Base.prototype.getLocation = function(loc, totalWidth, totalHeight) {
            var x = loc.x != null ? loc.x : 'center';
            switch (x) {
                case 'center' :
                    x = Math.floor((this.canvasWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = 0;
                    break;
                case 'right' :
                    x = this.canvasWidth - totalWidth;
                    break;
            }
            var y = loc.y != null ? loc.y : 'center';
            switch (y) {
                case 'center' :
                    y = Math.floor((this.canvasHeight - totalHeight) / 2);
                    break;
                case 'top' :
                    y = 0;
                    break;
                case 'bottom' :
                    y = this.canvasHeight - totalHeight;
                    break;
            }
            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        };

        return Base;
    }
);

/**
 * 图片绘制
 * @module zrender/shape/Image
 * @author pissang(https://www.github.com/pissang)
 * @example
 *     var ImageShape = require('zrender/shape/Image');
 *     var image = new ImageShape({
 *         style: {
 *             image: 'test.jpg',
 *             x: 100,
 *             y: 100
 *         }
 *     });
 *     zr.addShape(image);
 */

/**
 * @typedef {Object} IImageStyle
 * @property {string|HTMLImageElement|HTMLCanvasElement} image 图片url或者图片对象
 * @property {number} x 左上角横坐标
 * @property {number} y 左上角纵坐标
 * @property {number} [width] 绘制到画布上的宽度，默认为图片宽度
 * @property {number} [height] 绘制到画布上的高度，默认为图片高度
 * @property {number} [sx=0] 从图片中裁剪的左上角横坐标
 * @property {number} [sy=0] 从图片中裁剪的左上角纵坐标
 * @property {number} [sWidth] 从图片中裁剪的宽度，默认为图片高度
 * @property {number} [sHeight] 从图片中裁剪的高度，默认为图片高度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */
define(
    'zrender/shape/Image',['require','./Base','../tool/util'],function (require) {

        var _needsRefresh = [];
        var _refreshTimeout;

        var Base = require('./Base');

        /**
         * @alias zrender/shape/Image
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var ZImage = function(options) {
            Base.call(this, options);

            this._imageCache = {};
            /**
             * 图片绘制样式
             * @name module:zrender/shape/Image#style
             * @type {module:zrender/shape/Image~IImageStyle}
             */
            /**
             * 图片高亮绘制样式
             * @name module:zrender/shape/Image#highlightStyle
             * @type {module:zrender/shape/Image~IImageStyle}
             */
        };

        ZImage.prototype = {
            
            type: 'image',

            brush : function(ctx, isHighlight, refresh) {
                var style = this.style || {};

                if (isHighlight) {
                    // 根据style扩展默认高亮样式
                    style = this.getHighlightStyle(
                        style, this.highlightStyle || {}
                    );
                }

                var image = style.image;
                var me = this;

                if (typeof(image) === 'string') {
                    var src = image;
                    if (this._imageCache[src]) {
                        image = this._imageCache[src];
                    } else {
                        image = new Image();
                        image.onload = function () {
                            image.onload = null;
                            clearTimeout(_refreshTimeout);
                            _needsRefresh.push(me);
                            // 防止因为缓存短时间内触发多次onload事件
                            _refreshTimeout = setTimeout(function () {
                                refresh && refresh(_needsRefresh);
                                // 清空needsRefresh
                                _needsRefresh = [];
                            }, 10);
                        };

                        image.src = src;
                        this._imageCache[src] = image;
                    }
                }
                if (image) {
                    // 图片已经加载完成
                    if (image.nodeName.toUpperCase() == 'IMG') {
                        if (window.ActiveXObject) {
                            if (image.readyState != 'complete') {
                                return;
                            }
                        }
                        else {
                            if (!image.complete) {
                                return;
                            }
                        }
                    }
                    // Else is canvas
                    var width = style.width || image.width;
                    var height = style.height || image.height;
                    var x = style.x;
                    var y = style.y;
                    
                    // 图片加载失败
                    if (!image.width || !image.height) {
                        return;
                    }

                    ctx.save();

                    this.doClip(ctx);

                    this.setContext(ctx, style);

                    // 设置transform
                    this.setTransform(ctx);

                    if (style.sWidth && style.sHeight) {
                        var sx = style.sx || 0;
                        var sy = style.sy || 0;
                        ctx.drawImage(
                            image,
                            sx, sy, style.sWidth, style.sHeight,
                            x, y, width, height
                        );
                    }
                    else if (style.sx && style.sy) {
                        var sx = style.sx;
                        var sy = style.sy;
                        var sWidth = width - sx;
                        var sHeight = height - sy;
                        ctx.drawImage(
                            image,
                            sx, sy, sWidth, sHeight,
                            x, y, width, height
                        );
                    }
                    else {
                        ctx.drawImage(image, x, y, width, height);
                    }
                    // 如果没设置宽和高的话自动根据图片宽高设置
                    if (!style.width) {
                        style.width = width;
                    }
                    if (!style.height) {
                        style.height = height;
                    }
                    if (!this.style.width) {
                        this.style.width = width;
                    }
                    if (!this.style.height) {
                        this.style.height = height;
                    }

                    this.drawText(ctx, style, this.style);

                    ctx.restore();
                }
            },

            /**
             * 计算返回图片的包围盒矩形
             * @param {module:zrender/shape/Image~IImageStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect: function(style) {
                return {
                    x : style.x,
                    y : style.y,
                    width : style.width,
                    height : style.height
                };
            },

            clearCache: function() {
                this._imageCache = {};
            }
        };

        require('../tool/util').inherits(ZImage, Base);
        return ZImage;
    }
);

/**
 * Painter绘图模块
 * @module zrender/Painter
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 *         errorrik (errorrik@gmail.com)
 *         pissang (https://www.github.com/pissang)
 */
 define(
    'zrender/Painter',['require','./config','./tool/util','./tool/log','./tool/matrix','./loadingEffect/Base','./mixin/Transformable','./shape/Image'],function (require) {
        

        var config = require('./config');
        var util = require('./tool/util');
        // var vec2 = require('./tool/vector');
        var log = require('./tool/log');
        var matrix = require('./tool/matrix');
        var BaseLoadingEffect = require('./loadingEffect/Base');
        var Transformable = require('./mixin/Transformable');

        // retina 屏幕优化
        var devicePixelRatio = window.devicePixelRatio || 1;
        devicePixelRatio = Math.max(devicePixelRatio, 1);
        var vmlCanvasManager = window['G_vmlCanvasManager'];

        
        // 返回false的方法，用于避免页面被选中
        function returnFalse() {
            return false;
        }

        // 什么都不干的空方法
        function doNothing() {}

        /**
         * @alias module:zrender/Painter
         * @constructor
         * @param {HTMLElement} root 绘图容器
         * @param {module:zrender/Storage} storage
         */
        var Painter = function (root, storage) {
            /**
             * 绘图容器
             * @type {HTMLElement}
             */
            this.root = root;
            /**
             * @type {module:zrender/Storage}
             */
            this.storage = storage;

            root.innerHTML = '';
            this._width = this._getWidth(); // 宽，缓存记录
            this._height = this._getHeight(); // 高，缓存记录

            var domRoot = document.createElement('div');
            this._domRoot = domRoot;

            // domRoot.onselectstart = returnFalse; // 避免页面选中的尴尬
            domRoot.style.position = 'relative';
            domRoot.style.overflow = 'hidden';
            domRoot.style.width = this._width + 'px';
            domRoot.style.height = this._height + 'px';
            root.appendChild(domRoot);

            this._layers = {};

            this._layerConfig = {};

            this._loadingEffect = new BaseLoadingEffect({});
            this.shapeToImage = this._createShapeToImageProcessor();

            // 创建各层canvas
            // 背景
            this._bgDom = createDom('bg', 'div', this);
            domRoot.appendChild(this._bgDom);
            this._bgDom.onselectstart = returnFalse;
            this._bgDom.style['-webkit-user-select'] = 'none';
            this._bgDom.style['user-select'] = 'none';
            this._bgDom.style['-webkit-touch-callout'] = 'none';

            // 高亮
            var hoverLayer = new Layer('_zrender_hover_', this);
            this._layers['hover'] = hoverLayer;
            domRoot.appendChild(hoverLayer.dom);
            hoverLayer.initContext();

            hoverLayer.dom.onselectstart = returnFalse;
            hoverLayer.dom.style['-webkit-user-select'] = 'none';
            hoverLayer.dom.style['user-select'] = 'none';
            hoverLayer.dom.style['-webkit-touch-callout'] = 'none';

            var me = this;
            this.updatePainter = function (shapeList, callback) {
                me.refreshShapes(shapeList, callback);
            };
        };

        /**
         * 首次绘图，创建各种dom和context
         * 
         * @param {Function} callback 绘画结束后的回调函数
         */
        Painter.prototype.render = function (callback) {
            if (this.isLoading()) {
                this.hideLoading();
            }
            // TODO
            this.refresh(callback, true);

            return this;
        };

        /**
         * 刷新
         * @param {Function} callback 刷新结束后的回调函数
         * @param {boolean} paintAll 强制绘制所有shape
         */
        Painter.prototype.refresh = function (callback, paintAll) {
            var list = this.storage.getShapeList(true);
            this._paintList(list, paintAll);

            if (typeof callback == 'function') {
                callback();
            }

            return this;
        };

        Painter.prototype._paintList = function (list, paintAll) {

            if (typeof(paintAll) == 'undefined') {
                paintAll = false;
            }

            this._updateLayerStatus(list);

            var currentLayer;
            var currentZLevel;
            var ctx;

            for (var id in this._layers) {
                if (id !== 'hover') {
                    this._layers[id].unusedCount++;
                    this._layers[id].updateTransform();
                }
            }

            var invTransform = [];

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];

                if (currentZLevel !== shape.zlevel) {
                    if (currentLayer && currentLayer.needTransform) {
                        ctx.restore();
                    }

                    currentLayer = this.getLayer(shape.zlevel, currentLayer);
                    ctx = currentLayer.ctx;
                    currentZLevel = shape.zlevel;

                    // Reset the count
                    currentLayer.unusedCount = 0;

                    if (currentLayer.dirty || paintAll) {
                        currentLayer.clear();
                    }

                    if (currentLayer.needTransform) {
                        ctx.save();
                        currentLayer.setTransform(ctx);
                    }
                }

                // Start group clipping
                if (shape.__startClip && !vmlCanvasManager) {
                    var clipShape = shape.__startClip;
                    ctx.save();
                    // Set transform
                    if (clipShape.needTransform) {
                        var m = clipShape.transform;
                        matrix.invert(invTransform, m);
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }

                    ctx.beginPath();
                    clipShape.buildPath(ctx, clipShape.style);
                    ctx.clip();

                    // Transform back
                    if (clipShape.needTransform) {
                        var m = invTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }

                if ((currentLayer.dirty || paintAll) && !shape.invisible) {
                    if (
                        !shape.onbrush
                        || (shape.onbrush && !shape.onbrush(ctx, false))
                    ) {
                        if (config.catchBrushException) {
                            try {
                                shape.brush(ctx, false, this.updatePainter);
                            }
                            catch (error) {
                                log(
                                    error,
                                    'brush error of ' + shape.type,
                                    shape
                                );
                            }
                        }
                        else {
                            shape.brush(ctx, false, this.updatePainter);
                        }
                    }
                }

                // Stop group clipping
                if (shape.__stopClip && !vmlCanvasManager) {
                    ctx.restore();
                }

                shape.__dirty = false;
            }

            if (currentLayer && currentLayer.needTransform) {
                ctx.restore();
            }

            for (var id in this._layers) {
                if (id !== 'hover') {
                    var layer = this._layers[id];
                    layer.dirty = false;
                    // 删除过期的层
                    // PENDING
                    // if (layer.unusedCount >= 500) {
                    //     this.delLayer(id);
                    // }
                    if (layer.unusedCount == 1) {
                        layer.clear();
                    }
                }
            }
        };

        /**
         * 获取 zlevel 所在层，如果不存在则会创建一个新的层
         * @param {number} zlevel
         * @param {module:zrender/Painter~Layer} [prevLayer]
         *        在需要创建新的层时需要使用，新创建层的dom节点会插在该层后面
         */
        Painter.prototype.getLayer = function (zlevel, prevLayer) {
            // Change draw layer
            var currentLayer = this._layers[zlevel];
            if (!currentLayer) {
                // Create a new layer
                currentLayer = new Layer(zlevel, this);
                var prevDom = prevLayer ? prevLayer.dom : this._bgDom;
                if (prevDom.nextSibling) {
                    prevDom.parentNode.insertBefore(
                        currentLayer.dom,
                        prevDom.nextSibling
                    );
                }
                else {
                    prevDom.parentNode.appendChild(
                        currentLayer.dom
                    );
                }
                currentLayer.initContext();
                
                this._layers[zlevel] = currentLayer;

                if (this._layerConfig[zlevel]) {
                    util.merge(currentLayer, this._layerConfig[zlevel], true);
                }

                currentLayer.updateTransform();
            }

            return currentLayer;
        };

        /**
         * 获取所有已创建的层
         * @param {Array.<module:zrender/Painter~Layer>} [prevLayer]
         */
        Painter.prototype.getLayers = function () {
            return this._layers;
        };

        Painter.prototype._updateLayerStatus = function (list) {
            
            var layers = this._layers;

            var elCounts = {};
            for (var z in layers) {
                if (z !== 'hover') {
                    elCounts[z] = layers[z].elCount;
                    layers[z].elCount = 0;
                }
            }

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];
                var zlevel = shape.zlevel;
                var layer = layers[zlevel];
                if (layer) {
                    layer.elCount++;
                    // 已经被标记为需要刷新
                    if (layer.dirty) {
                        continue;
                    }
                    layer.dirty = shape.__dirty;
                }
            }

            // 层中的元素数量有发生变化
            for (var z in layers) {
                if (z !== 'hover') {
                    if (elCounts[z] !== layers[z].elCount) {
                        layers[z].dirty = true;
                    }
                }
            }
        };

        /**
         * 指定的图形列表
         * @param {Array.<module:zrender/shape/Base>} shapeList 需要更新的图形元素列表
         * @param {Function} [callback] 视图更新后回调函数
         */
        Painter.prototype.refreshShapes = function (shapeList, callback) {
            for (var i = 0, l = shapeList.length; i < l; i++) {
                var shape = shapeList[i];
                this.storage.mod(shape.id);
            }

            this.refresh(callback);
            return this;
        };

        /**
         * 设置loading特效
         * 
         * @param {Object} loadingEffect loading特效
         * @return {Painter}
         */
        Painter.prototype.setLoadingEffect = function (loadingEffect) {
            this._loadingEffect = loadingEffect;
            return this;
        };

        /**
         * 清除hover层外所有内容
         */
        Painter.prototype.clear = function () {
            for (var k in this._layers) {
                if (k == 'hover') {
                    continue;
                }
                this._layers[k].clear();
            }

            return this;
        };

        /**
         * 修改指定zlevel的绘制参数
         * 
         * @param {string} zlevel
         * @param {Object} config 配置对象
         * @param {string} [config.clearColor=0] 每次清空画布的颜色
         * @param {string} [config.motionBlur=false] 是否开启动态模糊
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
         * @param {Array.<number>} [position] 层的平移
         * @param {Array.<number>} [rotation] 层的旋转
         * @param {Array.<number>} [scale] 层的缩放
         * @param {boolean} [zoomable=false] 层是否支持鼠标缩放操作
         * @param {boolean} [panable=false] 层是否支持鼠标平移操作
         */
        Painter.prototype.modLayer = function (zlevel, config) {
            if (config) {
                if (!this._layerConfig[zlevel]) {
                    this._layerConfig[zlevel] = config;
                }
                else {
                    util.merge(this._layerConfig[zlevel], config, true);
                }

                var layer = this._layers[zlevel];

                if (layer) {
                    util.merge(layer, this._layerConfig[zlevel], true);
                }
            }
        };

        /**
         * 删除指定层
         * @param {number} zlevel 层所在的zlevel
         */
        Painter.prototype.delLayer = function (zlevel) {
            var layer = this._layers[zlevel];
            if (!layer) {
                return;
            }
            // Save config
            this.modLayer(zlevel, {
                position: layer.position,
                rotation: layer.rotation,
                scale: layer.scale
            });
            layer.dom.parentNode.removeChild(layer.dom);
            delete this._layers[zlevel];
        };

        /**
         * 刷新hover层
         */
        Painter.prototype.refreshHover = function () {
            this.clearHover();
            var list = this.storage.getHoverShapes(true);
            for (var i = 0, l = list.length; i < l; i++) {
                this._brushHover(list[i]);
            }
            this.storage.delHover();

            return this;
        };

        /**
         * 清除hover层所有内容
         */
        Painter.prototype.clearHover = function () {
            var hover = this._layers.hover;
            hover && hover.clear();

            return this;
        };

        /**
         * 显示loading
         * 
         * @param {Object=} loadingEffect loading效果对象
         */
        Painter.prototype.showLoading = function (loadingEffect) {
            this._loadingEffect && this._loadingEffect.stop();
            loadingEffect && this.setLoadingEffect(loadingEffect);
            this._loadingEffect.start(this);
            this.loading = true;

            return this;
        };

        /**
         * loading结束
         */
        Painter.prototype.hideLoading = function () {
            this._loadingEffect.stop();

            this.clearHover();
            this.loading = false;
            return this;
        };

        /**
         * loading结束判断
         */
        Painter.prototype.isLoading = function () {
            return this.loading;
        };

        /**
         * 区域大小变化后重绘
         */
        Painter.prototype.resize = function () {
            var domRoot = this._domRoot;
            domRoot.style.display = 'none';

            var width = this._getWidth();
            var height = this._getHeight();

            domRoot.style.display = '';

            // 优化没有实际改变的resize
            if (this._width != width || height != this._height) {
                this._width = width;
                this._height = height;

                domRoot.style.width = width + 'px';
                domRoot.style.height = height + 'px';

                for (var id in this._layers) {

                    this._layers[id].resize(width, height);
                }

                this.refresh(null, true);
            }

            return this;
        };

        /**
         * 清除单独的一个层
         * @param {number} zLevel
         */
        Painter.prototype.clearLayer = function (zLevel) {
            var layer = this._layers[zLevel];
            if (layer) {
                layer.clear();
            }
        };

        /**
         * 释放
         */
        Painter.prototype.dispose = function () {
            if (this.isLoading()) {
                this.hideLoading();
            }

            this.root.innerHTML = '';

            this.root =
            this.storage =

            this._domRoot = 
            this._layers = null;
        };

        Painter.prototype.getDomHover = function () {
            return this._layers.hover.dom;
        };

        /**
         * 图像导出
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] 背景色
         * @return {string} 图片的Base64 url
         */
        Painter.prototype.toDataURL = function (type, backgroundColor, args) {
            if (vmlCanvasManager) {
                return null;
            }

            var imageDom = createDom('image', 'canvas', this);
            this._bgDom.appendChild(imageDom);
            var ctx = imageDom.getContext('2d');
            devicePixelRatio != 1 
                && ctx.scale(devicePixelRatio, devicePixelRatio);
            
            ctx.fillStyle = backgroundColor || '#fff';
            ctx.rect(
                0, 0, 
                this._width * devicePixelRatio,
                this._height * devicePixelRatio
            );
            ctx.fill();
            
            var self = this;
            // 升序遍历，shape上的zlevel指定绘画图层的z轴层叠
            
            this.storage.iterShape(
                function (shape) {
                    if (!shape.invisible) {
                        if (!shape.onbrush // 没有onbrush
                            // 有onbrush并且调用执行返回false或undefined则继续粉刷
                            || (shape.onbrush && !shape.onbrush(ctx, false))
                        ) {
                            if (config.catchBrushException) {
                                try {
                                    shape.brush(ctx, false, self.updatePainter);
                                }
                                catch (error) {
                                    log(
                                        error,
                                        'brush error of ' + shape.type,
                                        shape
                                    );
                                }
                            }
                            else {
                                shape.brush(ctx, false, self.updatePainter);
                            }
                        }
                    }
                },
                { normal: 'up', update: true }
            );
            var image = imageDom.toDataURL(type, args); 
            ctx = null;
            this._bgDom.removeChild(imageDom);
            return image;
        };

        /**
         * 获取绘图区域宽度
         */
        Painter.prototype.getWidth = function () {
            return this._width;
        };

        /**
         * 获取绘图区域高度
         */
        Painter.prototype.getHeight = function () {
            return this._height;
        };

        Painter.prototype._getWidth = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientWidth || parseInt(stl.width, 10))
                    - parseInt(stl.paddingLeft, 10) // 请原谅我这比较粗暴
                    - parseInt(stl.paddingRight, 10)).toFixed(0) - 0;
        };

        Painter.prototype._getHeight = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientHeight || parseInt(stl.height, 10))
                    - parseInt(stl.paddingTop, 10) // 请原谅我这比较粗暴
                    - parseInt(stl.paddingBottom, 10)).toFixed(0) - 0;
        };

        Painter.prototype._brushHover = function (shape) {
            var ctx = this._layers.hover.ctx;

            if (!shape.onbrush // 没有onbrush
                // 有onbrush并且调用执行返回false或undefined则继续粉刷
                || (shape.onbrush && !shape.onbrush(ctx, true))
            ) {
                var layer = this.getLayer(shape.zlevel);
                if (layer.needTransform) {
                    ctx.save();
                    layer.setTransform(ctx);
                }
                // Retina 优化
                if (config.catchBrushException) {
                    try {
                        shape.brush(ctx, true, this.updatePainter);
                    }
                    catch (error) {
                        log(
                            error, 'hoverBrush error of ' + shape.type, shape
                        );
                    }
                }
                else {
                    shape.brush(ctx, true, this.updatePainter);
                }
                if (layer.needTransform) {
                    ctx.restore();
                }
            }
        };

        Painter.prototype._shapeToImage = function (
            id, shape, width, height, devicePixelRatio
        ) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var devicePixelRatio = window.devicePixelRatio || 1;
            
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.setAttribute('width', width * devicePixelRatio);
            canvas.setAttribute('height', height * devicePixelRatio);

            ctx.clearRect(0, 0, width * devicePixelRatio, height * devicePixelRatio);

            var shapeTransform = {
                position : shape.position,
                rotation : shape.rotation,
                scale : shape.scale
            };
            shape.position = [ 0, 0, 0 ];
            shape.rotation = 0;
            shape.scale = [ 1, 1 ];
            if (shape) {
                shape.brush(ctx, false);
            }

            var ImageShape = require('./shape/Image');
            var imgShape = new ImageShape({
                id : id,
                style : {
                    x : 0,
                    y : 0,
                    image : canvas
                }
            });

            if (shapeTransform.position != null) {
                imgShape.position = shape.position = shapeTransform.position;
            }

            if (shapeTransform.rotation != null) {
                imgShape.rotation = shape.rotation = shapeTransform.rotation;
            }

            if (shapeTransform.scale != null) {
                imgShape.scale = shape.scale = shapeTransform.scale;
            }

            return imgShape;
        };

        Painter.prototype._createShapeToImageProcessor = function () {
            if (vmlCanvasManager) {
                return doNothing;
            }

            var me = this;

            return function (id, e, width, height) {
                return me._shapeToImage(
                    id, e, width, height, devicePixelRatio
                );
            };
        };

        /**
         * 创建dom
         * 
         * @inner
         * @param {string} id dom id 待用
         * @param {string} type dom type，such as canvas, div etc.
         * @param {Painter} painter painter instance
         */
        function createDom(id, type, painter) {
            var newDom = document.createElement(type);
            var width = painter._width;
            var height = painter._height;

            // 没append呢，请原谅我这样写，清晰~
            newDom.style.position = 'absolute';
            newDom.style.left = 0;
            newDom.style.top = 0;
            newDom.style.width = width + 'px';
            newDom.style.height = height + 'px';
            newDom.setAttribute('width', width * devicePixelRatio);
            newDom.setAttribute('height', height * devicePixelRatio);

            // id不作为索引用，避免可能造成的重名，定义为私有属性
            newDom.setAttribute('data-zr-dom-id', id);
            return newDom;
        }

        /**
         * @alias module:zrender/Painter~Layer
         * @constructor
         * @extends module:zrender/mixin/Transformable
         * @param {string} id
         * @param {module:zrender/Painter} painter
         */
        var Layer = function(id, painter) {
            this.dom = createDom(id, 'canvas', painter);
            this.dom.onselectstart = returnFalse; // 避免页面选中的尴尬
            this.dom.style['-webkit-user-select'] = 'none';
            this.dom.style['user-select'] = 'none';
            this.dom.style['-webkit-touch-callout'] = 'none';
            vmlCanvasManager && vmlCanvasManager.initElement(this.dom);

            this.domBack = null;
            this.ctxBack = null;

            this.painter = painter;

            this.unusedCount = 0;

            this.config = null;

            this.dirty = true;

            this.elCount = 0;

            // Configs
            /**
             * 每次清空画布的颜色
             * @type {string}
             * @default 0
             */
            this.clearColor = 0;
            /**
             * 是否开启动态模糊
             * @type {boolean}
             * @default false
             */
            this.motionBlur = false;
            /**
             * 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
             * @type {number}
             * @default 0.7
             */
            this.lastFrameAlpha = 0.7;
            /**
             * 层是否支持鼠标平移操作
             * @type {boolean}
             * @default false
             */
            this.zoomable = false;
            /**
             * 层是否支持鼠标缩放操作
             * @type {boolean}
             * @default false
             */
            this.panable = false;

            this.maxZoom = Infinity;
            this.minZoom = 0;

            Transformable.call(this);
        };

        Layer.prototype.initContext = function () {
            this.ctx = this.dom.getContext('2d');
            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }
        };

        Layer.prototype.createBackBuffer = function () {
            if (vmlCanvasManager) { // IE 8- should not support back buffer
                return;
            }
            this.domBack = createDom('back-' + this.id, 'canvas', this.painter);
            this.ctxBack = this.domBack.getContext('2d');

            if (devicePixelRatio != 1) { 
                this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
            }
        };

        /**
         * @param  {number} width
         * @param  {number} height
         */
        Layer.prototype.resize = function (width, height) {
            this.dom.style.width = width + 'px';
            this.dom.style.height = height + 'px';

            this.dom.setAttribute('width', width * devicePixelRatio);
            this.dom.setAttribute('height', height * devicePixelRatio);

            if (devicePixelRatio != 1) { 
                this.ctx.scale(devicePixelRatio, devicePixelRatio);
            }

            if (this.domBack) {
                this.domBack.setAttribute('width', width * devicePixelRatio);
                this.domBack.setAttribute('height', height * devicePixelRatio);

                if (devicePixelRatio != 1) { 
                    this.ctxBack.scale(devicePixelRatio, devicePixelRatio);
                }
            }
        };

        /**
         * 清空该层画布
         */
        Layer.prototype.clear = function () {
            var dom = this.dom;
            var ctx = this.ctx;
            var width = dom.width;
            var height = dom.height;

            var haveClearColor = this.clearColor && !vmlCanvasManager;
            var haveMotionBLur = this.motionBlur && !vmlCanvasManager;
            var lastFrameAlpha = this.lastFrameAlpha;

            if (haveMotionBLur) {
                if (!this.domBack) {
                    this.createBackBuffer();
                } 

                this.ctxBack.globalCompositeOperation = 'copy';
                this.ctxBack.drawImage(
                    dom, 0, 0,
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
            }

            if (haveClearColor) {
                ctx.save();
                ctx.fillStyle = this.config.clearColor;
                ctx.fillRect(
                    0, 0,
                    width / devicePixelRatio, 
                    height / devicePixelRatio
                );
                ctx.restore();
            }
            else {
                ctx.clearRect(
                    0, 0, 
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
            }

            if (haveMotionBLur) {
                var domBack = this.domBack;
                ctx.save();
                ctx.globalAlpha = lastFrameAlpha;
                ctx.drawImage(
                    domBack, 0, 0,
                    width / devicePixelRatio,
                    height / devicePixelRatio
                );
                ctx.restore();
            }
        };

        util.merge(Layer.prototype, Transformable.prototype);

        return Painter;
    }
);

/**
 * Group是一个容器，可以插入子节点，Group的变换也会被应用到子节点上
 * @module zrender/Group
 * @example
 *     var Group = require('zrender/Group');
 *     var Circle = require('zrender/shape/Circle');
 *     var g = new Group();
 *     g.position[0] = 100;
 *     g.position[1] = 100;
 *     g.addChild(new Circle({
 *         style: {
 *             x: 100,
 *             y: 100,
 *             r: 20,
 *             brushType: 'fill'
 *         }
 *     }));
 *     zr.addGroup(g);
 */
define('zrender/Group',['require','./tool/guid','./tool/util','./mixin/Transformable','./mixin/Eventful'],function(require) {

    var guid = require('./tool/guid');
    var util = require('./tool/util');

    var Transformable = require('./mixin/Transformable');
    var Eventful = require('./mixin/Eventful');

    /**
     * @alias module:zrender/Group
     * @constructor
     * @extends module:zrender/mixin/Transformable
     * @extends module:zrender/mixin/Eventful
     */
    var Group = function(options) {

        options = options || {};

        /**
         * Group id
         * @type {string}
         */
        this.id = options.id || guid();

        for (var key in options) {
            this[key] = options[key];
        }

        /**
         * @type {string}
         */
        this.type = 'group';

        /**
         * 用于裁剪的图形(shape)，所有 Group 内的图形在绘制时都会被这个图形裁剪
         * 该图形会继承Group的变换
         * @type {module:zrender/shape/Base}
         * @see http://www.w3.org/TR/2dcontext/#clipping-region
         */
        this.clipShape = null;

        this._children = [];

        this._storage = null;

        this.__dirty = true;

        // Mixin
        Transformable.call(this);
        Eventful.call(this);
    };

    /**
     * 是否忽略该 Group 及其所有子节点
     * @type {boolean}
     * @default false
     */
    Group.prototype.ignore = false;

    /**
     * 复制并返回一份新的包含所有儿子节点的数组
     * @return {Array.<module:zrender/Group|module:zrender/shape/Base>}
     */
    Group.prototype.children = function() {
        return this._children.slice();
    };

    /**
     * 获取指定 index 的儿子节点
     * @param  {number} idx
     * @return {module:zrender/Group|module:zrender/shape/Base}
     */
    Group.prototype.childAt = function(idx) {
        return this._children[idx];
    };

    /**
     * 添加子节点，可以是Shape或者Group
     * @param {module:zrender/Group|module:zrender/shape/Base} child
     */
    // TODO Type Check
    Group.prototype.addChild = function(child) {
        if (child == this) {
            return;
        }
        
        if (child.parent == this) {
            return;
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }

        this._children.push(child);
        child.parent = this;

        if (this._storage && this._storage !== child._storage) {
            
            this._storage.addToMap(child);

            if (child instanceof Group) {
                child.addChildrenToStorage(this._storage);
            }
        }
    };

    /**
     * 移除子节点
     * @param {module:zrender/Group|module:zrender/shape/Base} child
     */
    // TODO Type Check
    Group.prototype.removeChild = function(child) {
        var idx = util.indexOf(this._children, child);

        this._children.splice(idx, 1);
        child.parent = null;

        if (this._storage) {
            
            this._storage.delFromMap(child.id);

            if (child instanceof Group) {
                child.delChildrenFromStorage(this._storage);
            }
        }
    };

    /**
     * 遍历所有子节点
     * @param  {Function} cb
     * @param  {}   context
     */
    Group.prototype.eachChild = function(cb, context) {
        var haveContext = !!context;
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }
        }
    };

    /**
     * 深度优先遍历所有子孙节点
     * @param  {Function} cb
     * @param  {}   context
     */
    Group.prototype.traverse = function(cb, context) {
        var haveContext = !!context;
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }

            if (child.type === 'group') {
                child.traverse(cb, context);
            }
        }
    };

    Group.prototype.addChildrenToStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.addToMap(child);
            if (child.type === 'group') {
                child.addChildrenToStorage(storage);
            }
        }
    };

    Group.prototype.delChildrenFromStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.delFromMap(child.id);
            if (child.type === 'group') {
                child.delChildrenFromStorage(storage);
            }
        }
    };

    Group.prototype.modSelf = function() {
        this.__dirty = true;
    };

    util.merge(Group.prototype, Transformable.prototype, true);
    util.merge(Group.prototype, Eventful.prototype, true);

    return Group;
});
/**
 * Storage内容仓库模块
 * @module zrender/Storage
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 * @author errorrik (errorrik@gmail.com)
 * @author pissang (https://github.com/pissang/)
 */
define(
    'zrender/Storage',['require','./tool/util','./Group'],function (require) {

        

        var util = require('./tool/util');

        var Group = require('./Group');

        var defaultIterateOption = {
            hover: false,
            normal: 'down',
            update: false
        };

        function shapeCompareFunc(a, b) {
            if (a.zlevel == b.zlevel) {
                if (a.z == b.z) {
                    return a.__renderidx - b.__renderidx;
                }
                return a.z - b.z;
            }
            return a.zlevel - b.zlevel;
        }
        /**
         * 内容仓库 (M)
         * @alias module:zrender/Storage
         * @constructor
         */
        var Storage = function () {
            // 所有常规形状，id索引的map
            this._elements = {};

            // 高亮层形状，不稳定，动态增删，数组位置也是z轴方向，靠前显示在下方
            this._hoverElements = [];

            this._roots = [];

            this._shapeList = [];

            this._shapeListOffset = 0;
        };

        /**
         * 遍历迭代器
         * 
         * @param {Function} fun 迭代回调函数，return true终止迭代
         * @param {Object} [option] 迭代参数，缺省为仅降序遍历普通层图形
         * @param {boolean} [option.hover=true] 是否是高亮层图形
         * @param {string} [option.normal='up'] 是否是普通层图形，迭代时是否指定及z轴顺序
         * @param {boolean} [option.update=false] 是否在迭代前更新形状列表
         * 
         */
        Storage.prototype.iterShape = function (fun, option) {
            if (!option) {
                option = defaultIterateOption;
            }

            if (option.hover) {
                // 高亮层数据遍历
                for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                    var el = this._hoverElements[i];
                    el.updateTransform();
                    if (fun(el)) {
                        return this;
                    }
                }
            }

            if (option.update) {
                this.updateShapeList();
            }

            // 遍历: 'down' | 'up'
            switch (option.normal) {
                case 'down':
                    // 降序遍历，高层优先
                    var l = this._shapeList.length;
                    while (l--) {
                        if (fun(this._shapeList[l])) {
                            return this;
                        }
                    }
                    break;
                // case 'up':
                default:
                    // 升序遍历，底层优先
                    for (var i = 0, l = this._shapeList.length; i < l; i++) {
                        if (fun(this._shapeList[i])) {
                            return this;
                        }
                    }
                    break;
            }

            return this;
        };

        /**
         * 返回hover层的形状数组
         * @param  {boolean} [update=false] 是否在返回前更新图形的变换
         * @return {Array.<module:zrender/shape/Base>}
         */
        Storage.prototype.getHoverShapes = function (update) {
            if (update) {
                for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                    this._hoverElements[i].updateTransform();
                }
            }
            return this._hoverElements;
        };

        /**
         * 返回所有图形的绘制队列
         * @param  {boolean} [update=false] 是否在返回前更新该数组
         * 详见{@link module:zrender/shape/Base.prototype.updateShapeList}
         * @return {Array.<module:zrender/shape/Base>}
         */
        Storage.prototype.getShapeList = function (update) {
            if (update) {
                this.updateShapeList();
            }
            return this._shapeList;
        };

        /**
         * 更新图形的绘制队列。
         * 每次绘制前都会调用，该方法会先深度优先遍历整个树，更新所有Group和Shape的变换并且把所有可见的Shape保存到数组中，
         * 最后根据绘制的优先级（zlevel > z > 插入顺序）排序得到绘制队列
         */
        Storage.prototype.updateShapeList = function () {
            this._shapeListOffset = 0;
            for (var i = 0, len = this._roots.length; i < len; i++) {
                var root = this._roots[i];
                this._updateAndAddShape(root);
            }
            this._shapeList.length = this._shapeListOffset;

            for (var i = 0, len = this._shapeList.length; i < len; i++) {
                this._shapeList[i].__renderidx = i;
            }

            this._shapeList.sort(shapeCompareFunc);
        };

        Storage.prototype._updateAndAddShape = function (el, clipShapes) {
            
            if (el.ignore) {
                return;
            }

            el.updateTransform();

            if (el.type == 'group') {
                
                if (el.clipShape) {
                    // clipShape 的变换是基于 group 的变换
                    el.clipShape.parent = el;
                    el.clipShape.updateTransform();

                    // PENDING 效率影响
                    if (clipShapes) {
                        clipShapes = clipShapes.slice();
                        clipShapes.push(el.clipShape);
                    } else {
                        clipShapes = [el.clipShape];
                    }
                }

                for (var i = 0; i < el._children.length; i++) {
                    var child = el._children[i];

                    // Force to mark as dirty if group is dirty
                    child.__dirty = el.__dirty || child.__dirty;

                    this._updateAndAddShape(child, clipShapes);
                }

                // Mark group clean here
                el.__dirty = false;
                
            }
            else {
                el.__clipShapes = clipShapes;

                this._shapeList[this._shapeListOffset++] = el;
            }
        };

        /**
         * 修改图形(Shape)或者组(Group)
         * 
         * @param {string} elId 唯一标识
         * @param {Object} [params] 参数
         */
        Storage.prototype.mod = function (elId, params) {
            var el = this._elements[elId];
            if (el) {

                el.modSelf();

                if (params) {
                    // 如果第二个参数直接使用 shape
                    // parent, _storage, __startClip 三个属性会有循环引用
                    // 主要为了向 1.x 版本兼容，2.x 版本不建议使用第二个参数
                    if (params.parent || params._storage || params.__startClip) {
                        var target = {};
                        for (var name in params) {
                            if (
                                name == 'parent'
                                || name == '_storage'
                                || name == '__startClip'
                            ) {
                                continue;
                            }
                            if (params.hasOwnProperty(name)) {
                                target[name] = params[name];
                            }
                        }
                        util.merge(el, target, true);
                    }
                    else {
                        util.merge(el, params, true);
                    }
                }
            }

            return this;
        };

        /**
         * 移动指定的图形(Shape)或者组(Group)的位置
         * @param {string} shapeId 形状唯一标识
         * @param {number} dx
         * @param {number} dy
         */
        Storage.prototype.drift = function (shapeId, dx, dy) {
            var shape = this._elements[shapeId];
            if (shape) {
                shape.needTransform = true;
                if (!shape.ondrift // ondrift
                    // 有onbrush并且调用执行返回false或undefined则继续
                    || (shape.ondrift && !shape.ondrift(dx, dy))
                ) {
                    shape.drift(dx, dy);
                }
            }

            return this;
        };

        /**
         * 添加高亮层数据
         * 
         * @param {module:zrender/shape/Base} shape
         */
        Storage.prototype.addHover = function (shape) {
            shape.updateNeedTransform();
            this._hoverElements.push(shape);
            return this;
        };

        /**
         * 清空高亮层数据
         */
        Storage.prototype.delHover = function () {
            this._hoverElements = [];
            return this;
        };

        /**
         * 是否有图形在高亮层里
         * @return {boolean}
         */
        Storage.prototype.hasHoverShape = function () {
            return this._hoverElements.length > 0;
        };

        /**
         * 添加图形(Shape)或者组(Group)到根节点
         * @param {module:zrender/shape/Shape|module:zrender/Group} el
         */
        Storage.prototype.addRoot = function (el) {
            if (el instanceof Group) {
                el.addChildrenToStorage(this);
            }

            this.addToMap(el);
            this._roots.push(el);
        };

        /**
         * 删除指定的图形(Shape)或者组(Group)
         * @param  {string|Array.<string>} [elId] 如果为空清空整个Storage
         */
        Storage.prototype.delRoot = function (elId) {
            if (typeof(elId) == 'undefined') {
                // 不指定elId清空
                for (var i = 0; i < this._roots.length; i++) {
                    var root = this._roots[i];
                    if (root instanceof Group) {
                        root.delChildrenFromStorage(this);
                    }
                }

                this._elements = {};
                this._hoverElements = [];
                this._roots = [];

                return;
            }

            if (elId instanceof Array) {
                for (var i = 0, l = elId.length; i < l; i++) {
                    this.delRoot(elId[i]);
                }
                return;
            }

            var el;
            if (typeof(elId) == 'string') {
                el = this._elements[elId];
            }
            else {
                el = elId;
            }

            var idx = util.indexOf(this._roots, el);
            if (idx >= 0) {
                this.delFromMap(el.id);
                this._roots.splice(idx, 1);
                if (el instanceof Group) {
                    el.delChildrenFromStorage(this);
                }
            }
        };

        Storage.prototype.addToMap = function (el) {
            if (el instanceof Group) {
                el._storage = this;
            }
            el.modSelf();

            this._elements[el.id] = el;

            return this;
        };

        Storage.prototype.get = function (elId) {
            return this._elements[elId];
        };

        Storage.prototype.delFromMap = function (elId) {
            var el = this._elements[elId];
            if (el) {
                delete this._elements[elId];

                if (el instanceof Group) {
                    el._storage = null;
                }
            }

            return this;
        };


        /**
         * 清空并且释放Storage
         */
        Storage.prototype.dispose = function () {
            this._elements = 
            this._renderList = 
            this._roots =
            this._hoverElements = null;
        };

        return Storage;
    }
);

define(
    'zrender/animation/easing',[],function() {
        /**
         * 缓动代码来自 https://github.com/sole/tween.js/blob/master/src/Tween.js
         * @see http://sole.github.io/tween.js/examples/03_graphs.html
         * @exports zrender/animation/easing
         */
        var easing = {
            // 线性
            /**
             * @param {number} k
             * @return {number}
             */
            Linear: function (k) {
                return k;
            },

            // 二次方的缓动（t^2）
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticIn: function (k) {
                return k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticOut: function (k) {
                return k * (2 - k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k;
                }
                return -0.5 * (--k * (k - 2) - 1);
            },

            // 三次方的缓动（t^3）
            /**
             * @param {number} k
             * @return {number}
             */
            CubicIn: function (k) {
                return k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CubicOut: function (k) {
                return --k * k * k + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CubicInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k + 2);
            },

            // 四次方的缓动（t^4）
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticIn: function (k) {
                return k * k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticOut: function (k) {
                return 1 - (--k * k * k * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k;
                }
                return -0.5 * ((k -= 2) * k * k * k - 2);
            },

            // 五次方的缓动（t^5）
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticIn: function (k) {
                return k * k * k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticOut: function (k) {
                return --k * k * k * k * k + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k * k * k + 2);
            },

            // 正弦曲线的缓动（sin(t)）
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalIn: function (k) {
                return 1 - Math.cos(k * Math.PI / 2);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalOut: function (k) {
                return Math.sin(k * Math.PI / 2);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalInOut: function (k) {
                return 0.5 * (1 - Math.cos(Math.PI * k));
            },

            // 指数曲线的缓动（2^t）
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialIn: function (k) {
                return k === 0 ? 0 : Math.pow(1024, k - 1);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialOut: function (k) {
                return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialInOut: function (k) {
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if ((k *= 2) < 1) {
                    return 0.5 * Math.pow(1024, k - 1);
                }
                return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
            },

            // 圆形曲线的缓动（sqrt(1-t^2)）
            /**
             * @param {number} k
             * @return {number}
             */
            CircularIn: function (k) {
                return 1 - Math.sqrt(1 - k * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CircularOut: function (k) {
                return Math.sqrt(1 - (--k * k));
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CircularInOut: function (k) {
                if ((k *= 2) < 1) {
                    return -0.5 * (Math.sqrt(1 - k * k) - 1);
                }
                return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
            },

            // 创建类似于弹簧在停止前来回振荡的动画
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticIn: function (k) {
                var s; 
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return -(a * Math.pow(2, 10 * (k -= 1)) *
                            Math.sin((k - s) * (2 * Math.PI) / p));
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticOut: function (k) {
                var s;
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return (a * Math.pow(2, -10 * k) *
                        Math.sin((k - s) * (2 * Math.PI) / p) + 1);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticInOut: function (k) {
                var s;
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                if ((k *= 2) < 1) {
                    return -0.5 * (a * Math.pow(2, 10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p));
                }
                return a * Math.pow(2, -10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

            },

            // 在某一动画开始沿指示的路径进行动画处理前稍稍收回该动画的移动
            /**
             * @param {number} k
             * @return {number}
             */
            BackIn: function (k) {
                var s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BackOut: function (k) {
                var s = 1.70158;
                return --k * k * ((s + 1) * k + s) + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BackInOut: function (k) {
                var s = 1.70158 * 1.525;
                if ((k *= 2) < 1) {
                    return 0.5 * (k * k * ((s + 1) * k - s));
                }
                return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
            },

            // 创建弹跳效果
            /**
             * @param {number} k
             * @return {number}
             */
            BounceIn: function (k) {
                return 1 - easing.BounceOut(1 - k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BounceOut: function (k) {
                if (k < (1 / 2.75)) {
                    return 7.5625 * k * k;
                }
                else if (k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                }
                else if (k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                }
                else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BounceInOut: function (k) {
                if (k < 0.5) {
                    return easing.BounceIn(k * 2) * 0.5;
                }
                return easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
            }
        };

        return easing;
    }
);


/**
 * 动画主控制器
 * @config target 动画对象，可以是数组，如果是数组的话会批量分发onframe等事件
 * @config life(1000) 动画时长
 * @config delay(0) 动画延迟时间
 * @config loop(true)
 * @config gap(0) 循环的间隔时间
 * @config onframe
 * @config easing(optional)
 * @config ondestroy(optional)
 * @config onrestart(optional)
 */
define(
    'zrender/animation/Clip',['require','./easing'],function(require) {

        var Easing = require('./easing');

        function Clip(options) {

            this._targetPool = options.target || {};
            if (!(this._targetPool instanceof Array)) {
                this._targetPool = [ this._targetPool ];
            }

            // 生命周期
            this._life = options.life || 1000;
            // 延时
            this._delay = options.delay || 0;
            // 开始时间
            this._startTime = new Date().getTime() + this._delay;// 单位毫秒

            // 结束时间
            this._endTime = this._startTime + this._life * 1000;

            // 是否循环
            this.loop = typeof options.loop == 'undefined'
                        ? false : options.loop;

            this.gap = options.gap || 0;

            this.easing = options.easing || 'Linear';

            this.onframe = options.onframe;
            this.ondestroy = options.ondestroy;
            this.onrestart = options.onrestart;
        }

        Clip.prototype = {
            step : function (time) {
                var percent = (time - this._startTime) / this._life;

                // 还没开始
                if (percent < 0) {
                    return;
                }

                percent = Math.min(percent, 1);

                var easingFunc = typeof this.easing == 'string'
                                 ? Easing[this.easing]
                                 : this.easing;
                var schedule = typeof easingFunc === 'function'
                    ? easingFunc(percent)
                    : percent;

                this.fire('frame', schedule);

                // 结束
                if (percent == 1) {
                    if (this.loop) {
                        this.restart();
                        // 重新开始周期
                        // 抛出而不是直接调用事件直到 stage.update 后再统一调用这些事件
                        return 'restart';

                    }
                    
                    // 动画完成将这个控制器标识为待删除
                    // 在Animation.update中进行批量删除
                    this._needsRemove = true;
                    return 'destroy';
                }
                
                return null;
            },
            restart : function() {
                var time = new Date().getTime();
                var remainder = (time - this._startTime) % this._life;
                this._startTime = new Date().getTime() - remainder + this.gap;
            },
            fire : function(eventType, arg) {
                for (var i = 0, len = this._targetPool.length; i < len; i++) {
                    if (this['on' + eventType]) {
                        this['on' + eventType](this._targetPool[i], arg);
                    }
                }
            },
            constructor: Clip
        };

        return Clip;
    }
);

/**
 * 动画主类, 调度和管理所有动画控制器
 * 
 * @module zrender/animation/Animation
 * @author pissang(https://github.com/pissang)
 */
define(
    'zrender/animation/Animation',['require','./Clip','../tool/color','../tool/util','../tool/event'],function(require) {
        
        

        var Clip = require('./Clip');
        var color = require('../tool/color');
        var util = require('../tool/util');
        var Dispatcher = require('../tool/event').Dispatcher;

        var requestAnimationFrame = window.requestAnimationFrame
                                    || window.msRequestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.webkitRequestAnimationFrame
                                    || function (func) {
                                        setTimeout(func, 16);
                                    };

        var arraySlice = Array.prototype.slice;

        /**
         * @typedef {Object} IZRenderStage
         * @property {Function} update
         */
        
        /** 
         * @alias module:zrender/animation/Animation
         * @constructor
         * @param {Object} [options]
         * @param {Function} [options.onframe]
         * @param {IZRenderStage} [options.stage]
         * @example
         *     var animation = new Animation();
         *     var obj = {
         *         x: 100,
         *         y: 100
         *     };
         *     animation.animate(node.position)
         *         .when(1000, {
         *             x: 500,
         *             y: 500
         *         })
         *         .when(2000, {
         *             x: 100,
         *             y: 100
         *         })
         *         .start('spline');
         */
        var Animation = function (options) {

            options = options || {};

            this.stage = options.stage || {};

            this.onframe = options.onframe || function() {};

            // private properties
            this._clips = [];

            this._running = false;

            this._time = 0;

            Dispatcher.call(this);
        };

        Animation.prototype = {
            /**
             * 添加动画片段
             * @param {module:zrender/animation/Clip} clip
             */
            add: function(clip) {
                this._clips.push(clip);
            },
            /**
             * 删除动画片段
             * @param {module:zrender/animation/Clip} clip
             */
            remove: function(clip) {
                var idx = util.indexOf(this._clips, clip);
                if (idx >= 0) {
                    this._clips.splice(idx, 1);
                }
            },
            _update: function() {

                var time = new Date().getTime();
                var delta = time - this._time;
                var clips = this._clips;
                var len = clips.length;

                var deferredEvents = [];
                var deferredClips = [];
                for (var i = 0; i < len; i++) {
                    var clip = clips[i];
                    var e = clip.step(time);
                    // Throw out the events need to be called after
                    // stage.update, like destroy
                    if (e) {
                        deferredEvents.push(e);
                        deferredClips.push(clip);
                    }
                }
                if (this.stage.update) {
                    this.stage.update();
                }

                // Remove the finished clip
                for (var i = 0; i < len;) {
                    if (clips[i]._needsRemove) {
                        clips[i] = clips[len - 1];
                        clips.pop();
                        len--;
                    }
                    else {
                        i++;
                    }
                }

                len = deferredEvents.length;
                for (var i = 0; i < len; i++) {
                    deferredClips[i].fire(deferredEvents[i]);
                }

                this._time = time;

                this.onframe(delta);

                this.dispatch('frame', delta);
            },
            /**
             * 开始运行动画
             */
            start: function () {
                var self = this;

                this._running = true;

                function step() {
                    if (self._running) {
                        self._update();
                        requestAnimationFrame(step);
                    }
                }

                this._time = new Date().getTime();
                requestAnimationFrame(step);
            },
            /**
             * 停止运行动画
             */
            stop: function () {
                this._running = false;
            },
            /**
             * 清除所有动画片段
             */
            clear : function () {
                this._clips = [];
            },
            /**
             * 对一个目标创建一个animator对象，可以指定目标中的属性使用动画
             * @param  {Object} target
             * @param  {Object} options
             * @param  {boolean} [options.loop=false] 是否循环播放动画
             * @param  {Function} [options.getter=null]
             *         如果指定getter函数，会通过getter函数取属性值
             * @param  {Function} [options.setter=null]
             *         如果指定setter函数，会通过setter函数设置属性值
             * @return {module:zrender/animation/Animation~Animator}
             */
            animate : function (target, options) {
                options = options || {};
                var deferred = new Animator(
                    target,
                    options.loop,
                    options.getter, 
                    options.setter
                );
                deferred.animation = this;
                return deferred;
            },
            constructor: Animation
        };

        util.merge(Animation.prototype, Dispatcher.prototype, true);

        function _defaultGetter(target, key) {
            return target[key];
        }

        function _defaultSetter(target, key, value) {
            target[key] = value;
        }

        function _interpolateNumber(p0, p1, percent) {
            return (p1 - p0) * percent + p0;
        }

        function _interpolateArray(p0, p1, percent, out, arrDim) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _interpolateNumber(p0[i], p1[i], percent); 
                }
            }
            else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _interpolateNumber(
                            p0[i][j], p1[i][j], percent
                        );
                    }
                }
            }
        }

        function _isArrayLike(data) {
            switch (typeof data) {
                case 'undefined':
                case 'string':
                    return false;
            }
            
            return typeof data.length !== 'undefined';
        }

        function _catmullRomInterpolateArray(
            p0, p1, p2, p3, t, t2, t3, out, arrDim
        ) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _catmullRomInterpolate(
                        p0[i], p1[i], p2[i], p3[i], t, t2, t3
                    );
                }
            }
            else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _catmullRomInterpolate(
                            p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                            t, t2, t3
                        );
                    }
                }
            }
        }

        function _catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
            var v0 = (p2 - p0) * 0.5;
            var v1 = (p3 - p1) * 0.5;
            return (2 * (p1 - p2) + v0 + v1) * t3 
                    + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
                    + v0 * t + p1;
        }

        function _cloneValue(value) {
            if (_isArrayLike(value)) {
                var len = value.length;
                if (_isArrayLike(value[0])) {
                    var ret = [];
                    for (var i = 0; i < len; i++) {
                        ret.push(arraySlice.call(value[i]));
                    }
                    return ret;
                }
                else {
                    return arraySlice.call(value);
                }
            }
            else {
                return value;
            }
        }

        function rgba2String(rgba) {
            rgba[0] = Math.floor(rgba[0]);
            rgba[1] = Math.floor(rgba[1]);
            rgba[2] = Math.floor(rgba[2]);

            return 'rgba(' + rgba.join(',') + ')';
        }

        /**
         * @alias module:zrender/animation/Animation~Animator
         * @constructor
         * @param {Object} target
         * @param {boolean} loop
         * @param {Function} getter
         * @param {Function} setter
         */
        var Animator = function(target, loop, getter, setter) {
            this._tracks = {};
            this._target = target;

            this._loop = loop || false;

            this._getter = getter || _defaultGetter;
            this._setter = setter || _defaultSetter;

            this._clipCount = 0;

            this._delay = 0;

            this._doneList = [];

            this._onframeList = [];

            this._clipList = [];
        };

        Animator.prototype = {
            /**
             * 设置动画关键帧
             * @param  {number} time 关键帧时间，单位是ms
             * @param  {Object} props 关键帧的属性值，key-value表示
             * @return {module:zrender/animation/Animation~Animator}
             */
            when : function(time /* ms */, props) {
                for (var propName in props) {
                    if (!this._tracks[propName]) {
                        this._tracks[propName] = [];
                        // If time is 0 
                        //  Then props is given initialize value
                        // Else
                        //  Initialize value from current prop value
                        if (time !== 0) {
                            this._tracks[propName].push({
                                time : 0,
                                value : _cloneValue(
                                    this._getter(this._target, propName)
                                )
                            });
                        }
                    }
                    this._tracks[propName].push({
                        time : parseInt(time, 10),
                        value : props[propName]
                    });
                }
                return this;
            },
            /**
             * 添加动画每一帧的回调函数
             * @param  {Function} callback
             * @return {module:zrender/animation/Animation~Animator}
             */
            during: function (callback) {
                this._onframeList.push(callback);
                return this;
            },
            /**
             * 开始执行动画
             * @param  {string|Function} easing 
             *         动画缓动函数，详见{@link module:zrender/animation/easing}
             * @return {module:zrender/animation/Animation~Animator}
             */
            start: function (easing) {

                var self = this;
                var setter = this._setter;
                var getter = this._getter;
                var onFrameListLen = self._onframeList.length;
                var useSpline = easing === 'spline';

                var ondestroy = function() {
                    self._clipCount--;
                    if (self._clipCount === 0) {
                        // Clear all tracks
                        self._tracks = {};

                        var len = self._doneList.length;
                        for (var i = 0; i < len; i++) {
                            self._doneList[i].call(self);
                        }
                    }
                };

                var createTrackClip = function (keyframes, propName) {
                    var trackLen = keyframes.length;
                    if (!trackLen) {
                        return;
                    }
                    // Guess data type
                    var firstVal = keyframes[0].value;
                    var isValueArray = _isArrayLike(firstVal);
                    var isValueColor = false;

                    // For vertices morphing
                    var arrDim = (
                            isValueArray 
                            && _isArrayLike(firstVal[0])
                        )
                        ? 2 : 1;
                    // Sort keyframe as ascending
                    keyframes.sort(function(a, b) {
                        return a.time - b.time;
                    });
                    var trackMaxTime;
                    if (trackLen) {
                        trackMaxTime = keyframes[trackLen - 1].time;
                    }
                    else {
                        return;
                    }
                    // Percents of each keyframe
                    var kfPercents = [];
                    // Value of each keyframe
                    var kfValues = [];
                    for (var i = 0; i < trackLen; i++) {
                        kfPercents.push(keyframes[i].time / trackMaxTime);
                        // Assume value is a color when it is a string
                        var value = keyframes[i].value;
                        if (typeof(value) == 'string') {
                            value = color.toArray(value);
                            if (value.length === 0) {    // Invalid color
                                value[0] = value[1] = value[2] = 0;
                                value[3] = 1;
                            }
                            isValueColor = true;
                        }
                        kfValues.push(value);
                    }

                    // Cache the key of last frame to speed up when 
                    // animation playback is sequency
                    var cacheKey = 0;
                    var cachePercent = 0;
                    var start;
                    var i;
                    var w;
                    var p0;
                    var p1;
                    var p2;
                    var p3;


                    if (isValueColor) {
                        var rgba = [ 0, 0, 0, 0 ];
                    }

                    var onframe = function (target, percent) {
                        // Find the range keyframes
                        // kf1-----kf2---------current--------kf3
                        // find kf2 and kf3 and do interpolation
                        if (percent < cachePercent) {
                            // Start from next key
                            start = Math.min(cacheKey + 1, trackLen - 1);
                            for (i = start; i >= 0; i--) {
                                if (kfPercents[i] <= percent) {
                                    break;
                                }
                            }
                            i = Math.min(i, trackLen - 2);
                        }
                        else {
                            for (i = cacheKey; i < trackLen; i++) {
                                if (kfPercents[i] > percent) {
                                    break;
                                }
                            }
                            i = Math.min(i - 1, trackLen - 2);
                        }
                        cacheKey = i;
                        cachePercent = percent;

                        var range = (kfPercents[i + 1] - kfPercents[i]);
                        if (range === 0) {
                            return;
                        }
                        else {
                            w = (percent - kfPercents[i]) / range;
                        }
                        if (useSpline) {
                            p1 = kfValues[i];
                            p0 = kfValues[i === 0 ? i : i - 1];
                            p2 = kfValues[i > trackLen - 2 ? trackLen - 1 : i + 1];
                            p3 = kfValues[i > trackLen - 3 ? trackLen - 1 : i + 2];
                            if (isValueArray) {
                                _catmullRomInterpolateArray(
                                    p0, p1, p2, p3, w, w * w, w * w * w,
                                    getter(target, propName),
                                    arrDim
                                );
                            }
                            else {
                                var value;
                                if (isValueColor) {
                                    value = _catmullRomInterpolateArray(
                                        p0, p1, p2, p3, w, w * w, w * w * w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                }
                                else {
                                    value = _catmullRomInterpolate(
                                        p0, p1, p2, p3, w, w * w, w * w * w
                                    );
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        }
                        else {
                            if (isValueArray) {
                                _interpolateArray(
                                    kfValues[i], kfValues[i + 1], w,
                                    getter(target, propName),
                                    arrDim
                                );
                            }
                            else {
                                var value;
                                if (isValueColor) {
                                    _interpolateArray(
                                        kfValues[i], kfValues[i + 1], w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                }
                                else {
                                    value = _interpolateNumber(kfValues[i], kfValues[i + 1], w);
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        }

                        for (i = 0; i < onFrameListLen; i++) {
                            self._onframeList[i](target, percent);
                        }
                    };

                    var clip = new Clip({
                        target : self._target,
                        life : trackMaxTime,
                        loop : self._loop,
                        delay : self._delay,
                        onframe : onframe,
                        ondestroy : ondestroy
                    });

                    if (easing && easing !== 'spline') {
                        clip.easing = easing;
                    }
                    self._clipList.push(clip);
                    self._clipCount++;
                    self.animation.add(clip);
                };

                for (var propName in this._tracks) {
                    createTrackClip(this._tracks[propName], propName);
                }
                return this;
            },
            /**
             * 停止动画
             */
            stop : function() {
                for (var i = 0; i < this._clipList.length; i++) {
                    var clip = this._clipList[i];
                    this.animation.remove(clip);
                }
                this._clipList = [];
            },
            /**
             * 设置动画延迟开始的时间
             * @param  {number} time 单位ms
             * @return {module:zrender/animation/Animation~Animator}
             */
            delay : function (time) {
                this._delay = time;
                return this;
            },
            /**
             * 添加动画结束的回调
             * @param  {Function} cb
             * @return {module:zrender/animation/Animation~Animator}
             */
            done : function(cb) {
                if (cb) {
                    this._doneList.push(cb);
                }
                return this;
            }
        };

        return Animation;
    }
);

/*!
 * ZRender, a high performance canvas library.
 *  
 * Copyright (c) 2013, Baidu Inc.
 * All rights reserved.
 * 
 * LICENSE
 * https://github.com/ecomfe/zrender/blob/master/LICENSE.txt
 */
define(
    'zrender/zrender',['require','./dep/excanvas','./tool/util','./tool/log','./tool/guid','./Handler','./Painter','./Storage','./animation/Animation','./tool/env'],function(require) {
        /*
         * HTML5 Canvas for Internet Explorer!
         * Modern browsers like Firefox, Safari, Chrome and Opera support
         * the HTML5 canvas tag to allow 2D command-based drawing.
         * ExplorerCanvas brings the same functionality to Internet Explorer.
         * To use, web developers only need to include a single script tag
         * in their existing web pages.
         *
         * https://code.google.com/p/explorercanvas/
         * http://explorercanvas.googlecode.com/svn/trunk/excanvas.js
         */
        // 核心代码会生成一个全局变量 G_vmlCanvasManager，模块改造后借用于快速判断canvas支持
        require('./dep/excanvas');

        var util = require('./tool/util');
        var log = require('./tool/log');
        var guid = require('./tool/guid');

        var Handler = require('./Handler');
        var Painter = require('./Painter');
        var Storage = require('./Storage');
        var Animation = require('./animation/Animation');

        var _instances = {};    // ZRender实例map索引

        /**
         * @exports zrender
         * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
         *         pissang (https://www.github.com/pissang)
         */
        var zrender = {};
        /**
         * @type {string}
         */
        zrender.version = '2.0.4';

        /**
         * 创建zrender实例
         *
         * @param {HTMLElement} dom 绘图容器
         * @return {module:zrender~ZRender} ZRender实例
         */
        // 不让外部直接new ZRender实例，为啥？
        // 不为啥，提供全局可控同时减少全局污染和降低命名冲突的风险！
        zrender.init = function(dom) {
            var zr = new ZRender(guid(), dom);
            _instances[zr.id] = zr;
            return zr;
        };

        /**
         * zrender实例销毁
         * @param {module:zrender~ZRender} zr ZRender对象，不传则销毁全部
         */
        // 在_instances里的索引也会删除了
        // 管生就得管死，可以通过zrender.dispose(zr)销毁指定ZRender实例
        // 当然也可以直接zr.dispose()自己销毁
        zrender.dispose = function (zr) {
            if (zr) {
                zr.dispose();
            }
            else {
                for (var key in _instances) {
                    _instances[key].dispose();
                }
                _instances = {};
            }

            return zrender;
        };

        /**
         * 获取zrender实例
         * @param {string} id ZRender对象索引
         * @return {module:zrender~ZRender}
         */
        zrender.getInstance = function (id) {
            return _instances[id];
        };

        /**
         * 删除zrender实例，ZRender实例dispose时会调用，
         * 删除后getInstance则返回undefined
         * ps: 仅是删除，删除的实例不代表已经dispose了~~
         *     这是一个摆脱全局zrender.dispose()自动销毁的后门，
         *     take care of yourself~
         *
         * @param {string} id ZRender对象索引
         */
        zrender.delInstance = function (id) {
            delete _instances[id];
            return zrender;
        };

        function getFrameCallback(zrInstance) {
            return function () {
                var animatingElements = zrInstance.animatingElements;
                for (var i = 0, l = animatingElements.length; i < l; i++) {
                    zrInstance.storage.mod(animatingElements[i].id);
                }

                if (animatingElements.length || zrInstance._needsRefreshNextFrame) {
                    zrInstance.refresh();
                }
            };
        }

        /**
         * ZRender接口类，对外可用的所有接口都在这里
         * 非get接口统一返回支持链式调用
         *
         * @constructor
         * @alias module:zrender~ZRender
         * @param {string} id 唯一标识
         * @param {HTMLElement} dom dom对象，不帮你做document.getElementById
         * @return {ZRender} ZRender实例
         */
        var ZRender = function(id, dom) {
            /**
             * 实例 id
             * @type {string}
             */
            this.id = id;
            this.env = require('./tool/env');

            this.storage = new Storage();
            this.painter = new Painter(dom, this.storage);
            this.handler = new Handler(dom, this.storage, this.painter);

            // 动画控制
            this.animatingElements = [];
            /**
             * @type {module:zrender/animation/Animation}
             */
            this.animation = new Animation({
                stage: {
                    update: getFrameCallback(this)
                }
            });
            this.animation.start();

            this._needsRefreshNextFrame = false;
        };

        /**
         * 获取实例唯一标识
         * @return {string}
         */
        ZRender.prototype.getId = function () {
            return this.id;
        };

        /**
         * 添加图形形状到根节点
         * 
         * @param {module:zrender/shape/Base} shape 形状对象，可用属性全集，详见各shape
         */
        ZRender.prototype.addShape = function (shape) {
            this.storage.addRoot(shape);
            return this;
        };

        /**
         * 添加组到根节点
         *
         * @param {module:zrender/Group} group
         */
        ZRender.prototype.addGroup = function(group) {
            this.storage.addRoot(group);
            return this;
        };

        /**
         * 从根节点删除图形形状
         * 
         * @param {string} shapeId 形状对象唯一标识
         */
        ZRender.prototype.delShape = function (shapeId) {
            this.storage.delRoot(shapeId);
            return this;
        };

        /**
         * 从根节点删除组
         * 
         * @param {string} groupId
         */
        ZRender.prototype.delGroup = function (groupId) {
            this.storage.delRoot(groupId);
            return this;
        };

        /**
         * 修改图形形状
         * 
         * @param {string} shapeId 形状对象唯一标识
         * @param {Object} shape 形状对象
         */
        ZRender.prototype.modShape = function (shapeId, shape) {
            this.storage.mod(shapeId, shape);
            return this;
        };

        /**
         * 修改组
         * 
         * @param {string} groupId
         * @param {Object} group
         */
        ZRender.prototype.modGroup = function (groupId, group) {
            this.storage.mod(groupId, group);
            return this;
        };

        /**
         * 修改指定zlevel的绘制配置项
         * 
         * @param {string} zLevel
         * @param {Object} config 配置对象
         * @param {string} [config.clearColor=0] 每次清空画布的颜色
         * @param {string} [config.motionBlur=false] 是否开启动态模糊
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 在开启动态模糊的时候使用，与上一帧混合的alpha值，值越大尾迹越明显
         * @param {Array.<number>} [config.position] 层的平移
         * @param {Array.<number>} [config.rotation] 层的旋转
         * @param {Array.<number>} [config.scale] 层的缩放
         * @param {boolean} [config.zoomable=false] 层是否支持鼠标缩放操作
         * @param {boolean} [config.panable=false] 层是否支持鼠标平移操作
         */
        ZRender.prototype.modLayer = function (zLevel, config) {
            this.painter.modLayer(zLevel, config);
            return this;
        };

        /**
         * 添加额外高亮层显示，仅提供添加方法，每次刷新后高亮层图形均被清空
         * 
         * @param {Object} shape 形状对象
         */
        ZRender.prototype.addHoverShape = function (shape) {
            this.storage.addHover(shape);
            return this;
        };

        /**
         * 渲染
         * 
         * @param {Function} callback  渲染结束后回调函数
         */
        ZRender.prototype.render = function (callback) {
            this.painter.render(callback);
            this._needsRefreshNextFrame = false;
            return this;
        };

        /**
         * 视图更新
         * 
         * @param {Function} callback  视图更新后回调函数
         */
        ZRender.prototype.refresh = function (callback) {
            this.painter.refresh(callback);
            this._needsRefreshNextFrame = false;
            return this;
        };

        /**
         * 标记视图在浏览器下一帧需要绘制
         */
        ZRender.prototype.refreshNextFrame = function() {
            this._needsRefreshNextFrame = true;
            return this;
        };
        
        /**
         * 绘制高亮层
         * @param {Function} callback  视图更新后回调函数
         */
        ZRender.prototype.refreshHover = function (callback) {
            this.painter.refreshHover(callback);
            return this;
        };

        /**
         * 视图更新
         * 
         * @param {Array.<module:zrender/shape/Base>} shapeList 需要更新的图形列表
         * @param {Function} callback  视图更新后回调函数
         */
        ZRender.prototype.refreshShapes = function (shapeList, callback) {
            this.painter.refreshShapes(shapeList, callback);
            return this;
        };

        /**
         * 调整视图大小
         */
        ZRender.prototype.resize = function() {
            this.painter.resize();
            return this;
        };

        /**
         * 动画
         * 
         * @param {string|module:zrender/Group|module:zrender/shape/Base} el 动画对象
         * @param {string} path 需要添加动画的属性获取路径，可以通过a.b.c来获取深层的属性
         * @param {boolean} [loop] 动画是否循环
         * @return {module:zrender/animation/Animation~Animator}
         * @example:
         *     zr.animate(circle.id, 'style', false)
         *         .when(1000, {x: 10} )
         *         .done(function(){ // Animation done })
         *         .start()
         */
        ZRender.prototype.animate = function (el, path, loop) {
            if (typeof(el) === 'string') {
                el = this.storage.get(el);
            }
            if (el) {
                var target;
                if (path) {
                    var pathSplitted = path.split('.');
                    var prop = el;
                    for (var i = 0, l = pathSplitted.length; i < l; i++) {
                        if (!prop) {
                            continue;
                        }
                        prop = prop[pathSplitted[i]];
                    }
                    if (prop) {
                        target = prop;
                    }
                }
                else {
                    target = el;
                }

                if (!target) {
                    log(
                        'Property "'
                        + path
                        + '" is not existed in element '
                        + el.id
                    );
                    return;
                }

                var animatingElements = this.animatingElements;
                if (typeof el.__aniCount === 'undefined') {
                    // 正在进行的动画记数
                    el.__aniCount = 0;
                }
                if (el.__aniCount === 0) {
                    animatingElements.push(el);
                }
                el.__aniCount++;

                return this.animation.animate(target, { loop: loop })
                    .done(function () {
                        el.__aniCount--;
                        if (el.__aniCount === 0) {
                            // 从animatingElements里移除
                            var idx = util.indexOf(animatingElements, el);
                            animatingElements.splice(idx, 1);
                        }
                    });
            }
            else {
                log('Element not existed');
            }
        };

        /**
         * 停止所有动画
         */
        ZRender.prototype.clearAnimation = function () {
            this.animation.clear();
        };

        /**
         * loading显示
         * 
         * @param {Object=} loadingEffect loading效果对象
         */
        ZRender.prototype.showLoading = function (loadingEffect) {
            this.painter.showLoading(loadingEffect);
            return this;
        };

        /**
         * loading结束
         */
        ZRender.prototype.hideLoading = function () {
            this.painter.hideLoading();
            return this;
        };

        /**
         * 获取视图宽度
         */
        ZRender.prototype.getWidth = function() {
            return this.painter.getWidth();
        };

        /**
         * 获取视图高度
         */
        ZRender.prototype.getHeight = function() {
            return this.painter.getHeight();
        };

        /**
         * 图像导出
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] 背景色
         * @return {string} 图片的Base64 url
         */
        ZRender.prototype.toDataURL = function(type, backgroundColor, args) {
            return this.painter.toDataURL(type, backgroundColor, args);
        };

        /**
         * 将常规shape转成image shape
         * @param {module:zrender/shape/Base} e
         * @param {number} width
         * @param {number} height
         */
        ZRender.prototype.shapeToImage = function(e, width, height) {
            var id = guid();
            return this.painter.shapeToImage(id, e, width, height);
        };

        /**
         * 事件绑定
         * 
         * @param {string} eventName 事件名称
         * @param {Function} eventHandler 响应函数
         */
        ZRender.prototype.on = function(eventName, eventHandler) {
            this.handler.on(eventName, eventHandler);
            return this;
        };

        /**
         * 事件解绑定，参数为空则解绑所有自定义事件
         * 
         * @param {string} eventName 事件名称
         * @param {Function} eventHandler 响应函数
         */
        ZRender.prototype.un = function(eventName, eventHandler) {
            this.handler.un(eventName, eventHandler);
            return this;
        };
        
        /**
         * 事件触发
         * 
         * @param {string} eventName 事件名称，resize，hover，drag，etc
         * @param {event=} event event dom事件对象
         */
        ZRender.prototype.trigger = function (eventName, event) {
            this.handler.trigger(eventName, event);
            return this;
        };
        

        /**
         * 清除当前ZRender下所有类图的数据和显示，clear后MVC和已绑定事件均还存在在，ZRender可用
         */
        ZRender.prototype.clear = function () {
            this.storage.delRoot();
            this.painter.clear();
            return this;
        };

        /**
         * 释放当前ZR实例（删除包括dom，数据、显示和事件绑定），dispose后ZR不可用
         */
        ZRender.prototype.dispose = function () {
            this.animation.stop();
            
            this.clear();
            this.storage.dispose();
            this.painter.dispose();
            this.handler.dispose();

            this.animation = 
            this.animatingElements = 
            this.storage = 
            this.painter = 
            this.handler = null;

            // 释放后告诉全局删除对自己的索引，没想到啥好方法
            zrender.delInstance(this.id);
        };

        return zrender;
    }
);

define('zrender', ['zrender/zrender'], function (main) { return main; });

// 1. Graph Drawing by Force-directed Placement
// 2. http://webatlas.fr/tempshare/ForceAtlas2_Paper.pdf
define('echarts/layout/forceLayoutWorker',['require','zrender/tool/vector'],function __echartsForceLayoutWorker(require) {

    

    var vec2;
    // In web worker
    var inWorker = typeof(window) === 'undefined' && typeof(require) === 'undefined';
    if (inWorker) {
        vec2 = {
            create: function(x, y) {
                var out = new Float32Array(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },
            dist: function(a, b) {
                var x = b[0] - a[0];
                var y = b[1] - a[1];
                return Math.sqrt(x*x + y*y);
            },
            len: function(a) {
                var x = a[0];
                var y = a[1];
                return Math.sqrt(x*x + y*y);
            },
            scaleAndAdd: function(out, a, b, scale) {
                out[0] = a[0] + b[0] * scale;
                out[1] = a[1] + b[1] * scale;
                return out;
            },
            scale: function(out, a, b) {
                out[0] = a[0] * b;
                out[1] = a[1] * b;
                return out;
            },
            add: function(out, a, b) {
                out[0] = a[0] + b[0];
                out[1] = a[1] + b[1];
                return out;
            },
            sub: function(out, a, b) {
                out[0] = a[0] - b[0];
                out[1] = a[1] - b[1];
                return out;
            },
            normalize: function(out, a) {
                var x = a[0];
                var y = a[1];
                var len = x*x + y*y;
                if (len > 0) {
                    //TODO: evaluate use of glm_invsqrt here?
                    len = 1 / Math.sqrt(len);
                    out[0] = a[0] * len;
                    out[1] = a[1] * len;
                }
                return out;
            },
            negate: function(out, a) {
                out[0] = -a[0];
                out[1] = -a[1];
                return out;
            },
            copy: function(out, a) {
                out[0] = a[0];
                out[1] = a[1];
                return out;
            },
            set: function(out, x, y) {
                out[0] = x;
                out[1] = y;
                return out;
            }
        };
    }
    else {
        vec2 = require('zrender/tool/vector');
    }
    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    /****************************
     * Class: Region
     ***************************/

    function Region() {

        this.subRegions = [];

        this.nSubRegions = 0;

        this.node = null;

        this.mass = 0;

        this.centerOfMass = null;

        this.bbox = new ArrayCtor(4);

        this.size = 0;
    }

    // Reset before update
    Region.prototype.beforeUpdate = function() {
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].beforeUpdate();
        }
        this.mass = 0;
        if (this.centerOfMass) {
            this.centerOfMass[0] = 0;
            this.centerOfMass[1] = 0;
        }
        this.nSubRegions = 0;
        this.node = null;
    };
    // Clear after update
    Region.prototype.afterUpdate = function() {
        this.subRegions.length = this.nSubRegions;
        for (var i = 0; i < this.nSubRegions; i++) {
            this.subRegions[i].afterUpdate();
        }
    };

    Region.prototype.addNode = function(node) {
        if (this.nSubRegions === 0) {
            if (this.node == null) {
                this.node = node;
                return;
            }
            else {
                this._addNodeToSubRegion(this.node);
                this.node = null;
            }
        }
        this._addNodeToSubRegion(node);

        this._updateCenterOfMass(node);
    };

    Region.prototype.findSubRegion = function(x, y) {
        for (var i = 0; i < this.nSubRegions; i++) {
            var region = this.subRegions[i];
            if (region.contain(x, y)) {
                return region;
            }
        }
    };

    Region.prototype.contain = function(x, y) {
        return this.bbox[0] <= x
            && this.bbox[2] >= x
            && this.bbox[1] <= y
            && this.bbox[3] >= y;
    };

    Region.prototype.setBBox = function(minX, minY, maxX, maxY) {
        // Min
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        // Max
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;

        this.size = (maxX - minX + maxY - minY) / 2;
    };

    Region.prototype._newSubRegion = function() {
        var subRegion = this.subRegions[this.nSubRegions];
        if (!subRegion) {
            subRegion = new Region();
            this.subRegions[this.nSubRegions] = subRegion;
        }
        this.nSubRegions++;
        return subRegion;
    };

    Region.prototype._addNodeToSubRegion = function(node) {
        var subRegion = this.findSubRegion(node.position[0], node.position[1]);
        var bbox = this.bbox;
        if (!subRegion) {
            var cx = (bbox[0] + bbox[2]) / 2;
            var cy = (bbox[1] + bbox[3]) / 2;
            var w = (bbox[2] - bbox[0]) / 2;
            var h = (bbox[3] - bbox[1]) / 2;
            
            var xi = node.position[0] >= cx ? 1 : 0;
            var yi = node.position[1] >= cy ? 1 : 0;

            var subRegion = this._newSubRegion();
            // Min
            subRegion.setBBox(
                // Min
                xi * w + bbox[0],
                yi * h + bbox[1],
                // Max
                (xi + 1) * w + bbox[0],
                (yi + 1) * h + bbox[1]
            );
        }

        subRegion.addNode(node);
    };

    Region.prototype._updateCenterOfMass = function(node) {
        // Incrementally update
        if (this.centerOfMass == null) {
            this.centerOfMass = vec2.create();
        }
        var x = this.centerOfMass[0] * this.mass;
        var y = this.centerOfMass[1] * this.mass;
        x += node.position[0] * node.mass;
        y += node.position[1] * node.mass;
        this.mass += node.mass;
        this.centerOfMass[0] = x / this.mass;
        this.centerOfMass[1] = y / this.mass;
    };

    /****************************
     * Class: Graph Node
     ***************************/
    function GraphNode() {
        this.position = vec2.create();

        this.force = vec2.create();
        this.forcePrev = vec2.create();

        this.speed = vec2.create();
        this.speedPrev = vec2.create();

        // If repulsionByDegree is true
        //  mass = inDegree + outDegree + 1
        // Else
        //  mass is manually set
        this.mass = 1;

        this.inDegree = 0;
        this.outDegree = 0;
    }

    /****************************
     * Class: Graph Edge
     ***************************/
    function GraphEdge(node1, node2) {
        this.node1 = node1;
        this.node2 = node2;

        this.weight = 1;
    }

    /****************************
     * Class: ForceLayout
     ***************************/
    function ForceLayout() {

        this.barnesHutOptimize = false;
        this.barnesHutTheta = 1.5;

        this.repulsionByDegree = false;

        this.preventOverlap = false;
        this.strongGravity = true;

        this.gravity = 1.0;
        this.scaling = 1.0;

        this.edgeWeightInfluence = 1.0;

        this.center = [0, 0];
        this.width = 500;
        this.height = 500;

        this.maxSpeedIncrease = 1;
        this.enableAcceleration = true;

        this.nodes = [];
        this.edges = [];

        this.bbox = new ArrayCtor(4);

        this._rootRegion = new Region();
        this._rootRegion.centerOfMass = vec2.create();

        this._massArr = null;

        this._k = 0;
    }

    ForceLayout.prototype.initNodes = function(positionArr, massArr, sizeArr) {

        this.temperature = 1.0;

        var nNodes = positionArr.length / 2;
        this.nodes.length = 0;
        var haveSize = typeof(sizeArr) !== 'undefined';

        for (var i = 0; i < nNodes; i++) {
            var node = new GraphNode();
            node.position[0] = positionArr[i * 2];
            node.position[1] = positionArr[i * 2 + 1];
            node.mass = massArr[i];
            if (haveSize) {
                node.size = sizeArr[i];
            }
            this.nodes.push(node);
        }

        this._massArr = massArr;
        if (haveSize) {
            this._sizeArr = sizeArr;
        }
    };

    ForceLayout.prototype.initEdges = function(edgeArr, edgeWeightArr) {
        var nEdges = edgeArr.length / 2;
        this.edges.length = 0;
        var edgeHaveWeight = typeof(edgeWeightArr) !== 'undefined';

        for (var i = 0; i < nEdges; i++) {
            var sIdx = edgeArr[i * 2];
            var tIdx = edgeArr[i * 2 + 1];
            var sNode = this.nodes[sIdx];
            var tNode = this.nodes[tIdx];

            if (!sNode || !tNode) {
                continue;
            }
            sNode.outDegree++;
            tNode.inDegree++;
            var edge = new GraphEdge(sNode, tNode);

            if (edgeHaveWeight) {
                edge.weight = edgeWeightArr[i];
            }

            this.edges.push(edge);
        }
    };

    ForceLayout.prototype.update = function() {

        var nNodes = this.nodes.length;

        this.updateBBox();

        this._k = 0.4 * this.scaling * Math.sqrt(this.width * this.height / nNodes);

        if (this.barnesHutOptimize) {
            this._rootRegion.setBBox(
                this.bbox[0], this.bbox[1],
                this.bbox[2], this.bbox[3]
            );
            this._rootRegion.beforeUpdate();
            for (var i = 0; i < nNodes; i++) {
                this._rootRegion.addNode(this.nodes[i]);
            }
            this._rootRegion.afterUpdate();
        }
        else {
            // Update center of mass of whole graph
            var mass = 0;
            var centerOfMass = this._rootRegion.centerOfMass;
            vec2.set(centerOfMass, 0, 0);
            for (var i = 0; i < nNodes; i++) {
                var node = this.nodes[i];
                mass += node.mass;
                vec2.scaleAndAdd(centerOfMass, centerOfMass, node.position, node.mass);
            }
            if (mass > 0) {
                vec2.scale(centerOfMass, centerOfMass, 1 / mass);
            }
        }

        // Reset forces
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            vec2.copy(node.forcePrev, node.force);
            vec2.copy(node.speedPrev, node.speed);
            vec2.set(node.force, 0, 0);
        }

        // Compute forces
        // Repulsion
        for (var i = 0; i < nNodes; i++) {
            var na = this.nodes[i];
            if (this.barnesHutOptimize) {
                this.applyRegionToNodeRepulsion(this._rootRegion, na);
            }
            else {
                for (var j = i + 1; j < nNodes; j++) {
                    var nb = this.nodes[j];
                    this.applyNodeToNodeRepulsion(na, nb, false);
                }
            }

            // Gravity
            if (this.gravity > 0) {
                this.applyNodeGravity(na);
            }
        }

        // Attraction
        for (var i = 0; i < this.edges.length; i++) {
            this.applyEdgeAttraction(this.edges[i]);
        }

        // Apply forces
        // var speed = vec2.create();
        var v = vec2.create();
        for (var i = 0; i < nNodes; i++) {
            var node = this.nodes[i];
            var speed = node.speed;

            // var swing = vec2.dist(node.force, node.forcePrev);
            // // var swing = 30;
            // vec2.scale(node.force, node.force, 1 / (1 + Math.sqrt(swing)));
            vec2.scale(node.force, node.force, 1 / 30);

            // contraint force
            var df = vec2.len(node.force) + 0.1;
            var scale = Math.min(df, 500.0) / df;
            vec2.scale(node.force, node.force, scale);

            if (this.enableAcceleration) {
                vec2.add(speed, speed, node.force);
                vec2.scale(speed, speed, this.temperature);
            } else {
                vec2.copy(speed, node.force);
            }

            // Prevent swinging
            // Limited the increase of speed up to 100% each step
            // TODO adjust by nodes number
            // TODO First iterate speed control
            vec2.sub(v, speed, node.speedPrev);
            var swing = vec2.len(v);
            if (swing > 0) {
                vec2.scale(v, v, 1 / swing);
                var base = vec2.len(node.speedPrev);
                if (base > 0) {
                    swing = Math.min(swing / base, this.maxSpeedIncrease) * base;
                    vec2.scaleAndAdd(speed, node.speedPrev, v, swing);
                }
            }

            // constraint speed
            var ds = vec2.len(speed);
            var scale = Math.min(ds, 100.0) / (ds + 0.1);
            vec2.scale(speed, speed, scale);

            vec2.add(node.position, node.position, speed);
        }
    };

    ForceLayout.prototype.applyRegionToNodeRepulsion = (function() {
        var v = vec2.create();
        return function applyRegionToNodeRepulsion(region, node) {
            if (region.node) { // Region is a leaf 
                this.applyNodeToNodeRepulsion(region.node, node, true);
            }
            else {
                // Static region and node
                if (region.mass === 0 && node.mass === 0) {
                    return;
                }
                vec2.sub(v, node.position, region.centerOfMass);
                var d2 = v[0] * v[0] + v[1] * v[1];
                if (d2 > this.barnesHutTheta * region.size * region.size) {
                    var factor = this._k * this._k * (node.mass + region.mass) / (d2 + 1);
                    vec2.scaleAndAdd(node.force, node.force, v, factor * 2);
                }
                else {
                    for (var i = 0; i < region.nSubRegions; i++) {
                        this.applyRegionToNodeRepulsion(region.subRegions[i], node);
                    }
                }
            }
        };
    })();

    ForceLayout.prototype.applyNodeToNodeRepulsion = (function() {
        var v = vec2.create();
        return function applyNodeToNodeRepulsion(na, nb, oneWay) {
            if (na === nb) {
                return;
            }
            // Two static node
            if (na.mass === 0 && nb.mass === 0) {
                return;
            }
            
            vec2.sub(v, na.position, nb.position);
            var d2 = v[0] * v[0] + v[1] * v[1];

            // PENDING
            if (d2 === 0) {
                return;
            }

            var factor;
            var k2 = this._k * this._k;
            var mass = na.mass + nb.mass;

            if (this.preventOverlap) {
                var d = Math.sqrt(d2);
                d = d - na.size - nb.size;
                if (d > 0) {
                    factor = k2 * mass / (d * d);
                }
                else if (d <= 0) {
                    // A stronger repulsion if overlap
                    factor = k2 * 10 * mass;
                }
            }
            else {
                // Divide factor by an extra `d` to normalize the `v`
                factor = k2 * mass / d2;
            }

            if (!oneWay) {
                vec2.scaleAndAdd(na.force, na.force, v, factor * 2);
            }
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor * 2);
        };
    })();

    ForceLayout.prototype.applyEdgeAttraction = (function() {
        var v = vec2.create();
        return function applyEdgeAttraction(edge) {
            var na = edge.node1;
            var nb = edge.node2;

            vec2.sub(v, na.position, nb.position);
            var d = vec2.len(v);

            var w;
            if (this.edgeWeightInfluence === 0) {
                w = 1;
            }
            else if (this.edgeWeightInfluence == 1) {
                w = edge.weight;
            }
            else {
                w = Math.pow(edge.weight, this.edgeWeightInfluence);
            }

            var factor;

            if (this.preventOverlap) {
                d = d - na.size - nb.size;
                if (d <= 0) {
                    // No attraction
                    return;
                }
            }

            var factor = -w * d / this._k;

            vec2.scaleAndAdd(na.force, na.force, v, factor);
            vec2.scaleAndAdd(nb.force, nb.force, v, -factor);
        };
    })();

    ForceLayout.prototype.applyNodeGravity = (function() {
        var v = vec2.create();
        return function(node) {
            // PENDING Move to centerOfMass or [0, 0] ?
            // vec2.sub(v, this._rootRegion.centerOfMass, node.position);
            // vec2.negate(v, node.position);
            vec2.sub(v, this.center, node.position);
            if (this.width > this.height) {
                // Stronger gravity on y axis
                v[1] *= this.width / this.height;
            }
            else {
                // Stronger gravity on x axis
                v[0] *= this.height / this.width;
            }
            var d = vec2.len(v) / 100;
            
            if (this.strongGravity) {
                vec2.scaleAndAdd(node.force, node.force, v, d * this.gravity * node.mass);
            }
            else {
                vec2.scaleAndAdd(node.force, node.force, v, this.gravity * node.mass / (d + 1));
            }
        };
    })();

    ForceLayout.prototype.updateBBox = function() {
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        for (var i = 0; i < this.nodes.length; i++) {
            var pos = this.nodes[i].position;
            minX = Math.min(minX, pos[0]);
            minY = Math.min(minY, pos[1]);
            maxX = Math.max(maxX, pos[0]);
            maxY = Math.max(maxY, pos[1]);
        }
        this.bbox[0] = minX;
        this.bbox[1] = minY;
        this.bbox[2] = maxX;
        this.bbox[3] = maxY;
    };

    ForceLayout.getWorkerCode = function() {
        var str = __echartsForceLayoutWorker.toString();
        return str.slice(str.indexOf('{') + 1, str.lastIndexOf('return'));
    };

    ForceLayout.prototype.setToken = function(token) {
        this._token = token;
    };

    ForceLayout.prototype.tokenMatch = function(token) {
        return token === this._token;
    };

    /****************************
     * Main process
     ***************************/

    /* jshint ignore:start */
    if (inWorker) {
        var forceLayout = null;
        
        self.onmessage = function(e) {
            // Position read back
            if (e.data instanceof ArrayBuffer) {
                if (!forceLayout) {
                    return;
                }
                var positionArr = new Float32Array(e.data);
                var nNodes = (positionArr.length - 1) / 2;
                for (var i = 0; i < nNodes; i++) {
                    var node = forceLayout.nodes[i];
                    node.position[0] = positionArr[i * 2 + 1];
                    node.position[1] = positionArr[i * 2 + 2];
                }
                return;
            }

            switch(e.data.cmd) {
                case 'init':
                    if (!forceLayout) {
                        forceLayout = new ForceLayout();
                    }
                    forceLayout.initNodes(e.data.nodesPosition, e.data.nodesMass, e.data.nodesSize);
                    forceLayout.initEdges(e.data.edges, e.data.edgesWeight);
                    forceLayout._token = e.data.token;
                    break;
                case 'updateConfig':
                    if (forceLayout) {
                        for (var name in e.data.config) {
                            forceLayout[name] = e.data.config[name];
                        }
                    }
                    break;
                case 'update':
                    var steps = e.data.steps;

                    if (forceLayout) {
                        var nNodes = forceLayout.nodes.length;
                        var positionArr = new Float32Array(nNodes * 2 + 1);

                        forceLayout.temperature = e.data.temperature;

                        for (var i = 0; i < steps; i++) {
                            forceLayout.update();
                            forceLayout.temperature *= e.data.coolDown;
                        }
                        // Callback
                        for (var i = 0; i < nNodes; i++) {
                            var node = forceLayout.nodes[i];
                            positionArr[i * 2 + 1] = node.position[0];
                            positionArr[i * 2 + 2] = node.position[1];
                        }

                        positionArr[0] = forceLayout._token;

                        self.postMessage(positionArr.buffer, [positionArr.buffer]);
                    }
                    else {
                        // Not initialzied yet
                        var emptyArr = new Float32Array();
                        // Post transfer object
                        self.postMessage(emptyArr.buffer, [emptyArr.buffer]);
                    }
                    break;
            }
        };
    }
    /* jshint ignore:end */

    return ForceLayout;
});
/**
 * 力导向布局
 * @module echarts/layout/Force
 * @author pissang(http://github.com/pissang)
 */
define('echarts/layout/Force',['require','./forceLayoutWorker','zrender/tool/vector'],function(require) {

    var ForceLayoutWorker = require('./forceLayoutWorker');
    var vec2 = require('zrender/tool/vector');

    var requestAnimationFrame = window.requestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function (func) {setTimeout(func, 16);};
    var ArrayCtor = typeof(Float32Array) == 'undefined' ? Array : Float32Array;

    var workerUrl;

    function getToken() {
        return Math.round(Date.now() / 100) % 10000000;
    }

    function createWorkerUrl() {
        if (
            typeof(Worker) !== 'undefined' &&
            typeof(Blob) !== 'undefined'
        ) {
            try {
                var blob = new Blob([ForceLayoutWorker.getWorkerCode()]);
                workerUrl = window.URL.createObjectURL(blob);   
            }
            catch (e) {
                workerUrl = '';
            }
        }

        return workerUrl;
    }

    var ForceLayout = function(opts) {

        if (typeof(workerUrl) === 'undefined') {
            createWorkerUrl();
        }
        opts = opts || {};
        // 配置项
        this.width = opts.width || 500;
        this.height = opts.height || 500;
        this.center = opts.center || [this.width / 2, this.height / 2];
        this.ratioScaling = opts.ratioScaling || false;
        this.scaling = opts.scaling || 1;
        this.gravity = typeof(opts.gravity) !== 'undefined'
                        ? opts.gravity : 1;
        this.large = opts.large || false;
        this.preventOverlap = opts.preventOverlap || false;
        this.maxSpeedIncrease = opts.maxSpeedIncrease || 1;
        this.enableAcceleration = typeof(opts.enableAcceleration) === 'undefined'
            ? true : opts.enableAcceleration;

        this.onupdate = opts.onupdate || function () {};
        this.temperature = opts.temperature || 1;
        this.coolDown = opts.coolDown || 0.99;

        this._layout = null;
        this._layoutWorker = null;

        this._token = 0;

        var self = this;
        var _$onupdate = this._$onupdate;
        this._$onupdate = function(e) {
            _$onupdate.call(self, e);
        };
    };

    ForceLayout.prototype.updateConfig = function () {
        var width = this.width;
        var height = this.height;
        var size = Math.min(width, height);

        var config = {
            center: this.center,
            width: this.ratioScaling ? width : size,
            height: this.ratioScaling ? height : size,
            scaling: this.scaling || 1.0,
            gravity: this.gravity || 1.0,
            barnesHutOptimize: this.large,
            preventOverlap: this.preventOverlap,

            enableAcceleration: this.enableAcceleration,
            maxSpeedIncrease: this.maxSpeedIncrease
        };

        if (this._layoutWorker) {
            this._layoutWorker.postMessage({
                cmd: 'updateConfig',
                config: config
            });
        }
        else {
            for (var name in config) {
                this._layout[name] = config[name];
            }
        }
    };

    ForceLayout.prototype.init = function (graph, useWorker) {
        if (workerUrl && useWorker) {
            try {
                if (!this._layoutWorker) {
                    this._layoutWorker = new Worker(workerUrl);
                    this._layoutWorker.onmessage = this._$onupdate;
                }
                this._layout = null;
            }
            catch (e) {    // IE10-11 will throw security error when using blog url
                this._layoutWorker = null;
                if (!this._layout) {
                    this._layout = new ForceLayoutWorker();
                }
            }
        }
        else {
            if (!this._layout) {
                this._layout = new ForceLayoutWorker();
            }
            if (this._layoutWorker) {
                this._layoutWorker.terminate();
                this._layoutWorker = null;
            }
        }

        this.temperature = 1;

        this.graph = graph;

        // 节点数据
        var len = graph.nodes.length;
        var positionArr = new ArrayCtor(len * 2);
        var massArr = new ArrayCtor(len);
        var sizeArr = new ArrayCtor(len);

        for (var i = 0; i < len; i++) {
            var n = graph.nodes[i];
            positionArr[i * 2] = n.layout.position[0];
            positionArr[i * 2 + 1] = n.layout.position[1];
            massArr[i] = typeof(n.layout.mass) === 'undefined'
                ? 1 : n.layout.mass;
            sizeArr[i] = typeof(n.layout.size) === 'undefined'
                ? 1 : n.layout.size;

            n.layout.__index = i;
        }
        // 边数据
        len = graph.edges.length;
        var edgeArr = new ArrayCtor(len * 2);
        var edgeWeightArr = new ArrayCtor(len);
        for (var i = 0; i < len; i++) {
            var edge = graph.edges[i];
            edgeArr[i * 2] = edge.node1.layout.__index;
            edgeArr[i * 2 + 1] = edge.node2.layout.__index;
            edgeWeightArr[i] = edge.layout.weight || 1;
        }

        this._token = getToken();

        if (this._layoutWorker) {

            this._layoutWorker.postMessage({
                cmd: 'init',
                nodesPosition: positionArr,
                nodesMass: massArr,
                nodesSize: sizeArr,
                edges: edgeArr,
                edgesWeight: edgeWeightArr,
                token: this._token
            });
        }
        else {
            this._layout.setToken(this._token);
            this._layout.initNodes(positionArr, massArr, sizeArr);
            this._layout.initEdges(edgeArr, edgeWeightArr);   
        }

        this.updateConfig();
    };

    ForceLayout.prototype.step = function (steps) {
        var nodes = this.graph.nodes;
        if (this._layoutWorker) {
            // Sync back
            var positionArr = new ArrayCtor(nodes.length * 2 + 1);
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                positionArr[i * 2 + 1] = n.layout.position[0];
                positionArr[i * 2 + 2] = n.layout.position[1];
            }
            this._layoutWorker.postMessage(positionArr.buffer, [positionArr.buffer]);

            this._layoutWorker.postMessage({
                cmd: 'update',
                steps: steps,
                temperature: this.temperature,
                coolDown: this.coolDown
            });
            for (var i = 0; i < steps; i++) {
                this.temperature *= this.coolDown;
            }
        }
        else {
            
            requestAnimationFrame(this._$onupdate);

            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                vec2.copy(this._layout.nodes[i].position, n.layout.position);
            }
            for (var i = 0; i < steps; i++) {
                this._layout.temperature = this.temperature;
                this._layout.update();
                this.temperature *= this.coolDown;
            }
        }
    };

    ForceLayout.prototype._$onupdate = function (e) {
        if (this._layoutWorker) {
            var positionArr = new Float32Array(e.data);
            var token = positionArr[0];
            // If token is from current layout instance
            if (token === this._token) {
                for (var i = 0; i < this.graph.nodes.length; i++) {
                    var n = this.graph.nodes[i];
                    n.layout.position[0] = positionArr[i * 2 + 1];
                    n.layout.position[1] = positionArr[i * 2 + 2];
                }
                this.onupdate && this.onupdate();
            }
        }
        else if (this._layout) {
            if (this._layout.tokenMatch(this._token)) {
                for (var i = 0; i < this.graph.nodes.length; i++) {
                    var n = this.graph.nodes[i];
                    vec2.copy(n.layout.position, this._layout.nodes[i].position);
                }
                this.onupdate && this.onupdate();
            }
        }
    };

    ForceLayout.prototype.dispose = function() {
        if (this._layoutWorker) {
            this._layoutWorker.terminate();
        }
        this._layoutWorker = null;
        this._layout = null;
        this._token = 0;
    };

    return ForceLayout;
});
/**
 * 图数据结构
 * @module echarts/data/Graph
 * @author pissang(http://www.github.com/pissang)
 */
define('echarts/data/Graph',['require','zrender/tool/util'],function(require) {

    var util = require('zrender/tool/util');

    

    /**
     * @alias module:echarts/data/Graph
     * @constructor
     * @param {boolean} directed
     */
    var Graph = function(directed) {
        /**
         * 是否是有向图
         * @type {boolean}
         * @private
         */
        this._directed = directed || false;

        /**
         * @type {Array}
         */
        this.nodes = [];
        this.edges = [];

        this._nodesMap = {};
        this._edgesMap = {};
    };

    /**
     * 是否是有向图
     * @return {boolean}
     */
    Graph.prototype.isDirected = function () {
        return this._directed;
    }

    /**
     * 添加一个新的节点
     * @param {string} id 节点名称
     * @param {*} [data] 存储的数据
     */
    Graph.prototype.addNode = function (id, data) {
        if (this._nodesMap[id]) {
            return this._nodesMap[id];
        }

        var node = new Graph.Node(id, data);

        this.nodes.push(node);

        this._nodesMap[id] = node;
        return node;
    };
    
    /**
     * 获取节点
     * @param  {string} id
     * @return {module:echarts/data/Graph~Node}
     */
    Graph.prototype.getNodeById = function (id) {
        return this._nodesMap[id];
    };

    /**
     * 添加边
     * @param {string|module:echarts/data/Graph~Node} n1
     * @param {string|module:echarts/data/Graph~Node} n2
     * @param {*} data
     * @return {module:echarts/data/Graph~Edge}
     */
    Graph.prototype.addEdge = function (n1, n2, data) {
        if (typeof(n1) == 'string') {
            n1 = this._nodesMap[n1];
        }
        if (typeof(n2) == 'string') {
            n2 = this._nodesMap[n2];
        }
        if (!n1 || !n2) {
            return;
        }

        var key = n1.id + '-' + n2.id;
        if (this._edgesMap[key]) {
            return this._edgesMap[key];
        }

        var edge = new Graph.Edge(n1, n2, data);

        if (this._directed) {
            n1.outEdges.push(edge);
            n2.inEdges.push(edge);   
        }
        n1.edges.push(edge);
        if (n1 !== n2) {
            n2.edges.push(edge);
        }

        this.edges.push(edge);
        this._edgesMap[key] = edge;

        return edge;
    };

    /**
     * 移除边
     * @param  {module:echarts/data/Graph~Edge} edge
     */
    Graph.prototype.removeEdge = function (edge) {
        var n1 = edge.node1;
        var n2 = edge.node2;
        var key = n1.id + '-' + n2.id;
        if (this._directed) {
            n1.outEdges.splice(util.indexOf(n1.outEdges, edge), 1);
            n2.inEdges.splice(util.indexOf(n2.inEdges, edge), 1);   
        }
        n1.edges.splice(util.indexOf(n1.edges, edge), 1);
        if (n1 !== n2) {
            n2.edges.splice(util.indexOf(n2.edges, edge), 1);
        }

        delete this._edgesMap[key];
        this.edges.splice(util.indexOf(this.edges, edge), 1);
    };

    /**
     * 获取边
     * @param  {module:echarts/data/Graph~Node|string} n1
     * @param  {module:echarts/data/Graph~Node|string} n2
     * @return {module:echarts/data/Graph~Edge}
     */
    Graph.prototype.getEdge = function (n1, n2) {
        if (typeof(n1) !== 'string') {
            n1 = n1.id;
        }
        if (typeof(n2) !== 'string') {
            n2 = n2.id;
        }

        if (this._directed) {
            return this._edgesMap[n1 + '-' + n2]
                || this._edgesMap[n2 + '-' + n1];
        } else {
            return this._edgesMap[n1 + '-' + n2];
        }
    }

    /**
     * 移除节点（及其邻接边）
     * @param  {module:echarts/data/Graph~Node|string} node
     */
    Graph.prototype.removeNode = function (node) {
        if (typeof(node) === 'string') {
            node = this._nodesMap[node];
            if (!node) {
                return;
            }
        }

        delete this._nodesMap[node.id];
        this.nodes.splice(util.indexOf(this.nodes, node), 1);

        for (var i = 0; i < this.edges.length;) {
            var edge = this.edges[i];
            if (edge.node1 === node || edge.node2 === node) {
                this.removeEdge(edge);
            } else {
                i++;
            }
        }
    };

    /**
     * 线性遍历所有节点
     * @param  {Function} cb
     * @param  {*}   [context]
     */
    Graph.prototype.eachNode = function (cb, context) {
        for (var i = 0; i < this.nodes.length; i++) {
            cb.call(context, this.nodes[i], i);
        }
    };
    
    /**
     * 线性遍历所有边
     * @param  {Function} cb
     * @param  {*}   [context]
     */
    Graph.prototype.eachEdge = function (cb, context) {
        for (var i = 0; i < this.edges.length; i++) {
            cb.call(context, this.edges[i], i);
        }
    };
    
    /**
     * 清空图
     */
    Graph.prototype.clear = function() {
        this.nodes.length = 0;
        this.edges.length = 0;

        this._nodesMap = {};
        this._edgesMap = {};
    };
    
    /**
     * 广度优先遍历
     * @param {Function} cb
     * @param {module:echarts/data/Graph~Node} startNode 遍历起始节点
     * @param {string} [direction=none] none, in, out 指定遍历边
     * @param {*} [context] 回调函数调用context
     */
    Graph.prototype.breadthFirstTraverse = function (
        cb, startNode, direction, context
    ) {
        if (typeof(startNode) === 'string') {
            startNode = this._nodesMap[startNode];
        }
        if (!startNode) {
            return;
        }

        var edgeType = 'edges';
        if (direction === 'out') {
            edgeType = 'outEdges';
        } else if (direction === 'in') {
            edgeType = 'inEdges';
        }
        
        for (var i = 0; i < this.nodes.length; i++) {
            this.nodes[i].__visited = false;
        }

        if (cb.call(context, startNode, null)) {
            return;
        }

        var queue = [startNode];
        while (queue.length) {
            var currentNode = queue.shift();
            var edges = currentNode[edgeType];

            for (var i = 0; i < edges.length; i++) {
                var e = edges[i];
                var otherNode = e.node1 === currentNode 
                    ? e.node2 : e.node1;
                if (!otherNode.__visited) {
                    if (cb.call(otherNode, otherNode, currentNode)) {
                        // Stop traversing
                        return;
                    }
                    queue.push(otherNode);
                    otherNode.__visited = true;
                }
            }
        }
    };

    /**
     * 复制图
     */
    Graph.prototype.clone = function () {
        var graph = new Graph(this._directed);
        for (var i = 0; i < this.nodes.length; i++) {
            graph.addNode(this.nodes[i].id, this.nodes[i].data);
        }
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            graph.addEdge(e.node1.id, e.node2.id, e.data);
        }
        return graph;
    }

    /**
     * 图节点
     * @alias module:echarts/data/Graph~Node
     * @param {string} id
     * @param {*} [data]
     */
    var Node = function(id, data) {
        /**
         * 节点名称
         * @type {string}
         */
        this.id = id;
        /**
         * 节点存储的数据
         * @type {*}
         */
        this.data = data || null;
        /**
         * 入边，只在有向图上有效
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.inEdges = [];
        /**
         * 出边，只在有向图上有效
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.outEdges = [];
        /**
         * 邻接边
         * @type {Array.<module:echarts/data/Graph~Edge>}
         */
        this.edges = [];
    };
    
    /**
     * 度
     * @return {number}
     */
    Node.prototype.degree = function() {
        return this.edges.length; 
    };
    
    /**
     * 入度，只在有向图上有效
     * @return {number}
     */
    Node.prototype.inDegree = function() {
        return this.inEdges.length;
    };
    
    /**
     * 出度，只在有向图上有效
     * @return {number}
     */
    Node.prototype.outDegree = function() {
        return this.outEdges.length;
    };

    /**
     * 图边
     * @alias module:echarts/data/Graph~Edge
     * @param {module:echarts/data/Graph~Node} node1
     * @param {module:echarts/data/Graph~Node} node2
     * @param {extra} data
     */
    var Edge = function(node1, node2, data) {
        /**
         * 节点1，如果是有向图则为源节点
         * @type {module:echarts/data/Graph~Node}
         */
        this.node1 = node1;
        /**
         * 节点2，如果是有向图则为目标节点
         * @type {module:echarts/data/Graph~Node}
         */
        this.node2 = node2;

        /**
         * 边存储的数据
         * @type {*}
         */
        this.data = data || null;
    };

    Graph.Node = Node;
    Graph.Edge = Edge;

    /**
     * 从邻接矩阵生成
     * ```
     *        TARGET
     *    -1--2--3--4--5-
     *  1| x  x  x  x  x
     *  2| x  x  x  x  x
     *  3| x  x  x  x  x  SOURCE
     *  4| x  x  x  x  x
     *  5| x  x  x  x  x
     * ```
     * 节点的行列总和会被写到`node.data.value`
     * 对于有向图会计算每一行的和写到`node.data.outValue`,
     * 计算每一列的和写到`node.data.inValue`。
     * 边的权重会被然后写到`edge.data.weight`。
     * 如果是有向图被写到`edge.data.sourceWeight`和`edge.data.targetWeight`
     * 
     * @method module:echarts/data/Graph.fromMatrix
     * @param {Array.<Object>} nodesData 节点信息，必须有`id`属性, 会保存到`node.data`中
     * @param {Array} matrix 邻接矩阵
     * @param {boolean} directed 是否是有向图
     * @return {module:echarts/data/Graph}
     */
    Graph.fromMatrix = function(nodesData, matrix, directed) {
        if (
            !matrix || !matrix.length
            || (matrix[0].length !== matrix.length)
            || (nodesData.length !== matrix.length)
        ) {
            // Not a valid data
            return;
        }

        var size = matrix.length;
        var graph = new Graph(directed);

        for (var i = 0; i < size; i++) {
            var node = graph.addNode(nodesData[i].id, nodesData[i]);
            // TODO
            // node.data已经有value的情况
            node.data.value = 0;
            if (directed) {
                node.data.outValue = node.data.inValue = 0;
            }
        }
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var item = matrix[i][j];
                if (directed) {
                    graph.nodes[i].data.outValue += item;
                    graph.nodes[j].data.inValue += item;
                }
                graph.nodes[i].data.value += item;
                graph.nodes[j].data.value += item;
            }
        }

        for (var i = 0; i < size; i++) {
            for (var j = i; j < size; j++) {
                var item = matrix[i][j];
                if (item === 0) {
                    continue;
                }
                var n1 = graph.nodes[i];
                var n2 = graph.nodes[j];
                var edge = graph.addEdge(n1, n2, {});
                if (directed) {
                    edge.data.sourceWeight = item;
                    edge.data.targetWeight = matrix[j][i];
                }
                edge.data.weight = item;
                if (i !== j) {
                    if (directed) {
                        var inEdge = graph.addEdge(n2, n1, {});
                        inEdge.data.sourceWeight = matrix[j][i];
                        inEdge.data.targetWeight = item;
                    }
                    edge.data.weight += matrix[j][i];
                }
            }
        }

        return graph;
    };

    return Graph;
});
define('echarts/data/Tree',['require'],function(require) {

    function TreeNode(id) {
        this.id = id;
        this.depth = 0;
        this.height = 0;
        this.children = [];

        this.data = {};
        this.layout = {};
    };

    TreeNode.prototype.traverse = function (cb, context) {
        cb.call(context, this);

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(cb, context);
        }
    };

    TreeNode.prototype.updateDepthAndHeight = function (depth) {
        var height = 0;
        this.depth = depth;
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.updateDepthAndHeight(depth + 1);
            if (child.height > height) {
                height = child.height;
            }
        }
        this.height = height + 1;
    };

    TreeNode.prototype.getNodeById = function (id) {
        if (this.id === id) {
            return this;
        }
        for (var i = 0; i < this.children.length; i++) {
            var res = this.children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    };

    function Tree(id) {
        this.root = new TreeNode(id);
    }

    Tree.prototype.traverse = function(cb, context) {
        this.root.traverse(cb, context);
    };

    Tree.prototype.getSubTree = function(id) {
        var root = this.getNodeById(id);
        if (root) {
            var tree = new Tree(root.id);
            tree.root = root;
            return tree;
        }
    };

    Tree.prototype.getNodeById = function (id) {
        return this.root.getNodeById(id);
    };

    // TODO
    Tree.fromGraph = function (graph) {

        function buildHierarch(root) {
            var graphNode = graph.getNodeById(root.id);
            for (var i = 0; i < graphNode.outEdges.length; i++) {
                var edge = graphNode.outEdges[i];
                var childTreeNode = treeNodesMap[edge.node2.id]
                root.children.push(childTreeNode);
                buildHierarch(childTreeNode);
            }
        }

        var treeMap = {};
        var treeNodesMap = {};
        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            var treeNode;
            if (node.inDegree() == 0) {
                treeMap[node.id] = new Tree(node.id);
                treeNode = treeMap[node.id].root;
            } else {
                treeNode = new TreeNode(node.id);
            }

            treeNode.data = node.data;

            treeNodesMap[node.id] = treeNode;
        }
        var treeList = [];
        for (var id in treeMap) {
            buildHierarch(treeMap[id].root);
            treeMap[id].root.updateDepthAndHeight(0);
            treeList.push(treeMap[id]);
        }
        return treeList;
    }

    return Tree;
});
/**
 * Tree layout
 * @module echarts/layout/Tree
 * @author pissang(http://github.com/pissang)
 */
define('echarts/layout/Tree',['require','zrender/tool/vector'],function (require) {

    var vec2 = require('zrender/tool/vector');

    function TreeLayout(opts) {

        opts = opts || {};

        this.nodePadding = opts.nodePadding || 30;

        this.layerPadding = opts.layerPadding || 100;

        this._layerOffsets = [];

        this._layers = [];
    };

    TreeLayout.prototype.run = function (tree) {
        this._layerOffsets.length = 0;
        for (var i = 0; i < tree.root.height + 1; i++) {
            this._layerOffsets[i] = 0;
            this._layers[i] = [];
        }
        this._updateNodeXPosition(tree.root);
        var root = tree.root;
        this._updateNodeYPosition(root, 0, root.layout.height);
    };

    TreeLayout.prototype._updateNodeXPosition = function (node) {
        var minX = Infinity;
        var maxX = -Infinity;
        node.layout.position = node.layout.position || vec2.create();
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            this._updateNodeXPosition(child);
            var x = child.layout.position[0];
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
        }
        if (node.children.length > 0) {
            node.layout.position[0] = (minX + maxX) / 2;
        } else {
            node.layout.position[0] = 0;
        }
        var off = this._layerOffsets[node.depth] || 0;
        if (off > node.layout.position[0]) {
            var shift = off - node.layout.position[0];
            this._shiftSubtree(node, shift);
            for (var i = node.depth + 1; i < node.height + node.depth; i++) {
                this._layerOffsets[i] += shift;
            }
        }
        this._layerOffsets[node.depth] = node.layout.position[0] + node.layout.width + this.nodePadding;

        this._layers[node.depth].push(node);
    };

    TreeLayout.prototype._shiftSubtree = function (root, offset) {
        root.layout.position[0] += offset;
        for (var i = 0; i < root.children.length; i++) {
            this._shiftSubtree(root.children[i], offset);
        }
    };

    TreeLayout.prototype._updateNodeYPosition = function (node, y, prevLayerHeight) {
        node.layout.position[1] = y;
        var layerHeight = 0;
        for (var i = 0; i < node.children.length; i++) {
            layerHeight = Math.max(node.children[i].layout.height, layerHeight);
        }
        var layerPadding = this.layerPadding;
        if (typeof(layerPadding) === 'function') {
            layerPadding = layerPadding(node.depth);
        }
        for (var i = 0; i < node.children.length; i++) {
            this._updateNodeYPosition(node.children[i], y + layerPadding + prevLayerHeight, layerHeight);
        }
    };

    return TreeLayout;
});
define('bkgraph/component/Component',['require'],function (require) {

    var Component = function () {
        this.el = document.createElement('div');
    };

    Component.prototype.type = 'COMPONENT';

    Component.prototype.initialize = function (kg) {
    }

    Component.prototype.resize = function (w, h) {
        // Not implemented
    }

    return Component;
});
/**
 * 图形实体基类
 */
define('bkgraph/entity/Entity',['require','zrender/mixin/Eventful','zrender/tool/util'],function (require) {

    var Eventful = require('zrender/mixin/Eventful');
    var zrUtil = require('zrender/tool/util');

    var Entity = function () {

        Eventful.call(this);

        this._animations = {};
    }

    Entity.prototype.initialize = function () {};

    Entity.prototype.addAnimation = function (scope, animator) {
        if (this._animations[scope] == null) {
            this._animations[scope] = [];
        }
        if (zrUtil.indexOf(this._animations[scope], animator) < 0) {
            this._animations[scope].push(animator);
        }
        var self = this;
        animator.done(function () {
            var animations = self._animations[scope];
            animations.splice(zrUtil.indexOf(animator), 1);
        });
        return animator;
    };

    Entity.prototype.stopAnimation = function (scope) {
        var animations = this._animations[scope];
        if (animations) {
            for (var i = 0; i < animations.length; i++) {
                animations[i].stop();
            }
            this._animations[scope] = null;
        }
    };

    Entity.prototype.haveAnimation = function (scope) {
        return this._animations[scope] != null;
    }

    Entity.prototype.stopAnimationAll = function () {
        for (var scope in this._animations) {
            this.stopAnimation(scope);
        }
        this._animations = {};
    };

    zrUtil.merge(Entity.prototype, Eventful.prototype, true);

    return Entity;
});
/**
 * 圆形
 * @module zrender/shape/Circle
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 * @example
 *   var Circle = require('zrender/shape/Circle');
 *   var shape = new Circle({
 *       style: {
 *           x: 100,
 *           y: 100,
 *           r: 40,
 *           brushType: 'both',
 *           color: 'blue',
 *           strokeColor: 'red',
 *           lineWidth: 3,
 *           text: 'Circle'
 *       }    
 *   });
 *   zr.addShape(shape);
 */

/**
 * @typedef {Object} ICircleStyle
 * @property {number} x 圆心x坐标
 * @property {number} y 圆心y坐标
 * @property {number} r 半径
 * @property {string} [brushType='fill']
 * @property {string} [color='#000000'] 填充颜色
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */
define(
    'zrender/shape/Circle',['require','./Base','../tool/util'],function (require) {
        

        var Base = require('./Base');

        /**
         * @alias module:zrender/shape/Circle
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Circle = function(options) {
            Base.call(this, options);
            /**
             * 圆形绘制样式
             * @name module:zrender/shape/Circle#style
             * @type {module:zrender/shape/Circle~ICircleStyle}
             */
            /**
             * 圆形高亮绘制样式
             * @name module:zrender/shape/Circle#highlightStyle
             * @type {module:zrender/shape/Circle~ICircleStyle}
             */
        };

        Circle.prototype = {
            type: 'circle',
            /**
             * 创建圆形路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Circle~ICircleStyle} style
             */
            buildPath : function (ctx, style) {
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, true);
                return;
            },

            /**
             * 计算返回圆形的包围盒矩形
             * @param {module:zrender/shape/Circle~ICircleStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Circle, Base);
        return Circle;
    }
);

define('bkgraph/shape/Crescent',['require','zrender/shape/Base','zrender/tool/util'],function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    var Cresent = function (opts) {

        ShapeBase.call(this, opts);
    }

    Cresent.prototype.type = 'cresent';

    Cresent.prototype.buildPath = function (ctx, style) {
        var r = style.r;
        var cx = style.x;
        var cy = style.y;

        var rad1 = Math.PI / 2;
        var angle = Math.acos((r - style.height) / r);
        var rad0 = rad1 - angle;
        var rad2 = rad1 + angle;

        var x0 = cx + Math.cos(rad0) * r;
        var y0 = cy + Math.sin(rad0) * r;
        ctx.moveTo(x0, y0);
        ctx.arc(cx, cy, r, rad0, rad2);
        ctx.closePath();
    }

    Cresent.prototype.getRect = function (style) {
        var r = style.r;
        var cx = style.x;
        var cy = style.y;

        var rad1 = Math.PI / 2;
        var angle = Math.acos((r - style.height) / r);
        var rad0 = rad1 - angle;
        var rad2 = rad1 + angle;

        var x0 = cx + Math.cos(rad0) * r;
        var y0 = cy + Math.sin(rad0) * r;
        var x1 = cx + Math.cos(rad2) * r;
        var y1 = cy + Math.sin(rad2) * r;

        return {
            x: x0,
            y: y0,
            width: x1 - x0,
            height: r - y0
        }
    }

    zrUtil.inherits(Cresent, ShapeBase);

    return Cresent;
});
define('bkgraph/entity/Node',['require','./Entity','zrender/Group','zrender/shape/Circle','zrender/shape/Image','../shape/Crescent','zrender/tool/util','zrender/tool/color','zrender/tool/vector'],function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var CrescentShape = require('../shape/Crescent');
    var zrUtil = require('zrender/tool/util');
    var zrColor = require('zrender/tool/color');
    var vec2 = require('zrender/tool/vector');

    var baseRadius = 50;

    var defaultImage = new Image;
    defaultImage.src = 'img/default-avatar.png';

    var NodeEntity = function (opts) {

        Entity.call(this);
        
        this.el = new Group();

        // Configs
        opts = opts || {};

        this.radius = opts.radius || 20;

        this.label = opts.label || '';

        this.image = opts.image || '';

        this.style = {
            color: '#0e90fe',
            lineWidth: 3,
            labelColor: 'white'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            lineWidth: 5,
            labelColor: 'black'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        this._animatingCircles = [];
    }

    NodeEntity.prototype.initialize = function (zr) {
        var self = this;
        var r = this.radius;

        var dragging = false;
        var outlineShape = new CircleShape({
            style: {
                strokeColor: this.style.color,
                brushType: 'stroke',
                r: baseRadius,
                x: 0,
                y: 0,
                lineWidth: this.style.lineWidth
            },
            highlightStyle: {
                opacity: 0
            },
            z: 10,
            zlevel: 1,
            clickable: true,
            onmouseover: function () {
                self.dispatch('mouseover');
            },
            onmouseout: function () {
                self.dispatch('mouseout');
            },
            onclick: function () {
                self.dispatch('click');
            }
        });

        var image = new Image();
        image.onload = function () {
            imageShape.style.image = image;
            imageShape.modSelf();
            zr.refreshNextFrame();
        }
        image.src = this.image;

        var imageShape = new ImageShape({
            style: {
                image: defaultImage,
                x: -baseRadius,
                y: -baseRadius,
                width: baseRadius * 2,
                height: baseRadius * 2
            },
            z: 10,
            hoverable: false,
            zlevel: 1
        });

        if (this.label) {
            var labelShape = new CrescentShape({
                style: {
                    height: 25,
                    x: 0,
                    y: 0,
                    r: baseRadius,
                    color: zrColor.alpha(this.style.color, 0.8),
                    brushType: 'fill',
                    text: this.label,
                    textPosition: 'inside',
                    textAlign: 'center',
                    brushType: 'both',
                    textColor: this.style.labelColor,
                    textFont: '14px 微软雅黑'
                },
                z: 10,
                hoverable: false,
                zlevel: 1
            });
        }

        this.el.addChild(imageShape);

        if (labelShape) {
            this.el.addChild(labelShape);
        }

        this.el.addChild(outlineShape);

        this._imageShape = imageShape;
        this._labelShape = labelShape;
        this._outlineShape = outlineShape;

        this.el.scale[0] = this.el.scale[1] = this.radius / baseRadius;
    }

    NodeEntity.prototype.setRadius = function (r) {
        this.radius = r;
        this.el.scale[0] = this.el.scale[1] = r / baseRadius;
        this.el.modSelf();
    }

    NodeEntity.prototype.highlight = function (zr) {
        this._outlineShape.style.strokeColor = this.highlightStyle.color;
        this._outlineShape.style.lineWidth = this.highlightStyle.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.highlightStyle.color, 0.8);
        this._labelShape.style.textColor = this.highlightStyle.labelColor;

        this._outlineShape.zlevel = 3;
        this._labelShape.zlevel = 3;
        this._imageShape.zlevel = 3;

        this.el.modSelf();
    }

    NodeEntity.prototype.lowlight = function (zr) {
        this._outlineShape.style.strokeColor = this.style.color;
        this._outlineShape.style.lineWidth = this.style.lineWidth;
        this._labelShape.style.color = zrColor.alpha(this.style.color, 0.8);
        this._labelShape.style.textColor = this.style.labelColor;

        this._outlineShape.zlevel = 1;
        this._labelShape.zlevel = 1;
        this._imageShape.zlevel = 1;;

        this.el.modSelf();
    }

    NodeEntity.prototype.animateRadius = function (zr, r, time, cb) {
        this.stopAnimation('radius');

        var self = this;
        this.addAnimation('radius', zr.animation.animate(this)
            .when(time || 1000, {
                radius: r
            })
            .during(function () {
                self.setRadius(self.radius);
                zr.refreshNextFrame();
            })
            .done(function () {
                cb && cb();
            })
        )
        .start('ElasticOut')
    };

    NodeEntity.prototype.startActiveAnimation = function (zr) {

        if (this._animatingCircles.length) {
            return;
        }
        var phase = Math.random() * Math.PI * 2;
        for (var i = 0; i < 3; i++) {
            var rad = i / 3 * Math.PI * 2 + phase;
            var x0 = Math.cos(rad) * 8;
            var y0 = Math.sin(rad) * 8;
            var x1 = Math.cos(rad + Math.PI) * 8;
            var y1 = Math.sin(rad + Math.PI) * 8;
            var circle = new CircleShape({
                style: {
                    x: 0,
                    y: 0,
                    r: baseRadius + 5,
                    color: this.highlightStyle.color,
                    opacity: 0.5
                },
                hoverable: false,
                zlevel: 2
            });

            this.addAnimation('glowcircle', zr.animation.animate(circle.style, {loop: true})
                .when(1000, {
                    x: x1,
                    y: y1
                })
                .when(3000, {
                    x: x0,
                    y: y0
                })
                .when(4000, {
                    x: 0,
                    y: 0
                })
                .during(function () {
                    // mod一个就行了
                    circle.modSelf();
                    zr.refreshNextFrame();
                })
                .delay(-500 * i)
                .start()
            );

            this.el.addChild(circle);
            this._animatingCircles.push(circle);
        }
    }

    NodeEntity.prototype.stopActiveAnimation = function (zr) {
        if (this._animatingCircles.length) {
            for (var i = 0; i < this._animatingCircles.length; i++) {
                var circle = this._animatingCircles[i];
                this.el.removeChild(circle);
            }
            this._animatingCircles.length = 0;

            this.stopAnimation('glowcircle');

            zr.refreshNextFrame();
        }
    }

    var min = [0, 0];
    var max = [0, 0];
    NodeEntity.prototype.isInsideRect = function (rect) {
        var r = this.radius + this.style.lineWidth;

        min[0] = this.el.position[0] - r;
        min[1] = this.el.position[1] - r;
        max[0] = this.el.position[0] + r;
        max[1] = this.el.position[1] + r;

        return !(
            min[0] > rect.x + rect.width
            || min[1] > rect.y + rect.height
            || max[0] < rect.x
            || max[1] < rect.y
        );
    }

    zrUtil.inherits(NodeEntity, Entity);

    return NodeEntity;
});
/**
 * 虚线lineTo 
 *
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 *          errorrik (errorrik@gmail.com)
 */
define(
    'zrender/shape/util/dashedLineTo',[],function (/* require */) {

        var dashPattern = [ 5, 5 ];
        /**
         * 虚线lineTo 
         */
        return function (ctx, x1, y1, x2, y2, dashLength) {
            // http://msdn.microsoft.com/en-us/library/ie/dn265063(v=vs.85).aspx
            if (ctx.setLineDash) {
                dashPattern[0] = dashPattern[1] = dashLength;
                ctx.setLineDash(dashPattern);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                return;
            }

            dashLength = typeof dashLength != 'number'
                            ? 5 
                            : dashLength;

            var dx = x2 - x1;
            var dy = y2 - y1;
            var numDashes = Math.floor(
                Math.sqrt(dx * dx + dy * dy) / dashLength
            );
            dx = dx / numDashes;
            dy = dy / numDashes;
            var flag = true;
            for (var i = 0; i < numDashes; ++i) {
                if (flag) {
                    ctx.moveTo(x1, y1);
                }
                else {
                    ctx.lineTo(x1, y1);
                }
                flag = !flag;
                x1 += dx;
                y1 += dy;
            }
            ctx.lineTo(x2, y2);
        };
    }
);

/**
 * 直线
 * @module zrender/shape/Line
 * @author Kener (@Kener-林峰, linzhifeng@baidu.com)
 * @example
 *   var Line = require('zrender/shape/Line');
 *   var shape = new Line({
 *       style: {
 *           xStart: 0,
 *           yStart: 0,
 *           xEnd: 100,
 *           yEnd: 100,
 *           strokeColor: '#000',
 *           lineWidth: 10
 *       }
 *   });
 *   zr.addShape(line);
 */
/**
 * @typedef {Object} ILineStyle
 * @property {number} xStart 起点x坐标
 * @property {number} yStart 起点y坐标
 * @property {number} xEnd 终止点x坐标
 * @property {number} yEnd 终止点y坐标
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */
define(
    'zrender/shape/Line',['require','./Base','./util/dashedLineTo','../tool/util'],function (require) {
        var Base = require('./Base');
        var dashedLineTo = require('./util/dashedLineTo');
        
        /**
         * @alias module:zrender/shape/Line
         * @param {Object} options
         * @constructor
         * @extends module:zrender/shape/Base
         */
        var Line = function (options) {
            this.brushTypeOnly = 'stroke';  // 线条只能描边，填充后果自负
            this.textPosition = 'end';
            Base.call(this, options);

            /**
             * 直线绘制样式
             * @name module:zrender/shape/Line#style
             * @type {module:zrender/shape/Line~ILineStyle}
             */
            /**
             * 直线高亮绘制样式
             * @name module:zrender/shape/Line#highlightStyle
             * @type {module:zrender/shape/Line~ILineStyle}
             */
        };

        Line.prototype =  {
            type: 'line',

            /**
             * 创建线条路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Line~ILineStyle} style
             */
            buildPath : function (ctx, style) {
                if (!style.lineType || style.lineType == 'solid') {
                    // 默认为实线
                    ctx.moveTo(style.xStart, style.yStart);
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = (style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    dashedLineTo(
                        ctx,
                        style.xStart, style.yStart,
                        style.xEnd, style.yEnd,
                        dashLength
                    );
                }
            },

            /**
             * 计算返回线条的包围盒矩形
             * @param {module:zrender/shape/Line~ILineStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth = style.lineWidth || 1;
                style.__rect = {
                    x : Math.min(style.xStart, style.xEnd) - lineWidth,
                    y : Math.min(style.yStart, style.yEnd) - lineWidth,
                    width : Math.abs(style.xStart - style.xEnd)
                            + lineWidth,
                    height : Math.abs(style.yStart - style.yEnd)
                             + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Line, Base);
        return Line;
    }
);

define('bkgraph/shape/LabelLine',['require','zrender/shape/Base','zrender/shape/Line','zrender/tool/util'],function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');

    var LabelLine = function (opts) {
        ShapeBase.call(this, opts);
    }

    LabelLine.prototype.type = 'labelline';

    LabelLine.prototype.brush = function (ctx, isHighlight) {
        var style = this.style;

        if (isHighlight) {
            // 根据style扩展默认高亮样式
            style = this.getHighlightStyle(
                style,
                this.highlightStyle || {},
                this.brushTypeOnly
            );
        }

        ctx.save();
        
        this.doClip(ctx);

        this.setContext(ctx, style);
        // 设置transform
        this.setTransform(ctx);

        ctx.beginPath();
        ctx.moveTo(style.xStart, style.yStart);
        ctx.lineTo(style.xEnd, style.yEnd);
        ctx.stroke();

        // 画Label圆
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 10;
        if (cx == null) {
            cx = (style.xStart + style.xEnd) / 2;
            cy = (style.yStart + style.yEnd) / 2;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 画Label标签
        var text = style.text;
        var textPadding = style.textPadding;
        if (textPadding == null) { textPadding = 5; }

        ctx.font = style.textFont;
        var angle = Math.atan2(style.yEnd - style.yStart, style.xEnd - style.xStart);
        angle = Math.abs(angle);
        var x = cx;
        var y = cy;

        var width = ctx.measureText(text).width;
        var height = ctx.measureText('国').width;
        if (angle < 0.2 || angle > 2.94) {
            y -= r + textPadding;
            x -= width / 2;
            ctx.textBaseline = 'bottom';
            // 顺便保存rect
            this.__rect = {
                x: Math.min(x, cx - r * 2),
                y: y - height,
                width: Math.max(width, r * 4),
                height: height + textPadding + r * 4
            };
        } else {
            x += r + textPadding;
            ctx.textBaseline = 'middle';
            // 顺便保存rect
            this.__rect = {
                x: cx - r * 2,
                y: cy - Math.max(r * 2, height / 2),
                width: width + r * 4 + textPadding,
                height: Math.max(height, r * 4)
            };
        }
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    LabelLine.prototype.getRect = function (style) {
        return this.__rect;
    }

    LabelLine.prototype.isCover = function (x, y) {
        var originPos = this.getTansform(x, y);
        x = originPos[0];
        y = originPos[1];
        
        var rect = this.getRect(this.style);
        if (!rect) {
            return false;
        }
        return x >= rect.x
            && x <= (rect.x + rect.width)
            && y >= rect.y
            && y <= (rect.y + rect.height);
    }

    zrUtil.inherits(LabelLine, ShapeBase);

    return LabelLine;
});
define('bkgraph/util/util',['require'],function (require) {
    
    var supportCanvas = document.createElement('canvas').getContext;
    
    var util = {
        indexOf: function (array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        },

        bind: function (func, context) {
            if (func.bind) {
                return func.bind(context);
            }
            else {
                return function () {
                    func.apply(context, arguments);
                }
            }
        },

        addEventListener: function (el, name, func, useCapture) {
            if (window.addEventListener) {
                el.addEventListener(name, func, useCapture);
            }
            else {
                el.attachEvent('on' + name, func);
            }
        },

        removeEventListener: function (el, name, func, useCapture) {
            if (window.removeEventListener) {
                el.removeEventListener(name, func, useCapture);
            }
            else {
                el.detachEvent('on' + name, func);
            }
        },

        getStyle: function (el, name) {
            var style;
            if (window.getComputedStyle) {
                style = window.getComputedStyle(el, null);
            }
            else if (document.documentElement.currentStyle) {
                style = el.currentStyle;
            }
            if (name) {
                return style[name];
            }
            else {
                return style;
            }
        },

        addClass: function (el, className) {
            if (el.classList) {
                el.classList.add(className);
            }
            else {
                if (el.className.indexOf(className) < 0) {
                    el.className += ' ' + className;
                }
            }
        },

        removeClass: function (el, className) {
            if (el.classList) {
                el.classList.remove(className);
            }
            else {
                el.className.replace(className, '');
            }
        },

        hasClass: function (el, className) {
            if (el.classList) {
                return el.classList.contains(className);
            }
            else {
                return el.className.indexOf(className) >= 0;
            }
        },

        debounce: function (func, wait) {
            var timeout;

            return function () {
                var context = this, args = arguments;
                var later = function () {
                    timeout = null;
                    func.apply(context, args);
                }
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            }
        },

        truncate: function (str, len, tail) {
            if (str.length > len) {
                tail = tail == null ? '…' : tail;
                return str.substring(0, len - tail.length) + tail;
            }
            return str;
        },

        trim: function (str) {
            return str.replace(/^\s+|\s+$/g, '');
        },

        getHeight: function (el) {
            var rect = el.getBoundingClientRect();
            return rect.height;
        },

        getWidth: function (el) {
            var rect = el.getBoundingClientRect();
            return rect.width;
        },

        supportCanvas: function () {
            return supportCanvas;
        }
    }

    return util;
});
define('bkgraph/util/intersect',['require','zrender/tool/vector','zrender/tool/curve'],function (require) {

    var vec2 =  require('zrender/tool/vector');
    var curveTool = require('zrender/tool/curve');

    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();

    function lineXAtY(x0, y0, x1, y1, y) {
        var t = (y - y0) / (y1 - y0);
        if (t > 1 || t < 0) {
            return -Infinity;
        }
        return t * (x1 - x0) + x0;
    }

    function lineYAtX(x0, y0, x1, y1, x) {
        var t = (x - x0) / (x1 - x0);
        if (t > 1 || t < 0) {
            return -Infinity;
        }
        return t * (y1 - y0) + y0;
    }

    var t = [];
    function curveXAtY(x0, y0, x1, y1, x2, y2, y) {
        var n = curveTool.quadraticRootAt(y0, y1, y2, y, t);
        if (n === 0) {
            return -Infinity;
        }
        return curveTool.quadraticAt(x0, x1, x2, t[0]);
    }

    function curveYAtX(x0, y0, x1, y1, x2, y2, x) {
        var n = curveTool.quadraticRootAt(x0, x1, x2, x, t);
        if (n === 0) {
            return -Infinity;
        }
        return curveTool.quadraticAt(y0, y1, y2, t[0]);
    }

    var lineRect = function (line, rect, out) {
        var x0 = line.xStart;
        var y0 = line.yStart;
        var x1 = line.xEnd;
        var y1 = line.yEnd;

        // Intersect with top
        var x = lineXAtY(x0, y0, x1, y1, rect.y);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y;
            return 'top';
        }
        // Intersect with left
        var y = lineYAtX(x0, y0, x1, y1, rect.x);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x;
            out[1] = y;
            return 'left';
        }
        // Intersect with bottom
        var x = lineXAtY(x0, y0, x1, y1, rect.y + rect.height);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y + rect.height;
            return 'bottom';
        }
        // Intersect with right
        var y = lineYAtX(x0, y0, x1, y1, rect.x + rect.width);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x + rect.width;
            out[1] = y;
            return 'right';
        }
    };

    var curveRect = function (curve, rect, out) {
        var x0 = curve.xStart;
        var y0 = curve.yStart;
        var x1 = curve.cpX1;
        var y1 = curve.cpY1;
        var x2 = curve.xEnd;
        var y2 = curve.yEnd;

        // Intersect with top
        var x = curveXAtY(x0, y0, x1, y1, x2, y2, rect.y);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y;
            return 'top';
        }
        // Intersect with left
        var y = curveYAtX(x0, y0, x1, y1, x2, y2, rect.x);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x;
            out[1] = y;
            return 'left';
        }
        // Intersect with bottom
        var x = curveXAtY(x0, y0, x1, y1, x2, y2, rect.y + rect.height);
        if (x >= rect.x && x <= rect.x + rect.width) {
            out[0] = x;
            out[1] = rect.y + rect.height;
            return 'bottom';
        }
        // Intersect with right
        var y = curveYAtX(x0, y0, x1, y1, x2, y2, rect.x + rect.width);
        if (y >= rect.y && y <= rect.y + rect.height) {
            out[0] = rect.x + rect.width;
            out[1] = y;
            return 'right';
        }
    }

    return {
        lineRect: lineRect,

        curveRect: curveRect
    }
});
define('bkgraph/entity/Edge',['require','./Entity','zrender/Group','zrender/tool/util','../shape/LabelLine','../util/util','../util/intersect','zrender/tool/vector'],function (require) {

    var Entity = require('./Entity');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var LabelLineShape = require('../shape/LabelLine');

    var util = require('../util/util');
    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');
    var v = vec2.create();
    var v1 = vec2.create();
    var v2 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    var EdgeEntity = function (opts) {
        
        Entity.call(this);

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this.style = {
            color: '#0e90fe',
            labelColor: '#0e90fe'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            labelColor: '#f9dd05'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        var self = this;
        this.el = new LabelLineShape({
            style: {
                lineWidth: 1,
                opacity: this.style.opacity,
                color: this.style.color,
                strokeColor: this.style.color,
                text: util.truncate(this.label, 6),
                textFont: '12px 微软雅黑',
                textPadding: 5
            },
            z: 0,
            zlevel: 0,
            clickable: true,
            onclick: function () {
                self.dispatch('click')
            },
            onmouseover: function () {
                self.dispatch('mouseover');
            },
            onmouseout: function () {
                self.dispatch('mouseout');
            }
        });

    };

    EdgeEntity.prototype.initialize = function (zr) {
        this.update(zr);
    };

    EdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._computeLinePoints(v1, v2);
            this._setLinePoints(v1, v2);
        }
        this.el.modSelf();
    };

    EdgeEntity.prototype.highlight = function () {
        this.el.style.color = this.highlightStyle.color;
        this.el.style.strokeColor = this.highlightStyle.color;
        this.el.zlevel = 3;
        this.el.modSelf();

        this._isHighlight = true;
    };

    EdgeEntity.prototype.lowlight = function () {
        this.el.style.color = this.style.color;
        this.el.style.strokeColor = this.style.color;
        this.el.zlevel = 0;
        this.el.style.opacity = 0.7;

        this.el.modSelf();

        this._isHighlight = false;
    };

    EdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        this._computeLinePoints(v1, v2);
        var self = this;
        this.addAnimation('length', zr.animation.animate(this.el.style))
            .when(0, {
                xStart: v1[0],
                yStart: v1[1],
                xEnd: v1[0],
                yEnd: v1[1]
            })
            .when(time || 1000, {
                xStart: v1[0],
                yStart: v1[1],
                xEnd: v2[0],
                yEnd: v2[1]
            })
            .during(function () {
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(cb)
            .start();
    };

    EdgeEntity.prototype.highlightLabel = function () {
        if (!this._isHighlight) {
            this.el.style.color = this.highlightStyle.color;
        }
        // 显示全文
        this.el.style.text = this.label;
        this.el.modSelf();
    };
    EdgeEntity.prototype.lowlightLabel = function () {
        if (!this._isHighlight) {
            this.el.style.color = this.style.color;
        }
        // 隐藏多余文字
        this.el.style.text = util.truncate(this.label, 6);
        this.el.modSelf();
    };

    EdgeEntity.prototype.animateTextPadding = function (zr, time, textPadding, cb) {
        var self = this;
        this.stopAnimation('textPadding');
        this.addAnimation('textPadding', zr.animation.animate(this.el.style))
            .when(time, {
                textPadding: textPadding
            })
            .during(function () {
                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(cb)
            .start('ElasticOut');
    };

    EdgeEntity.prototype._computeLinePoints = function (v1, v2) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var p1 = sourceEntity.el.position;
        var p2 = targetEntity.el.position;

        // vec2.sub(v, p1, p2);
        // vec2.normalize(v, v);

        // vec2.scaleAndAdd(v1, p1, v, -sourceEntity.radius);
        // vec2.scaleAndAdd(v2, p2, v, targetEntity.radius);
        
        vec2.copy(v1, p1);
        vec2.copy(v2, p2);

        var line = this.el;
    }

    EdgeEntity.prototype._setLinePoints = function (v1, v2) {
        var line = this.el;
        line.style.xStart = v1[0];
        line.style.yStart = v1[1];
        line.style.xEnd = v2[0];
        line.style.yEnd = v2[1];
        line.style.cx = (v1[0] + v2[0]) / 2;
        line.style.cy = (v1[1] + v2[1]) / 2;
        line.style.r = (
            this.sourceEntity.radius + this.targetEntity.radius
        ) / 20 + 3;
    }

    EdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.lineRect(this.el.style, rect, out);
    }

    EdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.el.style;
        vec2.set(v1, style.xEnd, style.yEnd);
        vec2.set(v2, style.xStart, style.yStart);

        vec2.min(min, v1, v2);
        vec2.max(max, v1, v2);
        return !(max[0] < rect.x || max[1] < rect.y || min[0] > (rect.x + rect.width) || min[1] > (rect.y + rect.height));
    }

    zrUtil.inherits(EdgeEntity, Entity);

    return EdgeEntity;
});
/**
 * 贝塞尔曲线
 * @module zrender/shape/BezierCurve
 * @author Neil (杨骥, yangji01@baidu.com)
 * @example
 *     var BezierCurve = require('zrender/shape/BezierCurve');
 *     var shape = new BezierCurve({
 *         style: {
 *             xStart: 0,
 *             yStart: 0,
 *             cpX1: 100,
 *             cpY1: 0,
 *             cpX2: 0,
 *             cpY2: 100,
 *             xEnd: 100,
 *             yEnd: 100,
 *             strokeColor: 'red'
 *         }
 *     });
 *     zr.addShape(shape);
 */

/**
 * @typedef {Object} IBezierCurveStyle
 * @property {number} xStart 起点x坐标
 * @property {number} yStart 起点y坐标
 * @property {number} cpX1 第一个控制点x坐标
 * @property {number} cpY1 第一个控制点y坐标
 * @property {number} [cpX2] 第二个控制点x坐标，如果不给则为二次贝塞尔曲线
 * @property {number} [cpY2] 第二个控制点y坐标，如果不给则为二次贝塞尔曲线
 * @property {number} xEnd 终止点x坐标
 * @property {number} yEnd 终止点y坐标
 * @property {string} [strokeColor='#000000'] 描边颜色
 * @property {string} [lineCape='butt'] 线帽样式，可以是 butt, round, square
 * @property {number} [lineWidth=1] 描边宽度
 * @property {number} [opacity=1] 绘制透明度
 * @property {number} [shadowBlur=0] 阴影模糊度，大于0有效
 * @property {string} [shadowColor='#000000'] 阴影颜色
 * @property {number} [shadowOffsetX=0] 阴影横向偏移
 * @property {number} [shadowOffsetY=0] 阴影纵向偏移
 * @property {string} [text] 图形中的附加文本
 * @property {string} [textColor='#000000'] 文本颜色
 * @property {string} [textFont] 附加文本样式，eg:'bold 18px verdana'
 * @property {string} [textPosition='end'] 附加文本位置, 可以是 inside, left, right, top, bottom
 * @property {string} [textAlign] 默认根据textPosition自动设置，附加文本水平对齐。
 *                                可以是start, end, left, right, center
 * @property {string} [textBaseline] 默认根据textPosition自动设置，附加文本垂直对齐。
 *                                可以是top, bottom, middle, alphabetic, hanging, ideographic
 */

define(
    'zrender/shape/BezierCurve',['require','./Base','../tool/util'],function (require) {
        

        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/BezierCurve
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var BezierCurve = function(options) {
            this.brushTypeOnly = 'stroke';  // 线条只能描边，填充后果自负
            this.textPosition = 'end';
            Base.call(this, options);
            /**
             * 贝赛尔曲线绘制样式
             * @name module:zrender/shape/BezierCurve#style
             * @type {module:zrender/shape/BezierCurve~IBezierCurveStyle}
             */
            /**
             * 贝赛尔曲线高亮绘制样式
             * @name module:zrender/shape/BezierCurve#highlightStyle
             * @type {module:zrender/shape/BezierCurve~IBezierCurveStyle}
             */
        };

        BezierCurve.prototype = {
            type: 'bezier-curve',

            /**
             * 创建贝塞尔曲线路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/BezierCurve~IBezierCurveStyle} style
             */
            buildPath : function(ctx, style) {
                ctx.moveTo(style.xStart, style.yStart);
                if (typeof style.cpX2 != 'undefined'
                    && typeof style.cpY2 != 'undefined'
                ) {
                    ctx.bezierCurveTo(
                        style.cpX1, style.cpY1,
                        style.cpX2, style.cpY2,
                        style.xEnd, style.yEnd
                    );
                }
                else {
                    ctx.quadraticCurveTo(
                        style.cpX1, style.cpY1,
                        style.xEnd, style.yEnd
                    );
                }
            },

            /**
             * 计算返回贝赛尔曲线包围盒矩形。
             * 该包围盒是直接从四个控制点计算，并非最小包围盒。
             * @param {module:zrender/shape/BezierCurve~IBezierCurveStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var _minX = Math.min(style.xStart, style.xEnd, style.cpX1);
                var _minY = Math.min(style.yStart, style.yEnd, style.cpY1);
                var _maxX = Math.max(style.xStart, style.xEnd, style.cpX1);
                var _maxY = Math.max(style.yStart, style.yEnd, style.cpY1);
                var _x2 = style.cpX2;
                var _y2 = style.cpY2;

                if (typeof _x2 != 'undefined'
                    && typeof _y2 != 'undefined'
                ) {
                    _minX = Math.min(_minX, _x2);
                    _minY = Math.min(_minY, _y2);
                    _maxX = Math.max(_maxX, _x2);
                    _maxY = Math.max(_maxY, _y2);
                }

                var lineWidth = style.lineWidth || 1;
                style.__rect = {
                    x : _minX - lineWidth,
                    y : _minY - lineWidth,
                    width : _maxX - _minX + lineWidth,
                    height : _maxY - _minY + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(BezierCurve, Base);
        return BezierCurve;
    }
);

define('bkgraph/shape/LabelCurve',['require','zrender/shape/Base','zrender/shape/Line','zrender/tool/util','zrender/tool/curve','./LabelLine'],function (require) {

    var ShapeBase = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');

    var LabelLineShape = require('./LabelLine');

    var LabelCurve = function (opts) {
        ShapeBase.call(this, opts);
    }

    LabelCurve.prototype.type = 'labelcurve';

    LabelCurve.prototype.brush = function (ctx, isHighlight) {
        var style = this.style;

        if (isHighlight) {
            // 根据style扩展默认高亮样式
            style = this.getHighlightStyle(
                style,
                this.highlightStyle || {},
                this.brushTypeOnly
            );
        }

        ctx.save();
        this.doClip(ctx);
        this.setContext(ctx, style);
        // 设置transform
        this.setTransform(ctx);

        ctx.beginPath();
        ctx.moveTo(style.xStart, style.yStart);
        ctx.quadraticCurveTo(style.cpX1, style.cpY1, style.xEnd, style.yEnd);
        ctx.stroke();

        // 画Label圆
        ctx.globalAlpha = 1;
        var cx = style.cx;
        var cy = style.cy;
        var r = style.r || 10;
        if (cx == null) {
            cx = curveTool.quadraticAt(style.xStart, style.cpX1, style.xEnd, 0.5);
            cy = curveTool.quadraticAt(style.yStart, style.cpY1, style.yEnd, 0.5);
        }
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 画Label标签
        var text = style.text;
        var textPadding = style.textPadding;
        if (textPadding == null) { textPadding = 5; }

        ctx.font = style.textFont;
        var x = cx + r + textPadding;
        var y = cy;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);

        var width = ctx.measureText(text).width;
        var height = ctx.measureText('国').width;
        // 顺便保存rect
        this.__rect = {
            x: cx - r * 2,
            y: cy - Math.max(r * 2, height / 2),
            width: width + r * 4 + textPadding,
            height: Math.max(height, r * 4)
        };

        ctx.restore();
    }

    LabelCurve.prototype.getRect = LabelLineShape.prototype.getRect;

    LabelCurve.prototype.isCover = LabelLineShape.prototype.isCover;

    zrUtil.inherits(LabelCurve, ShapeBase);

    return LabelCurve;
});
define('bkgraph/entity/ExtraEdge',['require','./Entity','zrender/shape/BezierCurve','zrender/Group','zrender/tool/util','zrender/tool/curve','../shape/LabelCurve','./Edge','../util/util','../util/intersect','zrender/tool/vector'],function (require) {

    var Entity = require('./Entity');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    var Group = require('zrender/Group');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');
    var LabelCurveShape = require('../shape/LabelCurve');
    var EdgeEntity = require('./Edge');

    var util = require('../util/util');
    var intersect = require('../util/intersect');

    var vec2 = require('zrender/tool/vector');
    var v1 = vec2.create();
    var v2 = vec2.create();
    var v3 = vec2.create();
    var min = vec2.create();
    var max = vec2.create();

    function lerp(x0, x1, t) {
        return x0 * (1 - t) + x1 * t;
    }

    var ExtraEdgeEntity = function (opts) {
        
        Entity.call(this);

        // Configs
        opts = opts || {};

        this.sourceEntity = opts.sourceEntity || null;

        this.targetEntity = opts.targetEntity || null;

        this.label = opts.label || '';

        this.style = {
            color: '#0e90fe',
            opacity: 0.15,
            labelColor: 'white'
        };
        this.highlightStyle = {
            color: '#f9dd05',
            opacity: 1,
            labelColor: '#f9dd05'
        };
        if (opts.style) {
            zrUtil.merge(this.style, opts.style)
        }
        if (opts.highlightStyle) {
            zrUtil.merge(this.highlightStyle, opts.highlightStyle)
        }

        var self = this;
        this.el = new LabelCurveShape({
            style: {
                xStart: 0,
                yStart: 0,
                xEnd: 0,
                yEnd: 0,
                cpX1: 0,
                cpY1: 0,
                lineWidth: 1,
                opacity: this.highlightStyle.opacity,
                color: this.highlightStyle.color,
                strokeColor: this.highlightStyle.color,
                text: util.truncate(this.label, 10),
                textFont: '12px 微软雅黑',
                textPadding: 5
            },
            z: 0,
            zlevel: 0,
            clickable: true,
            onclick: function () {
                self.dispatch('click')
            },
            onmouseover: function () {
                self.dispatch('mouseover');
            },
            onmouseout: function () {
                self.dispatch('mouseout');
            }
        });
    };

    ExtraEdgeEntity.prototype.hidden = true;

    ExtraEdgeEntity.prototype.initialize = function (zr) {
        this.update();
    };

    ExtraEdgeEntity.prototype.update = function () {
        if (this.sourceEntity && this.targetEntity) {
            this._setCurvePoints(
                this.sourceEntity.el.position,
                this.targetEntity.el.position,
                1,
                true
            );
        }
        this.el.modSelf();
    };

    ExtraEdgeEntity.prototype.highlight = function () {
        this.hidden = false;
        this.el.zlevel = 3;
        this._isHighlight = true;
    };

    ExtraEdgeEntity.prototype.lowlight = function () {
        this.hidden = true;
        this.el.zlevel = 0;
        this._isHighlight = false;
    };

    ExtraEdgeEntity.prototype.animateLength = function (zr, time, delay, fromEntity, cb) {
        var inv = 1;
        if (fromEntity === this.targetEntity) {
            vec2.copy(v1, this.targetEntity.el.position);
            vec2.copy(v2, this.sourceEntity.el.position);
            inv = -1;
        } else {
            vec2.copy(v1, this.sourceEntity.el.position);
            vec2.copy(v2, this.targetEntity.el.position);
        }
        var self = this;
        var obj = {t: 0};
        var curve = this.el;
        this._setCurvePoints(v1, v2, inv);

        var x0 = curve.style.xStart;
        var x1 = curve.style.cpX1;
        var x2 = curve.style.xEnd;
        var y0 = curve.style.yStart;
        var y1 = curve.style.cpY1;
        var y2 = curve.style.yEnd;
        
        this.addAnimation('length', zr.animation.animate(obj)
            .when(time || 1000, {
                t: 1
            })
            .during(function (target, t) {
                // Subdivide
                var x01 = lerp(x0, x1, t);
                var x12 = lerp(x1, x2, t);
                var x012 = lerp(x01, x12, t);
                var y01 = lerp(y0, y1, t);
                var y12 = lerp(y1, y2, t);
                var y012 = lerp(y01, y12, t);

                curve.style.cpX1 = x01;
                curve.style.cpY1 = y01;
                curve.style.xEnd = x012;
                curve.style.yEnd = y012;

                self.el.modSelf();
                zr.refreshNextFrame();
            })
            .done(function () {
                cb && cb();
            })
            .start()
        );
    }

    ExtraEdgeEntity.prototype.highlightLabel = EdgeEntity.prototype.highlightLabel;
    
    ExtraEdgeEntity.prototype.lowlightLabel = EdgeEntity.prototype.highlightLabel;

    ExtraEdgeEntity.prototype.animateTextPadding = EdgeEntity.prototype.animateTextPadding

    ExtraEdgeEntity.prototype._setCurvePoints = function (p1, p2, inv) {
        var sourceEntity = this.sourceEntity;
        var targetEntity = this.targetEntity;

        var curve = this.el;
        curve.style.xStart = p1[0];
        curve.style.yStart = p1[1];
        curve.style.xEnd = p2[0];
        curve.style.yEnd = p2[1];
        curve.style.cpX1 = (p1[0] + p2[0]) / 2 - inv * (p2[1] - p1[1]) / 4;
        curve.style.cpY1 = (p1[1] + p2[1]) / 2 - inv * (p1[0] - p2[0]) / 4;
        
        curve.style.cx = curveTool.quadraticAt(
            curve.style.xStart, curve.style.cpX1, curve.style.xEnd, 0.5
        );
        curve.style.cy = curveTool.quadraticAt(
            curve.style.yStart, curve.style.cpY1, curve.style.yEnd, 0.5
        );

        inv = inv || 1;
    }

    ExtraEdgeEntity.prototype.intersectRect = function (rect, out) {

        return intersect.curveRect(this.el.style, rect, out);
    }

    ExtraEdgeEntity.prototype.isInsideRect = function (rect) {
        var style = this.el.style;
        vec2.set(v2, style.cpX1, style.cpY1);
        vec2.set(v3, style.xEnd, style.yEnd);
        vec2.set(min, style.xStart, style.yStart);
        vec2.set(max, style.xStart, style.yStart);

        vec2.min(min, min, v2);
        vec2.min(min, min, v3);
        vec2.max(max, max, v2);
        vec2.max(max, max, v3);
        return !(max[0] < rect.x || max[1] < rect.y || min[0] > (rect.x + rect.width) || min[1] > (rect.y + rect.height));
    }

    zrUtil.inherits(ExtraEdgeEntity, Entity);

    return ExtraEdgeEntity;
});
/**
 * 屏外提示形状
 */
define('bkgraph/entity/OutTip',['require','./Entity','zrender/tool/util','zrender/shape/Rectangle'],function (require) {

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
define('bkgraph/shape/CurveBundle',['require','zrender/shape/Base','zrender/tool/util'],function (require) {

    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    var CurveBundle = function (opts) {
        Base.call(this, opts);
    }

    CurveBundle.prototype = {

        type: 'curvebundle',

        brushTypeOnly: 'stroke',

        buildPath: function (ctx, style) {
            for (var i = 0; i < style.segments.length; i++) {
                var points = style.segments[i];
                ctx.moveTo(points[0], points[1]);
                ctx.quadraticCurveTo(
                    points[2], points[3],
                    points[4], points[5]
                );
            }
        }
    };

    zrUtil.inherits(CurveBundle, Base);

    return CurveBundle;
});
define('bkgraph/entity/ExtraEdgeBundle',['require','./Entity','zrender/tool/curve','zrender/tool/util','../shape/CurveBundle','zrender/tool/vector'],function (require) {

    var Entity = require('./Entity');
    var curveTool = require('zrender/tool/curve');
    var zrUtil = require('zrender/tool/util');

    var CurveBundleShape = require('../shape/CurveBundle');

    var vec2 = require('zrender/tool/vector');

    var ExtraEdgeBundleEntity = function (opts) {
        opts = opts || {};

        Entity.call(this);

        this.el = new CurveBundleShape({
            style: {
                segments: [],
                lineWidth: 1
            },
            hoverable: false
        });

        this.style = {
            color: '#0e90fe',
            opacity: 0.15
        }
        if (opts.style) {
            zrUtil.merge(this.style, opts.style);
        }

        this.edges = [];
    }

    ExtraEdgeBundleEntity.prototype.initialize = function (zr) {
        this.el.style.strokeColor = this.style.color;
        this.el.style.opacity = this.style.opacity;

        this.update(zr);
    }

    ExtraEdgeBundleEntity.prototype.update = function (zr) {

        var len = 0;
        for (var i = 0; i < this.edges.length; i++) {
            var e = this.edges[i];
            var sourceEntity = e.source.entity;
            var targetEntity = e.target.entity;

            var segs = this.el.style.segments;
            var seg = segs[i];
            if (!seg) {
                seg = segs[i] = [];
            }
            if (sourceEntity && targetEntity) {
                this._calCurvePoints(
                    sourceEntity.el.position,
                    targetEntity.el.position,
                    seg
                );

                len++;
            }
        }

        this.el.style.segments.length = len;

        this.el.modSelf();
    }

    ExtraEdgeBundleEntity.prototype.addEdge = function (e) {
        var sourceEntity = e.node1.entity;
        var targetEntity = e.node2.entity;

        var seg = [];
        if (sourceEntity && targetEntity) {
            this._calCurvePoints(
                sourceEntity.el.position,
                targetEntity.el.position,
                seg
            );

            this.edges.push(e);
            this.el.style.segments.push(seg);

            this.el.modSelf();
        }
    }

    ExtraEdgeBundleEntity.prototype.removeEdge = function (e) {
        var idx = this.edges.indexOf(e);
        if (idx > 0) {
            this.edges.splice(idx, 1);
            this.el.style.segments.splice(idx, 1);
        }
    }

    ExtraEdgeBundleEntity.prototype._calCurvePoints = function (p1, p2, out) {
        out[0] = p1[0];
        out[1] = p1[1];
        out[2] = (p1[0] + p2[0]) / 2 - (p2[1] - p1[1]) / 4;
        out[3] = (p1[1] + p2[1]) / 2 - (p1[0] - p2[0]) / 4;
        out[4] = p2[0];
        out[5] = p2[1];
    }


    zrUtil.inherits(ExtraEdgeBundleEntity, Entity);

    return ExtraEdgeBundleEntity;
});
// Parallax
define('bkgraph/util/Parallax',['require'],function(require) {

    function Parallax(dom) {
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom)
        }
        var current = dom.firstChild;
        var bgLayers = [];

        while (current) {
            if (current.className && current.className.indexOf('bkg-bg-layer') >= 0) {
                bgLayers.push(current);
            }
            current = current.nextSibling;
        }
        for (var i = 0; i < bgLayers.length; i++) {
            var bgLayer = bgLayers[i];
            bgLayer._offsetX = bgLayer.clientWidth - dom.clientWidth;
            bgLayer._offsetY = bgLayer.clientWidth - dom.clientWidth;
        }
        this._root = dom;
        this._bgLayers = bgLayers;

        this._offsetX = 0;
        this._offsetY = 0;
    }

    Parallax.prototype.scaleBase = 0.5;
    Parallax.prototype.scaleStep = 0.5;

    Parallax.prototype.setOffset = function (x, y) {
        this._offsetX = -x;
        this._offsetY = -y;
        this.moveTo(0, 0);
    }

    Parallax.prototype.moveTo = function(x, y) {
        var scale = this.scaleBase;
        for (var i = 0; i < this._bgLayers.length; i++) {
            var bgLayer = this._bgLayers[i];
            var left = x * scale + this._offsetX;
            var top = y * scale + this._offsetY;
            scale *= this.scaleStep;

            left = -Math.max(Math.min(-left, bgLayer._offsetX), 0);
            top = -Math.max(Math.min(-top, bgLayer._offsetY), 0);

            // PENDING
            // Use translate3d to create layer
            var transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px, 0px)';
            bgLayer.style.WebkitTransform = transform;
            bgLayer.style.MozTransform = transform;
            bgLayer.style.transform = transform;
            // bgLayer.style.left = left + 'px';
            // bgLayer.style.top = top + 'px';
        }
    }

    return Parallax;
});
define ('bkgraph/component/Cycle',['require'],function (require) {

    var Cycle = function () {

        this.nodes = [];
    }

    Cycle.findFromGraph = function (graph, maxCycleDepth) {

        for (var i = 0; i < graph.nodes.length; i++) {
            graph.nodes[i].__visited = false;
            graph.nodes[i].__ignore = false;
        }

        var stack = [];
        var cycles = [];

        var depthFirstTraverse = function (current, mainNode, depth) {
            if (depth + 1 > maxCycleDepth) {
                return;
            }
            stack.push(current);
            for (var i = 0; i < current.edges.length; i++) {
                var e = current.edges[i];
                var other = e.node1 === current ? e.node2 : e.node1;
                // 忽略已经完成查找的节点
                if (other.__ignore) {
                    continue;
                }
                if (other.__visited) {
                    if (other === mainNode && stack.length > 2 && stack.length <= maxCycleDepth) {
                        // Have a cycle
                        var cycle = new Cycle();
                        cycle.nodes = stack.slice();
                        cycles.push(cycle);
                    }
                } else {
                    other.__visited = true;
                    depthFirstTraverse(other, mainNode, depth + 1);
                }
            }
            stack.pop();
        }

        for (var i = 0; i < graph.nodes.length; i++) {
            for (var j = 0; j < graph.nodes.length; j++) {
                graph.nodes[j].__visited = false;
            }
            stack = [];
            graph.nodes[i].__visited = true;
            depthFirstTraverse(graph.nodes[i], graph.nodes[i], 0);
            graph.nodes[i].__ignore = true;
        }

        return cycles;
    }

    return Cycle;
});
define('bkgraph/component/GraphMain',['require','zrender','echarts/layout/Force','echarts/data/Graph','echarts/data/Tree','echarts/layout/Tree','zrender/tool/util','zrender/Group','./Component','zrender/tool/vector','../entity/Node','../entity/Edge','../entity/ExtraEdge','../entity/OutTip','../entity/ExtraEdgeBundle','../util/Parallax','zrender/shape/Circle','./Cycle','../util/util','../util/intersect'],function (require) {

    var zrender = require('zrender');
    var ForceLayout = require('echarts/layout/Force');
    var Graph = require('echarts/data/Graph');
    var Tree = require('echarts/data/Tree');
    var TreeLayout = require('echarts/layout/Tree');
    var zrUtil = require('zrender/tool/util');
    var Group = require('zrender/Group');
    var Component = require('./Component');
    var vec2 = require('zrender/tool/vector');

    var NodeEntity = require('../entity/Node');
    var EdgeEntity = require('../entity/Edge');
    var ExtraEdgeEntity = require('../entity/ExtraEdge');
    var OutTipEntity = require('../entity/OutTip');
    var ExtraEdgeBundleEntity = require('../entity/ExtraEdgeBundle');

    var Parallax = require('../util/Parallax');

    var CircleShape = require('zrender/shape/Circle');

    var Cycle = require('./Cycle');

    var util = require('../util/util');
    var intersect = require('../util/intersect');

    var EPSILON = 1e-2;
    var isAroundZero = function (val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }

    var GraphMain = function () {

        Component.call(this);

        this.minRadius = 30;
        this.maxRadius = 40;

        this.minRelationWeight = 30;
        this.maxRelationWeight = 40;

        this._kgraph = null;
        
        this._zr = null;

        // Graph for rendering
        this._graph = null;

        // Graph for layouting
        this._graphLayout = null;

        this._layouting = false;

        this._animating = false;

        this._root = null;

        this._mainNode = null;

        this._lastClickNode = null;

        this._lastHoverNode = null;

        // 当前关注的节点, 可能是点击，也可能是搜索定位
        this._activeNode = null;

        this._nodeEntityCount = 0;
        this._baseEntityCount = 0;

        this._firstShowEntityDetail = true;

        this._parallax = null;
    };

    GraphMain.prototype.type = 'GRAPH';

    GraphMain.prototype.initialize = function (kg) {
        this._kgraph = kg;

        var el = this.el;
        this.el.className = 'bkg-graph';

        el.style.width = kg.getWidth() + 'px';
        el.style.height = kg.getHeight() + 'px';

        this._initBG();
        this._initZR();
    };

    GraphMain.prototype._initZR = function () {
        $zrContainer = document.createElement('div');
        $zrContainer.className = 'bkg-graph-zr';

        this.el.appendChild($zrContainer);

        this._zr = zrender.init($zrContainer);

        var zrRefresh = this._zr.painter.refresh;
        var self = this;
        var zr = this._zr;

        this._min = [Infinity, Infinity];
        this._max = [zr.getWidth() / 2, zr.getHeight() / 2];
        var x0 = 0, y0 = 0, sx0 = 0, sy0 = 0;
        zr.painter.refresh = function () {
            self._culling();
            // 同步所有层的位置
            var layers = zr.painter.getLayers();
            var layer0 = layers[0];
            if (layer0) {
                var position = layer0.position;
                var scale = layer0.scale;
                position[0] = Math.max(-self._max[0] * scale[0] + zr.getWidth() - 500, position[0]);
                position[1] = Math.max(-self._max[1] * scale[1] + zr.getHeight() - 300, position[1]);
                position[0] = Math.min(-self._min[0] * scale[0] + 300, position[0]);
                position[1] = Math.min(-self._min[1] * scale[1] + 300, position[1]);

                if (
                    isNotAroundZero(position[0] - x0) || isNotAroundZero(position[1] - y0)
                    || isNotAroundZero(scale[0] - sx0) || isNotAroundZero(scale[1] - sy0)
                ) {
                    for (var z in layers) {
                        if (z !== 'hover') {
                            vec2.copy(layers[z].position, layers[0].position);
                            vec2.copy(layers[z].scale, layers[0].scale);
                            layers[z].dirty = true;   
                        }
                    }

                    self._syncOutTipEntities();
                }
                x0 = position[0];
                y0 = position[1];
                sx0 = scale[0];
                sy0 = scale[1];

                if (self._parallax) {
                    self._parallax.moveTo(x0 / sx0, y0 / sy0);
                }
            }

            zrRefresh.apply(this, arguments);
        }

        // 不显示hover层
        var layers = zr.painter.getLayers();
        for (var z in layers) {
            if (z === 'hover') {
                layers[z].dom.parentNode.removeChild(layers[z].dom);
            }
        }
    }

    GraphMain.prototype._initBG = function () {

        var $bg = document.createElement('div');
        $bg.className = 'bkg-graph-bg';

        this.el.appendChild($bg);

        // $bg.innerHTML = '<div class="bkg-bg-layer"></div>';
        // this._parallax = new Parallax($bg);

        // this._parallax.scaleBase = 0.35;
        // this._parallax.scaleStep = 0.5;

        // this._parallax.setOffset(2000, 2000);
    }

    GraphMain.prototype.resize = function (w, h) {

        this.el.style.width = w + 'px';
        this.el.style.height = h + 'px';

        this._zr.resize();
    };

    GraphMain.prototype.setData = function (data) {
        var graph = new Graph(true);
        this._graphLayout = graph;
        var zr = this._zr;

        var cx = this._kgraph.getWidth() / 2;
        var cy = this._kgraph.getHeight() / 2;

        // var vWidth, vHeight;
        var width = zr.getWidth();
        var height = zr.getHeight();

        // 映射数据
        var max = -Infinity;
        var min = Infinity;
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            min = Math.min(min, entity.hotValue);
            max = Math.max(max, entity.hotValue);
        }
        var diff = max - min;

        var noPosition = false;
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            var n = graph.addNode(entity.ID, entity);
            var r = diff > 0 ?
                (entity.hotValue - min) * (this.maxRadius - this.minRadius) / diff + this.minRadius
                : (this.maxRadius + this.minRadius) / 2;
            if (entity.layerCounter === 0) {
                r = 70;
                this._mainNode = n;
            }
            n.layout = {
                position: entity.position,
                mass: 1,
                size: r
            };
            if (!entity.position) {
                noPosition = true;
                if (entity.layerCounter === 0) {
                    n.layout.fixed = true;
                    n.layout.position = [
                        width / 2,
                        height / 2
                    ];
                    n.position = Array.prototype.slice.call(n.layout.position);
                }
            }
        }

        max = -Infinity;
        min = Infinity;
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            min = Math.min(min, relation.relationWeight);
            max = Math.max(max, relation.relationWeight);
        }
        diff = max - min;
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            if (relation.isExtra) {
                continue;
            }
            var w = diff > 0 ? 
                (relation.relationWeight - min) / diff * (this.maxRelationWeight - this.minRelationWeight) + this.minRelationWeight
                : (this.maxRelationWeight + this.minRelationWeight) / 2;
            var e = graph.addEdge(relation.fromID, relation.toID, relation);
            e.layout = {
                // 边权重
                weight: w * 8 / Math.pow(e.node1.data.layerCounter + 1, 1)
                // weight: e.node1.data.layerCounter === 0 ? 200 : w
            };
        }

        // 加入补边
        this._graph = this._graphLayout.clone();
        this._graph.eachNode(function (n) {
            // 共用布局
            n.layout = this._graphLayout.getNodeById(n.id).layout;
        }, this);
        for (var i = 0; i < data.relations.length; i++) {
            var relation = data.relations[i];
            if (!relation.isExtra) {
                continue;
            }
            var e = this._graph.addEdge(relation.fromID, relation.toID, relation);
            e.isExtra = true;
        }

        var layer0 = this._zr.painter.getLayer(0);
        var layer1 = this._zr.painter.getLayer(1, layer0);
        var layer2 = this._zr.painter.getLayer(2, layer1);
        var layer3 = this._zr.painter.getLayer(3, layer2);

        if (noPosition) {
            this.radialTreeLayout();
        } else {
            // 平移所有节点，使得中心节点能够在屏幕中心
            var offsetX = width / 2 - this._mainNode.layout.position[0];
            var offsetY = height / 2 - this._mainNode.layout.position[1];

            this._graph.eachNode(function (n) {
                n.layout.position[0] += offsetX;
                n.layout.position[1] += offsetY;
            })
        }

        this.render();
        
        this._loadStorage();

        var circles = this._findCircles('男友,女友,好友,妻子,老婆,丈夫,老公,绯闻,暧昧,情敌,对象,干爹,真爱,夫妻,情侣,不和,私生子'.split(','));
        for (var i = 0; i < circles.length; i++) {
            this.highlightCircle(circles[i]);
        }

        // 刚打开时的展开动画
        if (util.supportCanvas()) {
            this._entryAnimation();
        }
    };

    GraphMain.prototype.render = function () {
        var zr = this._zr;
        var graph = this._graph;

        if (this._root) {
            zr.delGroup(this._root);
        }
        this._root = new Group();
        zr.addGroup(this._root);

        // 补边使用bundle优化性能, IE8不使用
        if (util.supportCanvas()) {
            this._extraEdgeBundle = new ExtraEdgeBundleEntity();
            this._extraEdgeBundle.initialize(zr);
            this._root.addChild(this._extraEdgeBundle.el);
        }

        // 所有实体都在 zlevel-1 层
        graph.eachNode(function (n) {
            if (n.data.layerCounter > 2) {
                return;
            }
            this._baseEntityCount++;
            this._createNodeEntity(n);
        }, this);

        // 所有边都在 zlevel-0 层
        graph.eachEdge(function (e) {
            if (
                e.node1.data.layerCounter > 2 ||
                e.node2.data.layerCounter > 2
            ) {
                return;
            }
            this._createEdgeEntity(e);
        }, this);

        zr.render();

        zr.modLayer(0, {
            panable: true,
            zoomable: true,
            maxZoom: 1.5,
            minZoom: 0.5
        });
    };

    /**
     * 简单的摆放成放射状
     */
    GraphMain.prototype.naiveLayout = function (mainNode) {
        graph.breadthFirstTraverse(function (n2, n1) {
            if (n1) {
                if (!n2.layout.position) {
                    var cx = n1.layout.position[0];
                    var cy = n1.layout.position[1];
                    var r = 1000 / Math.pow(n1.data.layerCounter + 1, 2);
                    n1.__count = n1.__count || 0;
                    var angle = Math.PI * 2 * n1.__count / n1.outDegree();
                    n1.__count ++;
                    if (n1.__count === n1.outDegree()) {
                        // 置零
                        n1.__count = 0;
                    }
                    n2.layout.position = [
                        Math.cos(angle) * r + cx,
                        Math.sin(angle) * r + cy
                    ];
                }
            }
        }, mainNode, 'out');
    };

    /**
     * 放射树状布局
     */
    GraphMain.prototype.radialTreeLayout = function () {
        var cx = this._zr.getWidth() / 2;
        var cy = this._zr.getHeight() / 2;
        var tree = Tree.fromGraph(this._graphLayout)[0];
        tree.traverse(function (treeNode) {
            var graphNode = this._graphLayout.getNodeById(treeNode.id);
            treeNode.layout = {
                width: graphNode.layout.size * 2,
                height: graphNode.layout.size * 2
            };
        }, this);
        var layout = new TreeLayout();
        var layerPadding = [100, 400, 200, 200, 200, 200, 200];
        layout.layerPadding = function (level) {
            return layerPadding[level] || 200;
        };
        layout.run(tree);

        var min = [Infinity, Infinity];
        var max = [-Infinity, -Infinity];
        tree.traverse(function (treeNode) {
            vec2.min(min, min, treeNode.layout.position);
            vec2.max(max, max, treeNode.layout.position);
        });
        var width = max[0] - min[0];
        var height = max[1] - min[1];
        tree.traverse(function (treeNode) {
            var graphNode = this._graphLayout.getNodeById(treeNode.id);
            var x = treeNode.layout.position[0];
            var y = treeNode.layout.position[1];
            var r = y;
            var rad = x / width * Math.PI * 2;

            graphNode.layout.position = [
                // 以中心节点为圆心
                r * Math.cos(rad) + cx,
                r * Math.sin(rad) + cy
            ];
        }, this);
    }

    /**
     * 开始力导向布局
     */
    GraphMain.prototype.startForceLayout = function (cb) {
        var graph = this._graphLayout;
        var forceLayout = new ForceLayout();
        forceLayout.center = [
            this._kgraph.getWidth() / 2,
            this._kgraph.getHeight() / 2
        ];
        // forceLayout.gravity = 0.8;
        forceLayout.scaling = 12;
        forceLayout.coolDown = 0.99;
        // forceLayout.enableAcceleration = false;
        forceLayout.maxSpeedIncrease = 100;
        // 这个真是不好使
        forceLayout.preventOverlap = true;

        graph.eachNode(function (n) {
            n.layout.mass = n.degree() * 3;
        });

        // 在边上加入顶点防止重叠实体与边发生重叠
        var edgeNodes = [];
        // graph.eachEdge(function (e) {
        //     var n = graph.addNode(e.id, e);
        //     var p = vec2.create();
        //     vec2.add(p, e.node1.layout.position, e.node2.layout.position);
        //     vec2.scale(p, p, 0.5);
        //     n.layout = {
        //         position: p,
        //         mass: 0,
        //         radius: 10
        //     };
        //     edgeNodes.push(n);
        //     n.isEdgeNode = true;
        // });
        
        forceLayout.init(graph, false);
        this._layouting = true;
        var self = this;

        forceLayout.onupdate = function () {
            for (var i = 0; i < graph.nodes.length; i++) {
                if (graph.nodes[i].layout.fixed) {
                    vec2.copy(graph.nodes[i].layout.position, graph.nodes[i].position);
                }
            }
            for (var i = 0; i < edgeNodes.length; i++) {
                var n = edgeNodes[i];
                var e = n.data;
                var p = n.layout.position;
                vec2.add(p, e.node1.layout.position, e.node2.layout.position);
                vec2.scale(p, p, 0.5);
            }
            self._updateNodePositions();   

            if (forceLayout.temperature < 0.01) {
                self.stopForceLayout();
                cb && cb.call(self);
            }
            else {
                if (self._layouting) {
                    forceLayout.step(10);
                }
            }
        }
       forceLayout.step(10);
    };

    /**
     * 停止力导向布局
     */
    GraphMain.prototype.stopForceLayout = function () {
        var graph = this._graphLayout;
        var edgeNodes = [];
        graph.eachNode(function (n) {
            if (n.isEdgeNode) {
                edgeNodes.push(n);
            }
        });
        for (var i = 0; i < edgeNodes.length; i++) {
            graph.removeNode(edgeNodes[i]);
        }

        this._layouting = false;
    }

    GraphMain.prototype.unhoverAll = function () {
        var zr = this._zr;
        var graph = this._graph;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity && n !== this._activeNode) {
                this.unhoverNode(n);
                if (n._isHighlight) {
                    n.entity.highlight(zr);
                }
            }
        }
    }

    /**
     * 低亮所有节点
     */
    GraphMain.prototype.lowlightAll = function () {
        var zr = this._zr;
        var graph = this._graph;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                this.unhoverNode(n);
                this.lowlightNode(n);
            }
            // 移除屏外提示
            if (n._outTipEntity) {
                this._root.removeChild(n._outTipEntity.el);
                n._outTipEntity = null;
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.lowlight();
            }
        }

        zr.refreshNextFrame();
    }

    /**
     * 节点移除hover特效
     */
    GraphMain.prototype.unhoverNode = function (node) {
        if (node._isHover) {
            if (util.supportCanvas()) {
                node.entity.stopActiveAnimation(this._zr);
                node.entity.animateRadius(
                    this._zr, node.layout.size, 500
                );
            } else {
                node.entity.setRadius(node.layout.size);
            }

            node.entity.lowlight();

            node._isHover = false;
        }
    }

    /**
     * 鼠标 hover 到节点上的特效
     */
    GraphMain.prototype.hoverNode = function (node) {
        if (node._isHover) {
            return;
        }

        node._isHover = true;

        // Hover 实体放大
        if (util.supportCanvas()) {
            node.entity.animateRadius(
                this._zr, node.layout.size * 1.2, 500
            );
            node.entity.startActiveAnimation(this._zr);
        } else {
            node.entity.setRadius(node.layout.size * 1.2);
        }

        node.entity.highlight();
    }

    /**
     * 低亮指定节点
     */
    GraphMain.prototype.lowlightNode = function (node) {
        if (node.entity && node._isHighlight) {
            node.entity.lowlight();
            node._isHighlight = false;
        }
    }

    /**
     * 高亮指定节点
     */
    GraphMain.prototype.highlightNode = function (node) {
        if (node.entity && !node._isHighlight) {
            node.entity.highlight();
            node._isHighlight = true;
        }
    }

    /**
     * 高亮节点与邻接节点, 点击的时候出发
     */
    GraphMain.prototype.highlightNodeAndAdjeceny = function (node) {
        if (typeof(node) === 'string') {
            node = this._graph.getNodeById(node);
        }
        var zr = this._zr;

        this.lowlightAll();

        this.hoverNode(node);
        node._isHighlight = true;

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            //中心节点不出补边
            if (node.data.layerCounter === 0 && e.isExtra) {
                continue;
            }

            var newEntity = false;
            if (!other.entity) {
                // 动态添加
                this._createNodeEntity(other);
                newEntity = true;
            }
            other.entity.highlight();

            if (!e.entity) {
                // 动态添加
                this._createEdgeEntity(e);
            }

            e.entity.highlight();
            if (newEntity && util.supportCanvas()) {
                this._growNodeAnimation(other, node, Math.random() * 500);
            }

            other._isHighlight = true;

            this._syncOutTipEntities();
        }

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    };

    /**
     * 高亮节点与主节点的关系路径
     */
    GraphMain.prototype.highlightNodeToMain = function (node) {
        if (typeof(node) === 'string') {
            node = this._graphLayout.getNodeById(node);
        }

        this._lastClickNode = null;
        this._activeNode = node;

        var graphLayout = this._graphLayout;
        var graph = this._graph;
        var zr = this._zr;
        node = graphLayout.getNodeById(node.id);

        this.lowlightAll();

        // 这里把图当做树来做了
        var current = node;
        var nodes = [current];
        while (current) {
            var n = graph.getNodeById(current.id);
            if (!n.entity) {
                this._createNodeEntity(n);
            }
            if (node === current) {
                this.hoverNode(n);
                n._isHighlight = true;
            } else {
                n.entity.highlight();
                n._isHighlight = true;   
            }

            var inEdge = current.inEdges[0];
            if (!inEdge) {
                break;
            }
            current = inEdge.node1;

            nodes.push(current);
        }

        for (var i = 0; i < nodes.length - 1; i++) {
            var n2 = nodes[i];
            var n1 = nodes[i + 1];
            var e = graph.getEdge(n1.id, n2.id);

            if (!e.entity) {
                this._createEdgeEntity(e);
            }
            e.entity.highlight();
        }

        this._syncHeaderBarExplorePercent();

        zr.refreshNextFrame();
    }

    /**
     * 
     */
    GraphMain.prototype.highlightCircle = function (cycle) {
        var len = cycle.nodes.length;
        for (var i = 0; i < len; i++) {
            var n1 = cycle.nodes[i];
            var n2 = cycle.nodes[(i + 1) % len];

            var e = this._graph.getEdge(n1, n2) || this._graph.getEdge(n2, n1);
            if (!n1.entity) {
                this._createNodeEntity(n1);
            }
            if (!n2.entity) {
                this._createNodeEntity(n2);
            }
            if (!e.entity) {
                this._createEdgeEntity(e);
            }

            this.highlightNode(n1);
            this.highlightNode(n2);
            e.entity.highlight();
        }
        this._zr.refreshNextFrame();
        this._syncHeaderBarExplorePercent();
    }

    /**
     * 在边栏中显示实体详细信息
     */
    GraphMain.prototype.showEntityDetail = function (n) {
        var graph = this._graphLayout;
        if (typeof(n) === 'string') {
            n = graph.getNodeById(n);
        }

        var sideBar = this._kgraph.getComponentByType('SIDEBAR');
        if (sideBar) {
            sideBar.setData(n.data);
            if (this._firstShowEntityDetail) {
                sideBar.show();
            }
            this._firstShowEntityDetail = false;
        }
    }

    /**
     * 在边栏中显示关系的详细信息
     */
     GraphMain.prototype.showRelationDetail = function (e) {
        var sideBar = this._kgraph.getComponentByType('SIDEBAR');
        if (sideBar) {
            var data = {};
            for (var name in e.data) {
                data[name] = e.data[name];
            }
            data.fromEntity = this._graph.getNodeById(data.fromID).data;
            data.toEntity = this._graph.getNodeById(data.toID).data;

            sideBar.setData(data, true);
            sideBar.show();
        }
    }

    /**
     * 移动视图到指定的实体位置
     */
    GraphMain.prototype.moveToEntity = function (n) {
        var graph = this._graph;
        if (typeof(n) === 'string') {
            n = graph.getNodeById(n);
        }
        var zr = this._zr;
        if (!n) {
            return;
        }
        var entity = n.entity;
        var layer = zr.painter.getLayer(0);
        var pos = Array.prototype.slice.call(entity.el.position);
        vec2.mul(pos, pos, layer.scale);
        vec2.sub(pos, [zr.getWidth() / 2, zr.getHeight() / 2], pos);

        this.moveTo(pos[0], pos[1]);
    };

    /**
     * 移动视图到指定的位置
     */
    GraphMain.prototype.moveTo = function (x, y, cb) {
        var zr = this._zr;
        var layers = zr.painter.getLayers();
        var self = this;
        self._animating = true;
        zr.animation.animate(layers[0])
            .when(800, {
                position: [x, y]
            })
            .during(function () {
                zr.refreshNextFrame();
            })
            .done(function () {
                self._animating = false;
                cb && cb();
            })
            .start('CubicInOut');
    };

    GraphMain.prototype.moveLeft = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[0] += zr.getWidth() * 0.6;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveRight = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[0] -= zr.getWidth() * 0.6;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveTop = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[1] += zr.getHeight() * 0.3;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.moveDown = function (cb) {
        if (!zr) {
            return;
        }
        var layer = zr.painter.getLayer(0);
        var newPos = Array.prototype.slice.call(layer.position);
        newPos[1] -= zr.getHeight() * 0.3;

        hierarchy.moveTo(newPos[0], newPos[1], cb);
    };

    GraphMain.prototype.uncollapse = function () {
        var zr = this._zr;
        this._graph.eachNode(function (n) {
            if (!n.entity) {
                this._createNodeEntity(n);
                n.canCollapse = true;
            }
        }, this);
        this._graph.eachEdge(function (e) {
            if (!e.entity) {
                this._createEdgeEntity(e);
                e.canCollapse = true;
            }
        }, this);

        this._syncHeaderBarExplorePercent();

        zr.refreshNextFrame();
    };

    GraphMain.prototype.collapse = function () {
        var zr = this._zr;
        this._graph.eachNode(function (n) {
            if (n.canCollapse) {
                n.entity.stopAnimationAll();
                this._root.removeChild(n.entity.el);
                n.canCollapse = false;
                n.entity = null;
                this._nodeEntityCount--;
            }
        }, this);
        this._graph.eachEdge(function (e) {
            if (e.canCollapse) {
                e.entity.stopAnimationAll();
                this._root.removeChild(e.entity.el);
                e.canCollapse = false;
                e.entity = null;

                if (util.supportCanvas()) {
                    this._extraEdgeBundle.removeEdge(e);
                }
            }
        }, this);

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    }

    GraphMain.prototype.expandNode = function (node) {
        var zr = this._zr;

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            // 不出补边
            if (e.isExtra || other.entity) {
                continue;
            }

            this._createNodeEntity(other);
            this._createEdgeEntity(e);

            if (util.supportCanvas()) {
                this._growNodeAnimation(other, node, Math.random() * 500);
            }
        }

        this._syncHeaderBarExplorePercent();
        zr.refreshNextFrame();
    }

    GraphMain.prototype.toJSON = function () {
        var graph = this._graph;
        var res = {
            viewport: {
                x: 0,
                y: 0,
                width: this._zr.getWidth(),
                height: this._zr.getHeight()
            },
            entities: [],
            relations: []
        };
        graph.eachNode(function (n) {
            n.data.position = n.layout.position;
            res.entities.push(n.data);
        });
        graph.eachEdge(function (e) {
            res.relations.push(e.data);
        });
        return res;
    };

    GraphMain.prototype.getExplorePercent = function () {
        var nodes = this._graph.nodes;
        return (this._nodeEntityCount - this._baseEntityCount) / (nodes.length - this._baseEntityCount);
    };

    // 保存已展开的节点到localStorage
    GraphMain.prototype._loadStorage = function () {
        if (!window.localStorage) {
            return;
        }
        var id = this._mainNode.id;
        var graph = this._graph;

        var bkg = localStorage['BKGraph_expanded'];
        if (!bkg) {
            return;
        }
        bkg = JSON.parse(bkg);
        if (bkg[id]) {
            var obj = bkg[id];
            for (var i = 0; i < obj.entities.length; i++) {
                var node = graph.getNodeById(obj.entities[i]);
                if (node && !node.entity) {
                    this._createNodeEntity(node);
                }
            }
            for (var i = 0; i < obj.relations.length; i++) {
                var relation = obj.relations[i].split(',');
                var edge = graph.getEdge(relation[0], relation[1]);
                if (edge && !edge.entity) {
                    this._createEdgeEntity(edge);
                }
            }
        }

        this._syncHeaderBarExplorePercent();
    };

    // 保存已展开的节点到localStorage
    GraphMain.prototype._saveStorage = function () {
        if (!window.localStorage) {
            return;
        }
        var id = this._mainNode.id;
        var entities = [];
        var relations = [];
        this._graph.eachNode(function (n) {
            if (n.entity) {
                entities.push(n.id);
            }
        });
        this._graph.eachEdge(function (e) {
            if (e.entity) {
                relations.push(e.node1.id + ',' + e.node2.id);
            }
        });
        var bkg = localStorage['BKGraph_expanded'];
        if (!bkg) {
            bkg = {};
        } else {
            bkg = JSON.parse(bkg);
        }
        bkg[id] = {
            entities: entities,
            relations: relations
        };

        localStorage['BKGraph_expanded'] = JSON.stringify(bkg);
    };

    GraphMain.prototype._findCircles = function (keywords) {
        function matchRelation (name) {
            for (var i = 0; i < keywords.length; i++) {
                if (name.indexOf(keywords[i]) >= 0) {
                    return true;
                }
            }
            return false;
        }

        var cycles = Cycle.findFromGraph(this._graph, 3);
        var matchCircles = [];

        for (var j = 0; j < cycles.length; j++) {
            var cycle = cycles[j];

            // 最多三条边
            var len = cycle.nodes.length;
            for (var i = 0; i < len; i++) {
                var n1 = cycle.nodes[i];
                var n2 = cycle.nodes[(i + 1) % len];

                var e = this._graph.getEdge(n1, n2) || this._graph.getEdge(n2, n1);
                if (e && matchRelation(e.data.relationName)) {
                    continue;
                }
                break;
            }
            // 环中所有边都符合关键词
            if (i == cycle.nodes.length) {
                matchCircles.push(cycle);
            }

            // matchCircles.push(cycle);
            // console.log(cycle.nodes.map(function (a) {return a.data.name}));
        }

        return matchCircles;
    }

    /**
     * 刚进入时的动画效果
     */
    GraphMain.prototype._entryAnimation = function (cb) {
        var zr = this._zr;
        var self = this;
        var clipShape = new CircleShape({
            style: {
                x: zr.getWidth() / 2,
                y: zr.getHeight() / 2,
                r: 70
            }
        });
        this._root.clipShape = clipShape;
        this._root.modSelf();
        zr.refreshNextFrame();

        zr.animation.animate(clipShape.style)
            .when(2000, {
                r: Math.max(zr.getWidth(), zr.getHeight())
            })
            .during(function () {
                self._root.modSelf();
                zr.refreshNextFrame();
            })
            .done(function () {
                self._root.clipShape = null;
                cb && cb();
            })
            // .delay(200)
            .start();
    }

    /**
     * 同步节点的屏外提示
     */
    GraphMain.prototype._syncOutTipEntities = function () {
        var zr = this._zr;
        var node = this._lastClickNode;
        if (!node) {
            return;
        }
        var headerBar = this._kgraph.getComponentByType('HEADERBAR');
        var top = headerBar.el.clientHeight;
        var right = -parseInt(util.getStyle(this.el, 'right'));

        var lineRectIntersectPoint = vec2.create();
        var layer0 = this._zr.painter.getLayer(0);
        var rect = {
            x: -layer0.position[0] / layer0.scale[0],
            y: (-layer0.position[1] + top)/ layer0.scale[1],
            width: (zr.getWidth() - right) / layer0.scale[0],
            height: (zr.getHeight() - top) / layer0.scale[1]
        }

        for (var i = 0; i < node.edges.length; i++) {
            var e = node.edges[i];
            var other = e.node1 === node ? e.node2 : e.node1;

            //中心节点不出补边
            if (node.data.layerCounter === 0 && e.isExtra) {
                continue;
            }
            if (!e.entity || !other.entity) {
                continue;
            }
            if (!other.entity.isInsideRect(rect)) {
                var side = e.entity.intersectRect(rect, lineRectIntersectPoint);
                if (side) {
                    if (!other._outTipEntity) {
                        other._outTipEntity = new OutTipEntity({
                            label: other.data.name
                        });
                        other._outTipEntity.initialize(zr);
                        this._root.addChild(other._outTipEntity.el);   
                    }
                    var p = other._outTipEntity.el.position;
                    vec2.copy(p, lineRectIntersectPoint);
                    switch (side) {
                        case 'top':
                            break;
                        case 'left':
                            p[0] += 25;
                            break;
                        case 'bottom':
                            p[1] -= 25;
                            break;
                        case 'right':
                            p[0] -= 25;
                            break;
                    }
                    other._outTipEntity.el.modSelf();
                }
            } else if (other._outTipEntity) {
                this._root.removeChild(other._outTipEntity.el);
                other._outTipEntity = null;
            }
        }
    }

    GraphMain.prototype._growNodeAnimation = function (toNode, fromNode, delay) {
        var zr = this._zr;
        var e = this._graph.getEdge(fromNode.id, toNode.id);
        var self = this;

        var radius = toNode.entity.radius;
        toNode.entity.setRadius(1);
        this._animating = true;
        zr.refreshNextFrame();
        e.entity.animateLength(zr, 300, Math.random() * 300, fromNode.entity, function () {
            toNode.entity.animateRadius(zr, radius, 500, function () {
                self._animating = false;
            })
        });
    };

    GraphMain.prototype._createNodeEntity = function (node) {
        var nodeEntity = new NodeEntity({
            radius: node.layout.size,
            label: node.data.name,
            image: node.data.image
        });
        nodeEntity.initialize(this._zr);

        vec2.min(this._min, this._min, node.layout.position);
        vec2.max(this._max, this._max, node.layout.position);
        
        vec2.copy(nodeEntity.el.position, node.layout.position);
        var self = this;
        nodeEntity.bind('mouseover', function () {
            if (self._animating) {
                return;
            }
            if (self._lastHoverNode !== node) {
                self.hoverNode(node);
                self.expandNode(node);
            }
            self._lastHoverNode = node;
        });
        nodeEntity.bind('mouseout', function () {
            if (node !== self._activeNode) {
                self.unhoverNode(node);
                //  回复到高亮状态
                if (node._isHighlight) {
                    node.entity.highlight(self._zr);
                }
            }
            self._lastHoverNode = null;
        })

        nodeEntity.bind('click', function () {
            self.showEntityDetail(node);
            if (self._lastClickNode !== node) {
                self._lastClickNode = node;
                self._syncOutTipEntities();
                self.highlightNodeAndAdjeceny(node);

                self._activeNode = node;
            }
        })

        node.entity = nodeEntity;
        this._root.addChild(nodeEntity.el);

        this._nodeEntityCount++;
        return nodeEntity;
    };

    GraphMain.prototype._createEdgeEntity = function (e) {
        var edgeEntity;
        var zr = this._zr;
        if (e.node1.entity && e.node2.entity) {
            if (e.isExtra) {
                edgeEntity = new ExtraEdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
                if (util.supportCanvas()) {
                    this._extraEdgeBundle.addEdge(e);
                }
            } else {
                edgeEntity = new EdgeEntity({
                    sourceEntity: e.node1.entity,
                    targetEntity: e.node2.entity,
                    label: e.data.relationName
                });
            }
            edgeEntity.initialize(this._zr);

            edgeEntity.bind('click', function () {
                this.showRelationDetail(e);
            }, this);
            edgeEntity.bind('mouseover', function () {
                if (util.supportCanvas()) {
                    edgeEntity.animateTextPadding(zr, 300, 12);
                }
                edgeEntity.highlightLabel();
            });
            edgeEntity.bind('mouseout', function () {
                if (util.supportCanvas()) {
                    edgeEntity.animateTextPadding(zr, 300, 5);
                }
                edgeEntity.lowlightLabel();
            });

            e.entity = edgeEntity;

            this._root.addChild(edgeEntity.el);

            return edgeEntity;
        }
    };

    GraphMain.prototype._updateNodePositions = function () {
        var zr = this._zr;
        // PENDING
        var graph = this._graph;
        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                if (n.layout.fixed) {
                    vec2.copy(n.layout.position, n.entity.el.position);
                } else {
                    vec2.copy(n.entity.el.position, n.layout.position);
                }
                zr.modGroup(n.entity.el.id);
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.update(zr);
            }
        }

        zr.refreshNextFrame();
    };

    GraphMain.prototype._syncHeaderBarExplorePercent = function () {
        var headerBarComponent = this._kgraph.getComponentByType('HEADERBAR');
        if (headerBarComponent) {
            headerBarComponent.setExplorePercent(this.getExplorePercent());
        }

        this._saveStorage();
    }

    GraphMain.prototype._culling = function () {
        var graph = this._graph;
        var zr = this._zr;
        if (!graph) {
            return;
        }
        var right = -parseInt(util.getStyle(this.el, 'right'));

        var nodeLayer = zr.painter.getLayer(1);
        var width = zr.getWidth();
        var height = zr.getHeight();
        var min = [0, 0];
        var max = [0, 0];
        nodeLayer.updateTransform();

        var layer0 = this._zr.painter.getLayer(0);
        var rect = {
            x: -layer0.position[0] / layer0.scale[0],
            y: -layer0.position[1] / layer0.scale[1],
            width: (zr.getWidth() - right) / layer0.scale[0],
            height: zr.getHeight() / layer0.scale[1]
        }

        for (var i = 0; i < graph.nodes.length; i++) {
            var n = graph.nodes[i];
            if (n.entity) {
                n.entity.el.ignore = !n.entity.isInsideRect(rect);
            }
        }
        for (var i = 0; i < graph.edges.length; i++) {
            var e = graph.edges[i];
            if (e.entity) {
                e.entity.el.ignore = e.entity.hidden || !e.entity.isInsideRect(rect);
            }
        }
    }

    zrUtil.inherits(GraphMain, Component);

    function _randomInCircle(x, y, radius) {
        var v = vec2.create();
        var angle = Math.random() * Math.PI * 2;
        v[0] = Math.cos(angle) * radius + x;
        v[1] = Math.sin(angle) * radius + y;
        return v;
    }

    return GraphMain;
});
define('bkgraph/component/PanControl',['require'],function (require) {

});
define('bkgraph/component/ZoomControl',['require'],function (require) {
    
});
/**
 * ETPL (Enterprise Template)
 * Copyright 2013 Baidu Inc. All rights reserved.
 *
 * @file 模板引擎
 * @author errorrik(errorrik@gmail.com)
 *         otakustay(otakustay@gmail.com)
 */


// HACK: 可见的重复代码未抽取成function和var是为了gzip size，吐槽的一边去

(function (root) {
    /**
     * 对象属性拷贝
     *
     * @inner
     * @param {Object} target 目标对象
     * @param {Object} source 源对象
     * @return {Object} 返回目标对象
     */
    function extend(target, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }

        return target;
    }

    /**
     * 随手写了个栈
     *
     * @inner
     * @constructor
     */
    function Stack() {
        this.raw = [];
        this.length = 0;
    }

    Stack.prototype = {
        /**
         * 添加元素进栈
         *
         * @param {*} elem 添加项
         */
        push: function (elem) {
            this.raw[this.length++] = elem;
        },

        /**
         * 弹出顶部元素
         *
         * @return {*}
         */
        pop: function () {
            if (this.length > 0) {
                var elem = this.raw[--this.length];
                this.raw.length = this.length;
                return elem;
            }
        },

        /**
         * 获取顶部元素
         *
         * @return {*}
         */
        top: function () {
            return this.raw[this.length - 1];
        },

        /**
         * 获取底部元素
         *
         * @return {*}
         */
        bottom: function () {
            return this.raw[0];
        },

        /**
         * 根据查询条件获取元素
         *
         * @param {Function} condition 查询函数
         * @return {*}
         */
        find: function (condition) {
            var index = this.length;
            while (index--) {
                var item = this.raw[index];
                if (condition(item)) {
                    return item;
                }
            }
        }
    };

    /**
     * 唯一id的起始值
     *
     * @inner
     * @type {number}
     */
    var guidIndex = 0x2B845;

    /**
     * 获取唯一id，用于匿名target或编译代码的变量名生成
     *
     * @inner
     * @return {string}
     */
    function generateGUID() {
        return '___' + (guidIndex++);
    }

    /**
     * 构建类之间的继承关系
     *
     * @inner
     * @param {Function} subClass 子类函数
     * @param {Function} superClass 父类函数
     */
    function inherits(subClass, superClass) {
        /* jshint -W054 */
        var F = new Function();
        F.prototype = superClass.prototype;
        subClass.prototype = new F();
        subClass.prototype.constructor = subClass;
        /* jshint +W054 */
        // 由于引擎内部的使用场景都是inherits后，逐个编写子类的prototype方法
        // 所以，不考虑将原有子类prototype缓存再逐个拷贝回去
    }

    /**
     * HTML Filter替换的字符实体表
     *
     * @const
     * @inner
     * @type {Object}
     */
    var HTML_ENTITY = {
        /* jshint ignore:start */
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
        /* jshint ignore:end */
    };

    /**
     * HTML Filter的替换函数
     *
     * @inner
     * @param {string} c 替换字符
     * @return {string}
     */
    function htmlFilterReplacer(c) {
        return HTML_ENTITY[c];
    }

    /**
     * 默认filter
     *
     * @inner
     * @const
     * @type {Object}
     */
    var DEFAULT_FILTERS = {
        /**
         * HTML转义filter
         *
         * @param {string} source 源串
         * @return {string}
         */
        html: function (source) {
            return source.replace(/[&<>"']/g, htmlFilterReplacer);
        },

        /**
         * URL编码filter
         *
         * @param {string} source 源串
         * @return {string}
         */
        url: encodeURIComponent,

        /**
         * 源串filter，用于在默认开启HTML转义时获取源串，不进行转义
         *
         * @param {string} source 源串
         * @return {string}
         */
        raw: function (source) {
            return source;
        }
    };

    /**
     * 字符串字面化
     *
     * @inner
     * @param {string} source 需要字面化的字符串
     * @return {string}
     */
    function stringLiteralize(source) {
        return '"'
            + source
                .replace(/\x5C/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\x0A/g, '\\n')
                .replace(/\x09/g, '\\t')
                .replace(/\x0D/g, '\\r')
                // .replace( /\x08/g, '\\b' )
                // .replace( /\x0C/g, '\\f' )
            + '"';
    }

    /**
     * 对字符串进行可用于new RegExp的字面化
     *
     * @inner
     * @param {string} source 需要字面化的字符串
     * @return {string}
     */
    function regexpLiteral(source) {
        return source.replace(/[\^\[\]\$\(\)\{\}\?\*\.\+]/g, function (c) {
            return '\\' + c;
        });
    }

    /**
     * 字符串格式化
     *
     * @inner
     * @param {string} source 目标模版字符串
     * @param {...string} replacements 字符串替换项集合
     * @return {string}
     */
    function stringFormat(source) {
        var args = arguments;
        return source.replace(
            /\{([0-9]+)\}/g,
            function (match, index) {
                return args[index - 0 + 1];
            });
    }

    /**
     * 用于render的字符串变量声明语句
     *
     * @inner
     * @const
     * @type {string}
     */
    var RENDER_STRING_DECLATION = 'var r="";';

    /**
     * 用于render的字符串内容添加语句（起始）
     *
     * @inner
     * @const
     * @type {string}
     */
    var RENDER_STRING_ADD_START = 'r+=';

    /**
     * 用于render的字符串内容添加语句（结束）
     *
     * @inner
     * @const
     * @type {string}
     */
    var RENDER_STRING_ADD_END = ';';

    /**
     * 用于render的字符串内容返回语句
     *
     * @inner
     * @const
     * @type {string}
     */
    var RENDER_STRING_RETURN = 'return r;';

    // HACK: IE8-时，编译后的renderer使用join Array的策略进行字符串拼接
    if (typeof navigator !== 'undefined'
        && /msie\s*([0-9]+)/i.test(navigator.userAgent)
        && RegExp.$1 - 0 < 8
    ) {
        RENDER_STRING_DECLATION = 'var r=[],ri=0;';
        RENDER_STRING_ADD_START = 'r[ri++]=';
        RENDER_STRING_RETURN = 'return r.join("");';
    }

    /**
     * 将访问变量名称转换成getVariable调用的编译语句
     * 用于if、var等命令生成编译代码
     *
     * @inner
     * @param {string} name 访问变量名
     * @return {string}
     */
    function toGetVariableLiteral(name) {
        name = name.replace(/^\s*\*/, '');
        return stringFormat(
            'gv({0},["{1}"])',
            stringLiteralize(name),
            name.replace(
                    /\[['"]?([^'"]+)['"]?\]/g,
                    function (match, name) {
                        return '.' + name;
                    }
                )
                .split('.')
                .join('","')
        );
    }

    /**
     * 解析文本片段中以固定字符串开头和结尾的包含块
     * 用于 命令串：<!-- ... --> 和 变量替换串：${...} 的解析
     *
     * @inner
     * @param {string} source 要解析的文本
     * @param {string} open 包含块开头
     * @param {string} close 包含块结束
     * @param {boolean} greedy 是否贪婪匹配
     * @param {function({string})} onInBlock 包含块内文本的处理函数
     * @param {function({string})} onOutBlock 非包含块内文本的处理函数
     */
    function parseTextBlock(source, open, close, greedy, onInBlock, onOutBlock) {
        var closeLen = close.length;
        var texts = source.split(open);
        var level = 0;
        var buf = [];

        for (var i = 0, len = texts.length; i < len; i++) {
            var text = texts[i];

            if (i) {
                var openBegin = 1;
                level++;
                while (1) {
                    var closeIndex = text.indexOf(close);
                    if (closeIndex < 0) {
                        buf.push(level > 1 && openBegin ? open : '', text);
                        break;
                    }

                    level = greedy ? level - 1 : 0;
                    buf.push(
                        level > 0 && openBegin ? open : '',
                        text.slice(0, closeIndex),
                        level > 0 ? close : ''
                    );
                    text = text.slice(closeIndex + closeLen);
                    openBegin = 0;

                    if (level === 0) {
                        break;
                    }
                }

                if (level === 0) {
                    onInBlock(buf.join(''));
                    onOutBlock(text);
                    buf = [];
                }
            }
            else {
                text && onOutBlock(text);
            }
        }

        if (level > 0 && buf.length > 0) {
            onOutBlock(open);
            onOutBlock(buf.join(''));
        }
    }

    /**
     * 编译变量访问和变量替换的代码
     * 用于普通文本或if、var、filter等命令生成编译代码
     *
     * @inner
     * @param {string} source 源代码
     * @param {Engine} engine 引擎实例
     * @param {boolean} forText 是否为输出文本的变量替换
     * @return {string}
     */
    function compileVariable(source, engine, forText) {
        var code = [];
        var options = engine.options;

        var toStringHead = '';
        var toStringFoot = '';
        var wrapHead = '';
        var wrapFoot = '';

        // 默认的filter，当forText模式时有效
        var defaultFilter;

        if (forText) {
            toStringHead = 'ts(';
            toStringFoot = ')';
            wrapHead = RENDER_STRING_ADD_START;
            wrapFoot = RENDER_STRING_ADD_END;
            defaultFilter = options.defaultFilter;
        }

        parseTextBlock(
            source, options.variableOpen, options.variableClose, 1,

            function (text) {
                // 加入默认filter
                // 只有当处理forText时，需要加入默认filter
                // 处理if/var/use等command时，不需要加入默认filter
                if (forText && text.indexOf('|') < 0 && defaultFilter) {
                    text += '|' + defaultFilter;
                }

                // variableCode是一个gv调用，然后通过循环，在外面包filter的调用
                // 形成filter["b"](filter["a"](gv(...)))
                //
                // 当forText模式，处理的是文本中的变量替换时
                // 传递给filter的需要是字符串形式，所以gv外需要包一层ts调用
                // 形成filter["b"](filter["a"](ts(gv(...))))
                //
                // 当variableName以*起始时，忽略ts调用，直接传递原值给filter
                var filterCharIndex = text.indexOf('|');
                var variableName = (
                        filterCharIndex > 0
                        ? text.slice(0, filterCharIndex)
                        : text
                    ).replace(/^\s+/, '').replace(/\s+$/, '');
                var filterSource = filterCharIndex > 0
                    ? text.slice(filterCharIndex + 1)
                    : '';

                var variableRawValue = variableName.indexOf('*') === 0;
                var variableCode = [
                    variableRawValue ? '' : toStringHead,
                    toGetVariableLiteral(variableName),
                    variableRawValue ? '' : toStringFoot
                ];

                if (filterSource) {
                    filterSource = compileVariable(filterSource, engine);
                    var filterSegs = filterSource.split('|');
                    for (var i = 0, len = filterSegs.length; i < len; i++) {
                        var seg = filterSegs[i];

                        if (/^\s*([a-z0-9_-]+)(\((.*)\))?\s*$/i.test(seg)) {
                            variableCode.unshift('fs["' + RegExp.$1 + '"](');

                            if (RegExp.$3) {
                                variableCode.push(',', RegExp.$3);
                            }

                            variableCode.push(')');
                        }
                    }
                }

                code.push(
                    wrapHead,
                    variableCode.join(''),
                    wrapFoot
                );
            },

            function (text) {
                code.push(
                    wrapHead,
                    forText ? stringLiteralize(text) : text,
                    wrapFoot
                );
            }
        );

        return code.join('');
    }

    /**
     * 文本节点类
     *
     * @inner
     * @constructor
     * @param {string} value 文本节点的内容文本
     * @param {Engine} engine 引擎实例
     */
    function TextNode(value, engine) {
        this.value = value;
        this.engine = engine;
    }

    TextNode.prototype = {
        /**
         * 获取renderer body的生成代码
         *
         * @return {string}
         */
        getRendererBody: function () {
            var value = this.value;
            var options = this.engine.options;

            if (!value
                || (options.strip && /^\s*$/.test(value))
            ) {
                return '';
            }

            return compileVariable(value, this.engine, 1);
        },

        /**
         * 复制节点的方法
         *
         * @return {TextNode}
         */
        clone: function () {
            return this;
        }
    };

    /**
     * 命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function Command(value, engine) {
        this.value = value;
        this.engine = engine;
        this.children = [];
        this.cloneProps = [];
    }

    Command.prototype = {
        /**
         * 添加子节点
         *
         * @param {TextNode|Command} node 子节点
         */
        addChild: function (node) {
            this.children.push(node);
        },

        /**
         * 节点open，解析开始
         *
         * @param {Object} context 语法分析环境对象
         */
        open: function (context) {
            var parent = context.stack.top();
            parent && parent.addChild(this);
            context.stack.push(this);
        },

        /**
         * 节点闭合，解析结束
         *
         * @param {Object} context 语法分析环境对象
         */
        close: function (context) {
            if (context.stack.top() === this) {
                context.stack.pop();
            }
        },

        /**
         * 获取renderer body的生成代码
         *
         * @return {string}
         */
        getRendererBody: function () {
            var buf = [];
            var children = this.children;
            for (var i = 0; i < children.length; i++) {
                buf.push(children[i].getRendererBody());
            }

            return buf.join('');
        },

        /**
         * 复制节点的方法
         *
         * @return {Command}
         */
        clone: function () {
            var node = new this.constructor(this.value, this.engine);
            for (var i = 0, l = this.children.length; i < l; i++) {
                node.addChild(this.children[i].clone());
            }

            for (var i = 0, l = this.cloneProps.length; i < l; i++) {
                var prop = this.cloneProps[i];
                node[prop] = this[prop];
            }

            return node;
        }
    };

    /**
     * 命令自动闭合
     *
     * @inner
     * @param {Object} context 语法分析环境对象
     * @param {Function=} CommandType 自闭合的节点类型
     */
    function autoCloseCommand(context, CommandType) {
        var stack = context.stack;
        var closeEnd = CommandType
            ? stack.find(
                function (item) {
                    return item instanceof CommandType;
                }
            )
            : stack.bottom();

        if (closeEnd) {
            var node;

            while ((node = stack.top()) !== closeEnd) {
                /* jshint ignore:start */
                // 如果节点对象不包含autoClose方法
                // 则认为该节点不支持自动闭合，需要抛出错误
                // for等节点不支持自动闭合
                if (!node.autoClose) {
                    throw new Error(node.type + ' must be closed manually: ' + node.value);
                }
                /* jshint ignore:end */

                node.autoClose(context);
            }

            closeEnd.close(context);
        }

        return closeEnd;
    }

    /**
     * renderer body起始代码段
     *
     * @inner
     * @const
     * @type {string}
     */
    var RENDERER_BODY_START = ''
        + 'data=data||{};'
        + 'var v={},fs=engine.filters,hg=typeof data.get=="function",'
        + 'gv=function(n,ps){'
        +     'var p=ps[0],d=v[p];'
        +     'if(d==null){'
        +         'if(hg){return data.get(n);}'
        +         'd=data[p];'
        +     '}'
        +     'for(var i=1,l=ps.length;i<l;i++)if(d!=null)d = d[ps[i]];'
        +     'return d;'
        + '},'
        + 'ts=function(s){'
        +     'if(typeof s==="string"){return s;}'
        +     'if(s==null){s="";}'
        +     'return ""+s;'
        + '};'
    ;
    // v: variables
    // fs: filters
    // gv: getVariable
    // ts: toString
    // n: name
    // ps: properties
    // hg: hasGetter

    /**
     * Target命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function TargetCommand(value, engine) {
        /* jshint ignore:start */
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(\s*master\s*=\s*([a-z0-9\/_-]+)\s*\))?\s*/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }
        /* jshint ignore:end */

        this.master = RegExp.$3;
        this.name = RegExp.$1;
        Command.call(this, value, engine);

        this.blocks = {};
    }

    // 创建Target命令节点继承关系
    inherits(TargetCommand, Command);

    /**
     * Block命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function BlockCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.cloneProps = [ 'name' ];
    }

    // 创建Block命令节点继承关系
    inherits(BlockCommand, Command);

    /**
     * Import命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function ImportCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.name = RegExp.$1;
        Command.call(this, value, engine);
        this.cloneProps = [ 'name', 'state', 'blocks' ];
        this.blocks = {};
    }

    // 创建Import命令节点继承关系
    inherits(ImportCommand, Command);

    /**
     * Var命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function VarCommand(value, engine) {
        if (!/^\s*([a-z0-9_]+)\s*=([\s\S]*)$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.name = RegExp.$1;
        this.expr = RegExp.$2;
        Command.call(this, value, engine);
        this.cloneProps = [ 'name', 'expr' ];
    }

    // 创建Var命令节点继承关系
    inherits(VarCommand, Command);

    /**
     * filter命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function FilterCommand(value, engine) {
        if (!/^\s*([a-z0-9_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
        this.cloneProps = [ 'name', 'args' ];
    }

    // 创建filter命令节点继承关系
    inherits(FilterCommand, Command);

    /**
     * Use命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function UseCommand(value, engine) {
        if (!/^\s*([a-z0-9\/_-]+)\s*(\(([\s\S]*)\))?\s*$/i.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.name = RegExp.$1;
        this.args = RegExp.$3;
        Command.call(this, value, engine);
        this.cloneProps = [ 'name', 'args' ];
    }

    // 创建Use命令节点继承关系
    inherits(UseCommand, Command);

    /**
     * for命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function ForCommand(value, engine) {
        var rule = new RegExp(
            stringFormat(
                /* jshint ignore:start */
                '^\\s*({0}[\\s\\S]+{1})\\s+as\\s+{0}([0-9a-z_]+){1}\\s*(,\\s*{0}([0-9a-z_]+){1})?\\s*$',
                /* jshint ignore:end */
                regexpLiteral(engine.options.variableOpen),
                regexpLiteral(engine.options.variableClose)
            ),
            'i'
        );


        if (!rule.test(value)) {
            throw new Error('Invalid ' + this.type + ' syntax: ' + value);
        }

        this.list = RegExp.$1;
        this.item = RegExp.$2;
        this.index = RegExp.$4;
        Command.call(this, value, engine);
        this.cloneProps = [ 'list', 'item', 'index' ];
    }

    // 创建for命令节点继承关系
    inherits(ForCommand, Command);

    /**
     * if命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function IfCommand(value, engine) {
        Command.call(this, value, engine);
    }

    // 创建if命令节点继承关系
    inherits(IfCommand, Command);

    /**
     * elif命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function ElifCommand(value, engine) {
        IfCommand.call(this, value, engine);
    }

    // 创建elif命令节点继承关系
    inherits(ElifCommand, IfCommand);

    /**
     * else命令节点类
     *
     * @inner
     * @constructor
     * @param {string} value 命令节点的value
     * @param {Engine} engine 引擎实例
     */
    function ElseCommand(value, engine) {
        Command.call(this, value, engine);
    }

    // 创建else命令节点继承关系
    inherits(ElseCommand, IfCommand);

    /**
     * Target的节点状态
     *
     * @inner
     */
    var TargetState = {
        READING: 1,
        READED: 2,
        APPLIED: 3,
        READY: 4
    };

    /**
     * 应用其继承的母版，返回是否成功应用母版
     *
     * @return {boolean}
     */
    ImportCommand.prototype.applyMaster =

    /**
     * 应用其继承的母版，返回是否成功应用母版
     *
     * @return {boolean}
     */
    TargetCommand.prototype.applyMaster = function (masterName) {
        if (this.state >= TargetState.APPLIED) {
            return 1;
        }

        var blocks = this.blocks;

        function replaceBlock(node) {
            var children = node.children;

            if (children instanceof Array) {
                for (var i = 0, len = children.length; i < len; i++) {
                    var child = children[i];
                    if (child instanceof BlockCommand && blocks[child.name]) {
                        child = children[i] = blocks[child.name];
                    }

                    replaceBlock(child);
                }
            }
        }

        var master = this.engine.targets[masterName];
        if (master && master.applyMaster(master.master)) {
            this.children = master.clone().children;
            replaceBlock(this);
            this.state = TargetState.APPLIED;
            return 1;
        }
    };

    /**
     * 判断target是否ready
     * 包括是否成功应用母版，以及import语句依赖的target是否ready
     *
     * @return {boolean}
     */
    TargetCommand.prototype.isReady = function () {
        if (this.state >= TargetState.READY) {
            return 1;
        }

        var engine = this.engine;
        var readyState = 1;

        /**
         * 递归检查节点的ready状态
         *
         * @inner
         * @param {Command|TextNode} node 目标节点
         */
        function checkReadyState(node) {
            for (var i = 0, len = node.children.length; i < len; i++) {
                var child = node.children[i];
                if (child instanceof ImportCommand) {
                    var target = engine.targets[child.name];
                    readyState = readyState
                        && target && target.isReady(engine);
                }
                else if (child instanceof Command) {
                    checkReadyState(child);
                }
            }
        }

        if (this.applyMaster(this.master)) {
            checkReadyState(this);
            readyState && (this.state = TargetState.READY);
            return readyState;
        }
    };

    /**
     * 获取target的renderer函数
     *
     * @return {function(Object):string}
     */
    TargetCommand.prototype.getRenderer = function () {
        if (this.renderer) {
            return this.renderer;
        }

        if (this.isReady()) {
            // console.log(this.name + ' ------------------');
            // console.log(RENDERER_BODY_START + RENDER_STRING_DECLATION
            //     + this.getRendererBody()
            //     + RENDER_STRING_RETURN);

            /* jshint -W054 */
            var realRenderer = new Function(
                'data', 'engine',
                [
                    RENDERER_BODY_START,
                    RENDER_STRING_DECLATION,
                    this.getRendererBody(),
                    RENDER_STRING_RETURN
                ].join('\n')
            );
            /* jshint +W054 */

            var engine = this.engine;
            this.renderer = function (data) {
                return realRenderer(data, engine);
            };

            return this.renderer;
        }

        return null;
    };

    /**
     * 将target节点对象添加到语法分析环境中
     *
     * @inner
     * @param {TargetCommand} target target节点对象
     * @param {Object} context 语法分析环境对象
     */
    function addTargetToContext(target, context) {
        context.target = target;

        var engine = context.engine;
        var name = target.name;

        if (engine.targets[name]) {
            switch (engine.options.namingConflict) {
                /* jshint ignore:start */
                case 'override':
                    engine.targets[name] = target;
                    context.targets.push(name);
                case 'ignore':
                    break;
                /* jshint ignore:end */
                default:
                    throw new Error('Target exists: ' + name);
            }
        }
        else {
            engine.targets[name] = target;
            context.targets.push(name);
        }
    }

    /**
     * target节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    TargetCommand.prototype.open = function (context) {
        autoCloseCommand(context);
        Command.prototype.open.call(this, context);
        this.state = TargetState.READING;
        addTargetToContext(this, context);
    };

    /**
     * Var节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    VarCommand.prototype.open =

    /**
     * Use节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    UseCommand.prototype.open = function (context) {
        context.stack.top().addChild(this);
    };

    /**
     * Block节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    BlockCommand.prototype.open = function (context) {
        Command.prototype.open.call(this, context);
        (context.imp || context.target).blocks[this.name] = this;
    };

    /**
     * elif节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    ElifCommand.prototype.open = function (context) {
        var elseCommand = new ElseCommand();
        elseCommand.open(context);

        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };

    /**
     * else节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    ElseCommand.prototype.open = function (context) {
        var ifCommand = autoCloseCommand(context, IfCommand);
        ifCommand.addChild(this);
        context.stack.push(this);
    };

    /**
     * import节点open，解析开始
     *
     * @param {Object} context 语法分析环境对象
     */
    ImportCommand.prototype.open = function (context) {
        this.parent = context.stack.top();
        this.target = context.target;
        Command.prototype.open.call(this, context);
        this.state = TargetState.READING;
        context.imp = this;
    };

    /**
     * 节点解析结束
     * 由于use节点无需闭合，处理时不会入栈，所以将close置为空函数
     *
     * @param {Object} context 语法分析环境对象
     */
    UseCommand.prototype.close =

    /**
     * 节点解析结束
     * 由于var节点无需闭合，处理时不会入栈，所以将close置为空函数
     *
     * @param {Object} context 语法分析环境对象
     */
    VarCommand.prototype.close = function () {};

    /**
     * 节点解析结束
     *
     * @param {Object} context 语法分析环境对象
     */
    ImportCommand.prototype.close = function (context) {
        Command.prototype.close.call(this, context);
        this.state = TargetState.READED;
        context.imp = null;
    };

    /**
     * 节点闭合，解析结束
     *
     * @param {Object} context 语法分析环境对象
     */
    TargetCommand.prototype.close = function (context) {
        Command.prototype.close.call(this, context);
        this.state = this.master ? TargetState.READED : TargetState.APPLIED;
        context.target = null;
    };

    /**
     * 节点自动闭合，解析结束
     * ImportCommand的自动结束逻辑为，在其开始位置后马上结束
     * 所以，其自动结束时children应赋予其所属的parent
     *
     * @param {Object} context 语法分析环境对象
     */
    ImportCommand.prototype.autoClose = function (context) {
        // move children to parent
        var parentChildren = this.parent.children;
        parentChildren.push.apply(parentChildren, this.children);
        this.children.length = 0;

        // move blocks to target
        for (var key in this.blocks) {
            this.target.blocks[key] = this.blocks[key];
        }
        this.blocks = {};

        // do close
        this.close(context);
    };

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    UseCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    ImportCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    VarCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    ForCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    FilterCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    BlockCommand.prototype.beforeOpen =

    /**
     * 节点open前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    IfCommand.prototype.beforeOpen =

    /**
     * 文本节点被添加到分析环境前的处理动作：节点不在target中时，自动创建匿名target
     *
     * @param {Object} context 语法分析环境对象
     */
    TextNode.prototype.beforeAdd = function (context) {
        if (context.stack.bottom()) {
            return;
        }

        var target = new TargetCommand(generateGUID(), context.engine);
        target.open(context);
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    ImportCommand.prototype.getRendererBody = function () {
        this.applyMaster(this.name);
        return Command.prototype.getRendererBody.call(this);
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    UseCommand.prototype.getRendererBody = function () {
        return stringFormat(
            '{0}engine.render({2},{{3}}){1}',
            RENDER_STRING_ADD_START,
            RENDER_STRING_ADD_END,
            stringLiteralize(this.name),
            compileVariable(this.args, this.engine).replace(
                /(^|,)\s*([a-z0-9_]+)\s*=/ig,
                function (match, start, argName) {
                    return (start || '') + stringLiteralize(argName) + ':';
                }
            )
        );
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    VarCommand.prototype.getRendererBody = function () {
        if (this.expr) {
            return stringFormat(
                'v[{0}]={1};',
                stringLiteralize(this.name),
                compileVariable(this.expr, this.engine)
            );
        }

        return '';
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    IfCommand.prototype.getRendererBody = function () {
        return stringFormat(
            'if({0}){{1}}',
            compileVariable(this.value, this.engine),
            Command.prototype.getRendererBody.call(this)
        );
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    ElseCommand.prototype.getRendererBody = function () {
        return stringFormat(
            '}else{{0}',
            Command.prototype.getRendererBody.call(this)
        );
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    ForCommand.prototype.getRendererBody = function () {
        return stringFormat(
            /* jshint ignore:start */
            ''
            + 'var {0}={1};'
            + 'if({0} instanceof Array)'
            +     'for (var {4}=0,{5}={0}.length;{4}<{5};{4}++){v[{2}]={4};v[{3}]={0}[{4}];{6}}'
            + 'else if(typeof {0}==="object")'
            +     'for(var {4} in {0}){v[{2}]={4};v[{3}]={0}[{4}];{6}}',
            /* jshint ignore:end */
            generateGUID(),
            compileVariable(this.list, this.engine),
            stringLiteralize(this.index || generateGUID()),
            stringLiteralize(this.item),
            generateGUID(),
            generateGUID(),
            Command.prototype.getRendererBody.call(this)
        );
    };

    /**
     * 获取renderer body的生成代码
     *
     * @return {string}
     */
    FilterCommand.prototype.getRendererBody = function () {
        var args = this.args;
        return stringFormat(
            '{2}fs[{5}]((function(){{0}{4}{1}})(){6}){3}',
            RENDER_STRING_DECLATION,
            RENDER_STRING_RETURN,
            RENDER_STRING_ADD_START,
            RENDER_STRING_ADD_END,
            Command.prototype.getRendererBody.call(this),
            stringLiteralize(this.name),
            args ? ',' + compileVariable(args, this.engine) : ''
        );
    };

    /**
     * 命令类型集合
     *
     * @type {Object}
     */
    var commandTypes = {};

    /**
     * 添加命令类型
     *
     * @inner
     * @param {string} name 命令名称
     * @param {Function} Type 处理命令用到的类
     */
    function addCommandType(name, Type) {
        commandTypes[name] = Type;
        Type.prototype.type = name;
    }

    addCommandType('target', TargetCommand);
    addCommandType('block', BlockCommand);
    addCommandType('import', ImportCommand);
    addCommandType('use', UseCommand);
    addCommandType('var', VarCommand);
    addCommandType('for', ForCommand);
    addCommandType('if', IfCommand);
    addCommandType('elif', ElifCommand);
    addCommandType('else', ElseCommand);
    addCommandType('filter', FilterCommand);


    /**
     * etpl引擎类
     *
     * @constructor
     * @param {Object=} options 引擎参数
     * @param {string=} options.commandOpen 命令语法起始串
     * @param {string=} options.commandClose 命令语法结束串
     * @param {string=} options.variableOpen 变量语法起始串
     * @param {string=} options.variableClose 变量语法结束串
     * @param {string=} options.defaultFilter 默认变量替换的filter
     * @param {boolean=} options.strip 是否清除命令标签前后的空白字符
     * @param {string=} options.namingConflict target名字冲突时的处理策略
     */
    function Engine(options) {
        this.options = {
            commandOpen: '<!--',
            commandClose: '-->',
            commandSyntax: /^\s*(\/)?([a-z]+)\s*(?::([\s\S]*))?$/,
            variableOpen: '${',
            variableClose: '}',
            defaultFilter: 'html'
        };

        this.config(options);
        this.targets = {};
        this.filters = extend({}, DEFAULT_FILTERS);
    }

    /**
     * 配置引擎参数，设置的参数将被合并到现有参数中
     *
     * @param {Object} options 参数对象
     * @param {string=} options.commandOpen 命令语法起始串
     * @param {string=} options.commandClose 命令语法结束串
     * @param {string=} options.variableOpen 变量语法起始串
     * @param {string=} options.variableClose 变量语法结束串
     * @param {string=} options.defaultFilter 默认变量替换的filter
     * @param {boolean=} options.strip 是否清除命令标签前后的空白字符
     * @param {string=} options.namingConflict target名字冲突时的处理策略
     */
    Engine.prototype.config = function (options) {
        extend(this.options, options);
    };

    /**
     * 解析模板并编译，返回第一个target编译后的renderer函数。
     *
     * @param {string} source 模板源代码
     * @return {function(Object):string}
     */
    Engine.prototype.compile =

    /**
     * 解析模板并编译，返回第一个target编译后的renderer函数。
     * 该方法的存在为了兼容老模板引擎
     *
     * @param {string} source 模板源代码
     * @return {function(Object):string}
     */
    Engine.prototype.parse = function (source) {
        if (source) {
            var targetNames = parseSource(source, this);
            if (targetNames.length) {
                return this.targets[targetNames[0]].getRenderer();
            }
        }

        /* jshint -W054 */
        return new Function('return ""');
        /* jshint +W054 */
    };

    /**
     * 根据target名称获取编译后的renderer函数
     *
     * @param {string} name target名称
     * @return {function(Object):string}
     */
    Engine.prototype.getRenderer = function (name) {
        var target = this.targets[name];
        if (target) {
            return target.getRenderer();
        }
    };

    /**
     * 执行模板渲染，返回渲染后的字符串。
     *
     * @param {string} name target名称
     * @param {Object=} data 模板数据。
     *      可以是plain object，
     *      也可以是带有 {string}get({string}name) 方法的对象
     * @return {string}
     */
    Engine.prototype.render = function (name, data) {
        var renderer = this.getRenderer(name);
        if (renderer) {
            return renderer(data);
        }

        return '';
    };

    /**
     * 增加过滤器
     *
     * @param {string} name 过滤器名称
     * @param {Function} filter 过滤函数
     */
    Engine.prototype.addFilter = function (name, filter) {
        if (typeof filter === 'function') {
            this.filters[name] = filter;
        }
    };

    /**
     * 解析源代码
     *
     * @inner
     * @param {string} source 模板源代码
     * @param {Engine} engine 引擎实例
     * @return {Array} target名称列表
     */
    function parseSource(source, engine) {
        var commandOpen = engine.options.commandOpen;
        var commandClose = engine.options.commandClose;
        var commandSyntax = engine.options.commandSyntax;

        var stack = new Stack();
        var analyseContext = {
            engine: engine,
            targets: [],
            stack: stack,
            target: null
        };

        // text节点内容缓冲区，用于合并多text
        var textBuf = [];

        /**
         * 将缓冲区中的text节点内容写入
         *
         * @inner
         */
        function flushTextBuf() {
            var text;
            if (textBuf.length > 0 && (text = textBuf.join(''))) {
                var textNode = new TextNode(text, engine);
                textNode.beforeAdd(analyseContext);

                stack.top().addChild(textNode);
                textBuf = [];

                if (engine.options.strip
                    && analyseContext.current instanceof Command
                ) {
                    textNode.value = text.replace(/^[\x20\t\r]*\n/, '');
                }
                analyseContext.current = textNode;
            }
        }

        var NodeType;

        parseTextBlock(
            source, commandOpen, commandClose, 0,

            function (text) { // <!--...-->内文本的处理函数
                var match = commandSyntax.exec(text);

                // 符合command规则，并且存在相应的Command类，说明是合法有含义的Command
                // 否则，为不具有command含义的普通文本
                if (match
                    && (NodeType = commandTypes[match[2].toLowerCase()])
                    && typeof NodeType === 'function'
                ) {
                    // 先将缓冲区中的text节点内容写入
                    flushTextBuf();

                    var currentNode = analyseContext.current;
                    if (engine.options.strip && currentNode instanceof TextNode) {
                        currentNode.value = currentNode.value
                            .replace(/\r?\n[\x20\t]*$/, '\n');
                    }

                    if (match[1]) {
                        currentNode = autoCloseCommand(analyseContext, NodeType);
                    }
                    else {
                        currentNode = new NodeType(match[3], engine);
                        if (typeof currentNode.beforeOpen === 'function') {
                            currentNode.beforeOpen(analyseContext);
                        }
                        currentNode.open(analyseContext);
                    }

                    analyseContext.current = currentNode;
                }
                else if (!/^\s*\/\//.test(text)) {
                    // 如果不是模板注释，则作为普通文本，写入缓冲区
                    textBuf.push(commandOpen, text, commandClose);
                }

                NodeType = null;
            },

            function (text) { // <!--...-->外，普通文本的处理函数
                // 普通文本直接写入缓冲区
                textBuf.push(text);
            }
        );


        flushTextBuf(); // 将缓冲区中的text节点内容写入
        autoCloseCommand(analyseContext);

        return analyseContext.targets;
    }

    var etpl = new Engine();
    etpl.Engine = Engine;

    if (typeof exports === 'object' && typeof module === 'object') {
        // For CommonJS
        exports = module.exports = etpl;
    }
    else if (typeof define === 'function' && define.amd) {
        // For AMD
        define('etpl',etpl);
    }
    else {
        // For <script src="..."
        root.etpl = etpl;
    }
})(this);

/*!
 * Sizzle CSS Selector Engine v@VERSION
 * http://sizzlejs.com/
 *
 * Copyright 2008, 2014 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: @DATE
 */
(function( window ) {

var i,
    support,
    Expr,
    getText,
    isXML,
    tokenize,
    compile,
    select,
    outermostContext,
    sortInput,
    hasDuplicate,

    // Local document vars
    setDocument,
    document,
    docElem,
    documentIsHTML,
    rbuggyQSA,
    rbuggyMatches,
    matches,
    contains,

    // Instance-specific data
    expando = "sizzle" + 1 * new Date(),
    preferredDoc = window.document,
    dirruns = 0,
    done = 0,
    classCache = createCache(),
    tokenCache = createCache(),
    compilerCache = createCache(),
    sortOrder = function( a, b ) {
        if ( a === b ) {
            hasDuplicate = true;
        }
        return 0;
    },

    // General-purpose constants
    MAX_NEGATIVE = 1 << 31,

    // Instance methods
    hasOwn = ({}).hasOwnProperty,
    arr = [],
    pop = arr.pop,
    push_native = arr.push,
    push = arr.push,
    slice = arr.slice,
    // Use a stripped-down indexOf as it's faster than native
    // http://jsperf.com/thor-indexof-vs-for/5
    indexOf = function( list, elem ) {
        var i = 0,
            len = list.length;
        for ( ; i < len; i++ ) {
            if ( list[i] === elem ) {
                return i;
            }
        }
        return -1;
    },

    booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

    // Regular expressions

    // http://www.w3.org/TR/css3-selectors/#whitespace
    whitespace = "[\\x20\\t\\r\\n\\f]",

    // http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
    identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

    // Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
    attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
        // Operator (capture 2)
        "*([*^$|!~]?=)" + whitespace +
        // "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
        "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
        "*\\]",

    pseudos = ":(" + identifier + ")(?:\\((" +
        // To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
        // 1. quoted (capture 3; capture 4 or capture 5)
        "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
        // 2. simple (capture 6)
        "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
        // 3. anything else (capture 2)
        ".*" +
        ")\\)|)",

    // Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
    rwhitespace = new RegExp( whitespace + "+", "g" ),
    rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

    rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
    rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

    rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

    rpseudo = new RegExp( pseudos ),
    ridentifier = new RegExp( "^" + identifier + "$" ),

    matchExpr = {
        "ID": new RegExp( "^#(" + identifier + ")" ),
        "CLASS": new RegExp( "^\\.(" + identifier + ")" ),
        "TAG": new RegExp( "^(" + identifier + "|[*])" ),
        "ATTR": new RegExp( "^" + attributes ),
        "PSEUDO": new RegExp( "^" + pseudos ),
        "CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
            "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
            "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
        "bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
        // For use in libraries implementing .is()
        // We use this for POS matching in `select`
        "needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
            whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
    },

    rinputs = /^(?:input|select|textarea|button)$/i,
    rheader = /^h\d$/i,

    rnative = /^[^{]+\{\s*\[native \w/,

    // Easily-parseable/retrievable ID or TAG or CLASS selectors
    rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

    rsibling = /[+~]/,
    rescape = /'|\\/g,

    // CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
    funescape = function( _, escaped, escapedWhitespace ) {
        var high = "0x" + escaped - 0x10000;
        // NaN means non-codepoint
        // Support: Firefox<24
        // Workaround erroneous numeric interpretation of +"0x"
        return high !== high || escapedWhitespace ?
            escaped :
            high < 0 ?
                // BMP codepoint
                String.fromCharCode( high + 0x10000 ) :
                // Supplemental Plane codepoint (surrogate pair)
                String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
    };

// Optimize for push.apply( _, NodeList )
try {
    push.apply(
        (arr = slice.call( preferredDoc.childNodes )),
        preferredDoc.childNodes
    );
    // Support: Android<4.0
    // Detect silently failing push.apply
    arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
    push = { apply: arr.length ?

        // Leverage slice if possible
        function( target, els ) {
            push_native.apply( target, slice.call(els) );
        } :

        // Support: IE<9
        // Otherwise append directly
        function( target, els ) {
            var j = target.length,
                i = 0;
            // Can't trust NodeList.length
            while ( (target[j++] = els[i++]) ) {}
            target.length = j - 1;
        }
    };
}

function Sizzle( selector, context, results, seed ) {
    var match, elem, m, nodeType,
        // QSA vars
        i, groups, old, nid, newContext, newSelector;

    if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
        setDocument( context );
    }

    context = context || document;
    results = results || [];
    nodeType = context.nodeType;

    if ( typeof selector !== "string" || !selector ||
        nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

        return results;
    }

    if ( !seed && documentIsHTML ) {

        // Try to shortcut find operations when possible (e.g., not under DocumentFragment)
        if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {
            // Speed-up: Sizzle("#ID")
            if ( (m = match[1]) ) {
                if ( nodeType === 9 ) {
                    elem = context.getElementById( m );
                    // Check parentNode to catch when Blackberry 4.6 returns
                    // nodes that are no longer in the document (jQuery #6963)
                    if ( elem && elem.parentNode ) {
                        // Handle the case where IE, Opera, and Webkit return items
                        // by name instead of ID
                        if ( elem.id === m ) {
                            results.push( elem );
                            return results;
                        }
                    } else {
                        return results;
                    }
                } else {
                    // Context is not a document
                    if ( context.ownerDocument && (elem = context.ownerDocument.getElementById( m )) &&
                        contains( context, elem ) && elem.id === m ) {
                        results.push( elem );
                        return results;
                    }
                }

            // Speed-up: Sizzle("TAG")
            } else if ( match[2] ) {
                push.apply( results, context.getElementsByTagName( selector ) );
                return results;

            // Speed-up: Sizzle(".CLASS")
            } else if ( (m = match[3]) && support.getElementsByClassName ) {
                push.apply( results, context.getElementsByClassName( m ) );
                return results;
            }
        }

        // QSA path
        if ( support.qsa && (!rbuggyQSA || !rbuggyQSA.test( selector )) ) {
            nid = old = expando;
            newContext = context;
            newSelector = nodeType !== 1 && selector;

            // qSA works strangely on Element-rooted queries
            // We can work around this by specifying an extra ID on the root
            // and working up from there (Thanks to Andrew Dupont for the technique)
            // IE 8 doesn't work on object elements
            if ( nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
                groups = tokenize( selector );

                if ( (old = context.getAttribute("id")) ) {
                    nid = old.replace( rescape, "\\$&" );
                } else {
                    context.setAttribute( "id", nid );
                }
                nid = "[id='" + nid + "'] ";

                i = groups.length;
                while ( i-- ) {
                    groups[i] = nid + toSelector( groups[i] );
                }
                newContext = rsibling.test( selector ) && testContext( context.parentNode ) || context;
                newSelector = groups.join(",");
            }

            if ( newSelector ) {
                try {
                    push.apply( results,
                        newContext.querySelectorAll( newSelector )
                    );
                    return results;
                } catch(qsaError) {
                } finally {
                    if ( !old ) {
                        context.removeAttribute("id");
                    }
                }
            }
        }
    }

    // All others
    return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {Function(string, Object)} Returns the Object data after storing it on itself with
 *  property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *  deleting the oldest entry
 */
function createCache() {
    var keys = [];

    function cache( key, value ) {
        // Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
        if ( keys.push( key + " " ) > Expr.cacheLength ) {
            // Only keep the most recent entries
            delete cache[ keys.shift() ];
        }
        return (cache[ key + " " ] = value);
    }
    return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
    fn[ expando ] = true;
    return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created div and expects a boolean result
 */
function assert( fn ) {
    var div = document.createElement("div");

    try {
        return !!fn( div );
    } catch (e) {
        return false;
    } finally {
        // Remove from its parent by default
        if ( div.parentNode ) {
            div.parentNode.removeChild( div );
        }
        // release memory in IE
        div = null;
    }
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
    var arr = attrs.split("|"),
        i = attrs.length;

    while ( i-- ) {
        Expr.attrHandle[ arr[i] ] = handler;
    }
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
    var cur = b && a,
        diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
            ( ~b.sourceIndex || MAX_NEGATIVE ) -
            ( ~a.sourceIndex || MAX_NEGATIVE );

    // Use IE sourceIndex if available on both nodes
    if ( diff ) {
        return diff;
    }

    // Check if b follows a
    if ( cur ) {
        while ( (cur = cur.nextSibling) ) {
            if ( cur === b ) {
                return -1;
            }
        }
    }

    return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
    return function( elem ) {
        var name = elem.nodeName.toLowerCase();
        return name === "input" && elem.type === type;
    };
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
    return function( elem ) {
        var name = elem.nodeName.toLowerCase();
        return (name === "input" || name === "button") && elem.type === type;
    };
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
    return markFunction(function( argument ) {
        argument = +argument;
        return markFunction(function( seed, matches ) {
            var j,
                matchIndexes = fn( [], seed.length, argument ),
                i = matchIndexes.length;

            // Match elements found at the specified indexes
            while ( i-- ) {
                if ( seed[ (j = matchIndexes[i]) ] ) {
                    seed[j] = !(matches[j] = seed[j]);
                }
            }
        });
    });
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
    return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
    // documentElement is verified for cases where it doesn't yet exist
    // (such as loading iframes in IE - #4833)
    var documentElement = elem && (elem.ownerDocument || elem).documentElement;
    return documentElement ? documentElement.nodeName !== "HTML" : false;
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
    var hasCompare,
        doc = node ? node.ownerDocument || node : preferredDoc,
        parent = doc.defaultView;

    // If no document and documentElement is available, return
    if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
        return document;
    }

    // Set our document
    document = doc;
    docElem = doc.documentElement;

    // Support tests
    documentIsHTML = !isXML( doc );

    // Support: IE>8
    // If iframe document is assigned to "document" variable and if iframe has been reloaded,
    // IE will throw "permission denied" error when accessing "document" variable, see jQuery #13936
    // IE6-8 do not support the defaultView property so parent will be undefined
    if ( parent && parent !== parent.top ) {
        // IE11 does not have attachEvent, so all must suffer
        if ( parent.addEventListener ) {
            parent.addEventListener( "unload", function() {
                setDocument();
            }, false );
        } else if ( parent.attachEvent ) {
            parent.attachEvent( "onunload", function() {
                setDocument();
            });
        }
    }

    /* Attributes
    ---------------------------------------------------------------------- */

    // Support: IE<8
    // Verify that getAttribute really returns attributes and not properties (excepting IE8 booleans)
    support.attributes = assert(function( div ) {
        div.className = "i";
        return !div.getAttribute("className");
    });

    /* getElement(s)By*
    ---------------------------------------------------------------------- */

    // Check if getElementsByTagName("*") returns only elements
    support.getElementsByTagName = assert(function( div ) {
        div.appendChild( doc.createComment("") );
        return !div.getElementsByTagName("*").length;
    });

    // Support: IE<9
    support.getElementsByClassName = rnative.test( doc.getElementsByClassName );

    // Support: IE<10
    // Check if getElementById returns elements by name
    // The broken getElementById methods don't pick up programatically-set names,
    // so use a roundabout getElementsByName test
    support.getById = assert(function( div ) {
        docElem.appendChild( div ).id = expando;
        return !doc.getElementsByName || !doc.getElementsByName( expando ).length;
    });

    // ID find and filter
    if ( support.getById ) {
        Expr.find["ID"] = function( id, context ) {
            if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
                var m = context.getElementById( id );
                // Check parentNode to catch when Blackberry 4.6 returns
                // nodes that are no longer in the document #6963
                return m && m.parentNode ? [ m ] : [];
            }
        };
        Expr.filter["ID"] = function( id ) {
            var attrId = id.replace( runescape, funescape );
            return function( elem ) {
                return elem.getAttribute("id") === attrId;
            };
        };
    } else {
        // Support: IE6/7
        // getElementById is not reliable as a find shortcut
        delete Expr.find["ID"];

        Expr.filter["ID"] =  function( id ) {
            var attrId = id.replace( runescape, funescape );
            return function( elem ) {
                var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
                return node && node.value === attrId;
            };
        };
    }

    // Tag
    Expr.find["TAG"] = support.getElementsByTagName ?
        function( tag, context ) {
            if ( typeof context.getElementsByTagName !== "undefined" ) {
                return context.getElementsByTagName( tag );

            // DocumentFragment nodes don't have gEBTN
            } else if ( support.qsa ) {
                return context.querySelectorAll( tag );
            }
        } :

        function( tag, context ) {
            var elem,
                tmp = [],
                i = 0,
                // By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
                results = context.getElementsByTagName( tag );

            // Filter out possible comments
            if ( tag === "*" ) {
                while ( (elem = results[i++]) ) {
                    if ( elem.nodeType === 1 ) {
                        tmp.push( elem );
                    }
                }

                return tmp;
            }
            return results;
        };

    // Class
    Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
        if ( documentIsHTML ) {
            return context.getElementsByClassName( className );
        }
    };

    /* QSA/matchesSelector
    ---------------------------------------------------------------------- */

    // QSA and matchesSelector support

    // matchesSelector(:active) reports false when true (IE9/Opera 11.5)
    rbuggyMatches = [];

    // qSa(:focus) reports false when true (Chrome 21)
    // We allow this because of a bug in IE8/9 that throws an error
    // whenever `document.activeElement` is accessed on an iframe
    // So, we allow :focus to pass through QSA all the time to avoid the IE error
    // See http://bugs.jquery.com/ticket/13378
    rbuggyQSA = [];

    if ( (support.qsa = rnative.test( doc.querySelectorAll )) ) {
        // Build QSA regex
        // Regex strategy adopted from Diego Perini
        assert(function( div ) {
            // Select is set to empty string on purpose
            // This is to test IE's treatment of not explicitly
            // setting a boolean content attribute,
            // since its presence should be enough
            // http://bugs.jquery.com/ticket/12359
            div.innerHTML = "<select msallowcapture=''>" +
                "<option id='d\f]' selected=''></option></select>";

            // Support: IE8, Opera 11-12.16
            // Nothing should be selected when empty strings follow ^= or $= or *=
            // The test attribute must be unknown in Opera but "safe" for WinRT
            // http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
            if ( div.querySelectorAll("[msallowcapture^='']").length ) {
                rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
            }

            // Support: IE8
            // Boolean attributes and "value" are not treated correctly
            if ( !div.querySelectorAll("[selected]").length ) {
                rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
            }

            // Support: Chrome<29, Android<4.2+, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.7+
            if ( !div.querySelectorAll("[id~=d]").length ) {
                rbuggyQSA.push("~=");
            }

            // Webkit/Opera - :checked should return selected option elements
            // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
            // IE8 throws error here and will not see later tests
            if ( !div.querySelectorAll(":checked").length ) {
                rbuggyQSA.push(":checked");
            }
        });

        assert(function( div ) {
            // Support: Windows 8 Native Apps
            // The type and name attributes are restricted during .innerHTML assignment
            var input = doc.createElement("input");
            input.setAttribute( "type", "hidden" );
            div.appendChild( input ).setAttribute( "name", "D" );

            // Support: IE8
            // Enforce case-sensitivity of name attribute
            if ( div.querySelectorAll("[name=d]").length ) {
                rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
            }

            // FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
            // IE8 throws error here and will not see later tests
            if ( !div.querySelectorAll(":enabled").length ) {
                rbuggyQSA.push( ":enabled", ":disabled" );
            }

            // Opera 10-11 does not throw on post-comma invalid pseudos
            div.querySelectorAll("*,:x");
            rbuggyQSA.push(",.*:");
        });
    }

    if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
        docElem.webkitMatchesSelector ||
        docElem.mozMatchesSelector ||
        docElem.oMatchesSelector ||
        docElem.msMatchesSelector) )) ) {

        assert(function( div ) {
            // Check to see if it's possible to do matchesSelector
            // on a disconnected node (IE 9)
            support.disconnectedMatch = matches.call( div, "div" );

            // This should fail with an exception
            // Gecko does not error, returns false instead
            matches.call( div, "[s!='']:x" );
            rbuggyMatches.push( "!=", pseudos );
        });
    }

    rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
    rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

    /* Contains
    ---------------------------------------------------------------------- */
    hasCompare = rnative.test( docElem.compareDocumentPosition );

    // Element contains another
    // Purposefully does not implement inclusive descendent
    // As in, an element does not contain itself
    contains = hasCompare || rnative.test( docElem.contains ) ?
        function( a, b ) {
            var adown = a.nodeType === 9 ? a.documentElement : a,
                bup = b && b.parentNode;
            return a === bup || !!( bup && bup.nodeType === 1 && (
                adown.contains ?
                    adown.contains( bup ) :
                    a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
            ));
        } :
        function( a, b ) {
            if ( b ) {
                while ( (b = b.parentNode) ) {
                    if ( b === a ) {
                        return true;
                    }
                }
            }
            return false;
        };

    /* Sorting
    ---------------------------------------------------------------------- */

    // Document order sorting
    sortOrder = hasCompare ?
    function( a, b ) {

        // Flag for duplicate removal
        if ( a === b ) {
            hasDuplicate = true;
            return 0;
        }

        // Sort on method existence if only one input has compareDocumentPosition
        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
        if ( compare ) {
            return compare;
        }

        // Calculate position if both inputs belong to the same document
        compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
            a.compareDocumentPosition( b ) :

            // Otherwise we know they are disconnected
            1;

        // Disconnected nodes
        if ( compare & 1 ||
            (!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

            // Choose the first element that is related to our preferred document
            if ( a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
                return -1;
            }
            if ( b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
                return 1;
            }

            // Maintain original order
            return sortInput ?
                ( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
                0;
        }

        return compare & 4 ? -1 : 1;
    } :
    function( a, b ) {
        // Exit early if the nodes are identical
        if ( a === b ) {
            hasDuplicate = true;
            return 0;
        }

        var cur,
            i = 0,
            aup = a.parentNode,
            bup = b.parentNode,
            ap = [ a ],
            bp = [ b ];

        // Parentless nodes are either documents or disconnected
        if ( !aup || !bup ) {
            return a === doc ? -1 :
                b === doc ? 1 :
                aup ? -1 :
                bup ? 1 :
                sortInput ?
                ( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
                0;

        // If the nodes are siblings, we can do a quick check
        } else if ( aup === bup ) {
            return siblingCheck( a, b );
        }

        // Otherwise we need full lists of their ancestors for comparison
        cur = a;
        while ( (cur = cur.parentNode) ) {
            ap.unshift( cur );
        }
        cur = b;
        while ( (cur = cur.parentNode) ) {
            bp.unshift( cur );
        }

        // Walk down the tree looking for a discrepancy
        while ( ap[i] === bp[i] ) {
            i++;
        }

        return i ?
            // Do a sibling check if the nodes have a common ancestor
            siblingCheck( ap[i], bp[i] ) :

            // Otherwise nodes in our document sort first
            ap[i] === preferredDoc ? -1 :
            bp[i] === preferredDoc ? 1 :
            0;
    };

    return doc;
};

Sizzle.matches = function( expr, elements ) {
    return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
    // Set document vars if needed
    if ( ( elem.ownerDocument || elem ) !== document ) {
        setDocument( elem );
    }

    // Make sure that attribute selectors are quoted
    expr = expr.replace( rattributeQuotes, "='$1']" );

    if ( support.matchesSelector && documentIsHTML &&
        ( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
        ( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

        try {
            var ret = matches.call( elem, expr );

            // IE 9's matchesSelector returns false on disconnected nodes
            if ( ret || support.disconnectedMatch ||
                    // As well, disconnected nodes are said to be in a document
                    // fragment in IE 9
                    elem.document && elem.document.nodeType !== 11 ) {
                return ret;
            }
        } catch(e) {}
    }

    return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {
    // Set document vars if needed
    if ( ( context.ownerDocument || context ) !== document ) {
        setDocument( context );
    }
    return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {
    // Set document vars if needed
    if ( ( elem.ownerDocument || elem ) !== document ) {
        setDocument( elem );
    }

    var fn = Expr.attrHandle[ name.toLowerCase() ],
        // Don't get fooled by Object.prototype properties (jQuery #13807)
        val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
            fn( elem, name, !documentIsHTML ) :
            undefined;

    return val !== undefined ?
        val :
        support.attributes || !documentIsHTML ?
            elem.getAttribute( name ) :
            (val = elem.getAttributeNode(name)) && val.specified ?
                val.value :
                null;
};

Sizzle.error = function( msg ) {
    throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
    var elem,
        duplicates = [],
        j = 0,
        i = 0;

    // Unless we *know* we can detect duplicates, assume their presence
    hasDuplicate = !support.detectDuplicates;
    sortInput = !support.sortStable && results.slice( 0 );
    results.sort( sortOrder );

    if ( hasDuplicate ) {
        while ( (elem = results[i++]) ) {
            if ( elem === results[ i ] ) {
                j = duplicates.push( i );
            }
        }
        while ( j-- ) {
            results.splice( duplicates[ j ], 1 );
        }
    }

    // Clear input after sorting to release objects
    // See https://github.com/jquery/sizzle/pull/225
    sortInput = null;

    return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
    var node,
        ret = "",
        i = 0,
        nodeType = elem.nodeType;

    if ( !nodeType ) {
        // If no nodeType, this is expected to be an array
        while ( (node = elem[i++]) ) {
            // Do not traverse comment nodes
            ret += getText( node );
        }
    } else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
        // Use textContent for elements
        // innerText usage removed for consistency of new lines (jQuery #11153)
        if ( typeof elem.textContent === "string" ) {
            return elem.textContent;
        } else {
            // Traverse its children
            for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
                ret += getText( elem );
            }
        }
    } else if ( nodeType === 3 || nodeType === 4 ) {
        return elem.nodeValue;
    }
    // Do not include comment or processing instruction nodes

    return ret;
};

Expr = Sizzle.selectors = {

    // Can be adjusted by the user
    cacheLength: 50,

    createPseudo: markFunction,

    match: matchExpr,

    attrHandle: {},

    find: {},

    relative: {
        ">": { dir: "parentNode", first: true },
        " ": { dir: "parentNode" },
        "+": { dir: "previousSibling", first: true },
        "~": { dir: "previousSibling" }
    },

    preFilter: {
        "ATTR": function( match ) {
            match[1] = match[1].replace( runescape, funescape );

            // Move the given value to match[3] whether quoted or unquoted
            match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

            if ( match[2] === "~=" ) {
                match[3] = " " + match[3] + " ";
            }

            return match.slice( 0, 4 );
        },

        "CHILD": function( match ) {
            /* matches from matchExpr["CHILD"]
                1 type (only|nth|...)
                2 what (child|of-type)
                3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
                4 xn-component of xn+y argument ([+-]?\d*n|)
                5 sign of xn-component
                6 x of xn-component
                7 sign of y-component
                8 y of y-component
            */
            match[1] = match[1].toLowerCase();

            if ( match[1].slice( 0, 3 ) === "nth" ) {
                // nth-* requires argument
                if ( !match[3] ) {
                    Sizzle.error( match[0] );
                }

                // numeric x and y parameters for Expr.filter.CHILD
                // remember that false/true cast respectively to 0/1
                match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
                match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

            // other types prohibit arguments
            } else if ( match[3] ) {
                Sizzle.error( match[0] );
            }

            return match;
        },

        "PSEUDO": function( match ) {
            var excess,
                unquoted = !match[6] && match[2];

            if ( matchExpr["CHILD"].test( match[0] ) ) {
                return null;
            }

            // Accept quoted arguments as-is
            if ( match[3] ) {
                match[2] = match[4] || match[5] || "";

            // Strip excess characters from unquoted arguments
            } else if ( unquoted && rpseudo.test( unquoted ) &&
                // Get excess from tokenize (recursively)
                (excess = tokenize( unquoted, true )) &&
                // advance to the next closing parenthesis
                (excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

                // excess is a negative index
                match[0] = match[0].slice( 0, excess );
                match[2] = unquoted.slice( 0, excess );
            }

            // Return only captures needed by the pseudo filter method (type and argument)
            return match.slice( 0, 3 );
        }
    },

    filter: {

        "TAG": function( nodeNameSelector ) {
            var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
            return nodeNameSelector === "*" ?
                function() { return true; } :
                function( elem ) {
                    return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
                };
        },

        "CLASS": function( className ) {
            var pattern = classCache[ className + " " ];

            return pattern ||
                (pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
                classCache( className, function( elem ) {
                    return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
                });
        },

        "ATTR": function( name, operator, check ) {
            return function( elem ) {
                var result = Sizzle.attr( elem, name );

                if ( result == null ) {
                    return operator === "!=";
                }
                if ( !operator ) {
                    return true;
                }

                result += "";

                return operator === "=" ? result === check :
                    operator === "!=" ? result !== check :
                    operator === "^=" ? check && result.indexOf( check ) === 0 :
                    operator === "*=" ? check && result.indexOf( check ) > -1 :
                    operator === "$=" ? check && result.slice( -check.length ) === check :
                    operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
                    operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
                    false;
            };
        },

        "CHILD": function( type, what, argument, first, last ) {
            var simple = type.slice( 0, 3 ) !== "nth",
                forward = type.slice( -4 ) !== "last",
                ofType = what === "of-type";

            return first === 1 && last === 0 ?

                // Shortcut for :nth-*(n)
                function( elem ) {
                    return !!elem.parentNode;
                } :

                function( elem, context, xml ) {
                    var cache, outerCache, node, diff, nodeIndex, start,
                        dir = simple !== forward ? "nextSibling" : "previousSibling",
                        parent = elem.parentNode,
                        name = ofType && elem.nodeName.toLowerCase(),
                        useCache = !xml && !ofType;

                    if ( parent ) {

                        // :(first|last|only)-(child|of-type)
                        if ( simple ) {
                            while ( dir ) {
                                node = elem;
                                while ( (node = node[ dir ]) ) {
                                    if ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) {
                                        return false;
                                    }
                                }
                                // Reverse direction for :only-* (if we haven't yet done so)
                                start = dir = type === "only" && !start && "nextSibling";
                            }
                            return true;
                        }

                        start = [ forward ? parent.firstChild : parent.lastChild ];

                        // non-xml :nth-child(...) stores cache data on `parent`
                        if ( forward && useCache ) {
                            // Seek `elem` from a previously-cached index
                            outerCache = parent[ expando ] || (parent[ expando ] = {});
                            cache = outerCache[ type ] || [];
                            nodeIndex = cache[0] === dirruns && cache[1];
                            diff = cache[0] === dirruns && cache[2];
                            node = nodeIndex && parent.childNodes[ nodeIndex ];

                            while ( (node = ++nodeIndex && node && node[ dir ] ||

                                // Fallback to seeking `elem` from the start
                                (diff = nodeIndex = 0) || start.pop()) ) {

                                // When found, cache indexes on `parent` and break
                                if ( node.nodeType === 1 && ++diff && node === elem ) {
                                    outerCache[ type ] = [ dirruns, nodeIndex, diff ];
                                    break;
                                }
                            }

                        // Use previously-cached element index if available
                        } else if ( useCache && (cache = (elem[ expando ] || (elem[ expando ] = {}))[ type ]) && cache[0] === dirruns ) {
                            diff = cache[1];

                        // xml :nth-child(...) or :nth-last-child(...) or :nth(-last)?-of-type(...)
                        } else {
                            // Use the same loop as above to seek `elem` from the start
                            while ( (node = ++nodeIndex && node && node[ dir ] ||
                                (diff = nodeIndex = 0) || start.pop()) ) {

                                if ( ( ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1 ) && ++diff ) {
                                    // Cache the index of each encountered element
                                    if ( useCache ) {
                                        (node[ expando ] || (node[ expando ] = {}))[ type ] = [ dirruns, diff ];
                                    }

                                    if ( node === elem ) {
                                        break;
                                    }
                                }
                            }
                        }

                        // Incorporate the offset, then check against cycle size
                        diff -= last;
                        return diff === first || ( diff % first === 0 && diff / first >= 0 );
                    }
                };
        },

        "PSEUDO": function( pseudo, argument ) {
            // pseudo-class names are case-insensitive
            // http://www.w3.org/TR/selectors/#pseudo-classes
            // Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
            // Remember that setFilters inherits from pseudos
            var args,
                fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
                    Sizzle.error( "unsupported pseudo: " + pseudo );

            // The user may use createPseudo to indicate that
            // arguments are needed to create the filter function
            // just as Sizzle does
            if ( fn[ expando ] ) {
                return fn( argument );
            }

            // But maintain support for old signatures
            if ( fn.length > 1 ) {
                args = [ pseudo, pseudo, "", argument ];
                return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
                    markFunction(function( seed, matches ) {
                        var idx,
                            matched = fn( seed, argument ),
                            i = matched.length;
                        while ( i-- ) {
                            idx = indexOf( seed, matched[i] );
                            seed[ idx ] = !( matches[ idx ] = matched[i] );
                        }
                    }) :
                    function( elem ) {
                        return fn( elem, 0, args );
                    };
            }

            return fn;
        }
    },

    pseudos: {
        // Potentially complex pseudos
        "not": markFunction(function( selector ) {
            // Trim the selector passed to compile
            // to avoid treating leading and trailing
            // spaces as combinators
            var input = [],
                results = [],
                matcher = compile( selector.replace( rtrim, "$1" ) );

            return matcher[ expando ] ?
                markFunction(function( seed, matches, context, xml ) {
                    var elem,
                        unmatched = matcher( seed, null, xml, [] ),
                        i = seed.length;

                    // Match elements unmatched by `matcher`
                    while ( i-- ) {
                        if ( (elem = unmatched[i]) ) {
                            seed[i] = !(matches[i] = elem);
                        }
                    }
                }) :
                function( elem, context, xml ) {
                    input[0] = elem;
                    matcher( input, null, xml, results );
                    return !results.pop();
                };
        }),

        "has": markFunction(function( selector ) {
            return function( elem ) {
                return Sizzle( selector, elem ).length > 0;
            };
        }),

        "contains": markFunction(function( text ) {
            text = text.replace( runescape, funescape );
            return function( elem ) {
                return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
            };
        }),

        // "Whether an element is represented by a :lang() selector
        // is based solely on the element's language value
        // being equal to the identifier C,
        // or beginning with the identifier C immediately followed by "-".
        // The matching of C against the element's language value is performed case-insensitively.
        // The identifier C does not have to be a valid language name."
        // http://www.w3.org/TR/selectors/#lang-pseudo
        "lang": markFunction( function( lang ) {
            // lang value must be a valid identifier
            if ( !ridentifier.test(lang || "") ) {
                Sizzle.error( "unsupported lang: " + lang );
            }
            lang = lang.replace( runescape, funescape ).toLowerCase();
            return function( elem ) {
                var elemLang;
                do {
                    if ( (elemLang = documentIsHTML ?
                        elem.lang :
                        elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

                        elemLang = elemLang.toLowerCase();
                        return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
                    }
                } while ( (elem = elem.parentNode) && elem.nodeType === 1 );
                return false;
            };
        }),

        // Miscellaneous
        "target": function( elem ) {
            var hash = window.location && window.location.hash;
            return hash && hash.slice( 1 ) === elem.id;
        },

        "root": function( elem ) {
            return elem === docElem;
        },

        "focus": function( elem ) {
            return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
        },

        // Boolean properties
        "enabled": function( elem ) {
            return elem.disabled === false;
        },

        "disabled": function( elem ) {
            return elem.disabled === true;
        },

        "checked": function( elem ) {
            // In CSS3, :checked should return both checked and selected elements
            // http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
            var nodeName = elem.nodeName.toLowerCase();
            return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
        },

        "selected": function( elem ) {
            // Accessing this property makes selected-by-default
            // options in Safari work properly
            if ( elem.parentNode ) {
                elem.parentNode.selectedIndex;
            }

            return elem.selected === true;
        },

        // Contents
        "empty": function( elem ) {
            // http://www.w3.org/TR/selectors/#empty-pseudo
            // :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
            //   but not by others (comment: 8; processing instruction: 7; etc.)
            // nodeType < 6 works because attributes (2) do not appear as children
            for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
                if ( elem.nodeType < 6 ) {
                    return false;
                }
            }
            return true;
        },

        "parent": function( elem ) {
            return !Expr.pseudos["empty"]( elem );
        },

        // Element/input types
        "header": function( elem ) {
            return rheader.test( elem.nodeName );
        },

        "input": function( elem ) {
            return rinputs.test( elem.nodeName );
        },

        "button": function( elem ) {
            var name = elem.nodeName.toLowerCase();
            return name === "input" && elem.type === "button" || name === "button";
        },

        "text": function( elem ) {
            var attr;
            return elem.nodeName.toLowerCase() === "input" &&
                elem.type === "text" &&

                // Support: IE<8
                // New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
                ( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
        },

        // Position-in-collection
        "first": createPositionalPseudo(function() {
            return [ 0 ];
        }),

        "last": createPositionalPseudo(function( matchIndexes, length ) {
            return [ length - 1 ];
        }),

        "eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
            return [ argument < 0 ? argument + length : argument ];
        }),

        "even": createPositionalPseudo(function( matchIndexes, length ) {
            var i = 0;
            for ( ; i < length; i += 2 ) {
                matchIndexes.push( i );
            }
            return matchIndexes;
        }),

        "odd": createPositionalPseudo(function( matchIndexes, length ) {
            var i = 1;
            for ( ; i < length; i += 2 ) {
                matchIndexes.push( i );
            }
            return matchIndexes;
        }),

        "lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
            var i = argument < 0 ? argument + length : argument;
            for ( ; --i >= 0; ) {
                matchIndexes.push( i );
            }
            return matchIndexes;
        }),

        "gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
            var i = argument < 0 ? argument + length : argument;
            for ( ; ++i < length; ) {
                matchIndexes.push( i );
            }
            return matchIndexes;
        })
    }
};

Expr.pseudos["nth"] = Expr.pseudos["eq"];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
    Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
    Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
    var matched, match, tokens, type,
        soFar, groups, preFilters,
        cached = tokenCache[ selector + " " ];

    if ( cached ) {
        return parseOnly ? 0 : cached.slice( 0 );
    }

    soFar = selector;
    groups = [];
    preFilters = Expr.preFilter;

    while ( soFar ) {

        // Comma and first run
        if ( !matched || (match = rcomma.exec( soFar )) ) {
            if ( match ) {
                // Don't consume trailing commas as valid
                soFar = soFar.slice( match[0].length ) || soFar;
            }
            groups.push( (tokens = []) );
        }

        matched = false;

        // Combinators
        if ( (match = rcombinators.exec( soFar )) ) {
            matched = match.shift();
            tokens.push({
                value: matched,
                // Cast descendant combinators to space
                type: match[0].replace( rtrim, " " )
            });
            soFar = soFar.slice( matched.length );
        }

        // Filters
        for ( type in Expr.filter ) {
            if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
                (match = preFilters[ type ]( match ))) ) {
                matched = match.shift();
                tokens.push({
                    value: matched,
                    type: type,
                    matches: match
                });
                soFar = soFar.slice( matched.length );
            }
        }

        if ( !matched ) {
            break;
        }
    }

    // Return the length of the invalid excess
    // if we're just parsing
    // Otherwise, throw an error or return tokens
    return parseOnly ?
        soFar.length :
        soFar ?
            Sizzle.error( selector ) :
            // Cache the tokens
            tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
    var i = 0,
        len = tokens.length,
        selector = "";
    for ( ; i < len; i++ ) {
        selector += tokens[i].value;
    }
    return selector;
}

function addCombinator( matcher, combinator, base ) {
    var dir = combinator.dir,
        checkNonElements = base && dir === "parentNode",
        doneName = done++;

    return combinator.first ?
        // Check against closest ancestor/preceding element
        function( elem, context, xml ) {
            while ( (elem = elem[ dir ]) ) {
                if ( elem.nodeType === 1 || checkNonElements ) {
                    return matcher( elem, context, xml );
                }
            }
        } :

        // Check against all ancestor/preceding elements
        function( elem, context, xml ) {
            var oldCache, outerCache,
                newCache = [ dirruns, doneName ];

            // We can't set arbitrary data on XML nodes, so they don't benefit from dir caching
            if ( xml ) {
                while ( (elem = elem[ dir ]) ) {
                    if ( elem.nodeType === 1 || checkNonElements ) {
                        if ( matcher( elem, context, xml ) ) {
                            return true;
                        }
                    }
                }
            } else {
                while ( (elem = elem[ dir ]) ) {
                    if ( elem.nodeType === 1 || checkNonElements ) {
                        outerCache = elem[ expando ] || (elem[ expando ] = {});
                        if ( (oldCache = outerCache[ dir ]) &&
                            oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

                            // Assign to newCache so results back-propagate to previous elements
                            return (newCache[ 2 ] = oldCache[ 2 ]);
                        } else {
                            // Reuse newcache so results back-propagate to previous elements
                            outerCache[ dir ] = newCache;

                            // A match means we're done; a fail means we have to keep checking
                            if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
                                return true;
                            }
                        }
                    }
                }
            }
        };
}

function elementMatcher( matchers ) {
    return matchers.length > 1 ?
        function( elem, context, xml ) {
            var i = matchers.length;
            while ( i-- ) {
                if ( !matchers[i]( elem, context, xml ) ) {
                    return false;
                }
            }
            return true;
        } :
        matchers[0];
}

function multipleContexts( selector, contexts, results ) {
    var i = 0,
        len = contexts.length;
    for ( ; i < len; i++ ) {
        Sizzle( selector, contexts[i], results );
    }
    return results;
}

function condense( unmatched, map, filter, context, xml ) {
    var elem,
        newUnmatched = [],
        i = 0,
        len = unmatched.length,
        mapped = map != null;

    for ( ; i < len; i++ ) {
        if ( (elem = unmatched[i]) ) {
            if ( !filter || filter( elem, context, xml ) ) {
                newUnmatched.push( elem );
                if ( mapped ) {
                    map.push( i );
                }
            }
        }
    }

    return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
    if ( postFilter && !postFilter[ expando ] ) {
        postFilter = setMatcher( postFilter );
    }
    if ( postFinder && !postFinder[ expando ] ) {
        postFinder = setMatcher( postFinder, postSelector );
    }
    return markFunction(function( seed, results, context, xml ) {
        var temp, i, elem,
            preMap = [],
            postMap = [],
            preexisting = results.length,

            // Get initial elements from seed or context
            elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

            // Prefilter to get matcher input, preserving a map for seed-results synchronization
            matcherIn = preFilter && ( seed || !selector ) ?
                condense( elems, preMap, preFilter, context, xml ) :
                elems,

            matcherOut = matcher ?
                // If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
                postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

                    // ...intermediate processing is necessary
                    [] :

                    // ...otherwise use results directly
                    results :
                matcherIn;

        // Find primary matches
        if ( matcher ) {
            matcher( matcherIn, matcherOut, context, xml );
        }

        // Apply postFilter
        if ( postFilter ) {
            temp = condense( matcherOut, postMap );
            postFilter( temp, [], context, xml );

            // Un-match failing elements by moving them back to matcherIn
            i = temp.length;
            while ( i-- ) {
                if ( (elem = temp[i]) ) {
                    matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
                }
            }
        }

        if ( seed ) {
            if ( postFinder || preFilter ) {
                if ( postFinder ) {
                    // Get the final matcherOut by condensing this intermediate into postFinder contexts
                    temp = [];
                    i = matcherOut.length;
                    while ( i-- ) {
                        if ( (elem = matcherOut[i]) ) {
                            // Restore matcherIn since elem is not yet a final match
                            temp.push( (matcherIn[i] = elem) );
                        }
                    }
                    postFinder( null, (matcherOut = []), temp, xml );
                }

                // Move matched elements from seed to results to keep them synchronized
                i = matcherOut.length;
                while ( i-- ) {
                    if ( (elem = matcherOut[i]) &&
                        (temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

                        seed[temp] = !(results[temp] = elem);
                    }
                }
            }

        // Add elements to results, through postFinder if defined
        } else {
            matcherOut = condense(
                matcherOut === results ?
                    matcherOut.splice( preexisting, matcherOut.length ) :
                    matcherOut
            );
            if ( postFinder ) {
                postFinder( null, results, matcherOut, xml );
            } else {
                push.apply( results, matcherOut );
            }
        }
    });
}

function matcherFromTokens( tokens ) {
    var checkContext, matcher, j,
        len = tokens.length,
        leadingRelative = Expr.relative[ tokens[0].type ],
        implicitRelative = leadingRelative || Expr.relative[" "],
        i = leadingRelative ? 1 : 0,

        // The foundational matcher ensures that elements are reachable from top-level context(s)
        matchContext = addCombinator( function( elem ) {
            return elem === checkContext;
        }, implicitRelative, true ),
        matchAnyContext = addCombinator( function( elem ) {
            return indexOf( checkContext, elem ) > -1;
        }, implicitRelative, true ),
        matchers = [ function( elem, context, xml ) {
            return ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
                (checkContext = context).nodeType ?
                    matchContext( elem, context, xml ) :
                    matchAnyContext( elem, context, xml ) );
        } ];

    for ( ; i < len; i++ ) {
        if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
            matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
        } else {
            matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

            // Return special upon seeing a positional matcher
            if ( matcher[ expando ] ) {
                // Find the next relative operator (if any) for proper handling
                j = ++i;
                for ( ; j < len; j++ ) {
                    if ( Expr.relative[ tokens[j].type ] ) {
                        break;
                    }
                }
                return setMatcher(
                    i > 1 && elementMatcher( matchers ),
                    i > 1 && toSelector(
                        // If the preceding token was a descendant combinator, insert an implicit any-element `*`
                        tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
                    ).replace( rtrim, "$1" ),
                    matcher,
                    i < j && matcherFromTokens( tokens.slice( i, j ) ),
                    j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
                    j < len && toSelector( tokens )
                );
            }
            matchers.push( matcher );
        }
    }

    return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
    var bySet = setMatchers.length > 0,
        byElement = elementMatchers.length > 0,
        superMatcher = function( seed, context, xml, results, outermost ) {
            var elem, j, matcher,
                matchedCount = 0,
                i = "0",
                unmatched = seed && [],
                setMatched = [],
                contextBackup = outermostContext,
                // We must always have either seed elements or outermost context
                elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
                // Use integer dirruns iff this is the outermost matcher
                dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
                len = elems.length;

            if ( outermost ) {
                outermostContext = context !== document && context;
            }

            // Add elements passing elementMatchers directly to results
            // Keep `i` a string if there are no elements so `matchedCount` will be "00" below
            // Support: IE<9, Safari
            // Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
            for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
                if ( byElement && elem ) {
                    j = 0;
                    while ( (matcher = elementMatchers[j++]) ) {
                        if ( matcher( elem, context, xml ) ) {
                            results.push( elem );
                            break;
                        }
                    }
                    if ( outermost ) {
                        dirruns = dirrunsUnique;
                    }
                }

                // Track unmatched elements for set filters
                if ( bySet ) {
                    // They will have gone through all possible matchers
                    if ( (elem = !matcher && elem) ) {
                        matchedCount--;
                    }

                    // Lengthen the array for every element, matched or not
                    if ( seed ) {
                        unmatched.push( elem );
                    }
                }
            }

            // Apply set filters to unmatched elements
            matchedCount += i;
            if ( bySet && i !== matchedCount ) {
                j = 0;
                while ( (matcher = setMatchers[j++]) ) {
                    matcher( unmatched, setMatched, context, xml );
                }

                if ( seed ) {
                    // Reintegrate element matches to eliminate the need for sorting
                    if ( matchedCount > 0 ) {
                        while ( i-- ) {
                            if ( !(unmatched[i] || setMatched[i]) ) {
                                setMatched[i] = pop.call( results );
                            }
                        }
                    }

                    // Discard index placeholder values to get only actual matches
                    setMatched = condense( setMatched );
                }

                // Add matches to results
                push.apply( results, setMatched );

                // Seedless set matches succeeding multiple successful matchers stipulate sorting
                if ( outermost && !seed && setMatched.length > 0 &&
                    ( matchedCount + setMatchers.length ) > 1 ) {

                    Sizzle.uniqueSort( results );
                }
            }

            // Override manipulation of globals by nested matchers
            if ( outermost ) {
                dirruns = dirrunsUnique;
                outermostContext = contextBackup;
            }

            return unmatched;
        };

    return bySet ?
        markFunction( superMatcher ) :
        superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
    var i,
        setMatchers = [],
        elementMatchers = [],
        cached = compilerCache[ selector + " " ];

    if ( !cached ) {
        // Generate a function of recursive functions that can be used to check each element
        if ( !match ) {
            match = tokenize( selector );
        }
        i = match.length;
        while ( i-- ) {
            cached = matcherFromTokens( match[i] );
            if ( cached[ expando ] ) {
                setMatchers.push( cached );
            } else {
                elementMatchers.push( cached );
            }
        }

        // Cache the compiled function
        cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

        // Save selector and tokenization
        cached.selector = selector;
    }
    return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
    var i, tokens, token, type, find,
        compiled = typeof selector === "function" && selector,
        match = !seed && tokenize( (selector = compiled.selector || selector) );

    results = results || [];

    // Try to minimize operations if there is no seed and only one group
    if ( match.length === 1 ) {

        // Take a shortcut and set the context if the root selector is an ID
        tokens = match[0] = match[0].slice( 0 );
        if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
                support.getById && context.nodeType === 9 && documentIsHTML &&
                Expr.relative[ tokens[1].type ] ) {

            context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
            if ( !context ) {
                return results;

            // Precompiled matchers will still verify ancestry, so step up a level
            } else if ( compiled ) {
                context = context.parentNode;
            }

            selector = selector.slice( tokens.shift().value.length );
        }

        // Fetch a seed set for right-to-left matching
        i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
        while ( i-- ) {
            token = tokens[i];

            // Abort if we hit a combinator
            if ( Expr.relative[ (type = token.type) ] ) {
                break;
            }
            if ( (find = Expr.find[ type ]) ) {
                // Search, expanding context for leading sibling combinators
                if ( (seed = find(
                    token.matches[0].replace( runescape, funescape ),
                    rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
                )) ) {

                    // If seed is empty or no tokens remain, we can return early
                    tokens.splice( i, 1 );
                    selector = seed.length && toSelector( tokens );
                    if ( !selector ) {
                        push.apply( results, seed );
                        return results;
                    }

                    break;
                }
            }
        }
    }

    // Compile and execute a filtering function if one is not provided
    // Provide `match` to avoid retokenization if we modified the selector above
    ( compiled || compile( selector, match ) )(
        seed,
        context,
        !documentIsHTML,
        results,
        rsibling.test( selector ) && testContext( context.parentNode ) || context
    );
    return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert(function( div1 ) {
    // Should return 1, but returns 4 (following)
    return div1.compareDocumentPosition( document.createElement("div") ) & 1;
});

// Support: IE<8
// Prevent attribute/property "interpolation"
// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert(function( div ) {
    div.innerHTML = "<a href='#'></a>";
    return div.firstChild.getAttribute("href") === "#" ;
}) ) {
    addHandle( "type|href|height|width", function( elem, name, isXML ) {
        if ( !isXML ) {
            return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
        }
    });
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert(function( div ) {
    div.innerHTML = "<input/>";
    div.firstChild.setAttribute( "value", "" );
    return div.firstChild.getAttribute( "value" ) === "";
}) ) {
    addHandle( "value", function( elem, name, isXML ) {
        if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
            return elem.defaultValue;
        }
    });
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert(function( div ) {
    return div.getAttribute("disabled") == null;
}) ) {
    addHandle( booleans, function( elem, name, isXML ) {
        var val;
        if ( !isXML ) {
            return elem[ name ] === true ? name.toLowerCase() :
                    (val = elem.getAttributeNode( name )) && val.specified ?
                    val.value :
                null;
        }
    });
}

// EXPOSE
if ( typeof define === "function" && define.amd ) {
    define('Sizzle',[],function() { return Sizzle; });
// Sizzle requires that there be a global window in Common-JS like environments
} else if ( typeof module !== "undefined" && module.exports ) {
    module.exports = Sizzle;
} else {
    window.Sizzle = Sizzle;
}
// EXPOSE

})( window );
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!bkgraph/html/personList.html',[],function () { return '<!-- target: personlist -->\r\n<!-- if: ${entities.length} -->\r\n<ul>\r\n    <!-- for: ${entities} as ${entity}-->\r\n    <li class="bkg-person" data-bkg-entity-id="${entity.ID}">\r\n        <img data-src="${entity.imageSquare}" alt="">\r\n        <h5>${entity.name}</h5>\r\n    </li>\r\n    <!-- /for -->\r\n</ul>\r\n<!-- else -->\r\n<ul>\r\n    <li class="bkg-empty">暂时没在TA的人脉圈中找到这个人哟~</li>\r\n</ul>\r\n<!-- /if -->';});

define('text!bkgraph/html/searchBar.html',[],function () { return '<div class="bkg-search">\r\n    <h3>人物搜索</h3>\r\n    <div class="bkg-search-input">\r\n        <input type="text" placeholder="输入看看${mainEntity.name}与TA之间的关系哟">\r\n        <!-- <div class="bkg-search-btn"></div> -->\r\n    </div>\r\n</div>\r\n<div class="bkg-person-list">\r\n    <div class="bkg-prev-page disable"></div>\r\n    <div class="bkg-person-list-viewport">\r\n    <!-- import: personlist-->\r\n    </div>\r\n    <div class="bkg-next-page"></div>\r\n</div>\r\n<div class="bkg-toggle">显 示</div>';});

define('bkgraph/component/SearchBar',['require','./Component','zrender/tool/util','etpl','../util/util','Sizzle','text!../html/personList.html','text!../html/searchBar.html'],function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var renderPersonList = etpl.compile(require('text!../html/personList.html'));
    var renderSearchbar = etpl.compile(require('text!../html/searchBar.html'));

    var SearchBar = function () {

        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
    }

    SearchBar.prototype.type = 'SEARCHBAR';

    SearchBar.prototype.initialize = function (kg, data) {
        
        this._kgraph = kg;

        var el = this.el;
        el.className = 'bkg-searchbar hidden';

        // 使用空数据
        this.render(data);
    }

    SearchBar.prototype.setData = function (data) {
        this.render(data);
    }

    SearchBar.prototype.render = function (data) {
        this.el.innerHTML = renderSearchbar(data);

        this._$viewport = Sizzle('.bkg-person-list-viewport', this.el)[0];
        this._$prevPageBtn = Sizzle('.bkg-prev-page', this.el)[0];
        this._$nextPageBtn = Sizzle('.bkg-next-page', this.el)[0];
        this._$input = Sizzle('.bkg-search-input input', this.el)[0];
        this._$toggleBtn = Sizzle('.bkg-toggle', this.el)[0];

        this._viewportWidth = this._$viewport.clientWidth;

        this._itemWidth = Sizzle

        var self = this;
        util.addEventListener(this._$input, 'keydown', util.debounce(function () {
            self.filter(self._$input.value);
        }, 200));

        this._updateSlider();
    }

    SearchBar.prototype.resize = function (w, h) {
        // Do nothing
    }

    /**
     * 显示搜索栏
     */
    SearchBar.prototype.hide = function () {
        util.addClass(this.el, 'hidden');
        this._$toggleBtn.innerHTML = '显 示';
    }

    /**
     * 隐藏搜索栏
     */
    SearchBar.prototype.show = function () {
        util.removeClass(this.el, 'hidden');
        this._$toggleBtn.innerHTML = '隐 藏';
    }

    /**
     * 切换搜索栏的显示隐藏
     */
    SearchBar.prototype.toggle = function () {
        if (util.hasClass(this.el, 'hidden')) {
            this.show();
        }
        else {
            this.hide();
        }
    }

    /**
     * 人物列表翻到下一页
     */
    SearchBar.prototype.nextPage = function () {
        if (this._isLastPage) {
            return;
        }

        this._left += this._viewportWidth;
        if (this._left + this._viewportWidth > this._width) {
            this._left = this._width - this._viewportWidth;
            this._isLastPage = true;

            util.addClass(this._$nextPageBtn, 'disable');
        }
        this._$list.style.left = -this._left + 'px';

        this._isFirstPage = false;
        util.removeClass(this._$prevPageBtn, 'disable');

        this._loadImage();
    }
    /**
     * 人物列表翻到上一页
     */
    SearchBar.prototype.prevPage = function () {
        if (this._isFirstPage) {
            return;
        }

        this._left -= this._viewportWidth;
        if (this._left < 0) {
            this._left = 0;
            this._isFirstPage = true;
            util.addClass(this._$prevPageBtn, 'disable');
        }

        this._$list.style.left = -this._left + 'px';

        this._isLastPage = false;
        util.removeClass(this._$nextPageBtn, 'disable');


        this._loadImage();
    }

    /**
     * 过滤人物
     */
    SearchBar.prototype.filter = function (name) {
        var data = this._kgraph.getRawData();
        var entities = [];
        if (!name) {
            entities = data.entities;
        } else {
            for (var i = 0; i < data.entities.length; i++) {
                if (data.entities[i].name.indexOf(name) >= 0) {
                    entities.push(data.entities[i]);
                }
            }
        }
        this._$viewport.innerHTML = renderPersonList({
            entities: entities
        });

        this._updateSlider();
    }

    /**
     * 点击人物
     */
    SearchBar.prototype.clickPerson = function (id) {
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        if (graphMain) {
            graphMain.highlightNodeToMain(id);
            graphMain.moveToEntity(id);
        }
    }

    SearchBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-prev-page')) {
            this.prevPage();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-next-page')) {
            this.nextPage();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle();
        }
        else if (Sizzle.matchesSelector(target, '.bkg-person *')) {
            var parent = target;
            while (parent) {
                if (parent.className.indexOf('bkg-person') >= 0) {
                    break;
                }
                parent = target.parentNode;
            }
            this.clickPerson(parent.getAttribute('data-bkg-entity-id'));
        }
    }

    SearchBar.prototype._updateSlider = function () {
        this._$list = Sizzle('ul', this._$viewport)[0];
        this._width = this._$list.clientWidth;
        
        this._isLastPage = false;
        this._isFirstPage = true;

        if (this._width < this._viewportWidth) {
            this._isLastPage = true;
        }
        this._isLastPage ? 
            util.addClass(this._$nextPageBtn, 'disable')
            : util.removeClass(this._$nextPageBtn, 'disable');
        this._isFirstPage ?
            util.addClass(this._$prevPageBtn, 'disable')
            : util.removeClass(this._$prevPageBtn, 'disable');

        this._left = 0;

        this._$imageList = Sizzle('li img', this._$list);
        var $img = this._$imageList[0];
        if ($img) {
            var $li = $img.parentNode;
            this._itemWidth = $li.clientWidth;
            var style = util.getStyle($li);
            this._itemWidth += parseInt(style['margin-left']) + parseInt(style['margin-right']);
        }

        this._loadImage();
    }

    SearchBar.prototype._loadImage = function () {
        var start = Math.floor(this._left / this._itemWidth);
        var end = Math.ceil((this._left + this._viewportWidth) / this._itemWidth);
        for (var i = start; i < end; i++) {
            var $item = this._$imageList[i];
            if ($item && !$item.getAttribute('src')) {
                $item.src = $item.getAttribute('data-src');
            }
        }
    }

    zrUtil.inherits(SearchBar, Component);

    return SearchBar;
});
define('bkgraph/util/ScrollBar',['require','./util','Sizzle'],function (require) {

    var util = require('./util');
    var Sizzle = require('Sizzle');

    var ScrollBar = function (content) {

        this._$viewport = content.parentNode;

        this._$content = content;

        this._$scrollButton = null;

        this._$scrollBar = null;

        this._scroll = 0;

        this._onMouseDown = util.bind(this._onMouseDown, this);
        this._onMouseMove = util.bind(this._onMouseMove, this);
        this._onMouseUp = util.bind(this._onMouseUp, this);
        this._onMouseScroll = util.bind(this._onMouseScroll, this);

        this._init();

        this._sx = 0;
        this._sy = 0;
        this._thumbTop = 0;
    };

    ScrollBar.prototype._init = function () {
        if (util.getStyle(this._$viewport, 'position') !== 'absolute') {
            this._$viewport.style.position = 'relative';
        }
        util.addClass(this._$viewport, 'bkg-scrollbar-viewport');
        util.addClass(this._$content, 'bkg-scrollbar-content');

        this._$scrollButton = document.createElement('div');
        this._$scrollButton.className = 'bkg-scrollbar-button';
        this._$scrollBar = document.createElement('div');
        this._$scrollBar.className = 'bkg-scrollbar-bar-y';

        this._$viewport.appendChild(this._$scrollBar);
        this._$scrollBar.appendChild(this._$scrollButton);

        util.addEventListener(this._$scrollButton, 'mousedown', this._onMouseDown);

        util.addEventListener(this._$viewport, 'mousewheel', this._onMouseScroll);
        util.addEventListener(this._$viewport, 'DOMMouseScroll', this._onMouseScroll);

        this.resize();
    };

    ScrollBar.prototype._onMouseDown = function (e) {
        util.addEventListener(document.body, 'mousemove', this._onMouseMove);
        util.addEventListener(document.body, 'mouseup', this._onMouseUp);

        this._sx = e.screenX;
        this._sy = e.screenY;
    };

    ScrollBar.prototype._onMouseUp = function () {
        util.removeEventListener(document.body, 'mouseup', this._onMouseUp);
        util.removeEventListener(document.body, 'mousemove', this._onMouseMove);
    };

    ScrollBar.prototype._onMouseMove = function (e) {
        this._thumbTop += e.screenY - this._sy;

        this._thumbTop = Math.max(this._thumbTop, 0);

        var max = this._scrollBarHeight - this._scrollButtonHeight;
        this._thumbTop = Math.min(max, this._thumbTop);

        this._$scrollButton.style.top = this._thumbTop + 'px';
        this._scroll = (this._contentHeight - this._viewportHeight) * this._thumbTop / max;
        this._$content.style.top = -this._scroll + 'px';

        this._sy = e.screenY;
        this._sx = e.screenX;
    };

    ScrollBar.prototype._onMouseScroll = function (e) {
        var delta = e.wheelDelta    // Webkit
            || -e.detail * 5;   // Firefox

        this.scrollTo(this._scroll - delta);
    }

    ScrollBar.prototype.scrollTo = function (scroll) {
        scroll = Math.max(0, scroll);

        var max = this._contentHeight - this._viewportHeight;
        if (max < 0) {
            return;
        }
        scroll = Math.min(scroll, max);

        this._scroll = scroll;

        this._$content.style.top = -scroll + 'px';

        this._thumbTop = (this._scrollBarHeight - this._scrollButtonHeight) * scroll / max;
        this._$scrollButton.style.top = this._thumbTop + 'px';
    };

    ScrollBar.prototype.resize = function () {
        this._contentHeight = parseInt(this._$content.clientHeight);
        this._viewportHeight = parseInt(this._$viewport.clientHeight);

        if (this._viewportHeight > this._contentHeight) {
            this._$scrollBar.style.display = 'none';
            return;
        } else {
            this._$scrollBar.style.display = 'block';
        }

        this._scrollBarHeight = parseInt(this._$scrollBar.clientHeight);
        var thumbHeight = this._scrollBarHeight * this._viewportHeight / this._contentHeight;
        this._scrollButtonHeight = thumbHeight;

        this._$scrollButton.style.height = thumbHeight + 'px';
    }

    return ScrollBar;
});
define('text!bkgraph/html/sideBarModule.html',[],function () { return '<!-- target: sidebarNews -->\r\n<div class="bkg-news bkg-sidebar-module">\r\n    <div class="bkg-module-title">\r\n        <div class="bkg-circle"></div>\r\n        <!-- block: newsModuleTitle -->\r\n        <h4 class="bkg-title">最新动态</h4>\r\n        <!-- /block -->\r\n    </div>\r\n    <ul>\r\n        <!-- for: ${news} as ${new}, ${index} -->\r\n        <li class="bkg-news-item">\r\n            <div class="bkg-circle"></div>\r\n            <a href="${new.url}" target="_blank" class="bkg-news-title">\r\n            ${new.title|truncate(20)}\r\n            </a>\r\n            <!-- if: ${index} == 0 -->\r\n            <p class="bkg-news-summary">${new.summary}</p>\r\n            <!-- /if-->\r\n            <div class="bkg-news-tail">\r\n                <a class="bkg-news-source" href="${new.url}" target="_blank">${new.source}</a>\r\n                <span class="bkg-news-publish-time">${new.publishTime|truncate(10, \'\')}</span>\r\n            </div>\r\n        </li>\r\n        <!-- /for -->\r\n    </ul>\r\n</div>\r\n\r\n<!-- target: sidebarWeibo -->\r\n<div class="bkg-weibo bkg-sidebar-module">\r\n    <div class="bkg-module-title">\r\n        <div class="bkg-circle"></div>\r\n        <h4>新浪微博</h4>\r\n    </div>\r\n    <div class="bkg-weibo-info">\r\n        <img class="bkg-left" src="${weibo.image}" alt="">\r\n        <div class="bkg-right">\r\n            <h5>${weibo.name}</h5>\r\n            <p>粉丝: ${weibo.fans}&nbsp;&nbsp;微博: ${weibo.weiboNum}</p>\r\n        </div>\r\n    </div>\r\n    <div class="bkg-latest-weibo">\r\n        <p class="bkg-latest-weibo-content">${weibo.latestWeibo|trim}<a href="${weibo.latestWeiboUrl}" target="_blank">查看全文</a></p>\r\n        <div class="bkg-latest-weibo-info">\r\n            <span class="bkg-latest-weibo-time" target="_blank">${weibo.latestWeiboTime}</span>\r\n            <a class="bkg-latest-weibo-comment" href="${weibo.latestWeiboUrl}" target="_blank">${weibo.latestWeiboComment}</a>\r\n            <a class="bkg-latest-weibo-forward" href="${weibo.latestWeiboUrl}" target="_blank">${weibo.latestWeiboForward}</a>\r\n        </div>\r\n    </div>\r\n    <div style="clear:both;"></div>\r\n</div>\r\n\r\n<!-- target: sidebarWorks -->\r\n<div class="bkg-works bkg-sidebar-module">\r\n    <div class="bkg-module-title">\r\n        <div class="bkg-circle"></div>\r\n        <h4>主要代表作品</h4>\r\n    </div>\r\n    <ul>\r\n    <!-- for: ${representativeWork} as ${work}, ${idx} -->\r\n        <li>\r\n            <a href="${work.movieRedir}" target="_blank">\r\n                <img src="${work.movieImage}" alt="" />\r\n                <span class="bkg-work-title">${work.movieName}</span>\r\n            </a>\r\n        </li>\r\n    <!-- /for -->\r\n    </ul>\r\n</div>\r\n\r\n<!-- target: sidebarRelationNews(master=sidebarNews) -->\r\n<!-- block: newsModuleTitle -->\r\n<h4 class="bkg-title"> ${fromEntity.name} 和 ${toEntity.name} 的最新动态</h4>\r\n<!-- /block -->';});

define('text!bkgraph/html/entityDetail.html',[],function () { return '<div class="bkg-entity-detail">\r\n    <div class="bkg-entity-detail-title">\r\n        <h3>${name}信息名片</h3>\r\n    </div>\r\n    <div class="bkg-sidebar-module bkg-person-info">\r\n        <div class="bkg-module-title">\r\n            <div class="bkg-circle"></div>\r\n            <h4>基本信息 百度百科</h4>\r\n        </div>\r\n        <img class="bkg-person-pic" src="${imageSquare}" />\r\n        <div class="bkg-person-description">\r\n            <p><b>出生:</b> ${birthDate|raw}</p>\r\n            <p>\r\n                <b>简介:</b> ${introduction.content|truncate(72)}\r\n                <a href="${sourceUrl}" class="bkg-more" target="_blank">更多>></a>\r\n            </p>\r\n        </div>\r\n        <div style="clear:both;"></div>\r\n    </div>\r\n    <!-- if: ${news} -->\r\n    <!-- import: sidebarNews -->\r\n    <!-- /if -->\r\n    <!-- if: ${weibo} -->\r\n    <!-- import: sidebarWeibo -->\r\n    <!-- /if -->\r\n    <!-- if: ${representativeWork} -->\r\n    <!-- import: sidebarWorks -->\r\n    <!-- /if -->\r\n    <div class="bkg-detail-bottom-line"></div>\r\n    <div class="bkg-detail-bottom"></div>\r\n</div>\r\n<!-- 留40px 的空白 -->\r\n<div style="height:40px;"></div>';});

define('text!bkgraph/html/relationDetail.html',[],function () { return '<div class="bkg-relation-detail">\r\n    <div class="bkg-relation-description">\r\n        <div class="bkg-relation-entity-from">\r\n            <img src="${fromEntity.imageSquare}" alt="">\r\n        </div>\r\n        <div class="bkg-relation-name">\r\n            <span>${relationName}</span>\r\n        </div>\r\n        <div class="bkg-relation-entity-to">\r\n            <img src="${toEntity.imageSquare}" alt="">\r\n        </div>\r\n        <div style="clear:both"></div>\r\n    </div>\r\n    <div class="bkg-relation-source">\r\n        <!-- if: ${relationSite} -->\r\n        <a class="bkg-relation-site"  href="${relationUrl}" target="_blank">来源: ${relationSite}</a>\r\n        <!-- else -->\r\n        <a class="bkg-relation-baidu" target="_blank">百度一下</a>\r\n        <!-- /if -->\r\n    </div>\r\n\r\n    <!-- if: ${news} -->\r\n    <!-- import: sidebarRelationNews -->\r\n    <!-- /if -->\r\n    <div class="bkg-detail-bottom-line"></div>\r\n    <div class="bkg-detail-bottom"></div>\r\n</div>\r\n<!-- 留40px 的空白 -->\r\n<div style="height:40px;"></div>';});

define('bkgraph/component/SideBar',['require','./Component','zrender/tool/util','etpl','Sizzle','../util/util','../util/ScrollBar','text!../html/sideBarModule.html','text!../html/entityDetail.html','text!../html/relationDetail.html'],function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');

    var ScrollBar = require('../util/ScrollBar');

    etpl.compile(require('text!../html/sideBarModule.html'));
    var renderEntityDetail = etpl.compile(require('text!../html/entityDetail.html'));
    var renderRelationDetail = etpl.compile(require('text!../html/relationDetail.html'));

    var SideBar = function () {
        
        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg, rawData) {
        this.el.className = 'bkg-sidebar hidden';

        this._$viewport = document.createElement('div');
        this._$viewport.className = 'bkg-sidebar-viewport';
        this.el.appendChild(this._$viewport);

        this._$content = document.createElement('div');
        this._$content.className = 'bkg-sidebar-content';
        this._$viewport.appendChild(this._$content);

        this._$toggleBtn = document.createElement('div');
        this._$toggleBtn.className = 'bkg-toggle';
        this._$toggleBtn.innerHTML = '显<br />示<br />';
        this.el.appendChild(this._$toggleBtn);

        this._scrollbar = new ScrollBar(this._$content);

        this._kgraph = kg;

        // 默认显示主要实体
        this.render(rawData.mainEntity);

        var headerBar = kg.getComponentByType('HEADERBAR');
        if (headerBar) {
            this.el.style.top = headerBar.el.clientHeight + 'px';
        }
        
        return this.el;
    }

    SideBar.prototype.resize = function (w, h) {
        this._scrollbar.resize();
    };

    SideBar.prototype.setData = function (data, isRelation) {
        this.render(data, isRelation);
    };

    SideBar.prototype.render = function (data, isRelation) {
        if (isRelation) {
            this._$content.innerHTML = renderRelationDetail(data);
        } else {
            this._$content.innerHTML = renderEntityDetail(data);
        }

        this._scrollbar.scrollTo(0);
        this._scrollbar.resize();

        // TODO
        var $relationName = Sizzle('.bkg-relation-name span', this.el)[0];
        if ($relationName) {
            $relationName.style.top = - util.getHeight($relationName) - 10 + 'px';
        }
    };

    /**
     * 显示边栏
     */
    SideBar.prototype.show = function () {
        if (util.hasClass(this.el, 'hidden')) {
            util.removeClass(this.el, 'hidden');

            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.right = -this.el.clientWidth + 'px';
            }

            this._$toggleBtn.innerHTML = '隐<br />藏<br /><';
        }
    };

    /**
     * 隐藏边栏
     */
    SideBar.prototype.hide = function () {
        if (!util.hasClass(this.el, 'hidden')) {
            util.addClass(this.el, 'hidden');

            var graphMain = this._kgraph.getComponentByType('GRAPH');
            if (graphMain) {
                graphMain.el.style.right = '0px';
            }

            this._$toggleBtn.innerHTML = '显<br />示<br />>';
        }
    };

    /**
     * 切换边栏的显示隐藏
     */
    SideBar.prototype.toggle = function () {
        if (util.hasClass(this.el, 'hidden')) {
            this.show();
        }
        else {
            this.hide();
        }
    };

    SideBar.prototype._dispatchClick= function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-toggle')) {
            this.toggle();
        }
    };

    zrUtil.inherits(SideBar, Component);

    return SideBar;
});
define('text!bkgraph/html/headerBar.html',[],function () { return '<div class="bkg-bg"></div>\r\n\r\n<h1>${name} <span style="font-weight:normal;">人物关系图谱</span></h1>\r\n<div class="bkg-explore-percent">\r\n    <span class="bkg-explore-percent-bar">\r\n        <span class="bkg-explore-percent-bar-inner"></span>\r\n        <!-- for: ${levels} as ${level}, ${index} -->\r\n        <div class="bkg-milestone" style="left:${level.position}%;"></div>\r\n        <!-- /for -->\r\n    </span>\r\n    <!-- for: ${levels} as ${level}, ${index} -->\r\n    <div class="bkg-level-${index} bkg-level" style="width:${level.interval}%; left:${level.position}%">\r\n        <div class="bkg-level-icon"></div>\r\n        <div class="bkg-level-title">${level.title}</div>\r\n    </div>\r\n    <!-- /for -->\r\n</div>\r\n\r\n<div class="bkg-share">分享</div>';});

// 所有组件样式
define('bkgraph/config',{
    levels: [
        {
            position: 0,
            title: '僵尸粉',
            content: '我真的只是路过而已，不要叫我僵尸粉啦，不过这张图还是蛮有意思的，你们也赶紧来看看啊~~~'
        },
        {
            position: 8,
            title: '初级粉',
            content: '在家宅的飞起！！！其实我看看电视电影就满足了，但是还是蛮想了解更多的，可惜出去看演唱会什么的好麻烦的！！！但是看看这张图我就什么都懂啦！！！'
        },
        {
            position: 20,
            title: '中级粉',
            content: '整天宅在家里多不好，还是要出去看看偶像的演唱会的 ，不能当终极粉我还能当个中级粉嘛！！！你想陪我一起去么，可以先看看这张图哟！！！'
        },
        {
            position: 40,
            title: '高级粉',
            content: '高级粉成就get！！！国内演唱会，我一场不漏，你们能做到么！！！先保证这张图的所有关系你都了解再来跟我PK吧！！！'
        },
        {
            position: 60,
            title: '顶级粉',
            content: '那句歌词怎么唱的，“不管世界变得怎么样，只要有你就会是天堂”，对的，有TA的地方，就会有我，想要追随我的脚步？先看看这张图吧！！！'
        },
        {
            position: 90,
            title: '私生粉',
            content: '哈哈哈！！！终于这个世界上没有人对TA的热爱程度能超过我了！！！我就是传说中的私生饭！！！想超越我？看看下面的图再说吧~~~233333'
        },
        {
            position: 100,
            title: '',
            interval: 0
        }
    ]
});
define('bkgraph/component/HeaderBar',['require','./Component','zrender/tool/util','etpl','../util/util','Sizzle','text!../html/headerBar.html','../config'],function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var renderHeaderBar = etpl.compile(require('text!../html/headerBar.html'));

    var config = require('../config');
    var levels = config.levels;

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

        var self = this;
        var $wbShareBtn = Sizzle('.bkg-share', this.el)[0];
        util.addEventListener($wbShareBtn, 'click', function (e) {
            self.weiboShare(e);
        });
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
            if (levels[i].position <= percent && (!levels[i+1] || levels[i + 1].position > percent)) {
                util.addClass(this._$levels[i], 'bkg-active');
            }
        }
    }

    HeaderBar.prototype.weiboShare = function (e) {
        var _$levels = this._$levels;
        var index = -1;
        for(var i = 0, len = _$levels.length; i < len; i++) {
            if(Sizzle.matchesSelector(_$levels[i], '.bkg-active')) {
                index = i;
            }
        }
        if(index < 0) return;

        var _param = {
            url: document.URL,
            appkey: '',
            ralateUid: '', //关联用户的id，自动@
            title: levels[index].content,
            pic: '',
            language: 'zh_cn'
        }
        var paramArr = [];
        for(var i in _param) {
            if(_param[i]) {
                paramArr.push(i + '=' + encodeURIComponent(_param[i]));
            }
        }
        var url = "http://service.weibo.com/share/share.php?" + paramArr.join('&');
        var height = 100;
        var width = 400;
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;
        window.open(url, 'newwindow', 'height=' + height + ',width=' + width + ',left=' + left + ',top=' + top); 
    }

    zrUtil.inherits(HeaderBar, Component);

    return HeaderBar;
});
// https://github.com/OscarGodson/JSONP/blob/master/JSONP.js
define('bkgraph/util/jsonp',['require'],function (require) {
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
          delete window[generatedFunction];
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
});
/**
 * @module zrender/tool/http
 */
define('zrender/tool/http',['require'],function(require) {
    /**
     * @typedef {Object} IHTTPGetOption
     * @property {string} url
     * @property {Function} onsuccess
     * @property {Function} [onerror]
     */

    /**
     * HTTP Get
     * @param {string|IHTTPGetOption} url
     * @param {Function} onsuccess
     * @param {Function} [onerror]
     * @param {Object} [opts] 额外参数
     */
    function get(url, onsuccess, onerror, opts) {
        if (typeof(url) === 'object') {
            var obj = url;
            url = obj.url;
            onsuccess = obj.onsuccess;
            onerror = obj.onerror;
            opts = obj;
        } else {
            if (typeof(onerror) === 'object') {
                opts = onerror;
            }
        }
        /* jshint ignore:start */
        var xhr = window.XMLHttpRequest
            ? new XMLHttpRequest()
            : new ActiveXObject('Microsoft.XMLHTTP');
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                    onsuccess && onsuccess(xhr.responseText);
                } else {
                    onerror && onerror();
                }
                xhr.onreadystatechange = new Function();
                xhr = null;
            }
        };

        xhr.send(null);
        /* jshint ignore:end */
    }

    return {
        get: get
    };
});
/**
 * @namespace bkgraph
 */
// TODO Entity zlevel的管理
define('bkgraph/bkgraph',['require','./component/GraphMain','./component/PanControl','./component/ZoomControl','./component/SearchBar','./component/SideBar','./component/HeaderBar','etpl','./util/jsonp','./util/util','zrender/tool/http'],function (require) {

    var GraphMain = require('./component/GraphMain');
    var PanControl = require('./component/PanControl');
    var ZoomControl = require('./component/ZoomControl');
    var SearchBar = require('./component/SearchBar');
    var SideBar = require('./component/SideBar');
    var HeaderBar = require('./component/HeaderBar');
    var etpl = require('etpl');
    var jsonp = require('./util/jsonp');
    var util = require('./util/util');

    var http = require('zrender/tool/http');

    // etpl truncate
    etpl.addFilter('truncate', util.truncate);
    // etpl trim
    etpl.addFilter('trim', util.trim);

    var TUPU_URL = 'http://cq01-ps-dev377.cq01.baidu.com:8087/tupu/api/graph/v1';

    /**
     * @alias bkgraph~BKGraph
     * @param {HTMLElement} dom
     */
    var BKGraph = function (dom, data, onsuccess) {

        this._container = dom;

        this._components = [];

        this._width = 0;

        this._height = 0;

        this._root = null;


        if (typeof(data) === 'string' || typeof(data) === 'number') {
                
            var self = this;

            jsonp(TUPU_URL, {
                id: data
            }, 'callback', function (data) {   
                data = self._fixData(data);
                self._rawData = data;

                self.initialize(data);

                onsuccess && onsuccess(self);
            });
            // http.get('../mock/person/' + data, function (data) {
            //     if (typeof(JSON) !== 'undefined' && JSON.parse) {
            //         data = JSON.parse(data);
            //     } else {
            //         data = eval('(' + data + ')');
            //     }
            //     data = self._fixData(data);
            //     self._rawData = data;
            //     self.initialize(data);
            //     onsuccess && onsuccess(self);
            // });
        } else {
            data = self._fixData(data);

            this._rawData = data;

            this.initialize(data);

            onsuccess && onsuccess(this);
        }
    }

    BKGraph.prototype._fixData = function (data) {
        for (var i = 0; i < data.entities.length; i++) {
            var entity = data.entities[i];
            // 数据修正
            entity.layerCounter = entity.layerCounter || 0;
            entity.layerCounter = parseInt(entity.layerCounter);

            if (entity.layerCounter === 0) {
                data.mainEntity = entity;
            }
        }

        return data;
    }

    BKGraph.prototype.getRawData = function () {
        return this._rawData;
    }

    BKGraph.prototype.initialize = function (data) {
        this._root = document.createElement('div');
        this._root.className = 'bkg-viewport';
        this._root.style.position = 'relative';
        this._root.style.overflow = 'hidden';

        this._container.appendChild(this._root);
        this.resize();

        // Graph Component is defaultly included
        var graphMain = new GraphMain();
        this.addComponent(graphMain);

        if (data) {
            graphMain.setData(data);
        }
    }

    BKGraph.prototype.addComponent = function (component) {
        this._components.push(component);
        
        if (component.el && component.el.nodeType === 1) {
            this._root.appendChild(component.el);
        }
        
        component.initialize(this, this._rawData);
    }

    BKGraph.prototype.getComponentsAllByType = function (type) {
        var components = [];
        for (var i = 0; i < this._components.length; i++) {
            if (this._components[i].type.toUpperCase() === type.toUpperCase()) {
                components.push(this._components[i]);
            }
        }
        return components;
    }

    BKGraph.prototype.getComponentByType = function (type) {
        for (var i = 0; i < this._components.length; i++) {
            if (this._components[i].type.toUpperCase() === type.toUpperCase()) {
                return this._components[i];
            }
        }
        return null;
    }

    BKGraph.prototype.resize = function () {
        var container = this._container;
        var style = container.currentStyle
            || window.getComputedStyle(container);
        this._width = container.clientWidth || parseInt(style.width);
        this._height = container.clientHeight || parseInt(style.height);

        this._root.style.width = this._width + 'px';
        this._root.style.height = this._height + 'px';

        for (var i = 0; i < this._components.length; i++) {
            this._components[i].resize(this._width, this._height);
        }
    }

    BKGraph.prototype.getWidth = function () {
        return this._width;
    }

    BKGraph.prototype.getHeight = function () {
        return this._height;
    }

    BKGraph.prototype.getRoot = function () {
        return this._root;
    }

    /**
     * 初始化图
     * @param {string|HTMLElement} dom
     * @param {Object} [data]
     * @param {Function} onsuccess
     * @memberOf bkgraph
     * @return {bkgraph~BKGraph}
     */
    function init(dom, data, onsuccess) {
        if (typeof(dom) === 'string') {
            dom = document.getElementById(dom);
        }
        var graph = new BKGraph(dom, data, onsuccess);

        return graph;
    }


    var bkgraph = {
        SearchBar: SearchBar,
        SideBar: SideBar,
        ZoomControl: ZoomControl,
        PanControl: PanControl,

        HeaderBar: HeaderBar,

        init: init
    };

    return bkgraph;
});
define('bkgraph', ['bkgraph/bkgraph'], function (main) { return main; });

var bkg = require("bkgraph");

for(var name in bkg){
	_exports[name] = bkg[name];
}

});