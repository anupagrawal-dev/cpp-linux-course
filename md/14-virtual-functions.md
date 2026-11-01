# 14 — Virtual Functions

*Category: C++ Core*

> A virtual function is chosen at run time from the real type of the object, so one piece of code can work with many derived types.

## Must-remember points

- Without `virtual`, `basePtr->fn()` uses **static dispatch**: the compiler picks the function from the **pointer's type** (the base version). With `virtual` it uses **dynamic dispatch**: the function of the **real object** is chosen at run time.
- Dynamic dispatch works only through a **pointer or reference** to the base. A by-value copy is sliced (lesson 13) and runs the base version.
- An override is virtual automatically. Write **`override`** on it: a signature mismatch (a missing `const`) becomes a compile error instead of a silent new function.
- **`final`** on a function stops further overriding; on a class it stops further inheritance.
- **vtable** = one table per class of function pointers, one slot per virtual function. **vptr** = a hidden pointer in each object to its class's vtable. A class with no virtual functions has neither.
- Cost: a vptr per object (8 bytes on x86-64), an extra load per call, usually no inlining.
- Traps: a virtual call inside a **constructor or destructor** does not reach the derived override, and **default arguments** come from the static type.
- A class meant to be used through base pointers needs a **virtual destructor** (lesson 12).

## Static vs dynamic dispatch

**Meaning:** when you call a member function through a base pointer or reference, the compiler must decide which version runs. For a normal function it decides at compile time, from the type of the pointer or reference (**static dispatch**). For a `virtual` function it decides at run time, from the type of the real object (**dynamic dispatch**). This needs a **pointer or reference**: a by-value copy is a new base object.

```cpp
#include <iostream>

class Animal {
public:
    virtual ~Animal() = default;                               // see lesson 12
    void describe() const { std::cout << "an animal\n"; }      // not virtual
    virtual void speak() const { std::cout << "...\n"; }       // virtual
};

class Dog : public Animal {
public:
    void describe() const { std::cout << "a dog\n"; }
    void speak() const override { std::cout << "Woof\n"; }
};

void byValue(Animal a) { a.speak(); }   // a is a new Animal: the Dog part was sliced off

int main() {
    Dog d;
    Animal& r = d;       // r refers to the Dog, seen as an Animal
    Animal* p = &d;      // the same through a pointer
    r.describe();        // static: chosen from the type of r (Animal)
    r.speak();           // dynamic: chosen from the real object (Dog)
    p->speak();          // dynamic
    byValue(d);          // a sliced copy: Animal's version
    d.Animal::speak();   // qualified name: Animal's version, no dispatch
}
```
```output
an animal
Woof
Woof
...
...
```

**How it works:**
1. `r` and `p` have base types, but the object behind them is a `Dog`.
2. `describe()` is not virtual, so `r.describe()` is bound at compile time to `Animal::describe`. `Dog::describe` only **hides** it (lesson 13).
3. `speak()` is virtual, so `r.speak()` and `p->speak()` check the real object at run time and call `Dog::speak`.
4. `byValue` builds a new `Animal` from the Dog's base part (slicing, lesson 13), so `Animal::speak` runs.
5. `d.Animal::speak()` names the class, which switches dispatch off. An override uses this to extend the base version: `Animal::speak();` inside `Dog::speak`.

## Polymorphism: one loop, many types

**Meaning:** the main use of virtual functions. Code is written once against the base class, and each object brings its own behaviour. You can keep different derived objects in one container of base pointers and treat them the same way.

```cpp
#include <iostream>
#include <string>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual std::string name() const { return "shape"; }
    virtual double area() const { return 0; }
};

class Circle : public Shape {
    double r;
public:
    explicit Circle(double radius) : r(radius) {}
    std::string name() const override { return "circle"; }
    double area() const override { return 3.14 * r * r; }
};

class Rect : public Shape {
    double w, h;
public:
    Rect(double width, double height) : w(width), h(height) {}
    std::string name() const override { return "rect"; }
    double area() const override { return w * h; }
};

void report(const Shape& s) {             // knows nothing about Circle or Rect
    std::cout << s.name() << ": " << s.area() << "\n";
}

int main() {
    Circle c(1);
    Rect r(2, 3);
    Shape plain;
    std::vector<const Shape*> shapes = {&c, &r, &plain};
    for (const Shape* s : shapes)
        report(*s);                       // each element reaches its own override
}
```
```output
circle: 3.14
rect: 6
shape: 0
```

