# Object members proposal

## Goal
ES, being a prototype based language, has matured to the point that it is being used to create full desktop and web applications. It now has support for the `class` keyword, making it far simpler to create object factory heirarchies. The main problem with `class` is that it currently doesn't support adding data, let alone private or protected data. Given that the intent of the `class` keyword was to create a simplified syntax for the well-documented process for creating object heirarchies via prototype inheritance, the absense of the ability to put data members into the `class` definition is sorely missed. Further, given that this data usually constitutes implementation details as opposed to being part of the public interface, and that some of these implementation details must be shared amongs descendant classes, there is a definite need for both `private` and `protected` members among the member data. That is what this proposal seeks to provide.

## Rationale
One of the main reasons ES developers even bothered to construct their own class factories in ES5 was to hide implementation details from the users of their class factories. While the `_name` convention may have been nice, and sucessfully got many a programmer to respect functions and member data marked this way as private, it did nothing to stop many developers from ignoring the convention, creating software with various security/usability issues, unduely constraining the flexibility of the library developer, and, in some cases, damaging the reputation of the abused library.

This is the reason we need `private` and `protected`. Their existence will allow developers to properly hide what should be hidden from their users. For those who (quite rightly) think this will interfere with their ability to monkey patch code, you should really be filing feature requests and possibly code patches with the library developer to extend its usability and flexibility. Not only do you help the community by doing that, you also prevent yourself from getting "locked in" to a specific version of that library. Put another way, if you can monkey patch, you can submit a patch!

With regards to `protected` something must first be understood, it doesn't really protect anything. The problem occurs because ES is a dynamic language. At any time, any code can create an object that inherits another object. Since any object that inherits a particular prototype can manipulate the protected members of any other object inheriting that same prototype, nothing can be done to prevent malicious code from accessing the protected members of any object. As a matter of fact, this is also an issue for statically compiled code. The only difference is the speed with which such code can be developed.

However, absolutely hiding members is not the purpose of the `protected` feature. The main purpose of `protected` is to provide a clear, declarative, soft-privacy that partitions an object's internal API from its external API. This can be thought of as a technical formalization of the underscore convention that is prevelant in existing code bases for use in sharing API between objects. Since no protected member will ever appear to be a public member of the object, there's no chance of accidental use of an internal API. In order to make use of an object's internal API, the developer must deliberately inherit from that object.

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
  public static field = 3; //This allows functions object to make privileged public static members.
  console.log(`last sum = ${ExampleFn#.field1++ + ExampleFn#.field2++}`);
  console.log(`new sum = ${ExampleFn#.field1 + ExampleFn#.field2}`);
}
```
This notation allows the function to maintain data that survives the collapse of its closure. Each invocation of such a function would then have access to the data stored in those static fields by a prior invocation. While this feature is at first glance somewhat similar to the functionality of a generator, it is in fact very different, and a necessary feature for ensuring that fully featured constructor functions can still be generated without the help of the `class` keyword. See the [**Implementation details...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#implementation-details) section for more information. 

Access to such members can be made through the `#` operator with the owning `function` as the left parameter. Use of the `protected` keyword in this scope without the `static` keyword for a given variable declaration results in a `SyntaxError`. Since a closure is an inherently private space, the `private` keyword is not required when declaring a `private static` field. However, because this would leave no means of declaring a `public static` field, this becomes the one and only use case where `public` serves a function.

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

In general, the rule for the `#` operator looks like this:

`<lParam>#<rParam> === <lParam>.[[PrivateValues]][<lParam>.[[DeclarationInfo]]<rParam>]`

Given code like `obj#.field`, ES should perform the following steps:
1. Throw a type error if `obj` is not an object
2. Let D be the `[[DeclarationInfo]]` record of `obj`.
3. If D is not and is not in the `[[DeclarationInfo]]` of the current function object, throw a TypeError.
4. Let N be the value for the key matching `field` in D, or undefined if no such key exists.
5. Let P be the `[[PrivateValues]]` record of `obj`.
6. If N is not a key of P, Throw a TypeError.
7. Return P[N].

