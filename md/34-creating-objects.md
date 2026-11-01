# 34 — Creating / Instantiating Objects

*Category: C++ Core*

> An object is created in one of three places (the stack, the heap, or static storage), and where you create it decides how long it lives and who destroys it.

## Must-remember points

- An object lives in one of **three places**: the **stack** (local variables), the **heap** (`new`, `make_unique`) or **static storage** (globals, `static` locals, static members: created before `main` or on first use, destroyed after `main` returns). The place decides its lifetime (lesson 39).
- **Stack:** `Entity e;` is destroyed automatically at the end of its scope. Fast, but limited in size. Access members with `.`.
- **Heap:** `new Entity` returns a **pointer**; the object lives until `delete` (forget it and you **leak**). Access members with `->`. Today, prefer `auto p = std::make_unique<Entity>();`, which deletes for you.
- Use the heap only when needed: the object must **outlive its scope**, is **too big** for the stack, its size is known only **at run time**, or it is used **polymorphically**.
- Initialization forms: `Entity e(1, 2);`, `Entity e{1, 2};` (no narrowing), `Entity e = {1, 2};`, `Entity e = Entity(1, 2);` (C++17: no copy). `Entity e();` declares a **function** (most vexing parse): write `Entity e;` or `Entity e{};`.
- `Entity(1, 2)` used as an expression creates a **temporary**: an object with no name that dies at the end of the full expression.
- Arrays of objects: `Entity a[3];` needs a **default constructor**; `std::vector<Entity>` with `emplace_back` builds elements whose count is known only at run time.
- Traps: a **dangling** pointer (to an object already destroyed), a **leak** (never deleted), a **double delete**. Set raw pointers to `nullptr` after `delete`, or better, don't own objects through raw pointers.

## Three places an object can live

**Meaning:** where you create an object decides when it is destroyed. A local (`Entity e;`) lives on the **stack** until the end of its scope; an object from `new` lives on the **heap** until it is deleted; a global or `static` object lives in **static storage** until the program ends.

```cpp
#include <iostream>
#include <string>

class Entity {
    std::string name;
public:
    Entity(const std::string& n) : name(n) { std::cout << "  create " << name << "\n"; }
    ~Entity()                              { std::cout << "  destroy " << name << "\n"; }
    void hello() const                     { std::cout << "  hello from " << name << "\n"; }
};

Entity global("global");                     // static storage: before main, until the program ends

Entity* makeOnHeap() {
    Entity local("local");                   // stack: dies when this function returns
    return new Entity("heap");               // heap: lives until delete
}

int main() {
    std::cout << "main starts\n";
    Entity* p = makeOnHeap();
    std::cout << "back in main\n";
    p->hello();                              // pointer: use ->
    delete p;
    static Entity counter("static local");   // static storage too: lives to the end of the program
    global.hello();                          // object: use .
    std::cout << "main ends\n";
}
```
```output
  create global
main starts
  create local
  create heap
  destroy local
back in main
  hello from heap
  destroy heap
  create static local
  hello from global
main ends
  destroy static local
  destroy global
```

**How it works:**
1. `global` is created before `main` starts and destroyed after it ends.
2. `local` dies when `makeOnHeap` returns. The heap object survives the return because only `delete` ends its life.
3. `new` gives back a **pointer**, so members are reached with `p->hello()` (short for `(*p).hello()`). `global` is an object, so it uses `.`.
4. The `static` local is created when its line first runs, and destroyed after `main` before `global` (reverse order).

| | Stack | Heap | Static storage |
|---|---|---|---|
| Written as | `Entity e;` inside a function | `new Entity` / `std::make_unique<Entity>()` | a global, `static Entity e;`, a static member |
| Created | when the line runs | when `new` runs | before `main` (globals) or on first use (`static` locals) |
| Destroyed | automatically, at the end of the scope | by `delete` (or the smart pointer) | automatically, after `main` returns |
| You hold | the object itself (`.`) | a pointer to it (`->`) | the object itself (`.`) |
| Typical size limit | a few MB for the whole stack | most of the RAM | fixed when the program is built |

Why the stack is faster and how memory is laid out is lesson 3; lifetimes in detail are lesson 39.

## Initialization forms

**Meaning:** a stack object can be written in several ways. They all call a constructor; they differ in what they allow.

