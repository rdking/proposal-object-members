//Pre-defined globally
var Privacy = (() => {
    const IS_PROXY = Symbol("IS_PROXY");
    const IS_PV = Symbol("IS_PV");
    const DATA = Symbol("DATA");
    const CALL_STACK = Symbol("CALL_STACK");

    var handler = {
        slots: new WeakMap(),
        getPrivateValue(target, key) {
            let pvtKey = undefined;
            let thisDI = target.DeclarationInfo;
            let thisPV = target.PrivateValues;
            let methodDI = this.get.caller['[[DeclarationInfo]]'];

            if (!methodDI || ((methodDI !== thisDI) && !thisDI.isPrototypeOf(methodDI)))
                throw new TypeError();

            if (key in target.DeclarationInfo)
                pvtKey = target.DeclarationInfo[key];

            if (!(pvtKey in thisPV))
                throw new TypeError();

            return thisPV[pvtKey];
        },
        setPrivateValue(target, key, value) {
            let pvtKey = undefined;
            let thisDI = target.DeclarationInfo;
            let thisPV = target.PrivateValues;
            let methodDI = arguments.callee.caller['[[DeclarationInfo]]'];

            if (!methodDI || ((methodDI !== thisDI) && !thisDI.isPrototypeOf(methodDI)))
                throw new TypeError();

            if (key in target.DeclarationInfo)
                pvtKey = target.DeclarationInfo[key];

            if (!(pvtKey in thisPV))
                throw new TypeError();
            
            thisPV[pvtKey] = value;
        },
        get(target, key, receiver) {
            var retval;
            if (key === IS_PROXY) {
                retval = true;
            }
            else if (key === '#') {
                if (this.slots.has(receiver)) {
                    retval = new Proxy(this.slots.get(receiver), this);
                }
                else {
                    throw new TypeError(`Cannot access private slots of a non-Class instance.`);
                }
            }
            else if (target[IS_PV] && (key !== IS_PV)) {
                retval = this.getPrivateValue(target, key);
            }
            else {
                retval = Reflect.get(target, key, receiver);
            }

            return retval;
        },
        set(target, key, value, receiver) {
            (target[IS_PV]) ? this.setPrivateValue(target, key, value) : Reflect.set(target, key, value, receiver);
            return true;
        },
        construct(target, args, newTarget) {
            var retval = Reflect.construct(target, args, newTarget);
            if (!retval[IS_PROXY]) {
                retval = new Proxy(retval, this);
            }
            
            if (!this.slots.has(target)) {
                throw new TypeError(`Constructor ${target.name || "anonymous"} must be wrapped with Class.wrap()`);
            }

            var pv = this.slots.get(target);
            if (!this.slots.has(retval)) {
                this.slots.set(retval, {
                    [IS_PV]: true,
                    PrivateValues: Object.create(pv.PrivateValues),
                    DeclarationInfo: pv.DeclarationInfo
                });
            }
            else {
                let rpv = this.slots.get(target);
                if (!pv.PrivateValues.isPrototypeOf(rpv.PrivateValues))
                    Object.setPrototypeOf(rpv.PrivateValues, pv.PrivateValues);
                if (pv.DeclarationInfo !== rpv.DeclarationInfo)
                    rpv.DeclarationInfo = pv.DeclarationInfo;
            }

            return retval;
        },
        apply(target, context, args) {
            var pContext = (context[IS_PROXY]) ? context : new Proxy(context, handler);
            return Reflect.apply(target, pContext, args);
        }
    };

    function getFieldDef(ctorData, field) {
        var def = Object.getOwnPropertyDescriptor(ctorData, field);
        def.writable = true;

        if (typeof(field) !== "symbol") {
            let parts = field.split(' ');
            field = parts.pop();
            for (let part of parts) {
                switch (part) {
                    case "private":
                        def.private = true;
                        break;
                    case "protected":
                        def.private = true;
                        def.shared = true;
                        break;
                    case "static":
                        def.static = true;
                        break;
                    case "const":
                    case "final":
                        def.writable = false;
                        break;
                }
            }
        }

        return {field, def};
    }

    var retval = function Privacy(obj) {
        var isFn = typeof(obj) == "function";

        //Make sure that if we got a non-function, it's set up right...
        if (!isFn) {
            let oProto = Object.getPrototypeOf(obj);
            if (!oProto[IS_PROXY])
                Object.setPrototypeOf(obj, Privacy.wrap(oProto));
            if (!obj.constructor)
                obj.constructor = function () { Reflect.construct(Object.getPrototypeOf(obj), [], obj) };
            if (obj.constructor.prototype !== obj)
                obj.constructor.prototype = obj;
        }

        var ctor = (isFn) ? obj : obj.constructor;
        var ctorData = (DATA in ctor) ? ctor[DATA]() : {};
        var proto = (isFn) ? ctor.prototype : obj;
        var staticSlot = { [IS_PV]: true, PrivateValues: {}, DeclarationInfo: {}, InheritanceInfo: {} };
        var privateSlot = { [IS_PV]: true, PrivateValues: {}, DeclarationInfo: {}, InheritanceInfo: {} };
        
        //Set the private data for the constructor and prototype
        for (let field in ctorData) {
            let ({field, def}) = getFieldDef(ctorData, field);
            let isStatic = ctorData[field].static;
            let slot = (isStatic) ? staticSlot : privateSlot;
            if (ctorData[field].private) {
                Object.defineProperty(slot.PrivateValues, field, def);
                slot.DeclarationInfo[field] = Symbol(field.toString());
                if (!!ctorData[field].shared)
                    slot.InheritanceInfo[field] = slot.DeclarationInfo[field];
            }
            else {
                let target = (isStatic) ? ctor : proto;
                Object.defineProperty(target, field, def);
            }
        }
        handler.slots.set(ctor, staticSlot);
        handler.slots.set(proto, privateSlot);
        
        //Modify all functions of the class into proxies and add the appropriate definitions.
        var protoData = handler.slots.get(proto);
        var ctorData = handler.slots.get(ctor);
        for (let pair of [{data: protoData.PrivateValues, info: protoData.DeclarationInfo}, 
                          {data: ctorData.PrivateValues, info: ctorData.DeclarationInfo},
                          {data: proto, info: protoData.DeclarationInfo}]) {
            var defs = Object.getOwnPropertyDescriptors(pair.data);
            for (let key in defs) {
                let def = defs[key];
                let changed = false;

                if (key == "constructor")
                    continue;

                for (let prop of ["value", "get", "set"]) {
                    if (typeof(def[prop]) == "function") {
                        changed = true;
                        def[prop] = new Proxy(def[prop], handler);
                        handler.slots.set(def[prop], {
                            DeclarationInfo: { __proto__: pair.info }
                        });
                    }
                }

                if (changed) {
                    Object.defineProperty(pair.data, key, def);
                }
            }
        }

        if (DATA in ctor)
            delete ctor[DATA];

        return new Proxy(ctor, handler);;
    };

    Object.defineProperties(retval, {
        "DATA": { value: DATA },
        wrap: {
            value: function wrap(obj) {
                var retval = (obj[IS_PROXY]) ? obj : new Proxy(obj, handler);
                if (!handler.slots.has(obj))
                    handler.slots.set(obj, { PrivateValues: null, DeclarationInfo: null});
                return retval;
            }
        }
    });

    return retval;
})();

module.exports = Privacy;
