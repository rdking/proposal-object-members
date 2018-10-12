# Object members proposal

## Goal

This proposal is to provide functional support for access modifiers on object memmbers, namely `private`, `protected`, & `public` to ES. Use of `static` with and without access modifiers is to be supported for function objects. The end result will be lexical declaration syntax for:

* Fully encapsulated, hard-private fields accessible from an object
* Soft-private fields accessible from an object or its descendants
* Static fields at any access level accessible from a function object

Under this version of the proposal, encapsulation requires inaccessibility, but does not include undetectability. For a proposal that includes undetectability, see [README_WITH_SIGIL](./README_WITH_SIGIL.md).

## Rationale
Adding access levels to ES will provide developers with a clear, direct, and easy to understand means of modeling objects and their APIs using an approach familiar from other languages. The general idea is to add access modifiers for use in object definitions. This means that `class` will naturally inherit use of the modifiers since it is just a tokenization of a well known, often used pattern.Basing this paradigm on objects allows the feature to be used in both handwritten object factories and classes. The following should be understood when reading this proposal:

* **`private`** - full encapsulation. Only accessible from the declaring object's lexically included methods. Not an "ownProperty" of the declaring object.
* **`protected`** - accessible from the declaring object's lexically included methods, and any object for which the declaring object is a prototype. Not an "own property" of the declaring object.
* **`public`** - accessible in any scope from which the declaring object is also accessible.

