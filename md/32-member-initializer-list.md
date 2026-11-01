# 32 — Member Initializer List

*Category: C++ Core*

> The member initializer list creates each member directly with its value, once, before the constructor body runs; it is also the only way to call a base-class constructor.

## Must-remember points

- Written after the constructor's `:` and before `{`. It **initializes** each member **directly, once**, as the object is built. In the body the members already exist, so `a = x;` there is only an **assignment** (default-construct first, then overwrite).
- **Mandatory** for `const` members, **reference** members, and members whose type has **no default constructor**.
- The only way to pass arguments to a **base class** constructor: `Derived(int x) : Base(x) {}`. The base is always built first.
- Members are initialized in **declaration order**, not the order written in the list (g++ warns with `-Wreorder`). Never initialize a member from one declared after it.
- **Delegating constructor** (C++11): `Account(o) : Account(o, 0.0) {}` reuses another constructor. It must be the **only** item in the list, and the target's body runs first.
- A **default member initializer** (`int seats = 1;`) is a fallback, used only by constructors that don't list that member. When the list sets it, the default is **not used at all** (not even evaluated).
- Rule of thumb: set **every** member in the list (or with a default initializer). Keep the body for work that needs the finished members: checks, logging, registration.

## Initialize, don't assign: the list runs once

**Meaning:** every member is created **before** the constructor body starts. The list is where you say *how* each one is created. If a member is not in the list (and has no default initializer), it is default-constructed, and a line like `name = n;` in the body is a **second** step: an assignment to an object that already exists.

```cpp
#include <iostream>
#include <string>

struct Name {                                   // prints what happens to it
    std::string text;
    Name()                     { std::cout << "  default-construct\n"; }
    Name(const std::string& t) : text(t) { std::cout << "  construct from \"" << t << "\"\n"; }
    Name& operator=(const std::string& t) { text = t; std::cout << "  assign \"" << t << "\"\n"; return *this; }
};

struct InBody {
    Name name;
    InBody(const std::string& n) { name = n; }  // name already exists here: this is an assignment
};

struct InList {
    Name name;
    InList(const std::string& n) : name(n) {}   // name is created with its value
};

int main() {
    std::cout << "InBody:\n";
    InBody a("Ana");
    std::cout << "InList:\n";
    InList b("Ben");
}
```
```output
InBody:
  default-construct
  assign "Ana"
InList:
  construct from "Ben"
```

**How it works:**
1. `InBody` doesn't list `name`, so `name` is default-constructed before the body runs. The body then assigns to it: two operations.
2. `InList` creates `name` directly from `n`: one operation.
3. For an `int` the difference is tiny. For a `std::string`, a `std::vector` or any class with real work in its constructors, the body version wastes a construction. For some members it is not possible at all (next section).

## Members that must use the list

**Meaning:** some things can only get a value at the moment they are created, so assigning in the body is too late:
- a `const` member can't be assigned;
- a reference member must be bound when it is created and can't be re-bound;
- a member whose class has **no default constructor** can't be created without arguments;
- a **base class** with no default constructor needs its arguments, and the list is the only place to pass them.

```cpp
#include <iostream>

class Base {
public:
    explicit Base(int x) { std::cout << "Base(" << x << ")\n"; }   // no default constructor
};

struct Sensor {
    int pin;
    explicit Sensor(int p) : pin(p) {}                            // no default constructor
};

class Entity : public Base {
    const int id;              // const: can't be assigned later
    int& counter;              // reference: must be bound when created
    Sensor sensor;             // has no default constructor
public:
    Entity(int i, int& c) : Base(i), id(i), counter(c), sensor(i * 10) {
        ++counter;             // the body can use them: they all exist now
    }
    void print() const {
        std::cout << "id=" << id << " pin=" << sensor.pin << " counter=" << counter << "\n";
    }
};

int main() {
    int created = 0;
    Entity e(3, created);
    e.print();
    std::cout << "created = " << created << "\n";
}
```
```output
Base(3)
id=3 pin=30 counter=1
created = 1
```

**How it works:**
1. `Base(i)` runs first: base classes are always built before members.
2. `id`, `counter` and `sensor` are created with their values. `counter` refers to `main`'s `created`, so `++counter` in the body changes `created`.
3. With an empty list, g++ stops with `error: uninitialized const member in 'const int'`, `error: uninitialized reference member in 'int&'` and `error: no matching function for call to 'Sensor::Sensor()'`.

## Initialization order is declaration order

**Meaning:** members are always initialized in the order they are **declared in the class**, whatever order you write in the list. (Base classes come before all members.) The order in the list is ignored, and g++ warns when the two differ.

```cpp
#include <iostream>

struct Tracer {
    Tracer(const char* name) { std::cout << name << " "; }
};

class Widget {
    Tracer first;                                  // declared 1st
    Tracer second;                                 // declared 2nd
public:
    Widget() : second("second"), first("first") {} // written in the other order
};

int main() {
    Widget w;
    std::cout << "\n";
}
```
```output
first second
```

g++ with `-Wall` says: `warning: 'Widget::second' will be initialized after [-Wreorder]`.

This becomes a real bug when one member is initialized from another that is declared **later**:

```cpp
#include <iostream>

class Buffer {
    int* data;                                     // declared first, so initialized first
    int size;
public:
    Buffer(int n) : size(n), data(new int[size]) {}   // undefined behaviour: size is not set yet
    ~Buffer() { delete[] data; }
};

int main() { Buffer b(10); }
```

