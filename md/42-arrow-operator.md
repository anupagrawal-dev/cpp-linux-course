# 42 — The Arrow Operator

*Category: C++ Core*

> ptr->member is shorthand for (*ptr).member. Smart pointers and iterators overload operator-> so they can be used like pointers.

## Must-remember points

- `ptr->member` is shorthand for `(*ptr).member`: **dereference** the pointer, then apply the dot.
- `.` is used on an **object** or a **reference**; `->` on a **pointer** (raw or smart) or an **iterator**.
- `.` binds tighter than `*`, so `*p.x` means `*(p.x)` and doesn't compile for a pointer `p`. That is why `->` exists.
- For a **raw pointer**, `->` is **built-in**. A class can **overload `operator->`**: that's how `unique_ptr`, `shared_ptr` and iterators support `p->member`.
- An overloaded `operator->` returns a **pointer** (or an object that has its own `operator->`); the compiler keeps applying `->` until it reaches a raw pointer.
- Iterators: `it->first` on a `std::map` iterator is `(*it).first`; `it->x` on a `std::vector<Point>` iterator is `(*it).x`.
- `offsetof(Type, member)` (in `<cstddef>`) gives a member's byte offset. The old `&((T*)nullptr)->m` trick is undefined behaviour: use the macro.

## -> is (*p). in one step

**Meaning:** to reach a member through a pointer you first dereference the pointer (`*p` is the object), then use the dot. `p->x` does both in one step. A reference is just another name for the object, so it uses the dot.

```cpp
#include <iostream>

struct Entity {
    int x = 0;
    void print() const { std::cout << "x = " << x << "\n"; }
};

int main() {
    Entity obj;
    Entity& r = obj;
    Entity* p = &obj;

    obj.x = 1;          // object: dot
    r.x += 1;           // reference: dot
    (*p).x += 1;        // pointer, the long way: dereference, then dot
    p->x += 1;          // pointer, the short way
    p->print();         // works for member functions too
}
```
```output
x = 4
```

**How it works:**
1. `obj`, `r`, `*p` and `p->` all reach the same object, so the four updates add up to 4.
2. The parentheses in `(*p).x` are required: `.` binds tighter than `*`.

```cpp
struct Entity { int x = 0; };

int main() {
    Entity obj;
    Entity* p = &obj;
    int v = *p.x;        // does not compile: read as *(p.x), and p is a pointer
}
```

g++ even suggests the fix: `request for member 'x' in 'p', which is of pointer type 'Entity*' (maybe you meant to use '->' ?)`. The opposite mistake, `obj->x`, gives `base operand of '->' has non-pointer type 'Entity'`.

## -> with smart pointers and iterators

**Meaning:** smart pointers (lesson 40) and iterators are objects, not raw pointers, but they overload `->` (and `*`) so the same syntax works. A map iterator points at a `std::pair`, so its members are `first` (the key) and `second` (the value).

```cpp
#include <iostream>
#include <map>
#include <memory>
#include <string>
#include <vector>

struct Point { int x, y; };

int main() {
    auto sp = std::make_unique<Point>(Point{1, 2});
    sp->x = 10;                                        // unique_ptr overloads ->
    std::cout << sp->x << "," << sp->y << "\n";

    std::vector<Point> pts = {{3, 4}, {5, 6}};
    for (auto it = pts.begin(); it != pts.end(); ++it)
        std::cout << it->x << "," << it->y << " ";     // an iterator works like a pointer
    std::cout << "\n";

    std::map<std::string, int> ages = {{"Ana", 30}, {"Ben", 25}};
    auto found = ages.find("Ben");
    if (found != ages.end())                           // check before using ->
        std::cout << found->first << " is " << found->second << "\n";
}
```
```output
10,2
3,4 5,6
Ben is 25
```

**How it works:**
1. `sp->x` calls `sp.operator->()`, which returns the raw `Point*` inside, then applies the built-in `->`.
2. `it->x` is `(*it).x`: the iterator refers to one `Point` in the vector.
3. `found->first` is `(*found).first`. `find` returns `end()` when the key is missing, and using `->` on `end()` is undefined behaviour, hence the check.

## Overloading operator->

