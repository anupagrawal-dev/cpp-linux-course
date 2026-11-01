# 40 — Smart Pointers

*Category: C++ Core*

> RAII objects that own a heap object and delete it automatically: unique_ptr for one owner, shared_ptr for shared ownership, weak_ptr to observe without owning.

## Must-remember points

- Smart pointers (in `<memory>`) are **RAII wrappers** around a raw pointer: they **own** the heap object and `delete` it in their destructor, so early returns and exceptions can't leak it.
- **`unique_ptr`** = the **only** owner. Can't be copied, only **moved** (`std::move`). Same size as a raw pointer, practically no run-time cost. Your default; create it with `make_unique`.
- **`shared_ptr`** = **shared** ownership through a **reference count** in a control block; the object is deleted when the last owner goes (`use_count()`). `make_shared` needs one allocation instead of two.
- **`weak_ptr`** = a **non-owning** observer of a `shared_ptr`; it doesn't change the count. Use `.lock()` to get a `shared_ptr` if the object is still alive. It **breaks reference cycles**. (Deep dive: the *shared_ptr circular reference* page linked at the bottom of this lesson.)
- `unique_ptr` and `shared_ptr` overload `*`, `->` and the test `if (p)`, so you use them like raw pointers. `.get()` borrows the raw pointer (never delete it), `.reset()` deletes now, `unique_ptr::release()` gives up ownership **without** deleting.
- Passing to functions: a function that only **uses** the object takes `T&`/`const T&` (or `T*` if it may be null); one that **takes ownership** takes `std::unique_ptr<T>` by value and the caller writes `std::move(p)`.
- `std::unique_ptr<T[]>` owns an array (`delete[]`), but `std::vector` is usually better. `std::vector<std::unique_ptr<Base>>` owns a list of polymorphic objects.
- Prefer `make_unique` / `make_shared` over `new`: no raw `new` in your code, and the type is written once.

## Why smart pointers

**Meaning:** with a raw pointer, someone must remember to call `delete` on every path out of the code: normal end, early `return`, exception. Miss one and the object leaks. A smart pointer is an object whose destructor does the `delete`, so the cleanup happens automatically when the smart pointer goes out of scope (RAII, lesson 39).

```cpp
#include <iostream>
#include <memory>

struct Resource {
    int id;
    explicit Resource(int i) : id(i) { std::cout << "acquire " << id << "\n"; }
    ~Resource() { std::cout << "release " << id << "\n"; }
};

void rawVersion(bool fail) {
    Resource* r = new Resource(1);
    if (fail) return;                       // early return: delete is skipped, Resource 1 leaks
    delete r;
}

void smartVersion(bool fail) {
    auto r = std::make_unique<Resource>(2);
    if (fail) return;                       // r's destructor deletes Resource 2 anyway
}

int main() {
    rawVersion(true);
    smartVersion(true);
    std::cout << "end of main\n";
}
```
```output
acquire 1
acquire 2
release 2
end of main
```

**How it works:**
1. `rawVersion` returns before `delete r;`, so `release 1` never appears: a memory leak.
2. In `smartVersion`, `r` is a local object. Leaving the function in any way runs its destructor, which deletes the `Resource`.

## unique_ptr: one owner

**Meaning:** a `std::unique_ptr<T>` is the single owner of one heap object. Because there may only be one owner, copying is forbidden; ownership can be **moved** to another `unique_ptr`, which leaves the source empty (null).

```cpp
#include <iostream>
#include <memory>
#include <utility>

struct Entity {
    int id;
    explicit Entity(int i) : id(i) { std::cout << "Entity " << id << " created\n"; }
    ~Entity() { std::cout << "Entity " << id << " destroyed\n"; }
};

int main() {
    std::unique_ptr<Entity> a = std::make_unique<Entity>(1);
    std::cout << "id " << a->id << ", via * " << (*a).id << "\n";   // used like a raw pointer

    std::unique_ptr<Entity> b = std::move(a);         // ownership moves to b
    std::cout << "a is " << (a ? "full" : "empty") << ", b owns " << b->id << "\n";

    Entity* raw = b.get();                            // borrow: b still owns it
    std::cout << "raw sees " << raw->id << "\n";

    b = std::make_unique<Entity>(2);                  // b takes a new object, the old one is deleted
    b.reset();                                        // delete now; b becomes empty
    std::cout << "end of main\n";
}
```
```output
Entity 1 created
id 1, via * 1
a is empty, b owns 1
raw sees 1
Entity 2 created
Entity 1 destroyed
Entity 2 destroyed
end of main
```

**How it works:**
1. `std::move(a)` hands the pointer to `b` and sets `a` to null; `if (a)` tests for that.
2. `get()` returns the raw pointer without giving up ownership. Use it to call code that takes `T*`; never `delete` it.
3. Assigning a new `unique_ptr` to `b` first builds Entity 2, then deletes the Entity 1 that `b` owned.
4. `reset()` deletes the object now. (`release()` would return the raw pointer and stop owning it, leaving the `delete` to you.)

