var Privacy = require('../privacy.es6');

describe("Privacy - ES6 P.O.C for proposal-object-members: Simple Object Members with no constructor", () => {
    var testObject;
    var subTestObject;
    describe("Object with default prototype", () => {
        describe("External access checks", () => {
            test("Object definition with 'private' and/or 'protected' members does not fail", () => {
                testObject = Privacy({
                    ['private field1']: "found field1",
                    ['protected field2']: "found field2",
                    field3: "found field3",
                    ['private method1']() {
                        console.log("As seen from method1");
                        console.log(`field1 = ${this['#'].field1}`);
                        console.log(`field2 = ${this['#'].field2}`);
                        console.log(`field3 = ${this.field3}`);
                        console.log(`method1 = ${this['#'].method1.toString()}`);
                        console.log(`method2 = ${this.method2.toString()}`);
                    },
                    method2() {
                        console.log("As seen from method2");
                        console.log(`field1 = ${this['#'].field1}`);
                        console.log(`field2 = ${this['#'].field2}`);
                        console.log(`field3 = ${this.field3}`);
                        console.log(`method1 = ${this['#'].method1}`);
                        console.log(`method2 = ${this.method2}`);
                    },
                    doMethod1() {
                        this['#'].method1();
                    },
                    get privateField1() { return this['#'].field1; },
                    testSuite1() {
                        expect(this['#'].field1).toBe("found field1");
                        expect(this['#'].field2).toBe("found field2");
                    },
                    testSuite2() {
                        this['#'].field1 = "changed field1"; 
                        expect(this['#'].field1).toBe("changed field1");
                        this['#'].field2 = "changed field2";
                        expect(this['#'].field2).toBe("changed field2");
                    },
                    testSuite3() {
                        'use strict';
                        expect(Privacy.wrap(() => {
                            delete this['#'].field1;
                        })).toThrow();
                    },
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
                });
            });

            test("Operator '#' should not be available from outside", () => {
                expect(() => { return testObject['#']; }).toThrow();
            });

            test("Private members should not be seen as members from outside", () => {
                expect(testObject.hasOwnProperty("field1")).toBeFalsy();
                expect(testObject.hasOwnProperty("field2")).toBeFalsy();
                expect(testObject.hasOwnProperty("method1")).toBeFalsy();
            });

            test("Private members can exist along side public members of the same name", () => {
                expect(() => { testObject.field1 = 42; }).not.toThrow();
                expect(testObject.privateField1 != testObject.field1).toBeTruthy();
                expect(() => { delete testObject.field1; }).not.toThrow();
            });

            test("Newly added methods should not have access to private data", () => {
                var leakTest = function leakTest() {
                    console.log(`field1 = ${this['#'].field1}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest.call(testObject); }).toThrow();
                expect(() => { testObject.leakTest = leakTest; }).not.toThrow();
                expect(() => { testObject.leakTest(); }).toThrow();
                expect(() => { delete testObject.leakTest; }).not.toThrow();
            });
        });
        describe("Internal access checks", () => { 
            test("All members should be visible from the inside", () => {
                expect(() => { testObject.doMethod1()}).not.toThrow();
                expect(() => { testObject.method2()}).not.toThrow();
            });

            test("Private members should have expected values", () => {
                testObject.testSuite1();
            });

            test("Private members should be writable", () => {
                testObject.testSuite2();
            });

            test("Private members should not be deleteable", () => {
                testObject.testSuite3();
            });

            test("Private members should not be dynamically creatable", () => {
                testObject.testSuite4();
            });
        });
    });
    describe("Object with other object having private members as prototype", () => {
        describe("External access checks", () => {
            test("Object definition inheriting object with 'private' and 'protected' members does not fail", () => {
                subTestObject = Privacy({
                    __proto__: testObject,
                    ['private field4']: 'found field4',
                    method2() {
                        super.method2();
                        console.log(`field4 = ${this['#'].field4}`);
                    },
                    get privateField4() { return this['#'].field4; },
                    testSuite5() {
                        var field1;

                        try { field1 = this['#'].field1; }
                        catch (e) {}
                        expect(field1).toBeUndefined();
                        expect(this['#'].field2).toBe("changed field2");
                    },
                    testSuite6() {
                        this['#'].field1 = "found field1"; 
                        expect(this['#'].field1).toBe("changed field1");
                        this['#'].field2 = "found field2";
                        expect(this['#'].field2).toBe("changed field2");
                    },
                    testSuite7() {
                        'use strict';
                        expect(Privacy.wrap(() => {
                            delete this['#'].field1;
                        })).toThrow();
                    },
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
                });
            });

            test("Operator '#' should not be available from outside", () => {
                expect(() => { return subTestObject['#']; }).toThrow();
            });

            test("Private members should not be seen as members from outside", () => {
                expect(subTestObject.hasOwnProperty("field1")).toBeFalsy();
                expect(subTestObject.hasOwnProperty("field2")).toBeFalsy();
                expect(subTestObject.hasOwnProperty("method1")).toBeFalsy();
                expect(subTestObject.hasOwnProperty("field4")).toBeFalsy();
            });

            test("Private members can exist along side public members of the same name", () => {
                //Override super#.field1
                expect(() => { subTestObject.field1 = 42; }).not.toThrow();
                expect(subTestObject.privateField1 != subTestObject.field1).toBeTruthy();
                expect(() => { delete subTestObject.field1; }).not.toThrow();
                //Override this#.field4
                expect(() => { subTestObject.field4 = 42; }).not.toThrow();
                expect(subTestObject.privateField4 != subTestObject.field4).toBeTruthy();
                expect(() => { delete subTestObject.field4; }).not.toThrow();
            });

            test("Newly added methods should not have access to private data", () => {
                //Try to leak this#.field4
                var leakTest = function leakTest() {
                    console.log(`field4 = ${this['#'].field4}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest.call(subTestObject); }).toThrow();
                expect(() => { subTestObject.leakTest = leakTest; }).not.toThrow();
                expect(() => { subTestObject.leakTest(); }).toThrow();
                expect(() => { delete subTestObject.leakTest; }).not.toThrow();
                //Try to leak super#.field1
                var leakTest2 = function leakTest2() {
                    console.log(`field1 = ${this['#'].field1}`);
                    console.log(`If you see this, there's a private data leak!`);
                };
                expect(() => { leakTest2.call(subTestObject); }).toThrow();
                expect(() => { subTestObject.leakTest2 = leakTest2; }).not.toThrow();
                expect(() => { subTestObject.leakTest2(); }).toThrow();
                expect(() => { delete subTestObject.leakTest2; }).not.toThrow();
            });
        });
        describe("Internal access checks", () => {
            test("All members should be visible from the inside", () => {
                expect(() => { subTestObject.doMethod1()}).not.toThrow();
                expect(() => { subTestObject.method2()}).not.toThrow();
            });

            test("Private members should have expected values", () => {
                subTestObject.testSuite5();
            });

            test("Private members should be writable", () => {
                subTestObject.testSuite6();
            });

            test("Private members should not be deleteable", () => {
                subTestObject.testSuite7();
            });

            test("Private members should not be dynamically creatable", () => {
                subTestObject.testSuite8();
            });
        });
    });
});
