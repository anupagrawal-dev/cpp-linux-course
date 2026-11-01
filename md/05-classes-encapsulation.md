# 05 — Classes & Encapsulation

*Category: C++ Core*

> A class bundles data with the functions that work on it. Encapsulation keeps the data private, so every change goes through a member function that keeps the object valid.

## Must-remember points

- A **class** is a user-defined type: **data members** + **member functions**. An **object** is one instance of it; each object has its own copy of the data, and the functions are shared code.
- **Access specifiers**: `public` = anyone; `private` = only the class's own member functions; `protected` = the class and its derived classes (lesson 13). Access is checked per **class**, not per object.
- An **invariant** is a rule that must always hold for a valid object (balance >= 0, minute in 0..59).
- Private data + public methods = every change forced through a **single gate** that validates it, so the object can never reach an invalid state.
- The **constructor** makes the object valid from the first moment: it checks its arguments and refuses (throws) if they would break the invariant.
- Getters and setters that only read and write a field are **noise**. A setter helps when it **validates**; better still are real operations (`deposit`, `withdraw`, `addMinutes`).
- `private` isn't about security against attackers: it is **controlled change**, plus freedom to change the internals later without breaking users.
- Cost: more code and some interface design. For a plain bundle of values with no rule between them, public data is fine (a `struct`, lesson 6).

## What a class is

**Meaning:** a class is a new type you define. It groups **data members** (the state) with **member functions** (also called methods: what you can do with that state). The class is the blueprint; an **object** is one thing built from it. Each object has its own copy of the data members. A member function is called on a particular object and works on that object's data.

```cpp
#include <iostream>
#include <string>

class Player {
public:
    std::string name;                    // data members: every object has its own
    int health = 100;

    void takeDamage(int amount) {        // member function: works on the object it is called on
        health -= amount;
    }
    void print() const {
        std::cout << name << ": " << health << " hp\n";
    }
};

int main() {
    Player a;                            // two objects (instances) of one class
    Player b;
    a.name = "Ann";
    b.name = "Ben";
    a.takeDamage(30);                    // changes a only
    a.print();
    b.print();
    a.health = -500;                     // public data: nothing stops nonsense
    a.print();
    std::cout << sizeof(Player) << " bytes per object\n";
}
```
```output
Ann: 70 hp
Ben: 100 hp
Ann: -500 hp
40 bytes per object
```

