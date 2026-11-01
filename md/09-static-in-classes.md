# 09 — Static (for Classes & Structs)

*Category: C++ Core*

> A static member belongs to the class, not to any object: one shared copy of the data, and functions that run without an object (no this).

## Must-remember points

- A **static data member** has **one copy shared by all objects** of the class. It lives in static storage, outside the objects, so it does **not** add to `sizeof`. Classic use: an instance counter.
- Declared in the class, it still needs **one definition** outside it (`int Player::alive = 0;` in one `.cpp`), or the link fails with **`undefined reference`**. C++17 **`inline static`** defines it inside the class.
- In-class constants: **`static constexpr int max = 100;`** (implicitly inline since C++17, usable at compile time).
- A **static member function** has **no `this`**. Call it as `Class::fn()` without an object. It can use static members directly, but non-static members only through an object it is given.
- Use static functions for **factory functions** (named constructors), **utilities** that belong to the class, accessors for static data, and **callbacks** for C APIs that take a plain function pointer.
- Static data is shared by all objects **and all threads**. Changing it from two threads at once is a **data race**: use `std::atomic` or a mutex.
- **Singleton**: a static function returning a static local (`static Logger& instance()`). Built once on first use, but it is a hidden global: hard to test, so use it sparingly.

## Static data members: one copy for the whole class

**Meaning:** a normal data member exists once **per object**. A `static` data member exists once **per class**: every object sees the same variable, and it exists even when no object does. It is stored in static storage (like a global), not inside the objects. You reach it as `Class::name`, or through any object.

```cpp
#include <iostream>

class Player {
public:
    static int alive;          // declaration: one counter for the whole class
    int hp = 100;              // one per object

    Player()  { ++alive; }
    ~Player() { --alive; }
};

int Player::alive = 0;         // definition: the storage itself, exactly once

int main() {
    std::cout << "start: " << Player::alive << "\n";   // no object needed
    Player a, b;
    std::cout << "after a, b: " << Player::alive << "\n";
    {
        Player c;
        std::cout << "inside block: " << a.alive << "\n";   // same variable, reached via an object
    }
    std::cout << "after block: " << Player::alive << "\n";
    std::cout << "sizeof(Player) = " << sizeof(Player) << "\n";
}
```
```output
start: 0
after a, b: 2
inside block: 3
after block: 2
sizeof(Player) = 4
```

**How it works:**
1. `alive` exists before any `Player` is created, so `Player::alive` prints 0 at the start.
2. Every constructor adds 1 to the **same** variable, every destructor subtracts 1. `c` dies at the end of the block, so the count drops back to 2.
3. `a.alive` is the same variable as `Player::alive`. Prefer `Player::alive`: it makes clear the value is not per object.
4. `sizeof(Player)` is 4 (on x86-64 with g++): only `hp` is inside the object.

## Defining static data members

**Meaning:** inside the class, `static int alive;` is only a **declaration**: it says the variable exists, but creates no storage. The storage must be **defined exactly once** in the program. There are three ways to write it:
- **Out-of-class definition** (works in every standard): `int Player::alive = 0;` in exactly **one** `.cpp` file, without the word `static`.
- **`inline static`** (C++17): the declaration in the class is also the definition, so it can sit in a header.
- **`static constexpr`**: a compile-time constant, initialized in the class (implicitly `inline` since C++17).

```cpp
#include <iostream>
#include <string>
#include <array>

class Config {
public:
    static int loads;                          // 1) declared here...
    inline static std::string name = "app";    // 2) C++17: defined right here
    static constexpr int maxUsers = 3;         // 3) compile-time constant
};

int Config::loads = 0;                         // 1) ...defined here, in one .cpp only

int main() {
    Config::loads++;
    Config::name += "-v2";
    std::array<int, Config::maxUsers> slots{}; // a constexpr member can size an array
    std::cout << Config::loads << " " << Config::name << " " << slots.size() << "\n";
}
```
```output
1 app-v2 3
```

