 (function (factory){
 	// AMD
 	if( typeof define !== "undefined" && define["amd"] ){
 		define(["exports"], factory.bind(window));
 	// No module loader
 	}else{
 		factory(window["bkgraph"] = {});
 	}
})(function (_exports) {