```cpp
#include <iostream>
#include <vector>

struct Point {                           // an aggregate: public members, no constructors
    int x, y;
};

class Entity {
    int x, y;
public:
    Entity() : x(0), y(0) {}
    Entity(int px, int py) : x(px), y(py) {}
    void print() const { std::cout << x << "," << y << " "; }
};

int main() {
    Entity a;                    // default constructor
    Entity b(1, 2);              // parentheses
    Entity c{3, 4};              // braces: same constructor, but no narrowing allowed
    Entity d = {5, 6};           // copy-list-initialization (not allowed if the constructor is explicit)
    Entity e = Entity(7, 8);     // C++17: no temporary and no copy, same as Entity e(7, 8)
    auto f = Entity{9, 9};       // the same, with auto
    Entity g{};                  // empty braces: default constructor (Entity g(); would declare a function)
    a.print(); b.print(); c.print(); d.print(); e.print(); f.print(); g.print();
    std::cout << "\n";

    Point p{1, 2};               // aggregate: members in declaration order
    Point q{};                   // all members zero
    std::cout << p.x << "," << p.y << " " << q.x << "," << q.y << "\n";

    std::vector<int> v1(3, 7);   // parentheses: 3 elements, each 7
    std::vector<int> v2{3, 7};   // braces: the 2 elements 3 and 7
    std::cout << v1.size() << " " << v2.size() << "\n";
}
```
```output
0,0 1,2 3,4 5,6 7,8 9,9 0,0
1,2 0,0
3 2
```

**How it works:**
1. `a` to `g` all call `Entity()` or `Entity(int, int)`. Braces forbid narrowing conversions (lesson 11).
2. With an `explicit` constructor, `Entity d = {5, 6};` fails: `error: converting to 'Entity' from initializer list would use explicit constructor 'Entity::Entity(int, int)'`.
3. Since C++17, `Entity e = Entity(7, 8);` creates `e` directly: no temporary, no copy. It compiles even if the class can't be copied or moved.
4. `Point` has no constructors, so braces fill its members in order (aggregate initialization). `Point q{};` sets them all to zero, while `Point q;` would leave them uninitialized.
5. **The brace surprise:** braces prefer a constructor taking `std::initializer_list`, which containers have. `v1(3, 7)` is "3 copies of 7"; `v2{3, 7}` is "the list 3, 7".

| Form | Narrowing | `explicit` constructor | Note |
|---|---|---|---|
| `Entity e(1, 2);` | allowed silently | allowed | `Entity e();` declares a function |
| `Entity e{1, 2};` | error | allowed | prefers an `initializer_list` constructor |
| `Entity e = {1, 2};` | error | not allowed | same `initializer_list` preference |
| `Entity e = Entity(1, 2);` | allowed silently | allowed | C++17: no copy made |

## Temporaries: objects without a name

**Meaning:** the class name with arguments used **as an expression**, `Entity("arg")`, creates a **temporary**: an object with no name, destroyed at the end of the **full expression** (normally the `;`). Use it to pass an object to a function, call one function on it, or return a new object. Lesson 39 shows how a `const&` can extend its life.

```cpp
#include <iostream>
#include <string>

class Entity {
    std::string name;
public:
    Entity(const std::string& n) : name(n) { std::cout << "+" << name << " "; }
    ~Entity()                              { std::cout << "-" << name << " "; }
    void hello() const                     { std::cout << "hello(" << name << ") "; }
};

void greet(const Entity& e) { e.hello(); }

Entity make(const std::string& n) { return Entity(n); }   // returns a new object

int main() {
    greet(Entity("arg"));             // a temporary passed to a function
    std::cout << "| end of statement 1\n";
    Entity("call").hello();           // a temporary used for one call
    std::cout << "| end of statement 2\n";
    Entity kept = make("kept");       // the returned object gets a name: it lives on
    std::cout << "| end of statement 3\n";
}
```
```output
+arg hello(arg) -arg | end of statement 1
+call hello(call) -call | end of statement 2
+kept | end of statement 3
-kept
```

**How it works:**
1. `Entity("arg")` lives long enough for `greet` to use it, then dies at the `;`, before the next statement prints.
2. `Entity("call").hello()` builds, uses and destroys an object in one statement.
3. `make` returns a new object straight into `kept` (no copy in C++17), so it lives until the end of `main`.
4. A temporary can bind to a `const Entity&` parameter but not to a plain `Entity&`: `greet` takes `const Entity&` for that reason.

## Arrays of objects

**Meaning:** a C-style array creates every element at once. `Entity a[3];` calls the **default constructor** three times; a brace list can give each element its own arguments. When the count is known only at run time, use `std::vector` (lesson 43). Heap arrays with `new[]` are lesson 35.

```cpp
#include <iostream>
#include <vector>

class Entity {
    int id;
public:
    Entity() : id(0) {}                       // needed for Entity a[3];
    Entity(int i) : id(i) {}
    int getId() const { return id; }
};

int main() {
    Entity a[3];                              // 3 objects, each default-constructed
    Entity b[3] = {Entity(1), Entity(2)};     // b[2] has no initializer: default-constructed
    Entity c[] = {{4}, {5}, {6}};             // size deduced from the list: 3

    std::vector<Entity> v;                    // size decided at run time
    v.reserve(2);
    v.emplace_back(7);                        // built directly inside the vector
    v.push_back(Entity(8));                   // built outside, then moved in

    for (const Entity& e : a) std::cout << e.getId() << " ";
    for (const Entity& e : b) std::cout << e.getId() << " ";
    for (const Entity& e : c) std::cout << e.getId() << " ";
    for (const Entity& e : v) std::cout << e.getId() << " ";
    std::cout << "\n";
}
```
```output
0 0 0 1 2 0 4 5 6 7 8
```

