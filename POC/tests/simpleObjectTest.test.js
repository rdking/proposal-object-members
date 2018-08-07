var Privacy = require('../privacy.es6');

describe("Privacy - ES6 P.O.C for proposal-object-members: Simple Object Members", () => {
    describe("Object with no constructor and default prototype", () => {
        var testObject;
        
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
                        /*
                        The following lines make use of a special wrapper that can only be used
                        within a privileged method of the object. This is not to be implemented
                        in the proposal and is a concession in this implementation to allow
                        privileged access to non-member functions.
                        */

                        expect(Privacy.wrap(() => {
                            this['#'].field1 = "changed field1"; 
                        }, this)).not.toThrow();
                        expect(this['#'].field1).toBe("changed field1");
                        expect(Privacy.wrap(() => { this['#'].field2 = "changed field2"; }, this)).not.toThrow();
                        expect(this['#'].field2).toBe("changed field2");
                    },
                    testSuite3() {
                        'use strict';
                        expect(Privacy.wrap(() => {
                            delete this['#'].field1;
                        })).toThrow();
                    },
                    testSuite4() {
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
});
