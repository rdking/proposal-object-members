'use strict';
var SoftProxy = require("./softproxy");

var Privacy = (() => {
    const IS_PROXY = Symbol("IS_PROXY");
    const IS_PV = Symbol("IS_PV");
    const DATA = Symbol("DATA");
    const CONTEXT = Symbol("CONTEXT");
    const SUPER = Symbol("SUPER");

    function isSimpleObject(val) {
        return !((val === null) ||
               (val === undefined) ||
               ([ "function", "boolean", "number", "string", "symbol" ].indexOf(typeof(val)) > -1)) &&
               (!val.prototype || Array.isArray(val) ||
               (val.prototype.constructor === Object) ||
               !(/\{\s*\[\s*native\s+code\s*\]\s*\}/.test(val.prototype.constructor)));
    }

    function clone(obj) {
        let retval = {};
        let stack = [{ src: obj, dst: retval }];

        while (stack.length) {
            let { src, dst } = stack.pop();
            let proto = Object.getPrototypeOf(src);
            let keys = Object.getOwnPropertyNames(src).concat(Object.getOwnPropertySymbols(src));

            for (let key of keys) {
                let def = Object.getOwnPropertyDescriptor(src, key);
                for (let opt of ["value", "get", "set"]) {
                    let type = typeof(def[opt]);
                    if (def[opt] && !isSimpleObject(type)) {

                    }
                }
            }
        }


            
        if (proto) {
            stack.push({ src: proto, dst: {} });

        }
    }

    function getStackTrace() {
        var retval = {};
        if (Error.hasOwnProperty("prepareStackTrace")) {
            let original = Error.prepareStackTrace;
            function prepareStackTrace(err, trace) {
                var retval;

                err.stackTrace = trace;
                if (typeof(original) == "function") {
                    retval = original.bind(Error)(err, trace);
                    Error.prepareStackTrace = original;
                }

                return retval;
            }
            Error.prepareStackTrace = prepareStackTrace;
            ({ stack: retval.stack, stackTrace: retval.stackTrace } = new Error());
        }
        else {
            retval.stack = (new Error()).stack;
        }

        return retval;
    }

    function proxyCheck(obj) { //Necessary since prototypes report as well...
        'use strict';
        var proto = Object.getPrototypeOf(obj);
        Object.setPrototypeOf(obj, null);
        var retval = obj[IS_PROXY];
        Object.setPrototypeOf(obj, proto);
        return retval;
    }

    var handler = {
        slots: new WeakMap(),
        xref: new WeakMap(),
        stack: [],
        getCallerDI() {
            //This only exists because Function.caller has been deprecated.
            //It's only approximate and can be spoofed under the right conditions.
            var retval;
            if (this.stack.length) {
                let err = getStackTrace();
                let currentFn = this.stack[this.stack.length-1];
                let cfnPvt = this.slots.get(currentFn); 
                if (err.stackTrace) {
                    let frame = err.stackTrace[4];
                    let frameFn = (frame) ? frame.getFunction() : undefined;
                    let frameFnName = frame.getFunctionName();
                    if (((typeof(frameFn) == "function") && (frameFn === currentFn)) || 
                        (frameFnName == currentFn.name) ||
                        ((currentFn.name.length === 0) &&
                         (/<anonymous>/.test(frameFnName) ||
                         (frameFnName.includes(cfnPvt.className) && (/\.Privacy\.wrap/.test(frameFnName)))))) {
                        retval = cfnPvt.DeclarationInfo;
                    }
                }
                else {
                    let frame = err.stack.split('\n')[5];
                    let regex = new RegExp(`${currentFn.name || "<anonymous>"}`);
                    if (regex.test(frame) ||
                        (frame.includes(cfnPvt.className) && (/\.Privacy\.wrap\s+/.test(frame))))
                        retval = cfnPvt.DeclarationInfo;
                }
            }
            return retval;
        },
        canAccess(target) {
            if (!this.slots.has(target)) {
                throw new TypeError('Cannot access non-existent private key');
            }
            let pi = this.slots.get(target);
            let diList = pi.DeclarationInfo;
            let methodDI = this.getCallerDI();
            let exists = 0;

            if (methodDI) {
                for (let di of diList) {
                    let thisDI = methodDI.find((value) => {
                        return (value === di) || (value.isPrototypeOf(di)) || (di.isPrototypeOf(value));
                    });
                    if (thisDI)
                        ++exists;
                }
            }

            return !!exists;
        },
        getPrivateName(target, key) {
            let pvtKey = undefined;
            let diList = target.DeclarationInfo;
            let thisDI = undefined;
            let thisPV = target.PrivateValues;
            let methodDI = this.getCallerDI();

            if (methodDI) {
                for (let di of diList) {
                    thisDI = methodDI.find((value) => {
                        return (value === di) || (value.isPrototypeOf(di)) || (di.isPrototypeOf(value));
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

            pvtKey = thisDI[key];

            if (!(pvtKey in thisPV))
                throw new ReferenceError(`Cannot access non-existent private key ${key}`);

            return pvtKey;
        },
        get(target, key, receiver) {
            var retval;
            var opTarget = (target[SUPER]) ? target: receiver;
            if (key === IS_PROXY) {
                retval = this.slots.has(receiver);
            }
            else if (key === CONTEXT) {
                retval = target[CONTEXT];
            }
            else if (key === '#') {
                if (this.canAccess(opTarget)) {
                    retval = new SoftProxy({ [CONTEXT]: receiver, __proto__: this.slots.get(opTarget) }, this);
                }
                else {
                    throw new ReferenceError(`Cannot access private data from invalid scope.`);
                }
            }
            else if (target[IS_PV] && (key !== IS_PV)) {
                retval = target.PrivateValues[this.getPrivateName(target, key)];
            }
            else {
                retval = Reflect.get(target, key, receiver);
            }

            if ((key === "toString") && (retval === Function.prototype.toString))
                retval = retval.bind(target);

            return retval;
        },
        set(target, key, value, receiver) {
            if (target[IS_PV]) {
                target.PrivateValues[this.getPrivateName(target, key)] = value;
            }
            else {
                Reflect.set(target, key, value, receiver);
            }
            return true;
        },
        stageInstance(instance) {
            var proto = Object.getPrototypeOf(instance);
            var pv = this.slots.get(proto);
            if (!this.slots.has(instance)) {
                this.slots.set(instance, {
                    [IS_PV]: true,
                    PrivateValues: Object.assign(pv.PrivateValues),
                    DeclarationInfo: pv.DeclarationInfo
                });
            }
            else {
                let rpv = this.slots.get(instance);
                if (!(pv.PrivateValues.isPrototypeOf(rpv.PrivateValues) || 
                      (pv.PrivateValues === rpv.PrivateValues)))
                    Object.setPrototypeOf(rpv.PrivateValues, pv.PrivateValues);
                if (pv.DeclarationInfo !== rpv.DeclarationInfo)
                    rpv.DeclarationInfo = pv.DeclarationInfo;
            }
        },
        construct(target, args, newTarget) {
            this.stack.push(target);
            var retval = Reflect.construct(target, args, newTarget);
            if (!proxyCheck(retval)) {
                retval = new SoftProxy(retval, this);
            }
            var proto = Object.getPrototypeOf(retval);
            if (!this.slots.has(proto)) {
                throw new TypeError(`Constructor ${target.name || "anonymous"} must be wrapped with Class.wrap()`);
            }
            this.stageInstance(retval);

            this.stack.pop();
            return retval;
        },
        apply(target, context, args) {
            this.stack.push(target);
            var pContext = (!context) ? context : (context[IS_PV])? context[CONTEXT] : (proxyCheck(context)) ? context : new SoftProxy(context, handler);
            var retval = Reflect.apply(target, pContext, args);
            this.stack.pop();
            return retval;
        },
        deleteProperty(target, key) {
            var retval = false;
            if (!target[IS_PV])
                retval = Reflect.deleteProperty(target, key);
            return retval;
        }
    };

    function getFieldDef(ctorData, field, inFn) {
        var def = Object.getOwnPropertyDescriptor(ctorData, field);
        if ("value" in def)
            def.writable = true;

        def.private = !!inFn;

        if (typeof(field) !== "symbol") {
            let parts = field.split(' ');
            field = parts.pop();
            for (let part of parts) {
                switch (part) {
                    case "private":
                        def.private = true;
                        def.shared = false;
                        break;
                    case "protected":
                        def.private = true;
                        def.shared = true;
                        break;
                    case "public":
                        def.private = false;
                        def.shared = false;
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

    function inheritDeclarations(ps) {
        var list = ps.DeclarationInfo;
        var retval = [];

        retval.push(Object.create(ps.InheritanceInfo || Object.prototype));

        if (list) {
            for (let item of list) {
                retval.push(item);
            }
        }

        return retval;
    }

    var retval = function Privacy(obj) {
        var isFn = typeof(obj) == "function";
        var hasCtor = isFn || (obj.hasOwnProperty("constructor") && obj.constructor.hasOwnProperty("prototype"));

        //Make sure that if we got a non-function, it's set up right...
        if (!isFn) {
            if (hasCtor) {
                if (obj.constructor.prototype !== obj) {
                    obj.constructor.prototype = obj;
                }
            }
        }

        var ctor = (isFn) ? obj : (hasCtor) ? obj.constructor : null;
        var ctorData = (ctor) ? (DATA in ctor) ? ctor[DATA]() : (isFn) ? {} : obj : obj;
        var proto = (isFn) ? ctor.prototype : obj;
        var sProto = (ctor) ? Object.getPrototypeOf(ctor.prototype) : Object.getPrototypeOf(proto);
        var parent = (sProto) ? (ctor) ? sProto.constructor : (proxyCheck(sProto)) ? sProto : null : null;
        var parentStaticSlot = (ctor) ? (parent) ? handler.slots.get(parent) || {} : {} : {};
        var parentPrivateSlot = (parent) ? handler.slots.get((ctor) ? parent.prototype : parent) || {} : {};
        var staticSlot = { [IS_PV]: true, className: (ctor) ? ctor.name || "<anonymous>" : "<anonymous>",
                           PrivateValues: { __proto__: parentStaticSlot.PrivateValues || Object.prototype },
                           DeclarationInfo: inheritDeclarations(parentStaticSlot),
                           InheritanceInfo: { __proto__: parentStaticSlot.InheritanceInfo || Object.prototype } };
        var privateSlot = { [IS_PV]: true, className: (ctor) ? ctor.name || "<anonymous>" : "<anonymous>",
                            PrivateValues: { __proto__: parentPrivateSlot.PrivateValues || Object.prototype },
                            DeclarationInfo: inheritDeclarations(parentPrivateSlot), 
                            InheritanceInfo: { __proto__: parentPrivateSlot.InheritanceInfo || Object.prototype } };
        var cdProto = { [SUPER]: true };
        var pcdProto = new SoftProxy(cdProto, handler);
                            
        //Set the private data for the constructor and prototype
        var ctorDataKeys = Object.getOwnPropertyNames(ctorData).concat(Object.getOwnPropertySymbols(ctorData));
        for (let fieldName of ctorDataKeys) {
            let {field, def} = getFieldDef(ctorData, fieldName);
            let isStatic = def.static;
            let slot = (isStatic) ? staticSlot : privateSlot;
            if (def.private) {
                let fieldSymbol = Symbol(field.toString());
                Object.defineProperty(slot.DeclarationInfo[0], field, {
                    configurable: true,
                    value: fieldSymbol
                });
                Object.defineProperty(slot.PrivateValues, fieldSymbol, def);
                if (!!def.shared)
                    slot.InheritanceInfo[field] = fieldSymbol;
                if (!isFn)
                    delete ctorData[fieldName];
            }
            else {
                let target = (isStatic) ? ctor : proto;
                Object.defineProperty(target, field, def);
            }
        }

        if (ctor)
            handler.slots.set(ctor, staticSlot);

        if (sProto) {
            handler.slots.set(cdProto, privateSlot);
            handler.slots.set(pcdProto, privateSlot);
        }
        handler.slots.set(proto, privateSlot);

        if (ctor && (DATA in ctor))
            Object.setPrototypeOf(ctorData, pcdProto);

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
                        if (hasCtor && (key == "constructor")) {
                            def[prop] = new SoftProxy(p, handler);
                            let ctorSlot = handler.slots.get(p);
                            handler.slots.set(def[prop], ctorSlot);
                            ctorSlot.DeclarationInfo.push(privateSlot.DeclarationInfo[0]);
                        }
                        else {
                            def[prop] = new SoftProxy(p, handler);
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

        if (ctor && (DATA in ctor))
            delete ctor[DATA];
        
        var retval = (ctor) ? proto.constructor || new SoftProxy(ctor, handler) : new SoftProxy(proto, handler);
        if (!ctor) {
            handler.slots.set(retval, privateSlot);
        }
        else {
            /**
             * This little trick allows factories processed by Privacy to work
             * properly when used with HTML Custom Elements.
             */
            let rval = retval;
            let keys = Object.getOwnPropertyNames(rval).concat(Object.getOwnPropertySymbols(rval));
            retval = retval.bind();
            Object.defineProperties(retval, {
                'name': {
                    configurable: true,
                    get() { return rval.name; }
                },
                '#': {
                    get() { return rval['#']; }
                },
                'length': {
                    configurable: true,
                    get() { return rval.length; }
                },
                'prototype':{
                    configurable: true,
                    get() {
                        var retval;
                        if (proxyCheck(rval.prototype)) {
                            retval = rval.prototype;
                        }
                        else if (handler.xref.has(rval.prototype)) {
                            retval = handler.xref.get(rval.prototype);
                        }
                        else {
                            retval = new SoftProxy(rval.prototype, handler);
                            handler.xref.set(rval.prototype, retval);
                        }
                        return retval;
                    }
                },
                'toString': {
                    configurable: true,
                    get() { return rval.toString(); }
                }
            });
            for (let field of keys) {
                if (!(field in retval)) {
                    Object.defineProperty(retval, field, {
                        enumerable: true,
                        configurable: true,
                        get() { return rval[field]; }
                    });
                }
            }
            // retval = eval(`(function ${rval.name}(...args) {
            //     if (!new.target)
            //         throw new TypeError("Constructor ${rval.name} requires new");
            //     return Reflect.construct(rval, args, new.target);
            // })`);
            // Object.defineProperty(retval, '#', { get() { return rval['#']; } });
            // rval.prototype = (proxyCheck(rval.prototype)) ? rval.prototype : new SoftProxy(rval.prototype, handler);
            handler.slots.set(retval.prototype, privateSlot);
            handler.slots.set(retval, staticSlot);
        }
        return retval;
    };

    Object.defineProperties(retval, {
        "DATA": { value: DATA },
        wrap: {
            value: function wrap(obj) {
                var pv = (arguments[1] && handler.canAccess(arguments[1])) ? handler.slots.get(arguments[1]) : null;

                if (typeof(obj) != "function")
                    throw new TypeError("Cannot wrap non-functions");

                if (!handler.slots.has(obj)) {
                    let slot;
                    if (pv) {
                        slot = Object.assign({
                            PrivateValues: {}, 
                            DeclarationInfo: [{}],
                            InheritanceInfo: {},
                            className: (pv.constructor) ? pv.constructor.name : "Object"
                        }, pv);
                    }
                    else {
                        slot = {
                            PrivateValues: {}, 
                            DeclarationInfo: [{}],
                            InheritanceInfo: {}
                        };
                    }
                    handler.slots.set(obj, slot);
                }

                if (!pv && obj.prototype && !handler.slots.has(obj.prototype))
                    handler.slots.set(obj.prototype, { PrivateValues: {}, 
                                                       DeclarationInfo: [{}],
                                                       InheritanceInfo: {} });
                
                var retval = (proxyCheck(obj)) ? obj : new SoftProxy(obj, handler);
                return retval;
            }
        },
        staticField: {
            value: function staticField(fn, fieldName, value) {
                if (handler.slots.has(fn)) {
                    let slot = handler.slots.get(fn);
                    let fnDI = slot.DeclarationInfo[0];
                    if (!(fieldName in fnDI)) {
                        let {field, def} = getFieldDef({[fieldName]: value}, fieldName, true);
                        let fieldSymbol = Symbol(field.toString());
                        if (def.private) {
                            Object.defineProperty(fnDI, field, {
                                configurable: true,
                                value: fieldSymbol
                            });
                            Object.defineProperty(slot.PrivateValues, fieldSymbol, def);
                        }
                        else {
                            Object.defineProperty(fn, field, def);
                        }
                        if (!!def.shared)
                            slot.InheritanceInfo[field] = fieldSymbol;
                    }
                }
            }
        }
    });

    return retval;
})();

module.exports = Privacy;