## Existing proposals
This proposal covers ground in ES for which there are already existing proposals, namely:
* [proposal-static-class-features](https://github.com/tc39/proposal-static-class-features/)
* [proposal-class-fields](https://github.com/tc39/proposal-class-fields)

This proposal should be considered as inheriting the intent and some of the design of these pre-existing proposals. However, there are several critical differences between this proposal and the pre-existing proposals. These differences, I hope, will help to improve both the understanding and adoption of these features without unduely encumbering the language's optimizability or future extensibility. In the two subsections below, the phrase "existing proposal" refers to the proposal named in the section header.

#### Compared to proposal-static-class-features...
This proposal has few problems of its own, but inherits several by being tied to proposal-class fields.

* The existing proposal lacks the ability to provide an equivalent of `static #field;` in a function. This limits what developers can do with factory functions. This increases the conplexity of creating a method on the factory constructor that has access to the private data of the factory-created object without constantly re-creating the function.

  * The `static` keyword will be made available within the lexical scope of a function in conjunction with the access modifiers. 

* The existing proposal, due to the lack of a `protected` equivalent in proposal-class fields, has no concept of a `protected static` declaration in the existing proposal.

  * The `protected` keyword will be made available within the lexical scope of all objects. Within a function, this is a means of declaring the inheritable data for a function. Within a function, it must be used in conjunction with the `static` keyword or a `SyntaxError` will occur. 

#### Compared to proposal-class-fields...
The sheer amount effort that has been put into the existing proposal is formidable. It would be ill-adivsed at best to ignore the amount of effort poured into it. However, the existing proposal is not without its issues.

* The requirement for private field undetectability drove the need for a sigil as a means to hide private fields from namespace collisions with public fields applied later. However, the arguments raised in defense of the need for undetectability suffer from logical contradictions while examples of the problems that would benefit from undetectability do not fit the required scenario. See [issue #136](https://github.com/tc39/proposal-class-fields/issues/136).
  
  * This proposal does not require undetectability, and does not make use of a sigil.

* The syntax, while ostensibly easy to understand is meeting with high resistance from many of those who are aware of and interested in affecting the proposal. See [issue #100](https://github.com/tc39/proposal-class-fields/issues/100).

  * This proposal uses the well-known syntax and meanings for declaring fields with access levels keeping the learning curve small.
  * This proposal uses the same access notation for public and non-public fields.

* Attempts to understand the syntax of the existing proposal leads to mental model conflicts that are inherent to the use of the syntax itself. See [the FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#but-doesnt-giving-thisx-and-thisx-different-semantics-break-an-invariant-of-current-syntax), [issue #104](https://github.com/tc39/proposal-class-fields/issues/104#issuecomment-396623715), [issue #77](https://github.com/tc39/proposal-class-fields/issues/77#issuecomment-360974968).

* The syntax of the existing proposal limits the new features to `class` declarations despite ES being a prototype-based language as opposed to a class-based one. See [issue #77](https://github.com/tc39/proposal-class-fields/issues/77#issuecomment-361016935).

  * The access modifiers will be made available to object and function declarations.

* The existing proposal refuses to use the `private` keyword for fear that it "implies that access would be done with `this.x`" ([FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#why-arent-declarations-private-x)).

  * Access modifier keywords will be used to define non-public fields.
  * Access notation will become `obj.field`, exactly as expected

* The syntax of the existing proposal breaks the common equality `this.x === this['x']` for private fields due to the fact that the `#` sigil is part of the `[[IdentifierName]]` of the private field. See [the FAQ](https://github.com/tc39/proposal-class-fields/blob/master/PRIVATE_SYNTAX_FAQ.md#why-doesnt-thisx-access-the-private-field-named-x-given-that-thisx-does), [issue #74](https://github.com/tc39/proposal-class-fields/issues/74).

  * Computed field access will retain the common equality for non-public fields.

* The existing proposal lacks any concept of `protected`, making it difficult to share API that must not be accessible from the own properties of an object. See [issue #86](https://github.com/tc39/proposal-class-fields/issues/86).

  * The `protected` keyword will be used to define a field that can be accessed by both the declaring object and other objects having the declaring object as a prototype.

## Notation
The new syntax should be as follows:
<pre>
  <i>FunctionScopeAccessModifier</i>:
    <b>public</b>
    <b>protected</b>
  <i>ObjectScopeAccessModifier</i>:
    <b>protected</b>
    <b>private</b>
  <i>ClassElement</i>:
    <i>MethodDefinition</i>
    <b>static</b> <i>MethodDefinition</i>
    <i>ObjectScopeAccessModifier</i> <i>MethodDefinition</i>
    <i>ObjectScopeAccessModifier</i> <b>static</b> <i>MethodDefinition</i>
    <i>VariableDeclaration</i>
    <b>static</b> <i>VariableDeclaration</i>
    <i>ObjectScopeAccessModifier</i> <i>VariableDeclaration</i>
    <i>ObjectScopeAccessModifier</i> <b>static</b> <i>VariableDeclaration</i>
  <i>PropertyDefinition</i>:
    <i>IdentifierReference</i>
    <i>CoverInitializedName</i>
    <i>PropertyName</i> : AssignmentExpression
    <i>MethodDefinition</i>
    <i>ObjectScopeAccessModifier</i> <i>IdentifierReference</i>
    <i>ObjectScopeAccessModifier</i> <i>CoverInitializedName</i>
    <i>ObjectScopeAccessModifier</i> <i>PropertyName</i> : AssignmentExpression
    <i>ObjectScopeAccessModifier</i> <i>MethodDefinition</i>
  <i>VariableDeclaration</i>
    <i>BindingIdentifier</i> <i>Initializer</i><sub>opt</sub>
    <i>BindingPattern</i> <i>Initializer</i>
    <b>static</b> <i>BindingIdentifier</i> <i>Initializer</i><sub>opt</sub>
    <b>static</b> <i>BindingPattern</i> <i>Initializer</i>
    <i>FunctionScopeAccessModifier</i> <b>static</b> <i>BindingIdentifier</i> <i>Initializer</i><sub>opt</sub>
    <i>FunctionScopeAccessModifier</i> <b>static</b> <i>BindingPattern</i> <i>Initializer</i>
</pre>

In essense, this proposal intends to allow:
* field declarations in `class` definitions,
* access modifiers in any object, or class declaration
* access modifiers + `static` for any function-scoped variable declaration

```js
class Example {
  private privField1 = "value";
  protected static protStaticField2() {}
  field = "value"; //Note: public is default
}

var example2 = {
  private privField1: "value",
  protected protField2() {},
  field: "value" //Note: public is default
};

function ExampleFn() {
  static field = 1; //`private` is default
  protected static field2 = 2;
  public static field = 3; //`public` allows exposing static fields
  console.log(`last sum = ${ExampleFn.field1++ + ExampleFn.field2++}`);
  console.log(`new sum = ${ExampleFn.field1 + ExampleFn.field2}`);
}
```

The new static variable notation is a requirement that allows `class` definitions to have non-public static fields. As a side effect, this notation allows functions to maintain data that survives the collapse of its closure. Each invocation of such a function would then have access to the data stored in those static fields by a prior invocation. This feature may at first glance appear somewhat similar to the functionality of a generator. However, it differs in that no iterator is generated, and no closure is maintained. As a result, fully featured constructor functions can still be generated without the help of the `class` keyword. See the [**Implementation details...**](https://github.com/rdking/proposal-object-members/blob/master/README.md#implementation-details) section for more information. 

Use of any access modifier keyword in this scope without the `static` keyword for a given variable declaration results in a `SyntaxError`. Since a closure is an inherently private space, the `private` keyword is not required when declaring a `private static` field. However, because this would leave no means of declaring a `public static` field, this becomes the one and only use case where `public` serves a function. Use of an access modifier will not conflict with any other function modifiers. The `private` and `protected` keywords are meant to provide an access level to any and all possible forms of member variable, property, and function declaration that make sense within an object. 

---
## How's this supposed to work?

#### The `private` keyword
The `private` keyword declares members that are completely encapsulated in a scope that is public by default. This is done in much the same way as you would expect if you were implementing `private` data using a `WeakMap`. Nothing outside the declaring object will ever have access to any member declared `private` unless the declaring object provides for such. 

#### The `protected` keyword
The `protected` keyword declares members that are encapsulated in a scope, much like with `private`. However,if the declaring object becomes the prototype of another object, the new object will be granted access to these members. I must be noted that **_nothing declared `protected` should be considered as private information_**. What `protected` offers instead is API separation. This allows a developer to cleanly separate the API meant to be used most commonly from the API meant to be used by those who wish to extend the API.

#### The `public` keyword

The `public` keyword declares members that are public in a scope that is private by default. As such, this keword is only useful in the context of a function. This allows a function to declare publicly accessible static members that live on the function itself. This capability, being inherited by the `class` keyword, is what gives rise to the ability to declare `class` static fields.

The examples below should make the usage of `private`, `protected`, and `public` clear.

With this proposal's syntax:
```javascript
class Example {
  private field1 = 'alpha';
  static private field2 = 0;
  protected field3 = '42';
  static protected field4 = "You can see me!";
  field5 = "Just because...";
  
  print() {
    console.log(`field1 = ${this.field1}`);
    console.log(`field2 = ${this.constructor.field2}`);
    console.log(`field3 = ${this['field3']}`);
    console.log(`field4 = ${this.constructor.field4}`);
    console.log(`field5 = ${this.field5}`);
  }
}
```

Translated to ES6:
```js
var Example = (function() {
  var pvt = new WeakMap();

  /**
   * Puts the non-private static members of this class on a derived class.
   * @param {Symbol} flag - Should be <classname>.inheritance.
   * @param {function} subClass - Should be the derived class being created.
   * @returns {boolean} - a true/false flag telling whether or not derived
   * class creation was detected.
   */
  function isStaticInheritance(flag, subClass) {
    var retval = false;
    if ((flag === Example.inheritance) &&
        (typeof(subClass) == "function") &&
        (subClass.prototype instanceof Example)) {
      subClass[Example.inheritance] = pvt.get(Example.prototype).static;
      retval = true;
    }
    return retval;
  }

  class Example { 
    constructor() {
      //If a derived class was just created, don't bother initializing the instance.
      if (!((arguments.length === 2) && isStaticInheritance.apply(null, arguments))) {
        //Are we building something that extends Example?
        if (new.target !== this.constructor) {
          this[this.constructor.inheritance] = pvt.get(this.constructor.prototype);
        }

        pvt.set(this, {
          field1: 'alpha',
          field3: '42'
        });
      }
    }
  
    print() {
      if (!pvt.has(this)) {
        throw new TypeError("Invalid context object");
      }
      if (!pvt.has(this.constructor)) {
        throw new TypeError("Invalid context object");
      }
      var p = pvt.get(this);
      var fp = pvt.get(this.constructor);
      console.log(`field1 = ${p.field1}`);
      console.log(`field2 = ${fp.field2}`);
      console.log(`field3 = ${p['field3']}`);
      console.log(`field4 = ${fp.field4}`);
      console.log(`field5 = ${this.field5}`);
    }
  }

  //Static Private fields
  pvt.set(Example, {
    field2: 0,
    field4: "You can see me"
  });

  //Protected fields
  pvt.set(Example.prototype, {
    static: {
      get field4() { return pvt.get(Example).field4; }
    },
    nonStatic: {
      get field3() { return pvt.get(this).field3; }
    }
  });

  Object.defineProperty(Example, "inheritance", { value: Symbol() });

  return Example;
})();
```

If we were to inherit from the example above:
```javascript
class SubExample extends Example {
  private field6 = "Hello from the SubExample!";
  
  constructor() {
    super();
  }
  
  print() {
    super.print();
    console.log(`field5 = ${this.field6}`);
  }
}
```
it might translate to the following:
```javascript
var SubExample = (function () {
  var pvt = new WeakMap();

  /**
   * Puts the non-private static members of this class on a derived class.
   * @param {Symbol} flag - Should be <classname>.inheritance.
   * @param {function} subClass - Should be the derived class being created.
   * @returns {boolean} - a true/false flag telling whether or not derived
   * class creation was detected.
   */
  function isStaticInheritance(flag, subClass) {
    var retval = false;
    if ((flag === Example.inheritance) &&
        (typeof(subClass) == "function") &&
        (subClass.prototype instanceof Example)) {
      subClass[Example.inheritance] = pvt.get(Example.prototype).static;
      retval = true;
    }
    return retval;
  }

  /**
   * Migrates inheritance from base into the prototype of container.
   * @param {object} obj - the object hosting the inheritance data.
   * @param {function} base - the constructor of the base class.
   * @param {object} container - the private container for this class.
   * @param {boolean} wantStatic - a flag to determine which fields to inherit.
   */
  function getInheritance(obj, base, container, wantStatic) {
    if (obj[base.inheritance]) {
      let group = (!!wantStatic) ? 'static' : 'nonStatic';
      let inheritable = obj[base.inheritance][group];
      let inheritKeys = Object.getOwnPropertyNames(inheritable);

      //Copy the inheritables into our inheritance.
      for (let key of inheritKeys) {
        Object.defineProperty(container, key, Object.getOwnPropertyDescriptor(inheritable, key));
      }
      
      if (!wantStatic)
        delete obj[base.inheritance];
    }

    return container;
  }

  class SubExample extends Example {
    constructor() {
      //If a derived class was just created, don't bother initializing the instance.
      if (!((arguments.length === 2) && isStaticInheritance.apply(null, arguments))) {
        super();
    
        //Check for an inheritance 
        pvt.set(this, getInheritance(this, Example, {
          field6: "Hello from the SubExample!"
        }));
      }
    }
  
    print() {
      if (!pvt.has(this)) {
        throw new TypeError("Invalid context object");
      }
      var p = pvt.get(this);
      super.print();
      console.log(`field6 = ${p.field6}`);
    }
  }

  //Initialize SubExample with fields inherited from Example.
  new Example(Example.inheritance, SubExample);
  
  //Static Private fields
  pvt.set(SubExample, getInheritance(SubExample, Example, {}, true));

  //Protected fields
  pvt.set(Example.prototype, {
    static: getInheritance(SubExample, Example, {}, true),
    nonStatic: getInheritance(SubExample, Example, {}, false)
  });

  Object.defineProperty(SubExample, "inheritance", { value: Symbol() });

  return SubExample;
})();
```

## Privileges for object declarations...
Both `private` and `protected` will be supported for object declarations. This allows object factories to also make use of non-public data and API without the risk of memory leaks often inherent in closure-based APIs. Inheritance via setting the `__proto__` of an object will cause the instance to inherit the protected members of the parent object.

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
There will be those who strongly disagree with the use of the `private` keyword without access notation that looks like `obj.field`. As long as it is understood that much like implementation of private data via a WeakMap, there is a separate private container only accessible using the `#` operator from within a method declared on the object, then access notation does indeed "look like" `obj.field` since `obj#` is the actual object being accessed.

## The gotchas...
Because `obj#;` is a `SyntaxError`, there's no way to directly get at the private container. As such, the following things just won't work over private members:

* Destructuring 
* Iteration
* Anything else that would require direct access to the private container
