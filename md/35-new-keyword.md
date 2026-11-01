# 35 — The new Keyword

*Category: C++ Core*

> new allocates heap memory and runs the constructor; delete runs the destructor and frees the memory. In modern C++ you rarely write either yourself.

## Must-remember points

- `new` is an **operator** that does **two** things: it allocates memory (by calling `operator new`, which uses `malloc` in g++'s library) **and runs the constructor**. It returns a **typed pointer**. `delete` is the reverse: destructor, then `operator delete` (free).
- Forms: `new int` (value **indeterminate**), `new int()` (zero), `new int(5)`, `new int[n]` (`n` may be a **run-time** value), `new int[n]()` (all zeros). `new Point[3]` needs a **default constructor**, or a brace list for every element.
- Pairing (a mismatch is **undefined behaviour**): `new`/`delete`, `new[]`/`delete[]`, `malloc`/`free`. Never cross them.
- `new` vs `malloc`: `new` runs the constructor (and `delete` the destructor), computes the size itself, returns a **typed** pointer, and **throws `std::bad_alloc`** on failure. `malloc` gives raw bytes as `void*` and returns `nullptr`.
- Plain `new` never returns `nullptr`, so checking for it is useless. **`new (std::nothrow) T`** returns `nullptr` on failure instead of throwing.
- Heap layout: glibc's allocator keeps a small **header** just before the block (holding its size), which is how `free`/`delete` know how much to release from `p` alone. For a type with a destructor, `new[]` also stores the **element count** (8 extra bytes on x86-64 with g++), so `delete[]` runs every destructor. (Deep dive: the *Heap layout* page linked at the bottom of this lesson.)
- Modern C++: use `std::vector` instead of `new[]`, and `std::make_unique`/`std::make_shared` instead of `new` (lesson 40). Raw `new` remains inside RAII classes, placement `new`, and older or framework code.

## What new and delete do

**Meaning:** `new Point(1, 2)` is one expression but two steps. First it calls the function **`operator new`** to get enough raw memory for a `Point`. Then it runs the **constructor** in that memory and gives you a `Point*`. `delete p` reverses it: the **destructor** runs, then **`operator delete`** gives the memory back. The program below replaces the global `operator new` and `operator delete` with versions that print, to make the steps visible.

```cpp
#include <cstdio>
#include <cstdlib>
#include <new>

// Replace the global allocation functions so we can see when they run.
void* operator new(std::size_t n) {
    std::printf("operator new: %zu bytes\n", n);
    if (void* p = std::malloc(n)) return p;
    throw std::bad_alloc();
}
void operator delete(void* p) noexcept              { std::printf("operator delete\n"); std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::printf("operator delete\n"); std::free(p); }

struct Point {
    int x, y;
    Point(int a, int b) : x(a), y(b) { std::printf("Point(%d, %d) constructor\n", x, y); }
    ~Point()                         { std::printf("~Point destructor\n"); }
};

int main() {
    Point* p = new Point(1, 2);      // step 1: operator new, step 2: constructor
    std::printf("using p->x = %d\n", p->x);
    delete p;                        // step 1: destructor, step 2: operator delete
}
```
```output
operator new: 8 bytes
Point(1, 2) constructor
using p->x = 1
~Point destructor
operator delete
```

**How it works:**
1. `new` computes the size itself (`sizeof(Point)` = 8 here) and calls `operator new(8)`. The real one in g++'s library calls `malloc`, like this replacement.
2. The constructor then runs in that memory. Only now is there a `Point` object.
3. `delete p` runs `~Point` first, while the object is still valid, then releases the memory.
4. Both `operator delete` versions are replaced because since C++14 the compiler may call the one that also receives the size (g++ warns with `-Wsized-deallocation` if only one is defined).

## Forms of new, and arrays

**Meaning:** what you write after `new` decides how the memory is initialized and whether you get one object or an array:

| Expression | Result | Free with |
|---|---|---|
| `new int` | one `int`, value **indeterminate** (reading it is undefined behaviour) | `delete` |
| `new int()` / `new int{}` | one `int`, set to 0 | `delete` |
| `new int(5)` / `new int{5}` | one `int`, set to 5 | `delete` |
| `new Point(1, 2)` | one object, constructor runs | `delete` |
| `new int[n]` | `n` ints, `n` may come from input; values indeterminate | `delete[]` |
| `new int[n]()` | `n` ints, all 0 | `delete[]` |
| `new Point[3]` | 3 objects, **default constructor** for each | `delete[]` |
| `new Point[2]{{1, 2}, {3, 4}}` | 2 objects, each with its own arguments | `delete[]` |

`new Point[3]` on a class with only `Point(int, int)` fails: `error: no matching function for call to 'Point::Point()'`.

How does `delete[]` know how many destructors to run? This program replaces `operator new[]` to print how many bytes each array asks for:

```cpp
#include <cstdio>
#include <cstdlib>
#include <new>

void* operator new[](std::size_t n) {                 // report every array allocation
    std::printf("  operator new[] asked for %zu bytes\n", n);
    if (void* p = std::malloc(n)) return p;
    throw std::bad_alloc();
}
void operator delete[](void* p) noexcept              { std::free(p); }
void operator delete[](void* p, std::size_t) noexcept { std::free(p); }

struct Plain   { int v; };                            // trivial destructor
struct Tracked { int v; ~Tracked() {} };              // a destructor that must run per element

int main() {
    int n = 3;                                        // a size known only at run time
    std::printf("new int[n]():\n");
    int* a = new int[n]();                            // () sets every element to 0
    std::printf("  values: %d %d %d\n", a[0], a[1], a[2]);
    delete[] a;
    std::printf("new Plain[3]:\n");
    Plain* p = new Plain[3];
    delete[] p;
    std::printf("new Tracked[3]:\n");
    Tracked* t = new Tracked[3];                      // 12 bytes of objects + room for the count
    delete[] t;
}
```
```output
new int[n]():
  operator new[] asked for 12 bytes
  values: 0 0 0
new Plain[3]:
  operator new[] asked for 12 bytes
new Tracked[3]:
  operator new[] asked for 20 bytes
```

**How it works:**
1. Three `int`s or three `Plain`s need exactly 12 bytes: nothing has to happen per element at `delete[]` time.
2. `Tracked` has a destructor, so `new Tracked[3]` asks for 8 extra bytes (on x86-64 with g++) and stores the element count there, just before the first element. `delete[]` reads it and runs 3 destructors.
3. Plain `delete` on that pointer ignores the count and hands the allocator the wrong address. It is undefined behaviour; a test with g++ and glibc aborted with `munmap_chunk(): invalid pointer`. That is why `new[]` must be paired with `delete[]`.

## new vs malloc

**Meaning:** `malloc` comes from C. It only reserves bytes: it knows nothing about types, constructors or destructors. `new` is the C++ operator that creates **objects**. Under the hood g++'s `new` calls `malloc`, but adds the constructor call, the typed pointer and the exception on failure.

| | `new` / `delete` | `malloc` / `free` |
|---|---|---|
| Size | computed from the type: `new Point` | you pass bytes: `malloc(sizeof(Point))` |
| Constructor / destructor | runs them | never |
| Returns | a typed pointer (`Point*`) | `void*` (C++ needs a cast) |
| On failure | throws `std::bad_alloc` | returns `nullptr` |
| Arrays | `new T[n]` / `delete[]` | `malloc(n * sizeof(T))` / `free` |
| Can be replaced or overloaded | yes (`operator new`, per class too) | no |
| Use in C++ | rarely directly (prefer containers, smart pointers) | only for C interfaces and raw byte buffers |

**When to use which:** in C++ code create objects with `new` (or, better, the modern tools at the end of this lesson). Use `malloc`/`free` only when C code allocates or frees the memory, and never mix the families on one pointer: `free` doesn't run destructors, and `delete` on `malloc` memory is undefined behaviour.

## When allocation fails: bad_alloc and nothrow

**Meaning:** if the memory can't be found, plain `new` **throws `std::bad_alloc`**: it never returns `nullptr`, so `if (p == nullptr)` after it is dead code. If you prefer a null check (for example in code built without exceptions), use **`new (std::nothrow)`**, which returns `nullptr` instead. `malloc` always reports failure with `nullptr`.

```cpp
#include <cstdio>
#include <cstdlib>
#include <new>

int main() {
    std::size_t huge = std::size_t(1) << 62;          // 4 EiB: more than any machine can give

    try {
        char* p = new char[huge];                     // plain new: throws on failure
        delete[] p;
    } catch (const std::bad_alloc& e) {
        std::printf("new threw %s\n", e.what());
    }

    char* q = new (std::nothrow) char[huge];          // nothrow new: returns nullptr instead
    std::printf("new (std::nothrow) returned %s\n", q ? "memory" : "nullptr");
    delete[] q;                                       // deleting nullptr is a safe no-op

    void* m = std::malloc(huge);                      // malloc: returns nullptr, never throws
    std::printf("malloc returned %s\n", m ? "memory" : "nullptr");
    std::free(m);
}
```
```output
new threw std::bad_alloc
new (std::nothrow) returned nullptr
malloc returned nullptr
```

**How it works:**
1. 2^62 bytes is far beyond the address space of an x86-64 process, so every request fails.
2. Plain `new` throws; the `catch` reports it. Uncaught, it would end the program (lesson 22).
3. `new (std::nothrow)` and `malloc` return `nullptr`, and the program checks for it.
4. On Linux, a *reasonable* request usually succeeds even when RAM is short, because pages get physical memory only when first touched (lesson 27). Running out may then show up later, as the kernel's out-of-memory killer, not as `bad_alloc`.

## Modern C++: when to write new at all

**Meaning:** every raw `new` creates an owner you must remember to `delete`, on every path, exactly once. Modern C++ hands that job to classes that do it for you, so application code almost never contains `new` or `delete`.

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Point {
    int x, y;
    Point(int a, int b) : x(a), y(b) {}
};

int main() {
    int n = 4;
    std::vector<int> v(n);                       // instead of new int[n](): zeros, knows its size
    auto pt = std::make_unique<Point>(1, 2);     // instead of new Point(1, 2)
    auto buf = std::make_unique<int[]>(n);       // instead of new int[n](): zeros, delete[] for you
    v[3] = 7;
    buf[3] = 9;
    std::cout << v.size() << " " << v[3] << " " << pt->x << " " << buf[3] << "\n";
}                                                // everything is freed here: no delete written
```
```output
4 7 1 9
```

**How it works:**
1. `std::vector<int> v(n)` allocates `n` zeroed ints on the heap, remembers its size, can grow, and frees the array in its destructor (lesson 43).
2. `std::make_unique<Point>(1, 2)` calls `new Point(1, 2)` for you and wraps the pointer in a `unique_ptr` that deletes it (lesson 40).
3. `std::make_unique<int[]>(n)` is the array form; its destructor uses `delete[]`.

| Instead of | Write | Why |
|---|---|---|
| `new T[n]` | `std::vector<T> v(n);` | knows its size, can grow, frees itself |
| `new T(args)` with one owner | `std::make_unique<T>(args)` | deleted automatically, even on exceptions |
| `new T(args)` with shared owners | `std::make_shared<T>(args)` | deleted when the last owner goes |
| `new T` just to have an object | `T obj;` on the stack | no heap needed at all |

**Where raw `new` is still seen:**
- Inside RAII classes that own memory: the implementations of `std::vector`, `std::unique_ptr`, or your own small resource class.
- **Placement new**, `new (buffer) T(args)`, which constructs an object in memory you already have (memory pools, container internals). It allocates nothing.
- Older code and some frameworks, where a parent object deletes its children (for example Qt widgets).

## Common mistakes

- **Mismatched pairs:** `delete` on `new[]` memory, `free` on `new` memory, `delete` on `malloc` memory. All undefined behaviour.
- **Leaking:** a `new` without a `delete` on every path (early returns, exceptions). Use `make_unique` or a container (lesson 34 shows the leak).
- **Using a pointer after `delete`**, or deleting it twice. After `delete p;`, set `p = nullptr;` (deleting `nullptr` is a safe no-op), or don't use raw owning pointers at all.
- **Checking plain `new` for `nullptr`.** It throws instead; the check never fires. Use `new (std::nothrow)` if you want the check.
- **Reading `new int`** before assigning it: the value is indeterminate. Write `new int()` for zero.
- **`delete` on something that didn't come from `new`**, such as the address of a local variable: undefined behaviour.
- **Writing `new` where a stack object or a `std::vector` would do.** The heap is slower and needs ownership management (lesson 3).

## ⚠ Easily confused

- **new vs malloc** — `new` computes the size, runs the constructor, returns a typed pointer and throws `bad_alloc` on failure. `malloc` = raw bytes as `void*`, no constructor, returns `nullptr` on failure.
- **delete vs free** — `delete` = destructor, THEN free the memory. `free` = free only (no destructor).
- **delete vs delete[]** — `delete` = one object. `delete[]` reads the stored element count and runs the destructor for every element.
- **new vs operator new** — `new T(args)` is the expression: allocate + construct. `operator new(size)` is only the allocation function it calls (like `malloc`); it constructs nothing.
- **new vs new (std::nothrow)** — Plain `new` throws `std::bad_alloc` on failure. `new (std::nothrow)` returns `nullptr` instead.
- **header offset vs block size** — Header offset = a fixed constant known by the allocator (so `p - headerSize` works). Block size = variable, stored in the header and read at free time.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 35).