Copying is a compile error:

```cpp
#include <memory>

int main() {
    auto p = std::make_unique<int>(1);
    auto q = p;              // does not compile: unique_ptr can't be copied
}
```

g++ says `error: use of deleted function 'std::unique_ptr<_Tp, _Dp>::unique_ptr(const std::unique_ptr<_Tp, _Dp>&)'`: the copy constructor is `= delete` (lesson 41).

## Passing smart pointers to functions

**Meaning:** the parameter type says what the function does with ownership. Most functions only **use** an object and shouldn't care whether it lives in a `unique_ptr`, a `shared_ptr` or on the stack, so they take a reference or raw pointer. Only a function that keeps or destroys the object takes the smart pointer.

```cpp
#include <iostream>
#include <memory>
#include <utility>

struct Entity {
    int id;
    explicit Entity(int i) : id(i) {}
    ~Entity() { std::cout << "Entity " << id << " destroyed\n"; }
};

void show(const Entity& e) { std::cout << "show " << e.id << "\n"; }    // uses it
void maybeShow(const Entity* e) { if (e) show(*e); }                   // uses it, may be null
void take(std::unique_ptr<Entity> e) { std::cout << "take " << e->id << "\n"; }   // takes ownership
std::unique_ptr<Entity> make(int id) { return std::make_unique<Entity>(id); }     // gives ownership

int main() {
    std::unique_ptr<Entity> p = make(7);
    show(*p);
    maybeShow(p.get());
    take(std::move(p));                  // the Entity now belongs to take and dies when take ends
    std::cout << "p is " << (p ? "full" : "empty") << "\n";
}
```
```output
show 7
show 7
take 7
Entity 7 destroyed
p is empty
```

| The function... | Parameter / return type | Caller writes |
|---|---|---|
| only uses the object | `const T&` or `T&` (`T*` if it may be null) | `show(*p)`, `maybeShow(p.get())` |
| takes ownership (stores or destroys it) | `std::unique_ptr<T>` by value | `take(std::move(p))` |
| creates an object for the caller | returns `std::unique_ptr<T>` | `auto p = make(7);` (no `std::move` needed) |
| keeps a share of the ownership | `std::shared_ptr<T>` by value | `keep(sp)` (copies: count + 1) |
| may replace the caller's pointer | `std::unique_ptr<T>&` | `reseat(p)` (rare) |

## shared_ptr: shared ownership

**Meaning:** sometimes several objects need the same resource and none of them is clearly the last one to use it. A `std::shared_ptr` keeps a **reference count** in a separate **control block**: copying a `shared_ptr` adds 1, destroying or resetting one subtracts 1, and the object is deleted when the count reaches 0.

```cpp
#include <iostream>
#include <memory>

struct Texture {
    ~Texture() { std::cout << "Texture freed\n"; }
};

struct Sprite {
    std::shared_ptr<Texture> tex;                // each sprite co-owns the texture
};

int main() {
    Sprite a, b;
    {
        auto t = std::make_shared<Texture>();     // count 1
        a.tex = t;                                // count 2
        b.tex = t;                                // count 3
        std::cout << "owners: " << t.use_count() << "\n";
    }                                             // t is gone: count 2
    std::cout << "owners: " << a.tex.use_count() << "\n";
    a.tex.reset();                                // count 1
    std::cout << "a let go\n";
    b.tex.reset();                                // count 0: Texture deleted
    std::cout << "end of main\n";
}
```
```output
owners: 3
owners: 2
a let go
Texture freed
end of main
```

**How it works:**
1. The texture outlives `t`, the pointer that created it, because the sprites still own it.
2. It is freed exactly when the last owner lets go, whichever that is.
3. `make_shared` puts the object and the control block in **one** allocation; `std::shared_ptr<T>(new T)` needs two.
4. The count is updated atomically (g++ emits `lock addl` for a copy), so copying `shared_ptr`s in different threads is safe but slower than copying a raw pointer. The object itself is not protected.

## weak_ptr: observe without owning

**Meaning:** a `std::weak_ptr` points at an object owned by `shared_ptr`s but doesn't count as an owner. It can't be dereferenced directly: `lock()` returns a `shared_ptr` that is empty if the object is already gone. Its main job is to break **cycles**: two objects that own each other through `shared_ptr` keep each other's count above 0 forever, so neither is ever freed.

```cpp
#include <iostream>
#include <memory>

struct Node {
    const char* name;
    std::shared_ptr<Node> next;        // owns the next node
    std::weak_ptr<Node> prev;          // only observes the previous one
    explicit Node(const char* n) : name(n) {}
    ~Node() { std::cout << name << " freed\n"; }
};

int main() {
    auto a = std::make_shared<Node>("a");
    auto b = std::make_shared<Node>("b");
    a->next = b;                       // a owns b
    b->prev = a;                       // b observes a: a's count stays 1
    std::cout << "a owners: " << a.use_count() << ", b owners: " << b.use_count() << "\n";

    if (auto p = b->prev.lock())       // a shared_ptr while a is alive, empty after
        std::cout << "b's prev is " << p->name << "\n";
}
```
```output
a owners: 1, b owners: 2
b's prev is a
a freed
b freed
```

