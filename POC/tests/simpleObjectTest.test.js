var Privacy = require('../privacy.es6');

describe("Privacy - ES6 P.O.C for proposal-object-members: Simple Object Members", () => {
    describe("Object with no constructor and default prototype", () => {
        var testObject;
        
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
                    console.log(`field3 = ${this['#'].field3}`);
                    console.log(`method1 = ${this['#'].method1}`);
                    console.log(`method2 = ${this['#'].method2}`);
                },
                doMethod1() {
                    this['#'].method1();
                }
            });
        });

        test("Operator '#' should not be available from outside", () => {
            expect(testObject['#']).toBeUndefined();
        });

        test("Private members should not be seen as members from outside", () => {
            expect(testObject.hasOwnProperty("field1")).toBeFalsy();
            expect(testObject.hasOwnProperty("field2")).toBeFalsy();
            expect(testObject.hasOwnProperty("method1")).toBeFalsy();
        });

        test("Private members can exist along side public members of the same name", () => {
            expect(() => { testObject.field1 = 42; }).not.toThrow();
            expect(testObject.method2).not.toThrow();
            //expect(() => { delete testObject.field1; }).not.toThrow();
        });
    });
});