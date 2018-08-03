var Privacy = (() => {
    const IS_PROXY = Symbol("IS_PROXY");
    const IS_PV = Symbol("IS_PV");
    const DATA = Symbol("DATA");
    const CONTEXT = Symbol("CONTEXT");

    function proxyCheck(obj) { //Necessary since prototypes report as well...
        'use strict';
        var proto = Object.getPrototypeOf(obj);
        Object.setPrototypeOf(obj, null);
        var retval = obj[IS_PROXY];
        Object.setPrototypeOf(obj, proto);
        return retval;
    }

    function fixSuperProto(fn) {
        var proto = fn.prototype;
        var superProto = Object.getPrototypeOf(proto);
        if (superProto) {
            let pSuperProto = new Proxy(superProto, handler);
            Object.setPrototypeOf(proto, pSuperProto);
            if (!proxyCheck(superProto)) {
                handler.slots.set(superProto, null);
                handler.slots.set(pSuperProto, null);
            }
        }
    }

    var handler = {
        slots: new WeakMap(),
        stack: [],
        getCallerDI() {
            //This only exists because Function.caller has been deprecated.
            //It's only approximate and can be spoofed under the right conditions.
            var retval;
            if (this.stack.length) {
                let currentFn = this.stack[this.stack.length-1];
                let cfnPvt = this.slots.get(currentFn); 
                let eStack = (new Error()).stack.split('\n');
                let regex = new RegExp(`\\s*at\\s+(Proxy\\.|new\\s+)${currentFn.name || "<anonymous>"}\\s+\\([\\w/\\\\\\-\\.]+:\\d+:\\d+\\)`);
                if (regex.test(eStack[4]))
                    retval = cfnPvt.DeclarationInfo;
            }
            return retval;
        },
        getPrivateValue(target, key) {
            let pvtKey = undefined;
            let diList = target.DeclarationInfo;
            let thisDI = undefined;
            let thisPV = target.PrivateValues;
            let methodDI = this.getCallerDI();

            if (methodDI) {
                for (let di of diList) {
                    thisDI = methodDI.find((value) => {
                        return (value === di) || (value.isPrototypeOf(di));
                    });
                    if (thisDI && (key in thisDI))
                        break;
                    else
                        thisDI = undefined;
                }
            }

            if (!thisDI) {
                throw new TypeError(`Current method does not have access to private members of ${target.className}`);
            }

            if (key in thisDI)
                pvtKey = thisDI[key];

            if (!(pvtKey in thisPV))
                throw new ReferenceError(`Cannot access non-existent private key ${key}`);

            return thisPV[pvtKey];
        },
        setPrivateValue(target, key, value) {
            let pvtKey = undefined;
            let thisDI = target.DeclarationInfo[0];
            let thisPV = target.PrivateValues;
            let methodDI = this.getCallerDI();

            if (!(methodDI && methodDI.find((value) => {
                return (value === thisDI) || (thisDI.isPrototypeOf(value));
            }))) {
                throw new TypeError(`Current method does not have access to private members of ${target.className}`);
            }

            if (key in thisDI)
                pvtKey = thisDI[key];

            if (!(pvtKey in thisPV))
                throw new ReferenceError(`Cannot access non-existent private key ${key}`);
            
            thisPV[pvtKey] = value;
        },
        get(target, key, receiver) {
            var retval;
            if (key === IS_PROXY) {
                retval = this.slots.has(receiver);
            }
            else if (key === CONTEXT) {
                retval = target[CONTEXT];
            }
            else if (key === '#') {
                if (this.slots.has(receiver)) {
                    retval = new Proxy({ [CONTEXT]: receiver, __proto__: this.slots.get(receiver) }, this);
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
            this.stack.push(target);
            var retval = Reflect.construct(target, args, newTarget);
            if (!proxyCheck(retval)) {
                retval = new Proxy(retval, this);
            }
            var proto = Object.getPrototypeOf(retval);
            if (!this.slots.has(proto)) {
                throw new TypeError(`Constructor ${target.name || "anonymous"} must be wrapped with Class.wrap()`);
            }

            var pv = this.slots.get(proto);
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
            this.stack.pop();
            return retval;
        },
        apply(target, context, args) {
            this.stack.push(target);
            var pContext = (context[IS_PV])? context[CONTEXT] : (proxyCheck(context)) ? context : new Proxy(context, handler);
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

    function inheritDeclarations(list) {
        var retval = [];

        for (let item of list) {
            retval.push(Object.create(item));
        }

        if (!retval.length) {
            retval.push({});
        }

        return retval;
    }

    var retval = function Privacy(obj) {
        var isFn = typeof(obj) == "function";

        //Make sure that if we got a non-function, it's set up right...
        if (!isFn) {
            let oProto = Object.getPrototypeOf(obj);
            if (!proxyCheck(oProto))
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
        var staticSlot = { [IS_PV]: true, className: (ctor) ? ctor.name || "<anonymous>" : "<anonymous>",
                           PrivateValues: { __proto__: parentStaticSlot.PrivateValues },
                           DeclarationInfo: inheritDeclarations(parentStaticSlot.DeclarationInfo),
                           InheritanceInfo: { __proto__: parentStaticSlot.InheritanceInfo } };
        var privateSlot = { [IS_PV]: true, className: (ctor) ? ctor.name || "<anonymous>" : "<anonymous>",
                            PrivateValues: { __proto__: parentPrivateSlot.PrivateValues },
                            DeclarationInfo: inheritDeclarations(parentPrivateSlot.DeclarationInfo), 
                            InheritanceInfo: { __proto__: parentPrivateSlot.InheritanceInfo } };
        
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

        if (ctor)
            fixSuperProto(ctor);

        handler.slots.set(ctor, staticSlot);
        handler.slots.set(proto, privateSlot);

        //Modify all functions of the class into proxies and add the appropriate definitions.
        var info = [privateSlot.DeclarationInfo[0], staticSlot.DeclarationInfo[0]];
        for (let data of [privateSlot.PrivateValues, staticSlot.PrivateValues, proto]) {
            let keys = Object.getOwnPropertyNames(data).concat(Object.getOwnPropertySymbols(data));
            for (let key of keys) {
                let def = Object.getOwnPropertyDescriptor(data, key);
                let changed = false;

                for (let prop of ["value", "get", "set"]) {
                    if (typeof(def[prop]) == "function") {
                        let p = def[prop];
                        changed = true;
                        if (key == "constructor") {
                            def[prop] = new Proxy(p, handler);
                            let ctorSlot = handler.slots.get(p);
                            handler.slots.set(def[prop], ctorSlot);
                            ctorSlot.DeclarationInfo.push(privateSlot.DeclarationInfo[0]);
                        }
                        else {
                            def[prop] = new Proxy(p, handler);
                            let fnSlot = {
                                [IS_PV]: true,
                                className: (isFn) ? obj.name : "Object",
                                DeclarationInfo: info
                            };
                            handler.slots.set(def[prop], fnSlot);
                            handler.slots.set(p, fnSlot);
                        }
                    }
                }

                if (changed) {
                    Object.defineProperty(data, key, def);
                }
            }
        }

        if (DATA in ctor)
            delete ctor[DATA];

        return proto.constructor || new Proxy(ctor, handler);;
    };

    Object.defineProperties(retval, {
        "DATA": { value: DATA },
        wrap: {
            value: function wrap(obj) {
                if (typeof(obj) != "function")
                    throw new TypeError("Cannot wrap non-function for inheritance.");

                if (!handler.slots.has(obj))
                    handler.slots.set(obj, { PrivateValues: Object.prototype, 
                                             DeclarationInfo: [Object.prototype],
                                             InheritanceInfo: Object.prototype });
                if (obj.prototype && !handler.slots.has(obj.prototype))
                    handler.slots.set(obj.prototype, { PrivateValues: Object.prototype, 
                                                       DeclarationInfo: [Object.prototype],
                                                       InheritanceInfo: Object.prototype });
                
                fixSuperProto(obj);
                var retval = (proxyCheck(obj)) ? obj : new Proxy(obj, handler);
                return retval;
            }
        }
    });

    return retval;
})();

module.exports = Privacy;
