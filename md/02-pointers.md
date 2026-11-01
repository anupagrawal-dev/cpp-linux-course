# 02 — Pointers

*Category: C++ Core*

> A pointer is a variable that holds a memory address: & takes an address, * goes to it.

## Must-remember points

- A pointer holds an **address**. `&x` gives the address of `x`; `*p` **dereferences** `p` (reads or writes the value at that address). Unlike a reference (lesson 4), a pointer can be **reseated** and can be **null**.
- Declare one pointer per line: in `int* a, b;` only `a` is a pointer, `b` is a plain `int`.
- Initialize every pointer, to an address or to `nullptr`. An uninitialized (**wild**) pointer holds garbage; dereferencing it or a null pointer is **undefined behaviour**. Prefer `nullptr` to `NULL` or `0`.
- Every data pointer has the same size (**8 bytes** on x86-64). The **type** says how to read `*p` and how far `p + 1` moves: `sizeof(T)` bytes. An array name **decays** to a pointer to its first element.
- Pass `&x` to a function taking `int*` and the function can change the caller's `x` (and `nullptr` can mean "no value").
- `const int* p`: the value can't be changed through `p`. `int* const p`: `p` can't be moved. Read the declaration right to left.
- The pointer variable lives **wherever it is declared**: on the stack for a local, in static storage for a global, inside its object for a member. What it points to may be anywhere.
- `int**` is a pointer to a pointer. `void*` is an address with no type: cast it back to the real type before use.

## & and *: taking an address and dereferencing

**Meaning:** every variable sits at some address in memory, and a pointer is a variable whose value is such an address. `&x` means "the address of `x`". `*p` means "the value at the address in `p`": you can read it or assign to it. In a declaration, `int* p` just says "`p` is a pointer to `int`".

```cpp
#include <iostream>

int main() {
    int x = 42;
    int* p = &x;                    // p holds the address of x

    std::cout << *p << "\n";        // read through p: 42
    *p = 99;                        // write through p
    std::cout << x << "\n";         // x changed: 99

    int y = 7;
    p = &y;                         // reseat: p now points to y
    std::cout << *p << "\n";

    int* a, b;                      // trap: a is an int*, b is a plain int
    a = &x;
    b = *a;
    std::cout << sizeof(a) << " " << sizeof(b) << "\n";
}
```
```output
42
99
7
8 4
```

**How it works:**
1. `int* p = &x;` stores the address of `x` in `p`; `*p = 99` follows it and writes into `x` itself.
2. `p = &y` changes which address `p` holds. `x` is not affected.
3. In `int* a, b;` the `*` belongs to `a` only, so `b` is an `int` (4 bytes) while `a` is a pointer (8 bytes on x86-64). Write `int* a; int* b;` on separate lines.

## nullptr and wild pointers

**Meaning:** `nullptr` (C++11) is the value of a pointer that points to nothing, and `if (p)` is true only for a non-null pointer. `NULL` and `0` are older ways to write it, but both are integers. A pointer that was never initialized is **wild**: it holds leftover bits, points to an unknown place, and no test can detect it.

```cpp
#include <iostream>

void show(int n)  { std::cout << "show(int) " << n << "\n"; }
void show(int* p) { std::cout << "show(int*) " << (p ? "valid" : "null") << "\n"; }

int main() {
    int* p = nullptr;               // points to nothing, and you can test for it
    if (p == nullptr)
        std::cout << "p is null\n";

    show(0);                        // 0 is an int: calls show(int)
    show(nullptr);                  // nullptr is a pointer: calls show(int*)
}
```
```output
p is null
show(int) 0
show(int*) null
```

**How it works:**
1. `nullptr` has its own type, `std::nullptr_t`, which converts to any pointer type but never to `int`. So `show(nullptr)` picks the pointer overload.
2. `show(0)` picks `show(int)`, even if you meant "null pointer". With g++, `show(NULL)` doesn't compile at all: `call of overloaded 'show(NULL)' is ambiguous`.
3. Dereferencing a null pointer is undefined behaviour (on Linux it usually ends in a segmentation fault). When null is possible, check `if (p)` first.

A wild pointer:

```cpp
int main() {
    int* w;          // wild: never initialized, holds a garbage address
    *w = 1;          // undefined behaviour: writes to an unknown address
}
```

g++ `-Wall` warns `'w' is used uninitialized`. The fix is to always initialize: `int* w = nullptr;` or `int* w = &something;`.

## Pointer size, type and arithmetic

**Meaning:** an address is just a number, so every data pointer has the same size: 8 bytes on x86-64. The **type** still matters: it says how many bytes `*p` reads and what they mean, and `p + n` moves `n * sizeof(T)` bytes, to the n-th next element. In most expressions an array's name **decays** to a pointer to its first element, so `p[i]` means `*(p + i)`.

