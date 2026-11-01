# 13 — Inheritance

*Category: C++ Core*

> A derived class reuses and extends a base class. Use it for a true is-a relationship; use composition (has-a) for everything else.

## Must-remember points

- **Inheritance**: `class Car : public Vehicle` gives `Car` all of `Vehicle`'s members, and `Car` adds its own. Use it only when the derived class truly **is a** kind of the base.
- A derived object **contains a base part**. Construction runs **base first, then derived**; destruction runs in reverse. Pass arguments to the base constructor in the **initializer list**: `Car(...) : Vehicle(brand)`.
- **Not inherited**: constructors, destructor, assignment operators. `using Vehicle::Vehicle;` opts in to the base constructors.
- `public` inheritance keeps the base's public members public: the normal **is-a**. `protected`/`private` inheritance hide them (rare: reuse of implementation).
- `protected` member = usable by the class **and its derived classes**, not by outside code.
- **has-a = composition**: keep the other object as a **member** (`Car` has an `Engine`). Prefer it when you only want to reuse code or the relationship is "contains / uses".
- **Substitution test (Liskov)**: anything that works with a base object must still work with a derived one. If not (Square/Rectangle), don't inherit.
- A derived object can be passed where a base is expected (**upcast**, via pointer or reference). Copying it into a base **by value slices** it, and a derived function **hides** every base overload with the same name.

## What inheritance is

**Meaning:** a new class (the **derived** class) is built on an existing one (the **base** class). The derived class automatically has the base's data and functions, and adds what is special about it. The relationship it models is **is-a**: a `Car` **is a** `Vehicle`.

```cpp
#include <iostream>
#include <string>

class Vehicle {                       // base class: what every vehicle has
public:
    std::string brand;
    void honk() const { std::cout << brand << ": beep\n"; }
};

class Car : public Vehicle {          // derived class: a Car IS A Vehicle
public:
    int doors = 4;                    // added by Car
    void openTrunk() const { std::cout << brand << ": trunk open\n"; }
};

int main() {
    Car c;
    c.brand = "Audi";                 // inherited from Vehicle
    c.honk();                         // inherited from Vehicle
    c.openTrunk();                    // Car's own function
    std::cout << c.doors << " doors\n";
}
```
```output
Audi: beep
Audi: trunk open
4 doors
```

**How it works:**
1. `class Car : public Vehicle` says: start from everything in `Vehicle`, then add the members listed here.
2. `c.brand` and `c.honk()` are found in the `Vehicle` part of `c`. `doors` and `openTrunk()` are in the `Car` part.
3. Inside `openTrunk()`, `Car` can use `brand` directly because it is a public member of its base.

**Advantages:**
- Shared code is written once in the base and reused by every derived class.
- Code written for `Vehicle&` works for every kind of vehicle (polymorphism, lesson 14).

**Disadvantages:**
- The derived class depends on the base's details: a change in the base can break every derived class.
- Deep hierarchies (A -> B -> C -> D) are hard to follow: to understand `D` you must read all four classes.

## Constructors and destruction order

**Meaning:** a derived object is built in layers. The base part is built first, because the derived part may use it. The derived class chooses which base constructor runs, in its **member initializer list**. Destruction peels the layers off in reverse.

```cpp
#include <iostream>
#include <string>

class Vehicle {
public:
    std::string brand;
    Vehicle(const std::string& b) : brand(b) { std::cout << "Vehicle(" << brand << ") "; }
    ~Vehicle() { std::cout << "~Vehicle "; }
};

class Car : public Vehicle {
public:
    int doors;
    Car(const std::string& b, int d) : Vehicle(b), doors(d) {   // base constructor chosen here
        std::cout << "Car(" << doors << ") ";
    }
    ~Car() { std::cout << "~Car "; }
};

class Truck : public Vehicle {
public:
    using Vehicle::Vehicle;            // inherit Vehicle(const std::string&) as Truck's constructor
};

int main() {
    {
        Car c("Audi", 2);
        std::cout << "| ";
    }                                  // c is destroyed here
    std::cout << "\n";
    Truck t("Volvo");
    std::cout << "| " << t.brand << "\n";
}
```
```output
Vehicle(Audi) Car(2) | ~Car ~Vehicle
Vehicle(Volvo) | Volvo
~Vehicle
```

