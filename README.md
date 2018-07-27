# Object members proposal

## Goal
ES, being a prototype based language, has matured to the point that it is being used to create full desktop and web applications. It now has support for the `class` keyword, making it far simpler to create object factory heirarchies. The main problem with `class` is that it currently doesn't support adding data, let alone private or protected data. Given that the intent of the `class` keyword was to create a simplified syntax for the well-documented process for creating object heirarchies via prototype inheritance, the absense of the ability to put data members into the `class` definition is sorely missed. Further, given that this data usually constitutes implementation details as opposed to being part of the public interface, and that some of these implementation details must be shared amongs descendant classes, there is a definite need for both `private` and `protected` members among the member data. That is what this proposal seeks to provide.

## Rationale
One of the main reasons ES developers even bothered to construct their own class factories in ES5 was to hide implementation details from the users of their class factories. While the `_name` convention may have been nice, and sucessfully got many a programmer to respect functions and member data marked this way as private, it did nothing to stop many developers from ignoring the convention, creating software with various security/usability issues, unduely constraining the flexibility of the library developer, and, in some cases, damaging the reputation of the abused library.

This is the reason we need `private` and `protected`. Their existance will allow developers to properly hide what should be hidden from their users. For those who (quite rightly) think this will interfere with their ability to monkey patch code, you should really be filing feature requests and possibly code patches with the library developer to extend its usability and flexibility. Not only do you help the community by doing that, you also prevent yourself from getting "locked in" to a specific version of that library. Put another way, if you can monkey patch, you can submit a patch!

