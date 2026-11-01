# 15 — Interfaces / Abstract Classes

*Category: C++ Core*

> A pure virtual function makes a class abstract: it can't be created, only derived from. A class of only pure virtual functions is an interface: a contract other code depends on.

## Must-remember points

- **Pure virtual function**: `virtual double area() const = 0;` has no default; every concrete derived class must override it.
- A class with at least one pure virtual function is **abstract**: you can't create an object of it (`Shape s;` doesn't compile), not even as a by-value parameter.
- A derived class becomes **concrete** only when it overrides **every** pure virtual function. Until then it is abstract too.
- You use an abstract class through **pointers and references** (`const Shape&`, `Shape*`): that is the whole point.
- An abstract class can still have **data, constructors and implemented functions**: shared code written once, with the type-specific steps left pure.
- **Interface** = only pure virtual functions and no data (a convention: C++ has no `interface` keyword). A class can implement **several** interfaces.
- Every polymorphic base, interfaces included, needs a **virtual destructor**: `virtual ~Shape() = default;` (lesson 12).
- Why interfaces: code depends on the contract, not the implementation, so you can **swap implementations** and **test with fakes**. Cost: a virtual call and an extra layer.

## Pure virtual functions and abstract classes

**Meaning:** in lesson 14, `Shape::area()` returned 0, a meaningless default. Writing `= 0` instead of a body makes it **pure virtual**: the base declares the function but doesn't provide it, and every concrete shape must. A class with a pure virtual function is **abstract**: it describes what all shapes can do, but you can't create a plain `Shape`.

```cpp
#include <iostream>

class Shape {                                    // abstract
public:
    virtual ~Shape() = default;                  // polymorphic base: virtual destructor (lesson 12)
    virtual double area() const = 0;             // pure virtual: each shape must define it
};

class Circle : public Shape {
    double r;
public:
    explicit Circle(double radius) : r(radius) {}
    double area() const override { return 3.14 * r * r; }
};

class Square : public Shape {
    double side;
public:
    explicit Square(double s) : side(s) {}
    double area() const override { return side * side; }
};

void printArea(const Shape& s) { std::cout << "area " << s.area() << "\n"; }

int main() {
    Circle c(1);
    Square q(2);
    printArea(c);
    printArea(q);
}
```
```output
area 3.14
area 4
```

**How it works:**
1. `Circle` and `Square` override `area()`, so they are concrete and can be created.
2. `printArea` takes `const Shape&`, so it accepts any concrete shape and calls its `area()` through the vtable (lesson 14).
3. `Shape` itself can't be created:

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

int main() {
    Shape s;          // does not compile: Shape is abstract
}
```

g++ says `error: cannot declare variable 's' to be of abstract type 'Shape'`, followed by `note: because the following virtual functions are pure within 'Shape':` and the list of them. The same error appears for a derived class that forgot one override.

A useful side effect: a function taking `Shape` by value can't be defined or called either (`void f(Shape s) {}` gives `cannot declare parameter 's' to be of abstract type 'Shape'`), so an abstract base can't be sliced by accident.

## Abstract classes can have data, constructors and code

**Meaning:** abstract doesn't mean empty. An abstract class can hold the data every derived class needs, a constructor to set it, and finished functions that all derived classes share. Only the steps that differ per type are left pure. A shared function that calls a pure virtual step is called the **Template Method** pattern.

```cpp
#include <iostream>
#include <string>

class Employee {                                          // abstract, but not empty
    std::string name;                                     // data every employee has
protected:
    explicit Employee(const std::string& n) : name(n) {}  // called by derived constructors
public:
    virtual ~Employee() = default;
    virtual double pay() const = 0;                       // differs per kind of employee
    void printPayslip() const {                           // shared code, written once
        std::cout << name << ": " << pay() << "\n";
    }
};

class Salaried : public Employee {
    double monthly;
public:
    Salaried(const std::string& n, double m) : Employee(n), monthly(m) {}
    double pay() const override { return monthly; }
};

class Hourly : public Employee {
    double rate;
    int hours;
public:
    Hourly(const std::string& n, double r, int h) : Employee(n), rate(r), hours(h) {}
    double pay() const override { return rate * hours; }
};

int main() {
    Salaried a("Asha", 5000);
    Hourly b("Ben", 20, 30);
    a.printPayslip();
    b.printPayslip();
}
```
```output
Asha: 5000
Ben: 600
```

**How it works:**
1. `Employee` can't be created on its own, but its constructor still runs as the base part of every `Salaried` and `Hourly` (lesson 13). Making it `protected` documents that only derived classes call it.
2. `printPayslip` is written once in the base. Its call to `pay()` is virtual, so each object uses its own formula.
3. A new kind of employee only has to provide `pay()`; the payslip format stays the same for everyone.

## Interfaces, and implementing several

**Meaning:** an **interface** is an abstract class with only pure virtual functions (plus a virtual destructor) and no data. It is a pure contract: "anything that is `Printable` has `print()`". C++ has no `interface` keyword; this is a convention. A class can implement several interfaces through multiple inheritance. Because interfaces carry no data, this avoids the diamond problems of lesson 13.

```cpp
#include <iostream>
#include <string>

class Printable {                                   // interface
public:
    virtual ~Printable() = default;
    virtual void print() const = 0;
};

class Serializable {                                // another interface
public:
    virtual ~Serializable() = default;
    virtual std::string serialize() const = 0;
};

