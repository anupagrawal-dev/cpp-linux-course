# 21 — std::array vs std::vector

*Category: C++ Language & Safety*

> C array, `std::array` or `std::vector`: choose by whether the size is fixed at compile time, and whether it must grow.

## Must-remember points

- `std::array<T, N>` = a C array wrapped in an object: size **fixed at compile time**, can't grow, **no heap allocation of its own**. It lives **wherever the object lives**: stack if local, heap if inside a heap object, static storage if global.
- `std::vector<T>` = **dynamic** array: size chosen and changed at run time (`push_back`, `resize`). The elements are always in a separate **heap** block; the vector object itself is three pointers (24 bytes on x86-64).
- A C array (`int c[N]`) **decays** to a pointer when passed, can't be copied with `=`, and `==` compares addresses. `std::array` fixes all three: it knows its `size()`, copies with `=`, and `==` compares elements.
- All three are **contiguous**; `std::array` and `std::vector` give `.data()` for C APIs. Both have `[]` (unchecked) and `.at()` (checked, throws `std::out_of_range`).
- Pass `std::array` and `std::vector` by **`const&`**: by value copies every element. `std::array<int, 3>` and `std::array<int, 5>` are **different types**.
- **Fixed, known, small count → `std::array`. Unknown or changing count → `std::vector`** (the default choice). C arrays mainly for C interop.
- Large data (megabytes) does not belong in a **local** `std::array`: the stack is often 8 MB. Use a `std::vector`.

## The three side by side

**Meaning:** all three store elements contiguously, one after another (lesson 18). They differ in when the size is decided, where the elements live, and how they behave as objects.

```cpp
#include <array>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <vector>

int main() {
    int c[3] = {1, 2, 3};                    // C array
    std::array<int, 3> a = {1, 2, 3};        // std::array: same layout, with member functions
    std::vector<int> v = {1, 2, 3};          // std::vector: elements in a heap block

    v.push_back(4);                          // only the vector can grow
    std::array<int, 3> a2 = a;               // copies all 3 elements (int c2[3] = c; is an error)
    std::vector<int> v2 = v;                 // copies into a new heap block

    std::cout << std::size(c) << " " << a.size() << " " << v.size() << "\n";
    std::cout << (a2 == a) << " " << (v2 == v) << "\n";               // == compares elements
    std::cout << sizeof(c) << " " << sizeof(a) << " " << sizeof(v) << "\n";
    try { std::cout << a.at(5); } catch (const std::out_of_range&) { std::cout << "a.at(5) threw\n"; }
}
```
```output
3 3 4
1 1
12 12 24
a.at(5) threw
```

**How it works:**
1. `v.push_back(4)` grows the vector to 4 elements. `std::array` and the C array have no such operation.
2. `std::array` and `std::vector` copy with `=` and compare element by element with `==`. A C array can do neither.
3. `sizeof` shows the layout (x86-64, g++): the C array and `std::array` are exactly 3 ints (12 bytes); the vector object is 24 bytes (pointers to the start, the end of the elements and the end of the block) however many elements it holds.

| | C array `int c[N]` | `std::array<int, N>` | `std::vector<int>` |
|---|---|---|---|
| Size decided | compile time | compile time | run time, can change |
| Grow / shrink | no | no | `push_back`, `resize`, `erase` |
| Where the elements are | inside the array itself | inside the object | a separate heap block |
| Heap allocation of its own | no | no | yes, once it holds elements |
| `sizeof` (x86-64) | `N * 4` | `N * 4` | 24, whatever the size |
| Knows its size | only where declared (`std::size`) | `.size()` | `.size()` |
| Passed to a function | decays to a pointer | copied by value; pass `const&` | copied by value; pass `const&` |
| Copy with `=` / compare with `==` | no / compares addresses | yes / compares elements | yes / compares elements |
| Bounds-checked access | no | `.at()` | `.at()` |
| Move | not movable as a whole | moves element by element, O(N) | takes over the heap block, O(1) |

How the vector grows (size, capacity, reallocation) is lesson 43.

## Where std::array lives: it never allocates

**Meaning:** a `std::array` is just its elements, stored inside the `std::array` object. So it lives **wherever that object lives**: on the stack as a local variable, on the heap as a member of an object created with `new`, in static storage as a global. What it never does is make a heap allocation **of its own**. A `std::vector` always keeps its elements in a separate heap block.

```cpp
#include <array>
#include <cstdlib>
#include <iostream>
#include <memory>
#include <new>
#include <vector>

static int allocations = 0;
void* operator new(std::size_t n) {                // count every heap allocation made with new
    ++allocations;
    if (void* p = std::malloc(n)) return p;
    throw std::bad_alloc();
}
void operator delete(void* p) noexcept { std::free(p); }
void operator delete(void* p, std::size_t) noexcept { std::free(p); }

struct Packet { std::array<int, 4> data{}; };      // the array is stored INSIDE each Packet

std::array<int, 4> table{};                        // global: static storage, no allocation

int main() {
    int before = allocations;
    std::array<int, 4> local{};                    // local: on the stack
    std::cout << "local std::array:    " << allocations - before << " allocations\n";

    before = allocations;
    auto p = std::make_unique<Packet>();           // one allocation for the Packet; its array is in that block
    std::cout << "Packet via new:      " << allocations - before << " allocation\n";

    before = allocations;
    std::vector<int> v(4);                         // the vector object is local; its 4 ints get a heap block
    std::cout << "std::vector<int>(4): " << allocations - before << " allocation\n";

    local[0] = p->data[0] + table[0] + v[0];
    std::cout << "sizeof(Packet) = " << sizeof(Packet) << ", sizeof(v) = " << sizeof(v) << "\n";
}
```
```output
local std::array:    0 allocations
Packet via new:      1 allocation
std::vector<int>(4): 1 allocation
sizeof(Packet) = 16, sizeof(v) = 24
```