**How it works:**
1. Remove the line `int Config::loads = 0;` and the program still compiles, but the link fails with `undefined reference` to `Config::loads`. The compiler saw the declaration; the linker found no storage.
2. `name` needs no extra line: `inline static` is a definition, and the linker merges copies from different files into one (like the inline variables of lesson 8).
3. `maxUsers` is known at compile time, so it can be used as a template argument or an array size.

| Form | Where it goes | Standard | Use for |
|---|---|---|---|
| `static int x;` + `int C::x = 0;` | declaration in the header, definition in one `.cpp` | all | code that must build before C++17 |
| `inline static int x = 0;` | the class, in the header | C++17 | mutable shared data (preferred) |
| `static constexpr int x = 3;` | the class, in the header | C++11 (inline from C++17) | constants known at compile time |

## Static member functions

**Meaning:** a static member function belongs to the class, not to an object, so it has **no `this` pointer**. You call it as `Class::fn()` with no object at all. It can use the class's static members and private parts, but it has no object of its own to read normal members from. g++ rejects such a use with `error: invalid use of member 'T::celsius' in static member function`.

Typical uses:
- **Factory functions** ("named constructors"): `fromCelsius(25)` and `fromFahrenheit(77)` both take a `double`, so two constructors couldn't tell them apart.
- **Utilities** that belong to the class but need no object.
- **Accessors** for private static data.

```cpp
#include <iostream>

class Temperature {
    double celsius;                                   // per object
    inline static int created = 0;                    // shared, private
    explicit Temperature(double c) : celsius(c) { ++created; }   // private constructor
public:
    static Temperature fromCelsius(double c)    { return Temperature(c); }                // factory
    static Temperature fromFahrenheit(double f) { return Temperature((f - 32) * 5 / 9); } // factory
    static double toFahrenheit(double c)        { return c * 9 / 5 + 32; }                // utility
    static int count()                          { return created; }                       // accessor

    double get() const { return celsius; }            // normal member function: has this
};

int main() {
    Temperature a = Temperature::fromCelsius(25);
    Temperature b = Temperature::fromFahrenheit(212);
    std::cout << a.get() << " " << b.get() << "\n";
    std::cout << Temperature::toFahrenheit(100) << "\n";
    std::cout << Temperature::count() << " objects made\n";
}
```
```output
25 100
212
2 objects made
```

**How it works:**
1. The constructor is private, so outside code can create a `Temperature` only through the factories. Their names say which unit the number is in.
2. A static function is a member, so it may call the private constructor and read the private `created`.
3. `toFahrenheit` and `count` are called on the class, with no object.
4. Because a static member function needs no object, its address is a **plain function pointer**. That is why it can be passed to C APIs that take one, such as `pthread_create` or `qsort`; a normal member function can't, because it needs a `this`.

| | Static member function | Normal member function |
|---|---|---|
| Has `this` | No | Yes |
| Call syntax | `Class::fn()` (no object needed) | `obj.fn()` or `ptr->fn()` |
| Uses normal members | only of an object passed to it | directly, of its own object |
| Can be `const` or `virtual` | No | Yes |
| Address fits a plain function pointer | Yes | No (needs an object) |

## Shared by every thread too

**Meaning:** a static member is one variable for the whole program, so all threads share it as well as all objects. If two threads change it at the same time without protection, that is a **data race**: undefined behaviour, and in practice lost updates. Make it a `std::atomic` (for a simple counter) or guard it with a mutex.

```cpp
#include <atomic>
#include <iostream>
#include <thread>

class Request {
public:
    inline static std::atomic<int> handled{0};   // shared by all objects AND all threads
    Request() { ++handled; }                     // atomic increment: no update is lost
};

void worker() {
    for (int i = 0; i < 100000; i++) {
        Request r;
    }
}

int main() {
    std::thread t1(worker), t2(worker);
    t1.join();
    t2.join();
    std::cout << Request::handled << "\n";
}
```
```output
200000
```