**How it works:**
1. Without `Entity()`, the line `Entity a[3];` fails: `error: no matching function for call to 'Entity::Entity()'`.
2. In `b`, elements without an initializer are default-constructed, so `b[2]` is 0.
3. `emplace_back(7)` passes 7 to the constructor and builds the element in place; `push_back` takes an object that already exists.

## Creating on the heap: new vs make_unique

**Meaning:** `new Entity(...)` creates an object on the heap and returns a raw pointer. You then **own** it: you must `delete` it exactly once, on every path. `std::make_unique<Entity>(...)` creates the same heap object but hands it to a `std::unique_ptr`, which deletes it automatically when the pointer goes out of scope. How `new` works inside is lesson 35; smart pointers are lesson 40.

```cpp
#include <iostream>
#include <memory>
#include <string>

class Entity {
    std::string name;
public:
    Entity(const std::string& n) : name(n) { std::cout << "  create " << name << "\n"; }
    ~Entity()                              { std::cout << "  destroy " << name << "\n"; }
    void hello() const                     { std::cout << "  hello from " << name << "\n"; }
};

void rawNew(bool early) {
    Entity* p = new Entity("raw");            // you own it: you must delete it
    p->hello();
    if (early) return;                        // LEAK: this path skips the delete
    delete p;
}

void smart(bool early) {
    auto p = std::make_unique<Entity>("smart");   // unique_ptr owns it
    p->hello();
    if (early) return;                        // fine: p's destructor deletes the Entity
}

int main() {
    std::cout << "rawNew(true):\n";
    rawNew(true);
    std::cout << "smart(true):\n";
    smart(true);
    std::cout << "main ends\n";
}
```
```output
rawNew(true):
  create raw
  hello from raw
smart(true):
  create smart
  hello from smart
  destroy smart
main ends
```

**How it works:**
1. `rawNew(true)` returns early, so `delete p` never runs: "destroy raw" is never printed. The object is leaked.
2. In `smart`, the `unique_ptr` is a stack object. Its destructor runs on every path and deletes the `Entity`.
3. Both are used the same way: `p->hello()`.

**When to use the heap:**
- The object must **outlive** the function that creates it (return a `std::unique_ptr`).
- It is **too big** for the stack, or its size is known only **at run time** (a `std::vector` usually handles both).
- **Polymorphism**: a `std::unique_ptr<Base>` pointing to a `Derived` (lesson 14).

Otherwise, use the stack: simpler, faster, and it can't leak.

## Common mistakes

**A dangling pointer to a stack object:** the pointer outlives the object it points to.

```cpp
#include <iostream>

struct Entity { int x = 1; };

int main() {
    Entity* bad;
    {
        Entity local;
        bad = &local;
    }                            // local is destroyed here
    std::cout << bad->x;         // undefined behaviour: bad points to a dead object
}
```

- **Using a pointer after `delete`**, or deleting twice. Set it to `nullptr` after `delete` (`delete nullptr;` is a safe no-op), or let a `unique_ptr` own the object.
- **Leaking.** Every `new` needs exactly one `delete` on **every** path, including early returns and exceptions. `make_unique` removes the problem.
- **`Entity e();`** declares a function, not an object. Write `Entity e;` or `Entity e{};`.
- **`.` on a pointer, `->` on an object.** `p.hello()` doesn't compile when `p` is a pointer; use `p->hello()`.
- **Putting everything on the heap** "to be safe". It is slower, needs ownership management, and gains nothing when the object's scope is enough.

## ⚠ Easily confused

- **stack vs heap vs static object** — Stack: `Entity e;`, destroyed at the end of its scope. Heap: `new Entity` / `make_unique`, destroyed by `delete` / the smart pointer. Static: globals and `static` locals, destroyed after `main` returns.
- **. vs ->** — `.` on an object (or reference); `->` on a pointer to an object (`p->x` == `(*p).x`).
- **dangling vs leak** — Dangling = a pointer to an object that was already destroyed (UB to use). Leak = a heap object never deleted (lost until the program ends).
- **v(3, 7) vs v{3, 7}** — For `std::vector<int>`: parentheses = 3 elements of value 7; braces = the 2 elements 3 and 7 (the `initializer_list` constructor wins).
- **temporary vs named object** — `Entity(1)` as an expression has no name and dies at the end of the full expression. `Entity e(1);` lives to the end of its scope.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 34).