**How it works:**
1. Replacing the global `operator new` lets the program count heap allocations. The local `std::array` costs none: its 16 bytes are part of `main`'s stack frame.
2. `make_unique<Packet>()` makes **one** allocation: the `Packet`, with its `std::array` inside (`sizeof(Packet)` is 16, the 4 ints). That array is on the heap, because its owner is.
3. `std::vector<int> v(4)` is a local object, but it allocates a heap block for its elements.

**Why it matters:** no allocation means no `new`/`delete` cost, good for small fixed data in hot code. But a big local `std::array<int, 3'000'000>` (12 MB) overflows an 8 MB stack, like a big C array.

## Passing them to functions

**Meaning:** a C array decays to a pointer, so the function needs the size separately. `std::array` and `std::vector` keep their size, but passing them **by value copies every element**; pass `const&` to read. The size `N` is part of a `std::array`'s type, so a function written for `std::array<int, 3>` won't take a `std::array<int, 5>`: make it a template, or take a `std::vector`.

```cpp
#include <array>
#include <cstddef>
#include <iostream>
#include <vector>

int sumC(const int* p, std::size_t n) {                  // C style: pointer + count
    int s = 0;
    for (std::size_t i = 0; i < n; i++) s += p[i];
    return s;
}

int sum3(const std::array<int, 3>& a) {                  // the size is part of the type
    int s = 0;
    for (int x : a) s += x;
    return s;
}

template <std::size_t N>
int sumAny(const std::array<int, N>& a) {                // any std::array<int, N>
    int s = 0;
    for (int x : a) s += x;
    return s;
}

int sumVec(const std::vector<int>& v) {                  // any length
    int s = 0;
    for (int x : v) s += x;
    return s;
}

int main() {
    int c[3] = {1, 2, 3};
    std::array<int, 3> a = {1, 2, 3};
    std::array<int, 5> a5 = {1, 2, 3, 4, 5};
    std::vector<int> v = {1, 2, 3, 4};
    std::cout << sumC(c, 3) << " " << sum3(a) << " " << sumAny(a5) << " " << sumVec(v) << "\n";
    // sum3(a5);    // error: std::array<int, 5> is a different type from std::array<int, 3>
    std::cout << sumC(a.data(), a.size()) << " " << sumC(v.data(), v.size()) << "\n";   // .data() for C APIs
}
```
```output
6 6 15 10
6 10
```

**How it works:**
1. `sum3(a5)` fails with `invalid initialization of reference of type 'const std::array<int, 3>&' from expression of type 'std::array<int, 5>'`.
2. `sumAny` deduces `N` from its argument, so it accepts any size (one copy of the function is generated per `N` used).
3. `.data()` returns a pointer to the first element, so both containers work with C functions that take `pointer + count`. In C++20, a `std::span<const int>` parameter accepts all three kinds directly.

## How to choose

**Meaning:** the decision depends on two questions: is the count known when you write the code, and does it change?

1. The count is known only at run time, or changes (reading input, collecting results): **`std::vector`**. It is the default sequence container.
2. The count is fixed and known at compile time, and the data is small (an RGB colour, a 3D point, a 4x4 matrix, a lookup table): **`std::array`**. No allocation, and the size is checked by the type system.
3. Fixed but large (megabytes): `std::vector`, or a `std::array` inside an object you create on the heap. Not a local variable.
4. A raw C array: only when talking to C code or for string literals. Even then, a `std::array` or `std::vector` with `.data()` usually works.

**`std::array` wins on:** no heap allocation, a size known to the compiler, no pointer to follow. **`std::vector` wins on:** a run-time, changeable size, large data on the heap, and an O(1) move.

## Common mistakes

- **"`std::array` lives on the stack."** It lives wherever its owner lives. What is true: it never allocates on its own.
- **Huge local `std::array`.** It overflows the stack like any big local array. Use `std::vector`.
- **Missing braces.** A local `std::array<int, 3> a;` holds garbage, like a C array. `std::array<int, 3> a{};` zeroes it. (`std::vector<int> v(3);` always zeroes.)
- **Passing by value by accident.** `void f(std::vector<int> v)` copies the whole vector on every call. Use `const std::vector<int>&`.
- **A run-time size for `std::array`.** `std::array<int, n>` with a run-time `n` doesn't compile (lesson 17). That is a `std::vector`.
- **Allocating a small fixed vector in a hot loop.** `std::vector<int> tmp(3);` inside a loop allocates and frees every iteration. A `std::array<int, 3>` costs nothing.

## ⚠ Easily confused

- **std::array vs std::vector** — array = size fixed at compile time, elements inside the object, no allocation of its own. vector = size chosen and changed at run time, elements in a heap block.
- **std::array vs C array** — Same memory layout. `std::array` knows its size, doesn't decay to a pointer, copies with `=` and compares elements with `==`.
- **lives on the stack vs never allocates** — A `std::array` is on the stack only when it is a local variable. Inside a heap object it is on the heap. What it never does is allocate memory itself.
- **size vs capacity** — `std::array`'s size is fixed forever. A vector has a size (elements in use) and a capacity (room allocated) that grows as needed (lesson 43).
- **sizeof(std::array) vs sizeof(std::vector)** — `sizeof(std::array<int, N>)` is `N * sizeof(int)`. `sizeof(std::vector<int>)` is the fixed size of its handle (24 bytes on x86-64), however many elements it holds.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 21).