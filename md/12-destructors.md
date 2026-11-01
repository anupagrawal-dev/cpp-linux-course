# 12 — Destructors & RAII

*Category: C++ Core*

> A destructor runs automatically when an object's lifetime ends; RAII uses that to release every resource on every path, even when an exception is thrown.

## Must-remember points

- A **destructor** is `~ClassName()`: no parameters, no return type, **exactly one** per class. It runs **automatically** when the object's lifetime ends; you never call it yourself.
- **When it runs:** a local at the **end of its scope**; a heap object at **`delete`** (`delete[]`: every element); a **temporary** at the end of its full expression (lesson 39); statics **after `main` returns**; locals during **stack unwinding** (exceptions).
- **Order:** the reverse of construction. The destructor body runs first, then the members in **reverse declaration order**, then the base class (**derived before base**).
- **RAII** (Resource Acquisition Is Initialization): acquire a resource in the constructor, release it in the destructor. It is then released on **every** path: normal end, early `return`, exception. `std::lock_guard`, `std::unique_ptr`, `std::vector` and `std::fstream` all work this way.
- **Rule of Zero:** build classes from members that clean up themselves (`std::string`, `std::vector`, `std::unique_ptr`) and write **no destructor at all**. A class that must free a raw resource itself also needs copy and move handling (**Rule of Three/Five**, lesson 41).
- A base class used through base pointers needs a **`virtual` destructor**: `delete` through a `Base*` with a non-virtual destructor is **undefined behaviour** (usually only the base part is destroyed).
- Destructors **must not throw**: they are implicitly **`noexcept`**, so an escaping exception calls `std::terminate`. Never call a destructor explicitly: it would run twice.

## What a destructor is

**Meaning:** the destructor is the opposite of the constructor: `~` plus the class name, no parameters, no return type, exactly one per class. It runs automatically at the end of the object's life and does the cleanup (free memory, close files, unlock mutexes). After its body, the members and the base class are destroyed, in **reverse** order of construction.

```cpp
#include <iostream>

struct Part {
    const char* name;
    Part(const char* n) : name(n) { std::cout << "+" << name << " "; }
    ~Part() { std::cout << "-" << name << " "; }
};

struct Vehicle {
    Vehicle()  { std::cout << "+Vehicle "; }
    ~Vehicle() { std::cout << "-Vehicle\n"; }
};

class Car : public Vehicle {
    Part engine{"engine"};                     // declared first
    Part wheels{"wheels"};                     // declared second
public:
    Car()  { std::cout << "+Car(body)\n"; }
    ~Car() { std::cout << "-Car(body) "; }     // runs first, while the members still exist
};

int main() {
    Car c;
}                                              // c's lifetime ends here
```
```output
+Vehicle +engine +wheels +Car(body)
-Car(body) -wheels -engine -Vehicle
```

**How it works:**
1. Construction goes base, members in declaration order, then the constructor body.
2. At the closing brace of `main`, `~Car` runs **first**. All members are still alive, so the body can use them.
3. Then the members are destroyed in **reverse** declaration order (`wheels`, then `engine`), and finally the base class `Vehicle`. Later members may depend on earlier ones, so they go first.

## When destructors run

**Meaning:** a destructor runs when an object's lifetime ends, and that moment depends on how the object was created. The five common cases:

```cpp
#include <iostream>

struct T {
    const char* name;
    T(const char* n) : name(n) { std::cout << "+" << name << " "; }
    ~T() { std::cout << "-" << name << " "; }
};

T global("global");                         // built before main

int main() {
    std::cout << "| main starts\n";
    {
        T a("block");
    }                                       // 1) end of scope
    std::cout << "\n";
    T* p = new T("heap");
    delete p;                               // 2) delete
    std::cout << "\n";
    T* arr = new T[2]{"arr0", "arr1"};
    delete[] arr;                           // 3) delete[]: every element, last first
    std::cout << "\n";
    std::cout << T("temp").name << " ";     // 4) a temporary: end of the full expression
    std::cout << "\n";
    static T s("static");
    std::cout << "| main ends\n";
}                                           // 5) after main returns: statics, in reverse order
```
```output
+global | main starts
+block -block
+heap -heap
+arr0 +arr1 -arr1 -arr0
+temp temp -temp
+static | main ends
-static -global
```

**How it works:**
1. **End of scope:** `a` lives only inside the inner braces.
2. **`delete`:** a heap object is destroyed only when you delete it. Without the `delete`, `-heap` would never print: a leak.
3. **`delete[]`:** destroys every element, in reverse order. Use `delete[]` for memory from `new[]` (lesson 35).
4. **Temporary:** `T("temp")` has no name. It lives until the end of the full expression (the `;`), so `-temp` prints after its name was used. Lesson 39 covers temporaries and lifetime extension.
5. **Program exit:** the global was built before `main`, the static local when its line first ran. After `main` returns they are destroyed in reverse order: `s` first, then `global`.
6. **Exceptions:** when an exception leaves a scope, its locals are destroyed too (next section; stack unwinding is lesson 22).