See [**Implementation details...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#implementation-details) for an explanation of the terms between the double braces (`[[ ]]`).

#### The `private` keyword
The `private` keyword declares members in much the same way as you would expect if you were implementing `private` data using a `WeakMap`. The `private` keyword will provide a simple means of implementing a "hard-private" interface. Nothing outside the declaring object will ever have access to any member declared `private` unless the declaring object provides for such. 

#### The `protected` keyword
The `protected` keyword declares members that are "soft-private" so as to allow them to be shared with inheriting objects. Because of the "soft-privacy" of `protected`, **_nothing declared as such should be considered as private information_**. ES is a dynamic language making privacy an all or nothing situation. What `protected` instead offers is API separation. By declaring fields as `protected` those fields will not appear on the public interface of the object. Instead, they will appear as public members of the object's `private` interface. In this way, methods declared in both the declaring object and other objects using the declaring object as a prototype will be able to access these members.

The examples below should make the usage of both `private` and `protected` clear.

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
//See the POC folder for details on this library
var Privacy = require("privacy.es6");

let Example = Privacy(class Example {
  static Privacy[DATA]() {
    return {
      ['private field1']: 'alpha',
      ['static private field2']: 0,
      ['protected field3']: '42',
      ['static protected field4']: "You can see me!"
    };
  }
  
  print() {
    console.log(`field1 = ${this['#'].field1}`);
    console.log(`field2 = ${this.constructor['#'].field2}`);
    console.log(`field3 = ${this['#']['field3']}`); //Yes, obj#.x === obj#['x']
    console.log(`field4 = ${this.constructor['#'].field4}`);
  }
})
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
let SubExample = Privacy(class SubExample extends Example {
  static Privacy[DATA]() {
    return {
        ['private field5']: "Hello from the SubExample!"
      };
    }
  
  constructor() {
    super();
  }
  
  print() {
    super.print();
    console.log(`field5 = ${this['#'].field5}`);
  }
});
```

## Privileges for object declarations...
The addition of `class` keyword also brought the `Reflect` API with it, ensuring that those who have the desire to avoid using the `class` keyword can do so without issue. It is the intention of this proposal that this ability be maintained even though the addition of privilege levels. This is done by allowing the new tokens (`private`, `protected`, & `#`) to be used in object literal declarations as shown in the notation example above. Because any member declared `private` or `protected` will not be publicly accessible on the object instance, any object containing such members must also contain 1 or more functions which, taken together, access all `private` and `protected` members. These functions must be declared within the scope of the object literal declaration.

## Mutations to objects...
Any function added to an object literal or a `class` prototype after the declaration will not have access to the `private` and `protected` members of the object literal or `class`. The reason for this can be seen by looking at the translated code in [**The `private` and `protected` keywords...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#the-private-and-protected-keywords) section above. The result of a `private` or `protected` declaration is a `Symbol` that only exists within the scope of the corresponding object literal or `class` declaration. Functions declared later will not have access to these `Symbols`. Also, since these `Symbols` are not themselves part of the object literal or `class` declaration, there is no means of retrieving these `Symbols` via any object literal, `class` constructor, or `class` prototype.

## Implementation details...
Every object will contain 3 new slots: 
* one for `private` values (`[[PrivateValues]]`)
* one for declaration info (`[[DeclarationInfo]]`)
* one for inheritance info (`[[InheritanceInfo]]`)

`[[PrivateValues]]` will contain a single record, the key/value pairs of which will be the private `Symbol` name and associated data for all of the `private` and `protected` fields as well as a `__proto__: null` pair. `[[PrivateValues]]` serves as the storage record for all `private` and `protected` data. Each member will be added as non-configurable. The `__proto__` will be set to the `[[PrivateValues]]` of the parent object after all `private` and `protected` declarations have been added.

`[[DeclarationInfo]]` will contain an array of records. The 1<sup>st</sup> of these records describes the private fields of the associated object. Each of the remaining records come from other object for which the current object has been granted access. Each `[[DeclarationInfo]]` object will have key/value pairs which will be the declared `[[Identifier Name]]` and corresponding private `Symbol` value of each `private` and `protected` member as well as a `__proto__: null` pair. Each record of the  `[[DeclarationInfo]]` array serves as a list of known `private` and `protected` fields that are valid given a particular scope and context pair. Each member of the 1<sup>st</sup> `[[DeclarationInfo]]` record will be added as non-configurable and read-only. The `__proto__` of the 1<sup>st</sup> record of the `[[DeclarationInfo]]` array will be set to the `[[InheritanceInfo]]` of the parent object after all `private` and `protected` declarations have been added.

`[[InheritanceInfo]]` will contain a single record, the key/value pairs of which are the declared `[[Identifier Name]]` and corresponding `Symbol` value of the `protected` members of the object as well as a `__proto__: null` pair. `[[InheritanceInfo]]` serves as the list of inheritable names. Each member will be added as non-configurable and read-only.  The `__proto__` will be set to the `[[InheritanceInfo]]` of the parent object after all `private` and `protected` declarations have been added.

Declaring an object within a given scope results in that object acquiring all `[[DeclarationInfo]]` records accessible via the containing scope. This **does not** include the `[[DeclarationInfo]]` records of other objects contained within the same scope. In this way, the object gains access to all private information accessible from the same scope. 

Access checks are performed by searching for matching records in the `[[DeclarationInfo]]` arrays of the targeted object and requesting function. If a match is found and the match contains the requested `[[IdentifierName]]`, access is granted. If no matching record is found, or if the requested `[[IdentifierName]]` is not found in any of the matching records, then a TypeError is thrown.

When using the `class` keyword to create an object factory, all non-`static` members that are declared either `private` or `protected` are applied to the prototype. Members that are declared both `static` and either `private` or `protected` are treated as though they are `static` members of the function's own lexical scope. This allows such members to be applied to the afore mentioned slots of the function object itself.

## The odd bits...
There will be those who strongly disagree with the use of the `private` keyword without access notation that looks like `obj.field`. To them I say, "I agree. It doesn't feel quite right having that extra character in there." At the same time, I recognize that this is ES, which is a very different language than the ones from which we're borrowing the `class` concept. As such, we should be willing to expect some _reasonable_ concessions. I would rather concede the extra `#` in `obj#.field` for rational reasons like the need to not have private implementation details interfere with public interface mutation, than concede `private` in `private field` for emotional reasons like "it doesn't feel right".

Besides, the use of WeakMaps for providing private data is already a well known use case. Those of us implementing such an approach are already aware that the private data exists in a separate object. As such, the mental model for the new syntax is quite simple: `obj#.field <-> [[WeakMap]].get(obj).field`. The internal reality will not be too different:
`obj#.field <-> obj.[[PrivateValues]][obj.[[DeclarationInfo]].field]`. The same mapping will hold true for array notation (`[]`) as well.

## The gotchas...
Because `obj#;` is a `SyntaxError`, there's no way to directly get at the private container. As such, the following things just won't work over private members:

* Destructuring 
* Iteration
* Anything else that would require direct access to the private container