**How it works:**
1. `Car c("Audi", 2)` first runs `Vehicle("Audi")` (named in Car's initializer list), then Car's own members and body.
2. At the closing brace, `~Car` runs first, then `~Vehicle`: the exact reverse.
3. `Vehicle` has no default constructor, so `Car` **must** name it in the initializer list, or it doesn't compile.
4. Constructors are **not inherited** automatically. `using Vehicle::Vehicle;` lets `Truck` be created with the same arguments as `Vehicle`. The last `~Vehicle` is `t` being destroyed at the end of `main`.

## Access: public, protected and private inheritance

**Meaning:** two separate things control access. The **member's own label** (`public`, `protected`, `private`) in the base, and the **inheritance mode** you write after the colon. The mode decides what the base's members become inside the derived class. `private` members of the base are never accessible in the derived class, whatever the mode.

| Base member is... | `: public Base` | `: protected Base` | `: private Base` |
|---|---|---|---|
| `public` | stays `public` | becomes `protected` | becomes `private` |
| `protected` | stays `protected` | stays `protected` | becomes `private` |
| `private` | not accessible | not accessible | not accessible |

```cpp
#include <iostream>

class Account {
public:
    int id = 7;
protected:
    int balance = 100;                // derived classes may use it
private:
    int pin = 1234;                   // only Account itself
};

class Savings : public Account {
public:
    void addInterest() {
        balance += 5;                 // OK: protected is visible to derived classes
        // pin = 0;                   // would not compile: private to Account
    }
    int getBalance() const { return balance; }
};

int main() {
    Savings s;
    s.addInterest();
    std::cout << s.id << " " << s.getBalance() << "\n";   // id is public, so main can read it
    // std::cout << s.balance;        // would not compile: protected, main is outside code
}
```
```output
7 105
```

**When to use which:**
- `public`: almost always. It is the only mode that means **is-a** to the outside world.
- `private` / `protected`: "implemented in terms of". The outside can't treat `Derived` as a `Base`. Composition (next section) usually says this more clearly.
- Remember the default: `class D : B` is **private** inheritance, `struct D : B` is public (lesson 6).

## is-a vs has-a: inheritance vs composition

**Meaning:**
- **is-a (inheritance)**: `B` is a kind of `A`. A `Car` is a `Vehicle`. `Car` inherits from `Vehicle`.
- **has-a (composition)**: `B` contains an `A` as a part. A `Car` has an `Engine`. `Car` keeps an `Engine` as a member and uses it.

Most real classes use both: a `Car` is a `Vehicle` **and** has an `Engine`.

```cpp
#include <iostream>
#include <string>

class Engine {                         // a part
public:
    int horsepower;
    explicit Engine(int hp) : horsepower(hp) {}
    void start() const { std::cout << "engine " << horsepower << "hp started\n"; }
};

class Vehicle {                        // a general kind
public:
    std::string brand;
    explicit Vehicle(const std::string& b) : brand(b) {}
};

class Car : public Vehicle {           // is-a: Car is a Vehicle
    Engine engine;                     // has-a: Car has an Engine (a member)
public:
    Car(const std::string& b, int hp) : Vehicle(b), engine(hp) {}
    void drive() const {
        engine.start();                // Car USES its engine; it is not an engine
        std::cout << brand << " is driving\n";
    }
};

void wash(const Vehicle& v) { std::cout << "washing " << v.brand << "\n"; }

int main() {
    Car c("Audi", 190);
    c.drive();
    wash(c);                           // works: a Car can be used as a Vehicle
    // c.start();                      // would not compile: Car is not an Engine
}
```
```output
engine 190hp started
Audi is driving
washing Audi
```

**How it works:**
1. `wash` takes a `const Vehicle&`. A `Car` can be passed because a `Car` **is** a `Vehicle`. That's what inheritance buys.
2. `Car` doesn't inherit from `Engine`. If it did, `c.start()` would compile and a `Car` could be passed to any function expecting an `Engine`. That makes no sense, so the engine is a **member**.
3. The engine stays an internal detail. `Car` decides what to expose (`drive()`), and could switch to a different engine type without changing its users.

| | Inheritance (is-a) | Composition (has-a) |
|---|---|---|
| Syntax | `class Car : public Vehicle` | `class Car { Engine engine; };` |
| Relationship | Car **is a** Vehicle | Car **has an** Engine |
| Use as the other type | Yes: pass a Car where a Vehicle is expected | No: a Car is not an Engine |
| Coupling | Tight: sees the base's public and protected parts | Loose: uses only the part's public interface |
| Change later | Hard: the base is fixed at compile time | Easy: swap the member type, or hold a pointer to an interface |
| Typical use | A family of types used through one interface | Building a class from parts; reusing code |

**How to decide:**
1. Can you say "a `B` **is a** `A`" and mean it in every situation? If you can only say "a `B` **has**/**uses** an `A`", use composition.
2. Would every function that works on an `A` make sense on a `B`? (The substitution test, next section.)
3. Do you need to treat `B` as an `A` through a pointer or reference (a list of `Vehicle*`, a function taking `Vehicle&`)? That's the real reason to inherit.

If the only goal is to reuse code, choose **composition**: the classes stay independent, and you expose only what you choose. This is the meaning of the guideline "prefer composition over inheritance".

## The substitution test (Liskov)

**Meaning:** if `B` inherits from `A`, a `B` must be usable **anywhere** an `A` is expected, without surprises. This is the **Liskov substitution principle**. A relationship that sounds like is-a in everyday language can still fail it.

```cpp
#include <iostream>

class Rectangle {
protected:
    int w = 0, h = 0;
public:
    void setWidth(int x)  { w = x; }
    void setHeight(int y) { h = y; }
    int area() const { return w * h; }
};

class Square : public Rectangle {      // "a square is a rectangle"... is it?
public:
    void setSide(int s) { w = h = s; }
};

// written for rectangles: width and height can be set independently
void makeBanner(Rectangle& r) {
    r.setWidth(10);
    r.setHeight(5);
    std::cout << "area " << r.area() << "\n";
}

int main() {
    Square sq;
    sq.setSide(3);
    makeBanner(sq);                    // compiles: a Square is a Rectangle
    std::cout << "this square now has area " << sq.area() << ", so its sides are 10 and 5\n";
}
```
```output
area 50
this square now has area 50, so its sides are 10 and 5
```

**How it works:**
1. `makeBanner` relies on a promise of `Rectangle`: width and height are independent.
2. A square can't keep that promise. Through the `Rectangle&`, the function sets 10 and 5, and the "square" is no longer square.
3. Overriding `setWidth` in `Square` to change both sides doesn't fix it: then `makeBanner` would print area 25 instead of 50, and still be surprised.

**Fix:** don't make `Square` inherit from `Rectangle`. Make both separate classes (both can derive from a general `Shape`, lesson 15). The test to apply: **behaviour**, not everyday language, decides is-a.

## Upcasting, slicing and name hiding

**Meaning:**
- **Upcasting**: a `Derived*` converts to a `Base*` (and a `Derived&` to a `Base&`) automatically. The object stays whole; you just see it as its base.
- **Downcasting**: going back from `Base*` to `Derived*` is not automatic. It needs `dynamic_cast` (lesson on casting) and is a sign the design may be wrong.
- **Slicing**: copying a derived object into a base object **by value** copies only the base part.
- **Name hiding**: if the derived class declares a function with the same name as a base function, it **hides all** base functions with that name, even with different parameters.

```cpp
#include <iostream>
#include <string>

class Vehicle {
public:
    std::string brand = "generic";
    void print() const         { std::cout << "vehicle " << brand << "\n"; }
    void print(int times) const { for (int i = 0; i < times; i++) print(); }
};

class Car : public Vehicle {
public:
    int doors = 4;
    using Vehicle::print;              // without this line, print(int) below would not compile
    void print() const { std::cout << "car " << brand << " with " << doors << " doors\n"; }
};

int main() {
    Car c;
    c.brand = "Audi";

    Vehicle& ref = c;                  // upcast: no copy, ref IS c
    Vehicle* ptr = &c;                 // upcast through a pointer
    std::cout << ref.brand << " " << ptr->brand << "\n";

    Vehicle copy = c;                  // SLICED: only the Vehicle part is copied, doors is gone
    std::cout << "copy is a " << sizeof(copy) << "-byte Vehicle, c is a " << sizeof(c) << "-byte Car\n";

    c.print();                         // Car::print()
    c.print(2);                        // Vehicle::print(int), visible thanks to the using-declaration
}
```
```output
Audi Audi
copy is a 32-byte Vehicle, c is a 40-byte Car
car Audi with 4 doors
vehicle Audi
vehicle Audi
```

**How it works:**
1. `ref` and `ptr` see the same object `c`, through its `Vehicle` part.
2. `copy` is a separate `Vehicle` object, smaller than `c` (sizes are for g++ on x86-64), because the `Car` part was sliced off.
3. Without `using Vehicle::print;`, `c.print(2)` would not compile: `Car::print()` hides **both** base `print` functions.
4. `Vehicle::print(int)` calls `print()`. That call goes to `Vehicle::print()`, not `Car`'s: without `virtual` (lesson 14) the choice is made from the type the code sits in.

## Multiple inheritance and the diamond

**Meaning:** a class may inherit from several bases: `class Smartphone : public Phone, public Camera`. It gets the members of both. Trouble starts in the **diamond**: two bases that share a common base. Then the derived object holds **two copies** of that common base, and using its members is ambiguous. `virtual` inheritance keeps a single shared copy.

```cpp
#include <iostream>

class Device { public: int serial = 42; };
class Phone  : virtual public Device {};    // virtual: share one Device
class Camera : virtual public Device {};
class Smartphone : public Phone, public Camera {};

int main() {
    Smartphone s;
    std::cout << s.serial << "\n";          // one Device part, so no ambiguity
}
```
```output
42
```

Without the two `virtual` keywords, `Smartphone` would contain two `Device` parts and `s.serial` would not compile ("request for member 'serial' is ambiguous").

**Use it for:** combining **interfaces** (classes with only pure virtual functions, lesson 15), which carry no data and no diamond trouble. **Avoid it for:** combining classes that hold data. Composition is simpler.

## Common mistakes

- **Inheriting only to reuse code.** `class Stack : public std::vector<int>` lets users call `insert()` in the middle of your stack. Keep a `std::vector<int>` as a private member instead (composition).
- **Forgetting `public`.** `class Car : Vehicle` is private inheritance, so `wash(c)` (expecting `const Vehicle&`) no longer compiles from outside.
- **Passing by value.** `void f(Vehicle v)` slices every `Car` passed to it. Take `const Vehicle&` or `Vehicle*`.
- **Hiding instead of overloading.** A derived `print()` hides the base's `print(int)`. Add `using Base::print;` or rename.
- **Deleting through a base pointer.** If objects are deleted through a `Base*`, the base needs a `virtual` destructor (lessons 12 and 14).
- **Stopping inheritance on purpose:** `class Car final : public Vehicle` forbids any class from deriving from `Car`.

## ⚠ Easily confused

- **is-a vs has-a** — **is-a** = inheritance: a Car is a Vehicle, so a Car can be passed where a Vehicle is expected. **has-a** = composition: a Car has an Engine as a member and uses it; a Car is not an Engine.
- **public vs private inheritance** — `public`: the base's public members stay public, so the outside world can treat Derived as a Base. `private` (the default for `class`): they become private; the outside can't use Derived as a Base.
- **protected vs private member** — `private` = only this class. `protected` = this class and its derived classes. Outside code can use neither.
- **hiding vs overriding** — Hiding: a derived function with the same name hides all base functions of that name (any parameters), chosen at compile time. Overriding: replacing a `virtual` function with the same signature, chosen at run time (lesson 14).
- **upcast vs downcast** — Upcast (Derived* -> Base*) is automatic and always safe. Downcast (Base* -> Derived*) needs `dynamic_cast`, which checks at run time.
- **slicing vs polymorphism** — Copy a derived object into a base **by value** and the derived part is cut off. Use a base **pointer or reference** to keep the whole object.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 13).