**Meaning:** a class that wraps a pointer can define `operator->` to return that pointer. When you write `w->m` and `w` is an object, the compiler calls `w.operator->()` and applies `->` to the result. If the result is again an object with `operator->`, it repeats, until it reaches a raw pointer. `operator->` must be a member function (lesson 37), and it usually comes with `operator*`.

```cpp
#include <iostream>

struct Entity {
    int x;
    explicit Entity(int v) : x(v) {}
    ~Entity() { std::cout << "Entity deleted\n"; }
    void print() const { std::cout << "Entity " << x << "\n"; }
};

class ScopedPtr {                                      // a tiny unique_ptr
    Entity* ptr;
public:
    explicit ScopedPtr(Entity* p) : ptr(p) {}
    ~ScopedPtr() { delete ptr; }
    ScopedPtr(const ScopedPtr&) = delete;              // one owner (lesson 41)
    ScopedPtr& operator=(const ScopedPtr&) = delete;
    Entity* operator->() const { return ptr; }         // return the raw pointer
    Entity& operator*() const { return *ptr; }         // return the object
};

int main() {
    ScopedPtr p(new Entity(5));
    p->print();              // p.operator->()->print()
    p->x = 7;
    (*p).print();            // operator* gives the object, then the dot
}                            // ~ScopedPtr deletes the Entity
```
```output
Entity 5
Entity 7
Entity deleted
```

**How it works:**
1. `p` is a `ScopedPtr` object, so `p->print()` becomes `p.operator->()->print()`: the overloaded call returns `Entity*`, and the built-in `->` reaches `print`.
2. `operator->` is `const` but returns a non-const `Entity*`: a const smart pointer can't be re-pointed, but the object it points to can still change. `std::unique_ptr` behaves the same.
3. The destructor makes it RAII: the `Entity` is deleted when `p` goes out of scope (lesson 40 has the real thing).
4. Other uses: iterators, and proxy objects that lock, log or count every access before handing out the pointer.

## Member offsets with offsetof

**Meaning:** `offsetof(Type, member)` from `<cstddef>` gives the distance in bytes from the start of an object to a member. It is useful for binary file and network formats, and for seeing where the compiler adds padding.

```cpp
#include <cstddef>
#include <iostream>

struct Packet {
    char tag;
    int value;
    double time;
};

int main() {
    std::cout << offsetof(Packet, tag) << " " << offsetof(Packet, value) << " "
              << offsetof(Packet, time) << " " << sizeof(Packet) << "\n";
}
```
```output
0 4 8 16
```

**How it works:**
1. On x86-64 with g++, `int` needs 4-byte alignment, so 3 padding bytes follow `tag` and `value` starts at 4.
2. `time` starts at 8 and is 8 bytes long, so the struct is 16 bytes.
3. Older code computed offsets with `(size_t)&((Packet*)nullptr)->value`. That applies `->` to a null pointer, which is undefined behaviour; `offsetof` is the supported way. It is meant for standard-layout types (plain structs): on a class with virtual functions g++ warns that it is `conditionally-supported`.

## Common mistakes

- **`.` on a pointer or `->` on an object**: the compiler stops you, and the message for `p.x` even suggests `->`.
- **`*p.x` instead of `(*p).x`**: `.` binds first. Write `p->x`.
- **`->` on a null, dangling or `end()` pointer/iterator**: undefined behaviour, often a crash. Check `if (p)` or `it != c.end()` first.
- **An overloaded `operator->` that returns an object by value** without its own `operator->`: `w->m` doesn't compile. Return a pointer.
- **`->` on a reference**: `r->x` doesn't compile for `Entity& r`. A reference uses `.`.

## ⚠ Easily confused

- **. vs ->** — `.` on an object or reference. `->` on a pointer (raw or smart) or iterator; `p->m` == `(*p).m`.
- **built-in -> vs overloaded ->** — Raw pointer: `->` is built-in. Class (smart pointer, iterator): `operator->` is a member function that returns a pointer, and the compiler then applies the built-in `->`.
- **(*p).x vs *p.x** — `(*p).x` = dereference, then member: same as `p->x`. `*p.x` = `*(p.x)`: member of `p` first, which fails for a pointer.
- **operator-> vs operator*** — `operator->` returns a pointer, used for `p->member`. `operator*` returns a reference to the object, used for `*p` and `(*p).member`.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 42).