class Invoice : public Printable, public Serializable {   // implements both
    int id, total;
public:
    Invoice(int i, int t) : id(i), total(t) {}
    void print() const override { std::cout << "Invoice #" << id << ": " << total << "\n"; }
    std::string serialize() const override { return std::to_string(id) + "," + std::to_string(total); }
};

void show(const Printable& p)    { p.print(); }
void save(const Serializable& s) { std::cout << "saving " << s.serialize() << "\n"; }

int main() {
    Invoice inv(7, 120);
    show(inv);
    save(inv);
}
```
```output
Invoice #7: 120
saving 7,120
```

**How it works:**
1. `Invoice` is a `Printable` and a `Serializable`, so it can be passed to both functions.
2. Each function sees only the interface it needs: `show` knows nothing about saving, `save` nothing about printing.
3. Any other class (a `Report`, a `Receipt`) can implement the same interfaces and work with the same functions.

## Why program to an interface: decoupling and testing

**Meaning:** when a class depends on an interface instead of a concrete class, the implementation can be chosen from outside: the real one in the program, a fake one in a test, a different one on another platform. Passing the dependency in (here through the constructor) is called **dependency injection**.

```cpp
#include <iostream>
#include <string>
#include <vector>

class Logger {                                    // the contract Thermostat depends on
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

class ConsoleLogger : public Logger {             // real implementation
public:
    void log(const std::string& msg) override { std::cout << "[log] " << msg << "\n"; }
};

class FakeLogger : public Logger {                // test implementation: only records
public:
    std::vector<std::string> lines;
    void log(const std::string& msg) override { lines.push_back(msg); }
};

class Thermostat {
    Logger& logger;                               // knows only the interface
public:
    explicit Thermostat(Logger& l) : logger(l) {}
    void set(int degrees) {
        if (degrees > 30) logger.log("too hot");
        else              logger.log("set to " + std::to_string(degrees));
    }
};

int main() {
    ConsoleLogger console;
    Thermostat real(console);
    real.set(22);

    FakeLogger fake;                              // what a unit test would do
    Thermostat tested(fake);
    tested.set(35);
    std::cout << "test " << (fake.lines.size() == 1 && fake.lines[0] == "too hot" ? "passed" : "failed") << "\n";
}
```
```output
[log] set to 22
test passed
```

**How it works:**
1. `Thermostat` holds a `Logger&`. It compiles without knowing that `ConsoleLogger` or `FakeLogger` exist.
2. The program gives it the console logger. The test gives it a fake that stores the messages, then checks them. No output has to be captured, and no file or network is touched.
3. Adding a `FileLogger` later needs no change to `Thermostat`.

**Advantages:**
- **Decoupling**: users depend on a small contract; implementations can change or be swapped without touching them.
- **Testing**: a fake implementation replaces slow or external parts (files, network, hardware).
- **Extension**: plugins and drivers add new implementations of a fixed interface.

**Disadvantages:**
- Every call is a virtual call (lesson 14), and objects are used through pointers or references, often on the heap (smart pointers, lesson 40).
- More classes and one more layer to read through.
- An interface is hard to change once many classes implement it.

**When to use it:** at a boundary where more than one implementation exists or is expected (real and test, Linux and Windows, several devices). If there will only ever be one implementation, a plain class is simpler.

## Concrete base vs abstract class vs interface

| | Concrete base class | Abstract class | Interface |
|---|---|---|---|
| Pure virtual functions | None | At least one | All (plus a virtual destructor) |
| Can create objects of it | Yes | No | No |
| Data members | Yes | Yes | No |
| Implemented functions | Yes | Yes | No |
| A derived class must | Override nothing | Override every pure virtual to be concrete | Override every function |
| Example | `Shape` with `area()` returning 0 (lesson 14) | `Employee`: name and payslip shared, `pay()` pure | `Logger`, `Printable` |
| Use when | The base is useful on its own | Types share data and code but differ in some steps | Only a contract is shared |

## Common mistakes

- **Missing one override.** The derived class stays abstract, and creating it fails with `cannot declare variable ... to be of abstract type`. The note under the error lists the functions still pure. A signature mismatch (a missing `const`) has the same effect: use `override`.
- **No virtual destructor** in the interface. Deleting a derived object through `Logger*` is then undefined behaviour (lesson 12).
- **A pure virtual destructor with no body.** `virtual ~Base() = 0;` makes the class abstract, but every derived destructor still calls `Base::~Base()`. Without a definition (`Base::~Base() {}`) the link fails with *undefined reference to* `Base::~Base()`.
- **Calling a pure virtual function from the base constructor or destructor.** The derived part doesn't exist yet (lesson 14), so this is undefined behaviour; g++ programs typically abort with `pure virtual method called`.
- **Putting data into an "interface".** Then it is an abstract class. Keep interfaces small: one job each (`Printable`, `Serializable`), not one huge interface.
- **An interface for everything.** With one implementation and no test fake, the extra layer only adds indirection.

## ⚠ Easily confused

- **abstract class vs interface** — Abstract = at least one pure virtual function; may also have data and implemented functions. Interface = only pure virtual functions and no data: a pure contract. A convention, not a keyword.
- **pure virtual vs virtual** — `= 0` (pure): no default, derived classes must override it, and the class becomes abstract. Plain `virtual`: has a body, and overriding it is optional.
- **abstract vs concrete class** — Abstract: has at least one pure virtual function that isn't overridden yet, so no objects of it can exist. Concrete: every pure virtual is overridden, so it can be created.
- **interface vs implementation** — Interface: what can be done (`Logger::log`). Implementation: how (`ConsoleLogger`, `FakeLogger`). Code that depends only on the interface works with any implementation.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 15).