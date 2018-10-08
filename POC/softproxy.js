/**
 * @classdesc SoftProxy is a variation of an ES6 Proxy that allows for the
 * retrieval of the underlying target object. Since the containing proxy is
 * only kept as a weak reference, normal management of the proxy instance
 * is sufficient to ensure no data leaks occur.
 */
var SoftProxy = (function() {
	let pvt = new WeakMap();

	return class SoftProxy {
		/**
		 * Creates a Proxy and registers the target for later retrieval.
		 * @param {object} tgt - Target object to monitor 
		 * @param {object} hndlr - Object containing invariant handlers.
		 */
		constructor(tgt, hndlr) {
			let retval = new Proxy(tgt, hndlr);
			pvt.set(retval, tgt);
			return retval;
		}

		/**
		 * Tests to see if a selected object is an unwrapable proxy.
		 * @param {object} tgt - Target object to test
		 * @returns {boolean}
		 */
		static isSoftProxy(tgt) {
			return !!pvt.has(tgt);
		}

		/**
		 * Attempts to retrieve the target object given a proxy.
		 * @param {object} prxy - Target proxy to unwrap
		 * @returns {object|undefined} Returns undefined if object is not a
		 * SoftProxy.
		 */
		static unwrap(prxy) {
			return pvt.get(prxy);
		}
	};
})();

if (typeof(module) == "object") {
	module.exports = SoftProxy;
}