**How it works:**
1. `a.takeDamage(30)` runs the function for `a`: inside it, `health` means `a.health`. (The compiler passes the object's address as the hidden `this` pointer, lesson 38.)
2. `b` is untouched: each object has its own `name` and `health`.
3. `sizeof(Player)` is only the data: a 32-byte `std::string` plus a 4-byte `int` plus padding (x86-64, g++). Member functions are stored once, in the program's code, not in each object.
4. `const` after `print()` promises that it doesn't change the object (lesson 7).
5. Because everything is `public`, `main` can set `health` to -500. The rest of this lesson is about preventing that.

## Access specifiers: public, private, protected

**Meaning:** an access specifier controls **who may use a member by name**. Everything after `public:` is open to all code. Everything after `private:` can be used only inside the class's own member functions. `protected:` also admits classes derived from this one (lesson 13). In a `class` the default is `private` (lesson 6 covers `struct`).

| Specifier | Own member functions | Derived classes | Other code |
|---|---|---|---|
| `public` | yes | yes | yes |
| `protected` | yes | yes | no |
| `private` | yes | no | no |

```cpp
#include <iostream>

class Player {
public:
    void takeDamage(int amount) { if (amount > 0) health -= amount; }
    int getHealth() const { return health; }
    bool strongerThan(const Player& other) const {
        return health > other.health;          // OK: access is checked per class, not per object
    }
private:
    int health = 100;                          // only Player's member functions can use it
};

int main() {
    Player a, b;
    a.takeDamage(30);
    b.takeDamage(-50);                         // refused: takeDamage can't be used to heal
    std::cout << a.getHealth() << " " << b.getHealth() << "\n";
    std::cout << std::boolalpha << b.strongerThan(a) << "\n";
    // a.health = 9999;                        // error: 'int Player::health' is private within this context
}
```
```output
70 100
true
```

**How it works:**
1. `main` can call the public functions, but `a.health = 9999;` does not compile.
2. `takeDamage` is now the only way to lower `health`, and it ignores negative amounts.
3. `strongerThan` reads `other.health`, another object's private member. That is allowed: `private` means "private to the class", so any `Player` member function may use any `Player`'s private members.
4. The check happens at **compile time**. At run time the bytes are in memory like any others; `private` protects the design, not the data.

## Invariants, and the constructor that establishes them

**Meaning:** an **invariant** is a rule that is true for every valid object at every moment between member-function calls. For a clock: the time is always between 00:00 and 23:59. Two things together guarantee it:
- The **constructor** (lesson 11) runs when the object is created. It checks its arguments and either builds a valid object or refuses by throwing an exception (lesson 22), so an invalid object never exists.
- Every **public member function** keeps the rule true after it finishes. Since the data is private, no other code can break it.

```cpp
#include <iostream>
#include <stdexcept>

class Clock {
public:
    Clock(int h, int m) {                          // constructor: runs when a Clock is created
        if (h < 0 || h > 23 || m < 0 || m > 59)
            throw std::invalid_argument("invalid time");
        total = h * 60 + m;
    }
    void addMinutes(int m) {                       // an operation that keeps the invariant
        total = ((total + m) % 1440 + 1440) % 1440;
    }
    int hour() const   { return total / 60; }      // getters computed from the hidden data
    int minute() const { return total % 60; }
private:
    int total;                                     // minutes since midnight: always 0..1439
};

void print(const Clock& c) {
    std::cout << c.hour() << ":" << (c.minute() < 10 ? "0" : "") << c.minute() << "\n";
}

int main() {
    Clock c(23, 30);
    print(c);
    c.addMinutes(45);              // wraps past midnight
    print(c);
    c.addMinutes(-30);
    print(c);
    try {
        Clock bad(25, 0);          // refused: an invalid Clock never exists
        print(bad);
    } catch (const std::invalid_argument& e) {
        std::cout << "error: " << e.what() << "\n";
    }
}
```
```output
23:30
0:15
23:45
error: invalid time
```

**How it works:**
1. `Clock c(23, 30)` passes the check, so `c` starts valid.
2. `addMinutes` does the wrap-around arithmetic in one place (1440 minutes per day). Callers can't forget it, even for negative minutes.
3. `Clock bad(25, 0)` throws inside the constructor, so `bad` is never created and `print(bad)` never runs.
4. The clock stores one number, minutes since midnight, but users only see `hour()` and `minute()`. The storage could later change to two fields without changing a single line in `main`. That freedom is the second benefit of private data.

## Getters, setters and real operations

**Meaning:** a **getter** returns a value from the object; a **setter** changes it. A setter that only copies its argument into the field (`void setLevel(int v) { level = v; }`) protects nothing: it is a public field with extra typing. A setter earns its place when it **validates**. Even better is a member function named after what users actually want to do.

```cpp
#include <iostream>

class Volume {
public:
    int get() const { return level; }
    bool set(int v) {                  // a validating setter
        if (v < 0 || v > 10) return false;
        level = v;
        return true;
    }
    void up()   { if (level < 10) level++; }    // the operations users actually want
    void down() { if (level > 0) level--; }
private:
    int level = 5;                     // invariant: 0..10
};

int main() {
    Volume v;
    v.up();
    v.up();
    std::cout << v.get() << "\n";
    std::cout << std::boolalpha << v.set(42) << " " << v.get() << "\n";
    for (int i = 0; i < 20; i++) v.down();    // stops at 0
    std::cout << v.get() << "\n";
}
```
```output
7
false 7
0
```

| Interface | Protects the invariant? | Verdict |
|---|---|---|
| public `int level;` | no | fine only if every value is valid |
| `getLevel()` + `setLevel(v) { level = v; }` | no | noise: public data in disguise |
| `set(v)` that rejects bad values | yes | good when users really need to set a value |
| `up()`, `down()`, `deposit()`, `withdraw()` | yes | best: the class owns the rules |

**When to use a getter:** when outside code needs to read a value; mark it `const`. With optimization on, a small getter defined in the class is normally inlined: g++ `-O2` compiles `v.get()` to a single load, so it costs nothing at run time.

## Advantages and costs of encapsulation

**Advantages:**
- **Invariants hold.** Every change passes through code that checks it, so an object can't be left half-updated or invalid.
- **Freedom to change internals.** Users depend only on the public functions, so the data layout can change without breaking them (the `Clock` above).
- **Easier debugging.** If a value goes wrong, only the class's own functions could have changed it: put a breakpoint there.
- **A smaller interface.** Users learn a few operations, not the meaning of every field.

**Disadvantages:**
- More code to write: functions instead of direct field access.
- The interface needs design. A bad one (a getter and setter for every field) costs the typing and gives none of the benefits.

**When to use it:** whenever there is a rule between the data members or on their values (a balance, a time, a buffer and its size). For a plain bundle of independent values, like a point's `x` and `y`, public data in a `struct` is simpler and honest (lesson 6).

Encapsulation (hide the data behind a gate) works together with **abstraction** (offer a simple interface that hides how the work is done): `addMinutes` does both.

## Common mistakes

- **Public data with a rule.** If `health` must stay in 0..100, a public `health` will be broken somewhere. Make it private and add operations.
- **A getter and setter for every field.** Unchecked setters bring back all the problems of public data. Add only what users need, and validate.
- **Forgetting the constructor.** Methods that check every change don't help if the object starts in an invalid state. Validate in the constructor.
- **Thinking `private` is security.** It is a compile-time rule; anyone with a pointer can still read the bytes. Never rely on it to hide secrets.
- **Thinking `private` is per object.** A member function may read another object's private members if it is of the same class.
- **Leaking the internals.** A public function that returns a non-const reference or pointer to a private member (`int& level()`) lets callers bypass every check.

## ⚠ Easily confused

- **private vs security** — `private` is compile-time access control for safe design, NOT runtime protection. Nothing stops the memory being read; the compiler only refuses direct access by name from other code.
- **encapsulation vs abstraction** — Encapsulation = hide the data behind a gate. Abstraction = expose a simple interface, hide the complexity.
- **class vs object** — A class is the type (the blueprint). An object is one instance of it, with its own copy of the data members.
- **private vs protected** — `private`: only this class's member functions. `protected`: this class and its derived classes. Outside code can use neither.
- **validating setter vs real operation** — A validating setter accepts any new value that passes the rule (`set(7)`). A real operation states the intent (`up()`, `withdraw(50)`) and keeps the rule itself, so callers need no arithmetic.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 05).