**How it works:**
1. Both threads create 100,000 `Request` objects, and every constructor increments the one shared counter.
2. `++` on a `std::atomic<int>` is a single indivisible step, so the total is always 200000.
3. With a plain `inline static int handled`, `++handled` is read, add, write. Two threads can read the same old value and one increment is lost. That is a data race, so the result can't be trusted.

## The singleton pattern

**Meaning:** a **singleton** is a class with exactly one object, reachable from anywhere. The usual C++ form (the "Meyers singleton") is a static member function that returns a reference to a **static local** object. The local is built the first time the function runs, and that first build is thread-safe since C++11 (lesson 44).

```cpp
#include <iostream>
#include <string>

class Logger {
public:
    static Logger& instance() {
        static Logger only;                    // built on the first call, destroyed at program exit
        return only;
    }
    void log(const std::string& msg) { std::cout << ++lines << ": " << msg << "\n"; }

    Logger(const Logger&) = delete;            // no copies: there must be only one
    Logger& operator=(const Logger&) = delete;
private:
    Logger() { std::cout << "Logger created\n"; }   // private: nobody else can make one
    int lines = 0;
};

int main() {
    std::cout << "main starts\n";
    Logger::instance().log("hello");
    Logger::instance().log("world");           // the same object: the count continues
}
```
```output
main starts
Logger created
1: hello
2: world
```

**How it works:**
1. The constructor is private and copying is deleted, so `instance()` is the only way to reach a `Logger`.
2. The object is created on the first call (after `main starts`), not at program start.
3. The second call returns the same object, so the line count continues at 2.

**Advantages:**
- Exactly one object, created only if it is used.
- No initialization-order problem between files: it is built on first use.

**Disadvantages:**
- It is a global in disguise: any code can reach it, so dependencies are hidden.
- Hard to test: you can't swap in a fake logger.
- Only the creation is thread-safe; `log` itself is not.

**When to use it:** rarely, for something that is truly one per process (a logger, the program's configuration). Passing the object to the code that needs it is usually clearer.

## Common mistakes

- **Forgetting the definition.** `static int count;` in the class, no `int Entity::count = 0;` anywhere: the link fails with `undefined reference` to `Entity::count`. Add the definition in one `.cpp`, or use `inline static`.
- **Writing `static` on the definition.** `static int Player::alive = 0;` fails: `error: 'static' may not be used when defining (as opposed to declaring) a static data member`. The word `static` goes only on the declaration in the class.
- **Defining it in a header without `inline`.** `int Player::alive = 0;` in a header included by two `.cpp` files gives `multiple definition`.
- **Counting objects but not copies.** The compiler-generated copy constructor doesn't run your `++alive`, but the destructor still runs `--alive`. With `Player a; Player b = a;` the counter shows 1 while two players exist, and -1 once both are destroyed. Write a copy constructor that also counts (copying is lesson 41).
- **Using normal members in a static function.** There is no `this`: g++ says `'this' is unavailable for static member functions`. Pass an object in, or make the function non-static.
- **Changing static data from several threads** without `std::atomic` or a mutex: a data race.

## ⚠ Easily confused

- **static member vs instance member** — A static member exists once for the whole class (even with no objects). An instance member exists once per object, inside it.
- **static method vs normal method** — A static method has no `this`: call it as `Class::fn()`, and it can use normal members only of an object passed in. A normal method works on the object it is called on.
- **declaration vs definition of a static member** — `static int count;` in the class only declares it. `int Entity::count = 0;` in one `.cpp` creates the storage. `inline static` (C++17) does both in the class.
- **static constexpr vs inline static** — `static constexpr` = a constant known at compile time. `inline static` = a normal shared variable that can change, defined in the class.
- **static member vs global variable** — Both live for the whole program in static storage. A static member is in the class's scope (`Player::alive`) and obeys `private`/`public`; a global is visible to everyone.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 09).