## RAII: tie every resource to an object

**Meaning:** a **resource** is anything that must be given back: heap memory, a file, a socket, a locked mutex. **RAII** (Resource Acquisition Is Initialization): acquire it in a constructor, release it in the destructor. The destructor runs whenever the object's scope is left, so the resource is released on every path and can't be forgotten.

```cpp
#include <iostream>
#include <mutex>
#include <stdexcept>

std::mutex m;

class Guard {                                  // RAII: owns "the mutex is locked"
    std::mutex& mx;
public:
    explicit Guard(std::mutex& x) : mx(x) { mx.lock();   std::cout << "  locked\n"; }
    ~Guard()                               { mx.unlock(); std::cout << "  unlocked\n"; }
    Guard(const Guard&) = delete;              // exactly one owner
    Guard& operator=(const Guard&) = delete;
};

int process(int x) {
    Guard g(m);                                // acquire in the constructor
    if (x < 0) throw std::invalid_argument("negative input");
    if (x == 0) return -1;                     // early return
    std::cout << "  working on " << x << "\n";
    return x * 2;
}                                              // release in the destructor, on every path

int main() {
    std::cout << "normal:\n";
    process(5);
    std::cout << "early return:\n";
    process(0);
    std::cout << "exception:\n";
    try {
        process(-1);
    } catch (const std::exception& e) {
        std::cout << "  caught: " << e.what() << "\n";
    }
    bool isFree = m.try_lock();                // succeeds only if nobody holds the lock
    std::cout << "mutex free at the end: " << std::boolalpha << isFree << "\n";
    if (isFree) m.unlock();
}
```
```output
normal:
  locked
  working on 5
  unlocked
early return:
  locked
  unlocked
exception:
  locked
  unlocked
  caught: negative input
mutex free at the end: true
```

**How it works:**
1. `Guard g(m)` locks the mutex in its constructor. From then on, `g` owns the lock.
2. On all three paths (normal end, `return -1`, `throw`) the function's scope is left, so `~Guard` runs and unlocks.
3. With the exception, `unlocked` prints **before** `caught`: the destructor runs while the exception travels out of `process`, before the `catch` block starts.
4. `try_lock()` succeeds at the end: the mutex really was released. With manual `lock()`/`unlock()` calls, the early return and the throw would skip the unlock, and the next lock would wait forever (a deadlock).
5. The standard library's `std::lock_guard` is exactly this class. Copying is deleted because two owners would unlock twice.

| | Manual cleanup | RAII |
|---|---|---|
| Release written | at every exit point | once, in the destructor |
| Early `return` | easy to forget | released automatically |
| Exception thrown | leaks unless you catch and re-throw | released during unwinding |
| Examples | `malloc`/`free`, `fopen`/`fclose`, `lock`/`unlock` | `std::vector`, `std::unique_ptr`, `std::fstream`, `std::lock_guard` |

**Disadvantage:** the release happens at the end of the scope. To release earlier, put the object in a smaller `{ }` block, or call the class's own release function if it has one (`unique_ptr::reset()`).

## The Rule of Zero

**Meaning:** if every member of a class already cleans up after itself, the class needs **no destructor at all**. The compiler-generated destructor destroys each member, and each member frees its own resource. This is the **Rule of Zero**: write classes from RAII members and write no cleanup code. A class that manages a **raw** resource itself (a `new[]`ed buffer, a file descriptor) needs a destructor, and then also its own copy and move operations, or copies will free the resource twice: the **Rule of Three/Five** in lesson 41.

```cpp
#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct Weapon {
    std::string kind;
    explicit Weapon(const std::string& k) : kind(k) {}
    ~Weapon() { std::cout << "~Weapon(" << kind << ")\n"; }
};

class Player {                                  // Rule of Zero: no destructor written
    std::string name;                           // frees its own characters
    std::vector<int> scores;                    // frees its own array
    std::unique_ptr<Weapon> weapon;             // deletes its Weapon
public:
    Player(const std::string& n, const std::string& w)
        : name(n), scores{10, 20}, weapon(std::make_unique<Weapon>(w)) {}
};

int main() {
    {
        Player p("Ana", "sword");
        std::cout << "player alive\n";
    }                                           // p dies: each member cleans up itself
    std::cout << "player gone, nothing leaked\n";
}
```
```output
player alive
~Weapon(sword)
player gone, nothing leaked
```

**How it works:**
1. `Player` has three heap resources (the string's characters, the vector's array, the `Weapon`) and no destructor.
2. When `p` dies, the compiler-generated destructor destroys the members in reverse order. `unique_ptr` deletes the `Weapon`, and its destructor prints.
3. Copying is handled correctly too: `unique_ptr` can't be copied, so `Player b = p;` would not compile (`use of deleted function 'Player::Player(const Player&)'`) instead of sharing one `Weapon`. Moving still works.