**How it works:**
1. The vector holds `const Shape*`, so it can point at a `Circle`, a `Rect` and a plain `Shape`.
2. Inside `report`, `s.name()` and `s.area()` call the version of the object passed in.
3. A new class (say `Triangle`) works with `report` without changing or recompiling it.
4. `Shape::area()` returning 0 is a meaningless default. Lesson 15 makes it **pure virtual** so every shape must provide its own.

## How it works: vtable and vptr

**Meaning:** each class with virtual functions gets one **vtable**: an array of function pointers, one slot per virtual function. Each object holds a hidden **vptr**, set by the constructor, pointing at its class's vtable. A virtual call loads the vptr, loads the function pointer from the right slot, and calls it.

| Object | its vptr points to | slot `name` | slot `area` |
|---|---|---|---|
| `Shape` object | vtable for `Shape` | `Shape::name` | `Shape::area` |
| `Circle` object | vtable for `Circle` | `Circle::name` | `Circle::area` |
| `Rect` object | vtable for `Rect` | `Rect::name` | `Rect::area` |

The vptr costs one pointer per object, however many virtual functions the class has:

```cpp
#include <iostream>

struct Plain       { int x; void f() {} };
struct OneVirtual  { int x; virtual void f() {} };
struct TwoVirtuals { int x; virtual void f() {} virtual void g() {} };

int main() {
    std::cout << sizeof(Plain) << " " << sizeof(OneVirtual) << " " << sizeof(TwoVirtuals) << "\n";
}
```
```output
4 16 16
```

**How it works:**
1. On x86-64 with g++, `Plain` is just its `int`. Normal member functions take no space in the object.
2. One virtual function adds an 8-byte vptr; with alignment padding the object becomes 16 bytes.
3. A second virtual function adds a slot to the vtable, not to each object.

The call in machine code (the three classes from the previous section plus `double get(const Shape& s) { return s.area(); }` in `shapes.cpp`):

```bash
$ g++ -O2 -c shapes.cpp
$ objdump -d --no-show-raw-insn -C shapes.o | grep -A3 '<get(Shape const&)>:'
0000000000000000 <get(Shape const&)>:
   0:	endbr64
   4:	mov    (%rdi),%rax
   7:	jmp    *0x18(%rax)
```

`mov` loads the vptr from the start of the object; `jmp *0x18(%rax)` jumps to the address in the slot for `area` (g++ puts two destructor entries and `name` before it). The target is known only at run time, so the call usually can't be inlined.

## override and final

**Meaning:** an override must match the base function exactly: same name, parameters and `const`. If it doesn't, you have written a **new** function that hides the base one, and calls through the base never reach it. `override` asks the compiler to check that it really overrides something. `final` stops the chain: no further override of that function, or no class derived from that class. An override is virtual even without the `virtual` keyword, so a further derived class can override it again unless it is `final`.

```cpp
#include <iostream>

struct Animal {
    virtual ~Animal() = default;
    virtual void speak() const { std::cout << "...\n"; }
};
struct Dog : Animal {
    void speak() { std::cout << "Woof\n"; }     // forgot const: a NEW function, not an override
};

int main() {
    Dog d;
    const Animal& a = d;
    a.speak();                                  // still Animal::speak
}
```
```output
...
```

This compiles (g++ 13 with `-Wall` only warns that `Animal::speak() const` "was hidden"). With `override`, the mistake becomes an error:

```cpp
struct Animal {
    virtual ~Animal() = default;
    virtual void speak() const {}
};
struct Dog : Animal {
    void speak() override {}      // does not compile: there is no base speak() without const
};
```

g++ says: `error: 'void Dog::speak()' marked 'override', but does not override`.

`final` closes the hierarchy:

```cpp
struct Animal { virtual ~Animal() = default; virtual void speak() const {} };
struct Dog : Animal { void speak() const final {} };   // no class below Dog may override speak
struct Puppy final : Dog {};                           // no class may derive from Puppy
struct Toy : Puppy {};                                 // does not compile: Puppy is final
```

g++ says `cannot derive from 'final' base 'Puppy' in derived type 'Toy'`; overriding `speak` in `Puppy` would give `overriding final function`. Because nothing can override a `final` function, the compiler may call it directly and inline it.

## Virtual calls in constructors and destructors

