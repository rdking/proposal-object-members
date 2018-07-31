//Pre-defined globally
var Privacy = (() => {
    const IS_PROXY = Symbol("IS_PROXY");
    const IS_PV = Symbol("IS_PV");
    const DATA = Symbol("DATA");

    var handler = {
        slots: new WeakMap(),
        stack: [],
        getCallerDI() {
            //This only exists because Function.caller has been deprecated.
            var retval;
            if (this.stack.length) {
                let currentFn = this.stack[this.stack.length-1];
                let cfnPvt = this.slots.get(currentFn[IS_PROXY] ? currentFn : this.slots.get(currentFn)); 
                let eStack = (new Error()).stack.split('\n');
                let regex = new RegExp(`\\s*at\\s+Proxy\.${currentFn.name || "<anonymous>"}\\s+\\([\\w/\\\\\\-\\.]+:\\d+:\\d+\\)`);
                if (regex.test(eStack[4]))
                    retval = cfnPvt.DeclarationInfo;
            }
            return retval;
        },
        getPrivateValue(target, key) {
            let pvtKey = undefined;
            let thisDI = target.DeclarationInfo[0];
            let thisPV = target.PrivateValues;
            let methodDI = this.getCallerDI();

            if (!(methodDI && methodDI.find((value) => {
                return (value === thisDI) || (thisDI.isPrototypeOf(value));
            }))) {
                throw new TypeError();
            }

            if (key in thisDI)
                pvtKey = thisDI[key];

            if (!(pvtKey in thisPV))
                throw new TypeError();

            return thisPV[pvtKey];
        },
        setPrivateValue(target, key, value) {
            let pvtKey = undefined;
            let thisDI = target.DeclarationInfo;
            let thisPV = target.PrivateValues;
            let methodDI = this.getCallerDI();

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
            
            if (!this.slots.has(newTarget.prototype)) {
                throw new TypeError(`Constructor ${target.name || "anonymous"} must be wrapped with Class.wrap()`);
            }

            var pv = this.slots.get(newTarget.prototype);
            if (!this.slots.has(retval)) {
                this.slots.set(retval, {
                    [IS_PV]: true,
                    PrivateValues: Object.create(pv.PrivateValues),
                    DeclarationInfo: [pv.DeclarationInfo[0]]
                });
            }
            else {
                let rpv = this.slots.get(retval);
                if (!pv.PrivateValues.isPrototypeOf(rpv.PrivateValues))
                    Object.setPrototypeOf(rpv.PrivateValues, pv.PrivateValues);
                if (pv.DeclarationInfo[0] !== rpv.DeclarationInfo[0])
                    rpv.DeclarationInfo[0] = pv.DeclarationInfo[0];
            }

            return retval;
        },
        apply(target, context, args) {
            this.stack.push(target);
            var pContext = (context[IS_PROXY]) ? context : new Proxy(context, handler);
            var retval = Reflect.apply(target, pContext, args);
            this.stack.pop();
            return retval;
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
        var parent = ((ctor) ? Object.getPrototypeOf(ctor.prototype) : Object.getPrototypeOf(proto)).constructor;
        var parentStaticSlot = handler.slots.get(parent);
        var parentPrivateSlot = handler.slots.get(parent.prototype);
        var staticSlot = { [IS_PV]: true, PrivateValues: { __proto__: parentStaticSlot.PrivateValues }, 
                                          DeclarationInfo: [{ __proto__: parentStaticSlot.DeclarationInfo }], 
                                          InheritanceInfo: { __proto__: parentStaticSlot.InheritanceInfo } };
        var privateSlot = { [IS_PV]: true, PrivateValues: { __proto__: parentPrivateSlot.PrivateValues },
                                           DeclarationInfo: [{ __proto__: parentPrivateSlot.PrivateValues }], 
                                           InheritanceInfo: { __proto__: parentPrivateSlot.PrivateValues } };
        
        //Set the private data for the constructor and prototype
        for (let fieldName in ctorData) {
            let {field, def} = getFieldDef(ctorData, fieldName);
            let isStatic = def.static;
            let slot = (isStatic) ? staticSlot : privateSlot;
            if (def.private) {
                let fieldSymbol = Symbol(field.toString())
                slot.DeclarationInfo[0][field] = fieldSymbol;
                Object.defineProperty(slot.PrivateValues, fieldSymbol, def);
                if (!!def.shared)
                    slot.InheritanceInfo[field] = fieldSymbol;
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
        var info = [protoData.DeclarationInfo[0], ctorData.DeclarationInfo[0]];
        for (let data of [protoData.PrivateValues, ctorData.PrivateValues, proto]) {
            var defs = Object.getOwnPropertyDescriptors(data);
            for (let key in defs) {
                let def = defs[key];
                let changed = false;

                for (let prop of ["value", "get", "set"]) {
                    if (typeof(def[prop]) == "function") {
                        let p = def[prop];
                        changed = true;
                        def[prop] = new Proxy(p, handler);
                        handler.slots.set(def[prop], {
                            IS_PROXY: true,
                            className: (isFn) ? obj.name : "Object",
                            DeclarationInfo: info
                        });
                        handler.slots.set(p, def[prop]);
                    }
                }

                if (changed) {
                    Object.defineProperty(data, key, def);
                }
            }
        }

        if (DATA in ctor)
            delete ctor[DATA];

        return data.constructor || new Proxy(ctor, handler);;
    };

    Object.defineProperties(retval, {
        "DATA": { value: DATA },
        wrap: {
            value: function wrap(obj) {
                if (typeof(obj) != "function")
                    throw new TypeError("Cannot wrap non-function for inheritance.");

                var retval = (obj[IS_PROXY]) ? obj : new Proxy(obj, handler);
                if (!handler.slots.has(obj))
                    handler.slots.set(obj, { PrivateValues: {}, DeclarationInfo: [], InheritanceInfo: {}});
                if (!handler.slots.has(obj.prototype))
                    handler.slots.set(obj.prototype, { PrivateValues: {}, DeclarationInfo: [], InheritanceInfo: {}});
                return retval;
            }
        }
    });

    return retval;
})();

module.exports = Privacy;
