var Privacy = require('../privacy.es6');

describe("Privacy - ES6 P.O.C for proposal-object-members: Classes", () => {
    var factory;
    var factoryInstance;
    var subFactory;
    var subFactoryInstance;
    describe("Object with default prototype", () => {
        describe("External access checks", () => {
            test("Class definition with 'private' and/or 'protected' members does not fail", () => {
                factory = Privacy(class Factory extends Privacy.wrap(Object) {
                    static [Privacy.DATA]() {
                        return {
                            ['private field1']: "found field1",
                            ['protected field2']: "found field2",
                            field3: "found field3",
                            ['private method1']() {
                                console.log("As seen from method1");
                                console.log(`field1 = ${this['#'].field1}`);
                                console.log(`field2 = ${this['#'].field2}`);
                                console.log(`field3 = ${this.field3}`);
                                console.log(`field4 = ${this.constructor['#'].counter}`);
                                console.log(`method1 = ${this['#'].method1.toString()}`);
                                console.log(`method2 = ${this.method2.toString()}`);
                            },
                            ['static private counter']: 0
                        };
                    }

                    method2() {
                        console.log("As seen from method2");
                        console.log(`field1 = ${this['#'].field1}`);
                        console.log(`field2 = ${this['#'].field2}`);
                        console.log(`field3 = ${this.field3}`);
                        console.log(`field4 = ${this.constructor['#'].counter}`);
                        console.log(`method1 = ${this['#'].method1}`);
                        console.log(`method2 = ${this.method2}`);
                    }

                    doMethod1() {
                        this['#'].method1();
                    }

                    get privateField1() { return this['#'].field1; }

                    testSuite1() {
                        expect(this['#'].field1).toBe("found field1");
                        expect(this['#'].field2).toBe("found field2");
                    }

                    testSuite2() {
                        this['#'].field1 = "changed field1"; 
                        expect(this['#'].field1).toBe("changed field1");
                        this['#'].field2 = "changed field2";
                        expect(this['#'].field2).toBe("changed field2");
                    }

                    testSuite3() {
                        'use strict';
                        expect(Privacy.wrap(() => {
                            delete this['#'].field1;
                        })).toThrow();
                    }

                    testSuite4() {
                        var failed = false;
                        try {
                            this['#'].foo = 'bar';
                        }
                        catch (e) {
                            failed = true;
                        }
                        expect(failed).toBeTruthy;
                    }

                    get privateStaticFieldCounter() {
                        return this['#'].counter;
                    }

                    constructor() {
                        super();
                        ++this.constructor['#'].counter;
                    }
                });
            });

            test("Should be able to construct an instance of a factory", () => {
                expect(() => { factoryInstance = new factory(); }).not.toThrow();
                expect(factoryInstance instanceof factory).toBeTruthy();
            });

            test("Operator '#' should not be available from outside the factory", () => {
                expect(() => { return factory['#']; }).toThrow();
            });

            test("Operator '#' should not be available from outside the factory instance", () => {
                expect(() => { return factoryInstance['#']; }).toThrow();
            });

            test("Private members should not be seen as members from outside", () => {
                expect(factoryInstance.hasOwnProperty("field1")).toBeFalsy();
                expect(factoryInstance.hasOwnProperty("field2")).toBeFalsy();
                expect(factoryInstance.hasOwnProperty("method1")).toBeFalsy();
            });

            test("Private static members should not be seen as members from outside", () => {
                expect(factory.hasOwnProperty("field4")).toBeFalsy();
            });

            test("Private members can exist along side public members of the same name", () => {
                expect(() => { factoryInstance.field1 = 42; }).not.toThrow();
                expect(factoryInstance.privateField1 != factoryInstance.field1).toBeTruthy();
                expect(() => { delete factoryInstance.field1; }).not.toThrow();
            });

            test("Private static members can exist along side public static members of the same name", () => {
                expect(() => { factory.field4 = 42; }).not.toThrow();
                expect(factory.privateStaticField4 != factory.field4).toBeTruthy();
                expect(() => { delete factory.field4; }).not.toThrow();
            });

            test("Newly added methods should not have access to private data", () => {
                var leakTest = function leakTest() {
                    console.log(`field1 = ${this['#'].field1}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest.call(factory); }).toThrow();
                expect(() => { factoryInstance.leakTest = leakTest; }).not.toThrow();
                expect(() => { factoryInstance.leakTest(); }).toThrow();
                expect(() => { delete factoryInstance.leakTest; }).not.toThrow();
            });
        });
        describe("Internal access checks", () => { 
            test("All members should be visible from the inside", () => {
                expect(() => { factoryInstance.doMethod1()}).not.toThrow();
                expect(() => { factoryInstance.method2()}).not.toThrow();
            });

            test("Private members should have expected values", () => {
                factoryInstance.testSuite1();
            });

            test("Private members should be writable", () => {
                factoryInstance.testSuite2();
            });

            test("Private members should not be deleteable", () => {
                factoryInstance.testSuite3();
            });

            test("Private members should not be dynamically creatable", () => {
                factoryInstance.testSuite4();
            });
        });
    });
    describe("Object with other object having private members as prototype", () => {
        describe("External access checks", () => {
            test("Object definition inheriting object with 'private' and 'protected' members does not fail", () => {
                subFactory = Privacy(class SubFactory extends factory {
                    static [Privacy.DATA]() {
                        return {
                            ['private field4']: 'found field4'
                        };
                    }

                    method2() {
                        super.method2();
                        console.log(`field4 = ${this['#'].field4}`);
                    }

                    get privateField4() { return this['#'].field4; }

                    testSuite5() {
                        var field1;

                        try {
                            field1 = this['#'].field1;
                        }
                        catch (e) {}
                        expect(field1).toBeUndefined();
                        expect(this['#'].field2).toBe("found field2");
                        expect(this['#'].field4).toBe("found field4");
                    }

                    testSuite6() {
                        this['#'].field2 = "changed field2"; 
                        expect(this['#'].field2).toBe("changed field2");
                        this['#'].field4 = "changed field4";
                        expect(this['#'].field4).toBe("changed field4");
                    }

                    testSuite7() {
                        'use strict';
                        expect(Privacy.wrap(() => {
                            delete this['#'].field1;
                        })).toThrow();
                    }

                    testSuite8() {
                        var failed = false;
                        try {
                            this['#'].foo = 'bar';
                        }
                        catch (e) {
                            failed = true;
                        }
                        expect(failed).toBeTruthy;
                    }

                    testSuite9() {
                        var failed = false;
                        try {
                            let x = this['#'].field1;
                        }
                        catch (e) {
                            failed = true;
                        }
                        expect(failed).toBeTruthy;

                        try {
                            failed = false;
                            this['#'].method1();
                        }
                        catch (e) {
                            failed = true;
                        }
                        expect(failed).toBeTruthy;
                    }

                    constructor() {
                        super();
                    }
                });
            });

            test("Should be able to construct an instance of a factory", () => {
                expect(() => { subFactoryInstance = new subFactory(); }).not.toThrow();
                debugger;
                expect(subFactoryInstance instanceof subFactory).toBeTruthy();
                expect(subFactoryInstance instanceof factory).toBeTruthy();
            });

            test("Operator '#' should not be available from outside", () => {
                expect(() => { return subFactory['#']; }).toThrow();
            });

            test("Private members should not be seen as members from outside", () => {
                expect(subFactoryInstance.hasOwnProperty("field1")).toBeFalsy();
                expect(subFactoryInstance.hasOwnProperty("field2")).toBeFalsy();
                expect(subFactoryInstance.hasOwnProperty("method1")).toBeFalsy();
                expect(subFactoryInstance.hasOwnProperty("field4")).toBeFalsy();
            });

            test("Private members can exist along side public members of the same name", () => {
                //Override super#.field1
                expect(() => { subFactoryInstance.field1 = 42; }).not.toThrow();
                expect(subFactoryInstance.privateField1 != subFactoryInstance.field1).toBeTruthy();
                expect(() => { delete subFactoryInstance.field1; }).not.toThrow();
                //Override this#.field4
                expect(() => { subFactoryInstance.field4 = 42; }).not.toThrow();
                expect(subFactoryInstance.privateField4 != subFactoryInstance.field4).toBeTruthy();
                expect(() => { delete subFactoryInstance.field4; }).not.toThrow();
            });

            test("Newly added methods should not have access to private data", () => {
                //Try to leak this#.field4
                var leakTest = function leakTest() {
                    console.log(`field4 = ${this['#'].field4}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest.call(subFactory); }).toThrow();
                expect(() => { subFactoryInstance.leakTest = leakTest; }).not.toThrow();
                expect(() => { subFactoryInstance.leakTest(); }).toThrow();
                expect(() => { delete subFactoryInstance.leakTest; }).not.toThrow();
                //Try to leak super#.field1
                var leakTest2 = function leakTest2() {
                    console.log(`field1 = ${this['#'].field1}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest2.call(subFactory); }).toThrow();
                expect(() => { subFactoryInstance.leakTest2 = leakTest2; }).not.toThrow();
                expect(() => { subFactoryInstance.leakTest2(); }).toThrow();
                expect(() => { delete subFactoryInstance.leakTest2; }).not.toThrow();
            });
        });
        describe("Internal access checks", () => {
            test("All members should be visible from the inside", () => {
                expect(() => { subFactoryInstance.doMethod1()}).not.toThrow();
                expect(() => { subFactoryInstance.method2()}).not.toThrow();
            });

            test("Private members should have expected values", () => {
                subFactoryInstance.testSuite5();
            });

            test("Private members should be writable", () => {
                subFactoryInstance.testSuite6();
            });

            test("Private members should not be deleteable", () => {
                subFactoryInstance.testSuite7();
            });

            test("Private members should not be dynamically creatable", () => {
                subFactoryInstance.testSuite8();
            });

            test("Private members of the prototype should not be accessible", () => {
                subFactoryInstance.testSuite9();
            });
        });
    });
});