```cpp
#include <iostream>

int main() {
    std::cout << sizeof(char*) << " " << sizeof(int*) << " " << sizeof(double*) << "\n";

    int nums[4] = {10, 20, 30, 40};
    int* p = nums;                          // the array name decays to &nums[0]
    std::cout << *p << " " << *(p + 2) << " " << p[3] << "\n";

    std::cout << p << " -> " << (p + 1) << "\n";       // int*: moves 4 bytes
    double d[2] = {1.5, 2.5};
    double* dp = d;
    std::cout << dp << " -> " << (dp + 1) << "\n";     // double*: moves 8 bytes

    for (int* q = nums; q != nums + 4; ++q)            // walk the array with a pointer
        std::cout << *q << " ";
    std::cout << "\n" << sizeof(nums) << " " << sizeof(p) << "\n";   // array vs pointer
}
```
```text
8 8 8
10 30 40
0x7ffded3e1a50 -> 0x7ffded3e1a54
0x7ffded3e1a60 -> 0x7ffded3e1a68
10 20 30 40
16 8
```

**How it works:**
1. All three pointer types are 8 bytes (x86-64, g++). The addresses change from run to run.
2. `p + 1` is 4 bytes further on for an `int*`, 8 for a `double*`: you count in elements, the compiler multiplies by the element size.
3. `nums + 4` points one past the last element. It may be used for comparison (`q != nums + 4`), but never dereferenced.
4. `sizeof(nums)` is the whole array (4 x 4 = 16 bytes); `sizeof(p)` is only the pointer (8). Once an array has decayed to a pointer, its length is lost.

Why arrays must be contiguous for this to work is covered in lesson 18.

## Passing a pointer to a function

**Meaning:** arguments are copied into a function's parameters. If you pass `x`, the function gets a copy and can't change the caller's `x`. If you pass `&x`, the function gets a copy of the **address**, and through it can change `x`. This is how C returns several results, and a pointer parameter can also be `nullptr` to mean "not given". C++ code often uses a reference for the same job (lesson 4).

```cpp
#include <iostream>

void bumpCopy(int n) { n++; std::cout << "inside bumpCopy: " << n << "\n"; }   // a copy
void bumpVia(int* p) { if (p) (*p)++; }        // the caller's variable, through its address

void divide(int a, int b, int* quotient, int* remainder) {   // two results
    *quotient = a / b;
    *remainder = a % b;
}

int main() {
    int a = 5, b = 5;
    bumpCopy(a);
    bumpVia(&b);
    bumpVia(nullptr);                     // allowed: the function checks for null
    std::cout << a << " " << b << "\n";

    int q, r;
    divide(17, 5, &q, &r);
    std::cout << q << " r " << r << "\n";
}
```
```output
inside bumpCopy: 6
5 6
3 r 2
```

**How it works:**
1. `bumpCopy(a)` changes its own copy to 6; `a` stays 5.
2. `bumpVia(&b)` receives the address of `b`, so `(*p)++` increments `b`. The parentheses matter: `*p++` would move the pointer instead.
3. `divide` returns two results by writing through two pointers.

## const with pointers

**Meaning:** a pointer involves two things that can be made read-only: the **value** it points to, and the **pointer** itself. Read the declaration from right to left: `int* const p` is "`p` is a const pointer to int", `const int* p` is "`p` is a pointer to an int that is const". `const` left of the `*` protects the value; right of the `*` it protects the pointer.

```cpp
#include <iostream>

int main() {
    int a = 1, b = 2;

    const int* p1 = &a;      // pointer to const int: the value is read-only through p1
    p1 = &b;                 // OK: p1 itself can move
    // *p1 = 5;              // error: assignment of read-only location '* p1'

    int* const p2 = &a;      // const pointer to int: p2 can't move
    *p2 = 10;                // OK: the value can change
    // p2 = &b;              // error: assignment of read-only variable 'p2'

    const int* const p3 = &b;    // neither can change
    std::cout << *p1 << " " << a << " " << *p3 << "\n";
}
```
```output
2 10 2
```

| Declaration | Change the value (`*p = 5`) | Move the pointer (`p = &b`) |
|---|---|---|
| `int* p` | yes | yes |
| `const int* p` (same as `int const* p`) | no | yes |
| `int* const p` | yes | no |
| `const int* const p` | no | no |

**When to use it:** take `const T*` parameters when a function only reads through the pointer (`int sum(const int* arr, int n)`, `const char*` strings); the compiler then enforces the promise. It only stops changes **through that pointer**: `a` itself can still be changed directly.