**How it works:**
1. At the end of `main`, `b` (the local) dies first: b's count goes 2 -> 1. Then `a` dies: a's count goes 1 -> 0, so node a is freed, and its `next` member releases node b.
2. If `prev` were a `shared_ptr`, a's count would be 2, both counts would stop at 1, and neither `freed` line would print: a leak. The deep-dive page draws this step by step.
3. `expired()` only reports; to use the object, call `lock()`: it can't disappear while you hold the result.

## Arrays and containers

**Meaning:** `std::unique_ptr<T[]>` owns a heap array, offers `[]` and calls `delete[]`, though `std::vector` is usually the better array. More common is a container **of** smart pointers: `std::vector<std::unique_ptr<Base>>` owns polymorphic objects (lessons 14 and 15) and deletes them all when it is destroyed.

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Shape {
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
struct Square : Shape {
    double s;
    explicit Square(double side) : s(side) {}
    double area() const override { return s * s; }
};
struct Circle : Shape {
    double r;
    explicit Circle(double radius) : r(radius) {}
    double area() const override { return 3.14 * r * r; }
};

int main() {
    auto buf = std::make_unique<int[]>(4);           // 4 ints, set to 0; freed with delete[]
    buf[2] = 42;
    std::cout << buf[0] << " " << buf[2] << "\n";

    std::vector<std::unique_ptr<Shape>> shapes;      // the vector owns the shapes
    shapes.push_back(std::make_unique<Square>(2));
    shapes.push_back(std::make_unique<Circle>(1));
    for (const auto& s : shapes)                     // a reference: unique_ptr can't be copied
        std::cout << s->area() << "\n";
}                                                    // each shape is deleted through Shape's virtual destructor
```
```output
0 42
4
3.14
```

**How it works:**
1. `make_unique<int[]>(4)` value-initializes the elements, so they start at 0.
2. `push_back` moves the temporary `unique_ptr` into the vector; a named one needs `shapes.push_back(std::move(p));`. `for (auto s : shapes)` would not compile: it would copy each `unique_ptr`.

## Cost and choosing

```cpp
#include <iostream>
#include <memory>

int main() {
    std::cout << sizeof(int*) << " " << sizeof(std::unique_ptr<int>) << " "
              << sizeof(std::shared_ptr<int>) << " " << sizeof(std::weak_ptr<int>) << "\n";
}
```
```output
8 8 16 16
```

On x86-64 with g++, a `unique_ptr` is just a pointer; a `shared_ptr` or `weak_ptr` holds two (object and control block).

| | Raw `T*` | `unique_ptr<T>` | `shared_ptr<T>` | `weak_ptr<T>` |
|---|---|---|---|---|
| Owns the object | No (should not) | Yes, alone | Yes, shared | No |
| Copy | Yes | No, move only | Yes (count + 1) | Yes |
| Size (x86-64, g++) | 8 | 8 | 16 | 16 |
| Extra cost | None | None | Control block, atomic count updates | Control block, `lock()` |
| Use for | Borrowing (non-owning) | Default for ownership | Ownership that is truly shared | Observing shared objects, breaking cycles |

**When to use which:** start with `unique_ptr`; switch to `shared_ptr` only when several owners really need the object and none is clearly last. Use `weak_ptr` for back-pointers and caches, raw pointers and references only to borrow.

## Common mistakes

- **Two owners from one raw pointer**: `std::unique_ptr<int> a(p); std::unique_ptr<int> b(p);` (or two `shared_ptr`s built from the same `p`) deletes the object twice: undefined behaviour. Create it with `make_unique`/`make_shared` and copy or move the smart pointer instead.
- **Deleting what `.get()` returned**: the smart pointer still owns it and deletes it again.
- **Using a `unique_ptr` after `std::move`**: it is null now.
- **`release()` without `delete`**: the object leaks. Use `reset()` to destroy it.
- **`shared_ptr` everywhere "to be safe"**: it costs a control block and atomic updates, and hides who owns what. Default to `unique_ptr`.
- **Cycles of `shared_ptr`** (parent <-> child, observer lists): make the back-pointer a `weak_ptr`.

## ⚠ Easily confused

- **unique_ptr vs shared_ptr** — unique = one owner, move-only, no overhead. shared = many owners, reference-counted, deleted at count 0 (control block, atomic count).
- **weak_ptr vs shared_ptr** — shared owns and counts. weak observes without counting: breaks cycles; use `.lock()` to access safely.
- **release() vs reset() vs move** — release() = give up ownership, NO delete (you must delete). reset() = delete now. move = transfer ownership to another smart pointer.
- **owning vs non-owning** — Smart pointers express ownership. Raw pointers/references are for borrowing: never delete through them.
- **passing by value vs by reference** — `std::unique_ptr<T>` by value = the function takes ownership (`f(std::move(p))`). `const T&` / `T*` = the function only uses the object; ownership stays with the caller.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 40).