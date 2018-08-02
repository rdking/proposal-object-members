/**
 * PowerProxy is a modified version of the standard Proxy that enables the
 * blatant violation of JavaScript Invariant rules. This means that when using
 * PowerProxy, you can do strange things like this:
 *
 * ```javascript
 * var obj = Object.freeze({alpha: 1, beta: 2, gamma: 3});
 * var a = new PowerProxy(obj, { get(target, key, receiver) {
 *    var retval = void 0;
 *    switch(key) {
 *       case "alpha":
 *          retval = 'a';
 *          break;
 *       case "delta":
 *          retval = 'd';
 *          break;
 *       default:
 *			retval = Reflect.get(target, key, receiver);
 *    }
 *    return retval;
 * }});
 * 
 * a.foo //returns undefined
 * a.foo = 2; //error in strict mode, silent fail otherwise
 * a.foo //returns undefined
 * a.alpha //returns 4
 * a.delta //returns 7
 * ```
 */

var PowerProxy = null;

if (Proxy) {
	var Pp = Proxy.prototype;
	Proxy.prototype = {};
	PowerProxy = class PowerProxy extends Proxy {
		constructor(_target, _handler) {
			var dummy = (Array.isArray(_target) ? [] :
						(typeof(_target) == "function") ? function(){} : {});
			super(dummy, new Proxy({
				apply(target, thisArg, argList) {
					var _thisArg = (thisArg === dummy) ? _target : thisArg;
					var _this = ("apply" in _handler) ? _handler : Reflect;
					return _this.apply(target, _thisArg, argList);
				}
			}, {
				get(target, key, receiver) {
					return target[key] || function forwarder(...args) {
						var _this = (key in _handler) ? _handler : Reflect;
						args[0] = _target;
						if (key == "set")
							args[3] = receiver;
						else if ((key == "get") || (key == "construct"))
							args[2] = receiver;
						return _this[key](...args);
					};
				}
			}));
		}
	};
	Proxy.prototype = Pp;
}

if (module instanceof Object) {
	module.exports = PowerProxy;
}