## Where the pointer itself lives

**Meaning:** a pointer is an ordinary variable, so it lives wherever it is declared, like an `int` would. A local pointer is on the stack, a global pointer is in static storage, and a pointer member is inside its object (which may be on the heap). The address it **holds** is a separate matter: it can point to the stack, the heap or static storage.

```cpp
#include <iostream>

int value = 7;
int* globalPtr = &value;            // a global pointer: static storage

struct Node {
    Node* next = nullptr;           // a member pointer: part of every Node object
};

int main() {
    int* localPtr = &value;         // a local pointer: on the stack
    Node* node = new Node;          // node (a local) is on the stack; the Node is on the heap

    std::cout << "localPtr holds  " << localPtr << "  (address of value)\n";
    std::cout << "&globalPtr      " << &globalPtr << "  (static storage)\n";
    std::cout << "&localPtr       " << &localPtr << "  (stack)\n";
    std::cout << "&node->next     " << &node->next << "  (inside the heap Node)\n";
    delete node;
}
```
```text
localPtr holds  0x562302e20010  (address of value)
&globalPtr      0x562302e20018  (static storage)
&localPtr       0x7ffed6496768  (stack)
&node->next     0x56231856e2b0  (inside the heap Node)
```

**How it works:** `localPtr` holds the address of the global `value`, but `&localPtr`, where the pointer itself is stored, is a stack address (`0x7ff...` on Linux x86-64). `globalPtr` sits next to `value` in static data, and `next` is on the heap with its `Node`. The memory regions are the subject of lesson 3.

## Pointer to pointer and void*

**Meaning:** a pointer can point to another pointer (`int**`). The usual reason is to let a function change the **caller's pointer**, not just the value it points to. `void*` is an address with no type: any data pointer converts to it, but you can't dereference it until you cast it back to the real type. C APIs such as `malloc` and `memcpy` use `void*`.

```cpp
#include <iostream>

void allocate(int** out) {          // a pointer to the caller's pointer
    *out = new int(42);             // changes the caller's pointer itself
}

int main() {
    int* p = nullptr;
    allocate(&p);                   // pass the address of p
    std::cout << *p << "\n";
    delete p;

    int n = 5;
    void* any = &n;                 // void*: an address with no type attached
    // std::cout << *any;           // error: 'void*' is not a pointer-to-object type
    int* back = static_cast<int*>(any);   // cast back to the real type first
    std::cout << *back << "\n";
}
```
```output
42
5
```

**How it works:**
1. `allocate(&p)` passes the address of `p`. `*out = ...` writes into `p` itself, so after the call `p` points to the new `int`.
2. `void* any = &n` is automatic, but the way back needs `static_cast<int*>`. Casting to the wrong type compiles but is undefined behaviour when used.
3. Modern C++ prefers returning a smart pointer (lesson 40) to `int**` out-parameters, and templates to `void*`.

## Common mistakes

- **`int* a, b;`** declares one pointer and one `int`. Declare each pointer on its own line.
- **Wild or null pointers.** Initialize every pointer, and check `if (p)` whenever null is possible.
- **Dangling pointers.** A pointer to a local that went out of scope, or to deleted memory, still holds the old address and can't be detected by a check (lessons 3 and 35).
- **`*p++` instead of `(*p)++`.** `*p++` moves the pointer and reads the old element; g++ warns `value computed is not used` when the result is unused.
- **`sizeof` on an array parameter.** In `int total(int arr[])`, `arr` is really an `int*`, so `sizeof(arr)` is 8. g++ warns `'sizeof' on array function parameter 'arr' will return size of 'int*'`. Pass the length too.
- **Going past the end.** `*(nums + 4)` on a 4-element array reads out of bounds (lesson 20).

## ⚠ Easily confused

- *** vs &** — In a declaration `int* p`, `*` means 'pointer'. In an expression, `*p` dereferences and `&x` takes an address.
- **p vs &p** — `p` = the address it holds (where it points). `&p` = the address of the pointer variable itself (a stack address when `p` is a local).
- **null vs dangling vs wild** — **Null** points to nothing on purpose; `if (p)` detects it. **Dangling** points to freed or out-of-scope memory; **wild** was never initialized. Both look valid, and using them is UB.
- **const int* vs int* const** — `const int* p`: can't change the value through `p`, can move `p`. `int* const p`: can't move `p`, can change the value.
- **nullptr vs NULL / 0** — `nullptr` has a pointer type (`std::nullptr_t`) and never converts to `int`. `NULL` and `0` are integers, so `f(0)` calls `f(int)` over `f(int*)`.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 02).