**When to use it:** whenever you can. Write a destructor only in a small class whose one job is to own one raw resource (like `Guard`), and build everything else from such classes.

## Virtual destructors

**Meaning:** when a derived object is deleted **through a base-class pointer**, the base class must have a `virtual` destructor. Then `delete` runs the derived destructor first, then the base one. Without `virtual`, the behaviour is undefined: typically only the base destructor runs, and whatever the derived part owns is never freed. Virtual functions are lesson 14.

```cpp
#include <iostream>

struct Shape {
    virtual ~Shape() { std::cout << "~Shape\n"; }   // virtual: delete through Shape* works
};

struct Image : Shape {
    int* pixels = new int[1000];
    ~Image() override { delete[] pixels; std::cout << "~Image (pixels freed)\n"; }
};

int main() {
    Shape* s = new Image;
    delete s;                                        // runs ~Image, then ~Shape
}
```
```output
~Image (pixels freed)
~Shape
```

**How it works:**
1. `s` has type `Shape*` but points to an `Image`. Because `~Shape` is virtual, `delete s` looks up the real type and calls `~Image`, which then calls `~Shape` automatically.
2. `std::unique_ptr<Shape>` also deletes through a `Shape*`, so it needs the virtual destructor just as much.
3. Remove `virtual` and `delete s` is undefined behaviour: in practice `~Image` is skipped and the pixel array leaks.

**Rule:** if a class has any virtual function, or is meant to be deleted through a base pointer, give it a `virtual` destructor (`virtual ~Shape() = default;` is enough). A class that is not meant to be a base can be marked `final`.

## Destructors must not throw; never call one yourself

**Meaning:** since C++11 a destructor is implicitly `noexcept`. If an exception escapes from it, the program does not look for a `catch`: it calls `std::terminate` and aborts. Destructors often run *during* the handling of another exception, and two exceptions at once can't be handled, so the language forbids it outright.

```cpp
#include <iostream>
#include <stdexcept>

struct Bad {
    ~Bad() { throw std::runtime_error("cleanup failed"); }   // (not run) it aborts the program
};

int main() {
    try {
        Bad b;
    } catch (const std::exception& e) {
        std::cout << "caught: " << e.what() << "\n";            // never reached
    }
}
```

**How it works:**
1. g++ already warns: `warning: 'throw' will always call 'terminate' [-Wterminate]`, with the note `in C++11 destructors default to 'noexcept'`.
2. Running it prints `terminate called after throwing an instance of 'std::runtime_error'` and `what():  cleanup failed`, then the program aborts (exit code 134). The `catch` block never runs.
3. Fix: handle errors inside the destructor (log and carry on), or offer a separate `close()` that can report failure and let the destructor clean up quietly.

**Never call a destructor yourself.** `obj.~T();` destroys the object, and the end of its scope destroys it **again**: undefined behaviour (for example a double free). To end an object's life early, put it in a smaller block, or hold it in a `std::unique_ptr` or `std::optional` and call `reset()`. Explicit destructor calls belong only to low-level code that uses placement `new`.

## Common mistakes

- **A non-virtual destructor in a polymorphic base.** `delete basePtr;` is undefined behaviour and usually leaks the derived part. Add `virtual ~Base() = default;`.
- **A destructor without copy handling.** A class that frees a raw pointer in its destructor but keeps the compiler's copy constructor gets two objects freeing one buffer (a double free). Follow the Rule of Three/Five (lesson 41), or better, use `std::vector` or `std::unique_ptr` (Rule of Zero).
- **Expecting cleanup without `delete`.** A heap object created with `new` is never destroyed automatically. Prefer `std::unique_ptr` (lesson 40).
- **Mixing `delete` and `delete[]`.** Memory from `new[]` must be freed with `delete[]`, or only part of the cleanup happens (undefined behaviour, lesson 35).
- **Throwing from a destructor, or calling `obj.~T()` by hand:** termination, or a destructor that runs twice (previous section).

## ⚠ Easily confused

- **virtual vs non-virtual destructor** — Deleting a derived object through a base pointer: virtual destructor = full cleanup (derived, then base); non-virtual = undefined behaviour, usually only the base part is destroyed.
- **RAII vs manual cleanup** — RAII: the destructor releases the resource automatically at scope exit, on every path. Manual: you must release it at every exit point, and early returns or exceptions skip it.
- **Rule of Zero vs Rule of Three/Five** — Zero: members clean up themselves, so write no destructor or copy code. Three/Five: you manage a raw resource, so write the destructor, copy and move operations together (lesson 41).
- **destructor order vs constructor order** — Construction: base, members in declaration order, body. Destruction: body, members in reverse order, base.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 12).