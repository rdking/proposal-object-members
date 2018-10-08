var Privacy = require('./privacy.es6');

console.log("Testing basic classes...");
//We can't just inherit from Object by not extending.
//All non-Privacy objects must be wrapped to use as a base.
var Example = Privacy(class Example extends Privacy.wrap(Object) {
    static [Privacy.DATA]() {
        //This function contains field definitions for the data in this class
        return {
            ['private field1']: 'alpha',
            ['static private field2']: 0,
            ['protected field3']: 42,
            ['protected static field4']: 'You can see me!',
            ['private foo']: Math.PI
        }
    }

    constructor() {
        super();
    }

    print() {
        console.log(`field1 = ${this['#'].field1}`);
        console.log(`field2 = ${this.constructor['#'].field2}`);
        console.log(`field3 = ${this['#']['field3']}`);
        console.log(`field4 = ${this.constructor['#'].field4}`);
    }
});

var test1 = new Example();
test1.print();
test1.foo = 2;
delete test1.foo;

console.log("\nTesting subclasses...");
var SubExample = Privacy(class SubExample extends Example {
    static [Privacy.DATA]() {
        return {
            yes: 'You can always see me!',
            ['static no']: "I didn't forget this either!",
            ['private field1']() {
                console.log(`The old "field3" is '${super['#'].field3}'!`);
            }
        }
    }

    constructor() {
        super();
        this['#'].field3 = 21;
    }

    print() {
        console.log(`According to the superclass...`);
        super.print();
        console.log(`According to the subclass...`);
        this['#'].field1();
    }
});

test2 = new SubExample();
test2.print();
console.log(`test2.yes = ${test2.yes}`);
console.log(`SubExample.no = ${SubExample.no}`);

console.log("\nTesting objects...");
var objExample = Privacy({
    ['private field1']: "signs point to yes",
    ['protected field2']: "seems likely",
    field3: "absolutely",
    print() {
        console.log(`field1 = ${this['#'].field1}`);
        console.log(`field2 = ${this['#'].field2}`);
        console.log(`field3 = ${this.field3}`);
    }
});

objExample.print();

console.log("\nTesting object inheritance...");
var objSubExample = Privacy({
    __proto__: objExample,
    ['private field1']: "new and improved",
    print() {
        console.log("I should be able to see field 2 from here...");
        this['#'].field2 += "... not!";
        console.log(`field1 = ${this['#'].field1}`);
        console.log(`field2 = ${this['#'].field2}`);
        console.log(`field3 = ${this.field3}`);
        console.log("And the old stuff is still there too!");
        super.print();
    }
});

objSubExample.print();
