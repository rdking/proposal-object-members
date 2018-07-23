# Object members proposal

## Goal
ES, being a prototype based language, has matured to the point that it is being used to create full desktop and web applications. It now has support for the `class` keyword, making it far simpler to create object factory heirarchies. The main problem with this is that it currently doesn't support adding data, let alone private or protected data. Given that the intent of the `class` keyword was to create syntactic sugar around the well-documented process for creating object heirarchies via prototype inheritance, the absense of the ability to put data members into the `class` definition is sorely missed. Further, given that this data usually constitutes implementation details as opposed to being part of the public interface, and that some of these implementation details must be shared amongs descendant classes, there is a definite need for both `private` and `protected` members among the member data. That is what this proposal seeks to provide.

## Rationale
One of the main reasons ES developers even bothered to construct their own class factories in ES5 was to hide implementation details from the users of their class factories. While the `_name` convention may have been nice, and sucessfully got many a programmer to respect functions and member data marked this way as private, it did nothing to stop many developers from ignoring the convention, creating software with various security/usability issues, unduely constraining the flexibility of the library developer, and, in some cases, damaging the reputation of the abused library.

This is the reason we need `private` and `protected`. Their existance will allow developers to properly hide what should be hidden from their users. For those who (quite rightly) think this will interfere with their ability to monkey patch code, you should really be filing feature requests and possibly code patches with the library developer to extend its usability and flexibility. Not only do you help the community by doing that, you also prevent yourself from getting "locked in" to a specific version of that library. Put another way, if you can monkey patch, you can submit a patch!

## Notation
It's as simple as this, I want to add the following possibilites to ES:
```javascript
class Example {
  private privField1 = "value";
  private privField2() {}
  private get privField3() {}
  private set privField3(value) {}
  private static privStaticField1 = "value";
  private static privStaticField2() {}
  private static get privStaticField3() {}
  private static set privStaticField3(value) {}
  protected protField1 = "value";
  protected protField2() {}
  protected get protField3() {}
  protected set protField3(value) {}
  protected static protStaticField1 = "value";
  protected static protStaticField2() {}
  protected static get protStaticField3() {}
  protected static set protStaticField3(value) {}
  /* public */ field = "value"; //Note: The public keyword is useless and not part of the proposal.
  /* public */ static field = "value"; //However, public data **is** part of the proposal.
}
```

Since `class` **_is and must forever remain_** syntactic sugar, whatever you can do with a `class` must also be doable via a simple object factory. Therefore, I'm also proposing these possibilities:
```javascript
var example = {
  private privField1 = "value",
  private privField2() {},
  private get privField3() {},
  private set privField3(value) {},
  private static privStaticField1 = "value",
  private static privStaticField2() {},
  private static get privStaticField3() {},
  private static set privStaticField3(value) {},
  protected protField1 = "value",
  protected protField2() {},
  protected get protField3() {},
  protected set protField3(value) {},
  protected static protStaticField1 = "value",
  protected static protStaticField2() {},
  protected static get protStaticField3() {},
  protected static set protStaticField3(value) {},
  /* public */ field = "value", //Note: The public keyword is useless and not part of the proposal.
  /* public */ static field = "value" //However, public data **is** part of the proposal.
};
```

Given the arguments that have led to [this other proposal](https://github.com/tc39/proposal-class-fields), I propose that the access notation for both `private` and `protected` members be like this:
```javascript
class Example {
  private privField1 = "value";
  
  constructor() {
    console.log(`privField1 = ${this#.privField1}`);
  }
  
  static print(obj) {
    console.log(`privField1 = ${obj#.["privField1"]}`);
  }
}
```

## How's this supposed to work?
#### The private member container access operator(`#`)
Other than the familiar declaration keywords, the only new thing is the `#`. As much as I hate to admit it, because of the comparatively peculiar way objects can be used in ES, to keep `private` members from being leaked, there must be a barrier between `public` members and `private` members. To this end, `#` will be a binary operator. The left term for this operator is the object from which we want to retrieve a `private` member. I didn't say "`private` or `protected` member" because `protected` members are just shared `private` members. More on that later. 

The right term for the `#` operator **must be an access operator**. This is critical. At no point, and under no circumstances is the `#` operator ever allowed to be used as a unary postfix operator. Allowing this would invite both confusion and private scope leaks. Violating this is a `SyntaxError`. The only other rule is that the `#` operator cannot be used outside of an object or `class` declaration. Violating this rule is also a `SyntaxError`. This also means that it is a SyntaxError to put `private` fields on an object declaration without also declaring at least 1 function in that declaration that accesses it.

#### The `private` and `protected` keywords
These keywords declare `private` members in much the same way as you would expect if you were implementing `private` data using a `WeakMap`. A short example should make it clear.

With this proposal's sugar:
```javascript
class Example {
  private field1 = 'alpha';
  static private field2 = 0;
  protected field3 = '42';
  static protected field4 = "You can see me!";
  
  print() {
    console.log(`field1 = ${this#.field1}`);
    console.log(`field2 = ${this.constructor#.field2}`);
    console.log(`field3 = ${this#['field3']}`); //Yes, obj#.x === obj#['x']
    console.log(`field4 = ${this.constructor#.field4}`);
  }
}
```

Sugar-free ES6:
```javascript
Object.defineProperty(Symbol.Inheritance, {value: Symbol("Inheritance")});

const Example = (function() {
  const privMap = new WeakMap();
  const field1 = Symbol("field1");
  const field2 = Symbol("field2");
  const field3 = Symbol("field3");
  const field4 = Symbol("field4");
  
  var retval = class Example {
    constructor() {
      if (!new.target)
        throw new TypeError("Constructor Example requires 'new'");

      //If Example extended something, super() would go here
      const __constructor_priv__ = privMap.get(this.constructor);
      privMap.set(this, Object.create(__constructor_priv__.privProto));
    }
  
    print() {
      if (!(privMap.has(this) && privMap.has(this.constructor)) {
        throw new TypeError("Function 'print' called without instance of 'Example' as the context");
      }
      
      const __priv__ = privMap.get(this); 
      const __constructor_priv__ = privMap.get(this.constructor);
      console.log(`field1 = ${__priv__[field1]}`);
      console.log(`field2 = ${__constructor_priv__[field2]}`);
      console.log(`field3 = ${__priv__[field3]}`);
      console.log(`field4 = ${__constructor_priv__[field4]}`);
    }
  };
  
  retval..[Symbol.Inheritance] = {
    protNames: {
      field3
    },
    protStaticNames: {
      field4
    },
    privProto: {
      [field1]: 'alpha',
      [field3]: 42
    },
    privStaticData: {
      [field2]: 0,
      [field4]: "You can see me!"
    }
  };
  
  privMap.set(retval, retval.prototype.[Symbol.Inheritance]);
  
  return retval;
})();
```

## The odd bits...
There will be those who strongly disagree with the use of the `private` keyword without access notation that looks like `obj.field`. To them I say, "I agree. It doesn't feel quite right having that extra character in there." At the same time, I recognize that this is ES, which is a very different language than the ones from which we're borrowing the `class` concept. As such, we should be willing to expect some _reasonable_ concessions. I would rather concede the extra `#` in `obj#.field` for rational reasons like the need to not have private implementation details interfere with public interface mutation, than concede `private` in `private field` for emotional reasons like "it doesn't feel right".

## The gotchas...
Because `obj#;` is a `SyntaxError`, there's no way to directly get at the private container. As such, the following things just won't work over private members:

* Destructuring 
* Iteration
* Anything else that would require direct access to the private container