**Meaning:** while the base constructor runs, the derived part does not exist yet; while the base destructor runs, it is already gone. So inside a constructor or destructor, a virtual call goes to the version of the class **currently being built or destroyed**, never to a more derived override.

```cpp
#include <iostream>

struct Base {
    Base()          { std::cout << "Base(): ";   hello(); }
    virtual ~Base() { std::cout << "~Base(): ";  hello(); }
    virtual void hello() const { std::cout << "Base::hello\n"; }
};
struct Derived : Base {
    Derived()  { std::cout << "Derived(): ";  hello(); }
    ~Derived() { std::cout << "~Derived(): "; hello(); }
    void hello() const override { std::cout << "Derived::hello\n"; }
};

int main() {
    Derived d;
}
```
```output
Base(): Base::hello
Derived(): Derived::hello
~Derived(): Derived::hello
~Base(): Base::hello
```

**How it works:**
1. `Base()` runs first (lesson 13). At that point the object is only a `Base`, so `hello()` reaches `Base::hello`.
2. When `Derived()` starts, the object becomes a `Derived` and the call reaches `Derived::hello`.
3. Destruction goes in reverse. Once `~Derived()` has finished, the object is a `Base` again.
4. If setup needs derived behaviour, call it after the object is fully built, or pass the data to the base constructor.

## Default arguments use the static type

**Meaning:** which function body runs is decided at run time, but default arguments are filled in at compile time from the type the compiler sees. Through a base reference you get the derived body with the **base's** default value.

```cpp
#include <iostream>
#include <string>

struct Printer {
    virtual ~Printer() = default;
    virtual void print(const std::string& text = "base default") const {
        std::cout << "Printer: " << text << "\n";
    }
};
struct Fancy : Printer {
    void print(const std::string& text = "fancy default") const override {
        std::cout << "Fancy: " << text << "\n";
    }
};

int main() {
    Fancy f;
    const Printer& p = f;
    p.print();      // body from Fancy, default argument from Printer
    f.print();
}
```
```output
Fancy: base default
Fancy: fancy default
```

**Fix:** don't give overrides different default arguments. Put the default only on the base function, or overload (`print()` calls `print("default")`).

## When to use virtual functions

| | Static dispatch (normal function) | Dynamic dispatch (`virtual`) |
|---|---|---|
| Decided | At compile time | At run time |
| Chosen from | Type of the pointer, reference or variable | Type of the real object |
| Object size | No extra cost | One vptr per object |
| Call cost | Direct call, can be inlined | Indirect call, usually not inlined |
| Typical use | Value types, small helpers, hot inner loops | A family of types used through one base |

**When to use it:** several types share one interface and the exact type is known only at run time: shapes in a drawing, devices in a driver list, plugins loaded at run time, a container of mixed objects.

**When not to use it:**
- The class is a value type not meant to be a base (`Point`, `Money`): it doesn't need a vtable.
- The type is known at compile time: overloads or templates (later lessons) choose the function for free.
- Hot loops over millions of small objects, where the extra load and the lost inlining show up in measurements.

## Common mistakes

- **Forgetting `virtual` in the base.** The derived function only hides the base one; calls through a base pointer run the base version.
- **Signature mismatch** (a missing `const`, a different parameter type): a new function, not an override. Always write `override`.
- **Passing by value**: `void f(Animal a)` slices and always calls `Animal`'s functions. Take `const Animal&` or `Animal*`.
- **No virtual destructor**: `delete basePtr;` on a derived object is then undefined behaviour (lesson 12). Add `virtual ~Base() = default;`.
- **Expecting the derived version** from a virtual call in a constructor or destructor, or a different default argument in an override.
- **Making everything virtual "just in case"**: it costs size and speed and suggests a design for inheritance that isn't there.

## ⚠ Easily confused

- **static vs dynamic dispatch** — Static = chosen at compile time from the pointer/reference **type**. Dynamic (`virtual`) = chosen at run time from the **real object** type.
- **vtable vs vptr** — vtable = one per class (array of function pointers). vptr = one per object (points to its class's vtable).
- **override vs overload** — `override` = redefine a base virtual function with the same signature (run-time choice). Overload = same name, different parameters (compile-time choice).
- **override vs hiding** — Same signature as a base `virtual` function = override, reached through base pointers. Anything else with the same name (non-virtual base, or different parameters/`const`) = hiding, never reached through the base.
- **`override` vs `final`** — `override` = check that this really overrides a base virtual function. `final` = nothing below may override this function (or derive from this class).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 14).