**How it works:**
1. `data` is declared first, so `new int[size]` runs first, while `size` still holds garbage. The array can have any size.
2. g++ warns twice: the `-Wreorder` warning, and `warning: '*this.Buffer::size' is used uninitialized [-Wuninitialized]`.
3. Fix: initialize from the parameter, `data(new int[n])`, or declare `size` before `data`. Simplest rule: write the list in declaration order, and treat `-Wreorder` as an error.

## Delegating constructors

**Meaning:** a constructor can hand the whole job to another constructor of the same class, by naming it in its list (C++11). The shared setup is written once. The delegation must be the **only** item in the list, because the target constructor already initializes every member.

```cpp
#include <iostream>
#include <string>

class Account {
    std::string owner;
    double balance;
public:
    Account(const std::string& o, double b) : owner(o), balance(b) {      // the one that does the work
        std::cout << "  main constructor: " << owner << " " << balance << "\n";
    }
    Account(const std::string& o) : Account(o, 0.0) {                     // delegates
        std::cout << "  delegating constructor body\n";
    }
    Account() : Account("guest") {}                                       // delegates twice
};

int main() {
    std::cout << "Account a(\"Ana\", 50):\n";
    Account a("Ana", 50);
    std::cout << "Account b(\"Ben\"):\n";
    Account b("Ben");
    std::cout << "Account c:\n";
    Account c;
}
```
```output
Account a("Ana", 50):
  main constructor: Ana 50
Account b("Ben"):
  main constructor: Ben 0
  delegating constructor body
Account c:
  main constructor: guest 0
  delegating constructor body
```

**How it works:**
1. `Account b("Ben")` calls `Account(o, 0.0)` first. That target constructor runs completely (list **and** body), then the delegating constructor's own body runs.
2. `Account c` delegates to `Account("guest")`, which delegates again. Chains are fine; a cycle (two constructors delegating to each other) is a bug.
3. Adding another item, `A() : A(1), y(2) {}`, is rejected: `error: mem-initializer for 'A::y' follows constructor delegation`.
4. Default arguments (lesson 11) are an alternative when the constructors differ only by default values.

## Default member initializers and the list

**Meaning:** since C++11 a member can have a default right where it is declared: `int seats = 1;`. It is used by every constructor that **doesn't** list that member. A constructor that lists the member uses the list's value instead, and the default is skipped completely: it is not evaluated first and then overwritten.

```cpp
#include <iostream>

int defaultId() {
    std::cout << "  defaultId() called\n";
    return 7;
}

class Ticket {
    int id = defaultId();                 // default member initializer: a fallback
    int seats = 1;
public:
    Ticket() {}                           // doesn't mention id: the fallback is used
    Ticket(int i) : id(i) {}              // the list wins: defaultId() is not even called
    void print() const { std::cout << "  id=" << id << " seats=" << seats << "\n"; }
};

int main() {
    std::cout << "Ticket t1:\n";
    Ticket t1;
    t1.print();
    std::cout << "Ticket t2(42):\n";
    Ticket t2(42);
    t2.print();
}
```
```output
Ticket t1:
  defaultId() called
  id=7 seats=1
Ticket t2(42):
  id=42 seats=1
```

**How it works:**
1. `Ticket t1` uses a constructor that doesn't list `id`, so `defaultId()` runs and `id` is 7.
2. `Ticket t2(42)` lists `id(42)`: `defaultId()` is never called. Each member is initialized exactly once.
3. `seats` is listed by neither constructor, so both use its default 1.

| | Default member initializer | Member initializer list |
|---|---|---|
| Written | at the declaration: `int seats = 1;` | in a constructor: `: seats(n)` |
| Value | the same for every constructor | can use the constructor's arguments |
| Applies to | every constructor that doesn't list the member | only that constructor |
| Base classes | not possible | the only way |
| Best for | sensible defaults, so no member is ever left uninitialized | values that come from the arguments |

## Common mistakes

- **Assigning in the body** what could be initialized in the list: wasted work for class types, and a compile error for `const`, reference and no-default-constructor members.
- **Writing the list in a different order** from the declarations, then initializing one member from another declared later: it reads garbage. Keep both orders the same and heed `-Wreorder`.
- **Expecting the list order to matter.** It doesn't: declaration order always wins.
- **Delegating and initializing in the same list.** `A() : A(1), y(2) {}` doesn't compile; set `y` in the target constructor or in the body.
- **Forgetting the base class.** If the base has no default constructor and the derived list doesn't name it, the code doesn't compile.
- **Using a member's name for the parameter and getting confused.** `Sensor(int pin) : pin(pin) {}` is legal: outside the parentheses `pin` is the member, inside it is the parameter. In the **body**, though, `pin` means the parameter (use `this->pin`, lesson 38).

## ⚠ Easily confused

- **initialize (list) vs assign (body)** — The list creates the member with its value, once. The body assigns to a member that already exists (default-construct, then overwrite for class types).
- **declaration order vs list order** — Members are initialized in the order they are DECLARED, not the order written in the list.
- **default member initializer vs list** — The default is a fixed fallback for constructors that don't list the member. When the member is in the list, the default is not used (not evaluated, not overwritten). Only the list can initialize a base class.
- **delegating vs normal list** — A delegating list names another constructor of the same class and nothing else. A normal list names the base classes and members.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 32).