## Existing proposals
This proposal covers ground in ES for which there are already existing proposals, namely:
* [proposal-static-class-features](https://github.com/tc39/proposal-static-class-features/)
* [proposal-class-fields](https://github.com/tc39/proposal-class-fields)

This proposal should be considered as inheriting the intent and some of the design of these pre-existing proposals. However, there are several critical differences between this proposal and the pre-existing proposals. These differences, I hope, will help to improve both the understanding and adoption of these features without unduely encumbering the language's optimizability or future extensibility. In the two subsections below, the phrase "existing proposal" refers to the proposal named in the section header.

#### Compared to proposal-static-class-features...
On its own, the existing proposal is virtually flawless. It provides exactly what one would expect from the syntax for a static class member. Wherein it allows for public `static` members to be added to a `class`, this proposal absorbs that functionality. However, the existing proposal is an extension of proposal-class-fields and inherits the issues therein. Unfortunately, the existing proposal also has a couple of issues all its own:
* The existing proposal lacks the ability to provide an equivalent of `static #field;` in a function. This will prevent developers from taking advantage of the benefits of the new notation to create object factories with private `static` data stored in the private data slot of the constructor function as would be done for the equivalent `class`.
  * The `static` keyword will be made available within the scope of a function as a means of declaring the `private` data for a function. The `static` keyword is preferred over the `private` keyword for this purpose specifically due to how it behaves.
* The existing proposal, due to the lack of a `protected` equivalent in proposal-class fields, has no concept of a `protected static` declaration in the existing proposal.
  * The `protected` keyword will be made available within the scope of a function as a means of declaring the inheritable `private` data for a function. It must be used in conjunction with the `static` keyword or a `SyntaxError` will occur.

#### Compared to proposal-class-fields...
The sheer amount effort that has been put into the existing proposal is formidable. It would be ill-adivsed at best to ignore the years of contemplation and discourse that has been poured into it. It is for this reason that the many issues and pitfalls that have been skillfully avoided in the existing proposal have been absorbed into this proposal. However, the existing proposal is not without its issues.

* The syntax, while ostensibly easy to understand is meeting with high resistance from many of those who are aware of and interested in affecting the proposal. See [issue #100](https://github.com/tc39/proposal-class-fields/issues/100).
  * This proposal uses more familiar syntax to handle the declarations which is in keeping with expectations from users of other langauges with the `class` keyword. This makes the syntax more natural and familiar to developers. To simplify private member retrieval, an operator is provided that both retrieves the private member container and protects it from being unduely exposed.
* The syntax of the existing proposal seems simple enough on the surface (just replace `_` with `#` and the language will do the rest). However, any attempt to understand the syntax leads to mental model conflicts that are inherent to the use of the syntax itself. See [the FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#but-doesnt-giving-thisx-and-thisx-different-semantics-break-an-invariant-of-current-syntax), [issue #104](https://github.com/tc39/proposal-class-fields/issues/104#issuecomment-396623715), [issue #77](https://github.com/tc39/proposal-class-fields/issues/77#issuecomment-360974968).
  * Instead of using the sigil in a way that always has 2 of 3 different meanings (declaration token, access operator, `[[IdentifierName]]` character), it will instead be used only as an access operator, simplifying the understanding of how to use it.
* The syntax of the existing proposal limits the prescribed features to usage of the `class` keyword. This is not in keeping with the fact that all of the present functionality of the `class` keyword can be used in ES6 without using the `class` keyword. Likewise, there are those who would want to be able to use a feature like that provided by the existing proposal without being required to use the `class` keyword. See [issue #77](https://github.com/tc39/proposal-class-fields/issues/77#issuecomment-361016935).
  * The `private` and `protected` keywords will also be made available to object declarations. The `#` access operator will be made available to functions declared within an object literal declaration.
* The existing proposal refuses to use the `private` keyword for fear that it "implies that access would be done with `this.x`" ([FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#why-arent-declarations-private-x)). This implication does not make sense given the fact that you can [model encapsulation using WeakMaps](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#how-can-you-model-encapsulation-using-weakmaps), a well known technique that requires accessing a separate object to retrieve the private members, and given that the existing proposal _desugars to using WeakMaps_. If that is how the existing proposal is to be mentally modelled, then it should also be obvious that the private fields of a `class` cannot be accessed via `this.x`.
  * The `private` keyword will be used to define a `private` field instead of the `#`. The notation for access to a `private` field will become `obj#.field`, maintaining some semblance of the `obj.x` expectation since `obj#` retrieves the private data record.
* The syntax of the existing proposal breaks the common equality `this.x === this['x']` for private fields due to the fact that the `#` sigil is part of the `[[IdentifierName]]` of the private field. See [the FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#why-doesnt-thisx-access-the-private-field-named-x-given-that-thisx-does), [issue #74](https://github.com/tc39/proposal-class-fields/issues/74).
  * Computed field access has been restored such that `obj#.field === obj#['field']`.
* The existing proposal lacks any concept of `protected`, making it difficult to share non-public information within `class` heirarchies. See [issue #86](https://github.com/tc39/proposal-class-fields/issues/86).
  * The `protected` keyword wiill be used to define a `private` field that can be accessed by descendant `class` instances.

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

Since the debut of `class` in ES, there has also been an alternate way to perform the same actions. There is nothing in ES6 that you can do with `class` that cannot be done without `class` in the same spec version. This was accomplished by ensuring there was a parallel API that allowed object factories to perform the same actions. To continue this tradition, I'm also proposing these possibilities:
```javascript
var example = {
  private privField1: "value",
  private privField2() {},
  private get privField3() {},
  private set privField3(value) {},
  protected protField1: "value",
  protected protField2() {},
  protected get protField3() {},
  protected set protField3(value) {},
  /* public */ field: "value" //Note: The public keyword is useless and not part of the proposal.
};
```

To completely level the playing field, two more notations will be allowed:
```javascript
function ExampleFn() {
  /* private */static field = 1; //The `private` keyword is implied by the scope and therefore useless.
  protected static field2 = 2;
  console.log(`last sum = ${ExampleFn#.field1++ + ExampleFn#.field2++}`);
  console.log(`new sum = ${ExampleFn#.field1 + ExampleFn#.field2}`);
}
```
The end result of this notation allows the function to maintain data that survives the collapse of its closure. Each invocation of such a function would then have access to the data stored in those static fields by a prior invocation. While this feature is at first glance somewhat similar to the functionality of a generator, it is in fact very different, and a necessary feature for ensuring that fully featured constructor functions can still be generated without the help of the `class` keyword. See the [**Implementation details...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#implementation-details) section for more information. Access to such members can be made through the `#` operator with the owning `function` as the left parameter. Use of the `protected` keyword in this scope without the `static` keyword for a given variable declaration results in a `SyntaxError`.

Missing from the above function examples are the use of `async` and `*`(to define a generator). It is the intention of this proposal that these also be supported. The `private` and `protected` keywords are meant to provide a privilege level to any and all possible forms of member variable, property, and function declaration that make sense within a class or object. Given the arguments that have led to [proposal-class-fields](https://github.com/tc39/proposal-class-fields), I propose that the access notation for both `private` and `protected` members be like this:
```javascript
class Example {
  private privField1 = "value";
  
  constructor() {
    console.log(`privField1 = ${this#.privField1}`);
  }
  
  static print(obj) {
    console.log(`privField1 = ${obj#["privField1"]}`);
  }
}
```

## How's this supposed to work?
#### The private member container access operator(`#`)
Other than the familiar declaration keywords, the only new thing is the `#`. As much as I hate to admit it, because of the comparatively peculiar way objects can be used in ES, to keep `private` members from being leaked, there must be a barrier between `public` members and `private` members. To this end, `#` will be a binary operator. The left term for this operator is the object from which we want to retrieve a `private` member. I didn't say "`private` or `protected` member" because `protected` members are just shared `private` members. More on that later. 

The right term for the `#` operator **must be an access operator**. This is critical. At no point, and under no circumstances is the `#` operator ever allowed to be used as a unary postfix operator. Allowing this would invite both confusion and private scope leaks. Violating this is a `SyntaxError`. The only other rule is that the `#` operator cannot be used outside of an object or `class` declaration. Violating this rule is also a `SyntaxError`. This also means that it is a SyntaxError to put `private` fields on an object declaration without also declaring at least 1 function in that declaration that accesses it.

#### The `private` and `protected` keywords
These keywords declare `private` members in much the same way as you would expect if you were implementing `private` data using a `WeakMap`. A short example should make it clear.

With this proposal's syntax:
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

Loosely Translated to ES6:
```javascript
//Pre-defined globally
const Class = (function() {
  const privMap = new WeakMap();
  return function Class(fn) {
    return fn(privMap);
  }
})();

const Example = Class(function(privMap) {
  const field1 = Symbol("field1");
  const field2 = Symbol("field2");
  const field3 = Symbol("field3");
  const field4 = Symbol("field4");
  
  var retval = class Example {
    constructor() {
      if (!new.target) {
        throw new TypeError("Constructor Example requires 'new'");
      }

      //If Example extended something, super() would go here
      const __constructor_priv__ = privMap.get(this.constructor);
      privMap.set(this, Object.create(__constructor_priv__.privProto));

      //Your "super()"-less constructor code here...
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
  
  privMap.set(retval, {
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
  });
  
  return retval;
});
```

If we were to inherit from the example above:
```javascript
class SubExample extends Example {
  private field5 = "Hello from the SubExample!";
  
  constructor() {
    super();
  }
  
  print() {
    super.print();
    console.log(`field5 = ${this#.field5}`);
  }
}
```
it might roughly translate to the following:
```javascript
const SubExample = Class(function(privMap) {
  if (!(privMap && privMap.has(SubExample))) {
    throw new TypeError("Class extends value Example is not a constructor or null");
  }
  const field3 = privMap.get(SubExample).protNames.field3;
  const field4 = privMap.get(SubExample).protStaticNames.field4;
  const field5 = Symbol("field5");
  
  var retval = class SubExample extends Example {
    constructor() {
      if (!new.target) {
        throw new TypeError("Constructor Example requires 'new'");
      }
      
      var retval = Reflect.construct(Example, arguments, SubExample); // === super();
      const __constructor_priv__ = privMap.get(retval.constructor);
      privMap.set(retval, Object.create(__constructor_priv__.privProto));
      
      //Your "super()"-less constructor code here...
      return retval;
    }
  
    print() {
      if (!privMap.has(this)) {
        throw new TypeError("Function 'print' called without instance of 'Example' as the context");
      }
      
      const __priv__ = privMap.get(this); 
      const __constructor_priv__ = privMap.get(this.constructor);
      Object.getPrototypeOf(Object.getPrototypeOf(this)).print.call(this);
      console.log(`field5 = ${__priv__[field5]}`);
    }
  };
  
  privMap.set(retval, {
    protNames: {
      __proto__: privMap.get(SubExample).protNames
    },
    protStaticNames: {
      __proto__: privMap.get(SubExample).protStaticNames
    },
    privProto: {
      [field5]: "Hello from the SubExample!",
      __proto__: privMap.get(SubExample).privProto
    },
    privStaticData: {
      __proto__: privMap.get(SubExample).privStaticData
    }
  });
  
  return retval;
});
```

## Privileges for object declarations...
The addition of `class` keyword also brought the `Reflect` API with it, ensuring that those who have the desire to avoid using the `class` keyword can do so without issue. It is the intention of this proposal that this ability be maintained even though the addition of privilege levels. This is done by allowing the new tokens (`private`, `protected`, & `#`) to be used in object literal declarations as shown in the notation example above. Because any member declared `private` or `protected` will not be publicly accessible on the object instance, any object containing such members must also contain 1 or more functions which, taken together, access all `private` and `protected` members. These functions must be declared within the scope of the object literal declaration.

## Mutations to objects...
Any function added to an object literal or a `class` prototype after the declaration will not have access to the `private` and `protected` members of the object literal or `class`. The reason for this can be seen by looking at the translated code in [**The `private` and `protected` keywords...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#the-private-and-protected-keywords) section above. The result of a `private` or `protected` declaration is a `Symbol` that only exists within the scope of the corresponding object literal or `class` declaration. Functions declared later will not have access to these `Symbols`. Also, since these `Symbols` are not themselves part of the object literal or `class` declaration, there is no means of retrieving these `Symbols` via any object literal, `class` constructor, or `class` prototype.

## Implementation details...
Every object will contain 2 new slots: 
* one for `private` values (`[[PrivateValues]]`)
* one for declaration info (`[[DeclarationInfo]]`)

`[[PrivateValues]]` will contain a single sealed record, the key/value pairs of which will be all of the `private` and `protected` symbols associated with the object and their corresponding default values as well as a `__proto__: null` pair. This serves as the storage for all `private` and `protected` data. `[[DeclarationInfo]]` will contain a single frozen record, the key/value pairs of which are the declared `[[Identifier Name]]` and corresponding `Symbol` value of the `protected` members of the object as well as a `__proto__: null` pair. This serves as the list of inheritable names.

The prototype resulting from a `class` declaration is no different. Neither is the resulting constructor function. When `private` and `protected` members are declared `static` in a `class`, their information is added to the afore mentioned slots of the generated constructor. If they are not declared `static`, their information is added to the afore mentioned slots of the generated prototype object. All key/value pairs added to the `[[DeclarationInfo]]` of any object are added as read-only. All key/value pairs added to the `[[PrivateValues]]` of a `class` prototype are added as read-only while those added to the constructor remain writable.

The `[[PrivateValues]]` of a function used in a `new` operation is used as the `private` and `protected` data for the `static` members of the `class` while the same record of the prototype is used as the `__proto__` value for the new `[[PrivateValues]]` record of every instance object created by the corresponding constructor. The corresponding `[[DeclarationInfo]]` for the new instance is simply copied from the prototype. When a `class` extends another, the `__proto__` field of both afore mentioned slots in both generated components of the newly derived `class` is assigned a reference to the corresponding record of the base `class`. In this way, inheritance of the `protected` members of a `class` continues to follow the same prototypal paradigm already present in ES.

Since the `[[PrivateValues]]` record of an object can only be constructed during the declaration of that object, and it is the desire of this proposal to maintain an API that allows developers to use all features of the language without specifically requiring the `class` keyword to be used. To this end, there must be a means of populating the `[[PrivateValues]]` of a `Function` object without needing the `class` keyword. That is why this proposal includes the ability to declare `static field;` and `protected static field;` within a `function` declaration. Such declarations will be executed at the time of `function` declaration and replaced by the corresponding `Symbol` definition during `function` execution. A fortunate side effect of this declaration style is that C-style static function variables will be added to the language naturally.

## The odd bits...
There will be those who strongly disagree with the use of the `private` keyword without access notation that looks like `obj.field`. To them I say, "I agree. It doesn't feel quite right having that extra character in there." At the same time, I recognize that this is ES, which is a very different language than the ones from which we're borrowing the `class` concept. As such, we should be willing to expect some _reasonable_ concessions. I would rather concede the extra `#` in `obj#.field` for rational reasons like the need to not have private implementation details interfere with public interface mutation, than concede `private` in `private field` for emotional reasons like "it doesn't feel right".

Besides, the use of WeakMaps for providing private data is already a well known use case. Those of us implementing such an approach are already aware that the private data exists in a separate object. As such, the mental model for the new syntax is quite simple: `obj#.field <-> [[WeakMap]].get(obj).field`. The internal reality will not be too different:
`obj#.field <-> obj.[[PrivateValues]][obj.[[DeclarationInfo]].field]`. The same mapping will hold true for array notation (`[]`) as well. This gives the `#` a very singular, easy to understand conceptual meaning: 

`<lParam>#<rParam> === <lParam>.[[PrivateValues]][<lParam>.[[DeclarationInfo]]<rParam>]`

## The gotchas...
Because `obj#;` is a `SyntaxError`, there's no way to directly get at the private container. As such, the following things just won't work over private members:

* Destructuring 
* Iteration
* Anything else that would require direct access to the private container


