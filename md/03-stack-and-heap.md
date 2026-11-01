# 03 — Stack & Heap Memory

*Category: C++ Core*

> A process's memory has regions: code, globals, heap and stack. The stack is fast, small and automatic; the heap is big, flexible and must be freed.

## Must-remember points

- A running program's memory is split into regions: **text** (machine code), **data** / **bss** (globals and statics), **heap** (`new` / `malloc`), **stack** (local variables and call frames).
- **Stack**: each function call pushes a **frame** (return address, saved registers, locals); returning pops it. Allocating is just moving the **stack pointer**: fast, automatic, lifetime tied to the scope.
- The stack's address range is **set aside** in advance, but each page gets physical RAM only when first touched. It is small: **8 MB** for the main thread on typical Linux (`ulimit -s` = 8192 KiB). Too deep recursion or a huge local array = **stack overflow** (segfault).
- On x86-64 the stack is at high addresses (`0x7ff...`) and grows **DOWN**: a push decrements the stack pointer, so the 'top of stack' is the **lowest** address.
- **Heap**: any size, chosen at run time, lives until freed. The allocator must find a free block and keep bookkeeping, so it is slower, and the heap can fragment.
- Use the **stack by default** (small, fixed size, needed only in this scope); use the **heap** for big data, sizes known only at run time, or data that must outlive the function.
- Heap memory nobody frees is a **leak**. Modern C++ lets an owner object free it: `std::vector`, `std::string`, smart pointers (**RAII**).
- Returning `&local` = dangling pointer (UB); mismatched `new` / `delete[]` = UB. **ASLR** moves every region to a random address on each run.

## The memory layout of a process

**Meaning:** when Linux starts a program, it gives the process its own virtual address space (lesson 24) and places a few regions in it:

| Region | Holds | Size fixed? |
|---|---|---|
| text | the machine code of your functions (read-only) | yes, at build time |
| data | globals and statics with a non-zero initial value | yes |
| bss | globals and statics with no initializer or zero (filled with 0 at start) | yes |
| heap | blocks from `new` / `malloc` | grows up as needed |
| memory-mapping area | shared libraries, large `malloc` blocks | grows as needed |
| stack | call frames: local variables, return addresses | grows down, up to a limit |

```cpp
#include <iostream>

int initialized = 42;               // data: global with a non-zero initial value
int zeroed;                         // bss: global with no initializer (starts as 0)

int square(int x) { return x * x; } // text: machine code

int main() {
    int local = square(3);          // stack
    int* block = new int(local);    // block is on the stack, the int it points to is on the heap

    std::cout << "stack  &local       " << &local << "\n";
    std::cout << "heap   block        " << block << "\n";
    std::cout << "bss    &zeroed      " << &zeroed << "\n";
    std::cout << "data   &initialized " << &initialized << "\n";
    std::cout << "text   square       " << reinterpret_cast<void*>(&square) << "\n";
    delete block;
}
```
```text
stack  &local       0x7ffcb360b2ec
heap   block        0x55b87b17c2b0
bss    &zeroed      0x55b85ac67154
data   &initialized 0x55b85ac67010
text   square       0x55b85ac641c9
```

**How it works:**
1. Read the addresses from the bottom up: code, data, bss, then the heap a little higher, and the stack far away near the top (`0x7ff...`).
2. `block` (the pointer) is a local on the stack; the `int` it points to is on the heap.
3. The cast to `void*` is needed to print a function's address (without it, `std::cout` prints `1`).
4. Run it twice and every address changes: that is **ASLR** (address space layout randomization), a security feature. The order of the regions stays the same. `/proc/<pid>/maps` lists the real regions of a running process, including `[heap]` and `[stack]`.

## The stack: frames, and why it is fast

**Meaning:** every function call pushes a **stack frame**: the return address, saved registers, and room for the function's local variables. Returning pops it. The CPU keeps the current top in the **stack pointer** register (`rsp` on x86-64). Creating all the locals of a function is one subtraction from that register, and freeing them is restoring it: no search, no bookkeeping. That, and the fact that the top of the stack is usually in the CPU cache, is why the stack is fast.

```cpp
#include <iostream>

void call(int depth) {
    int local = depth;                       // one local per frame
    std::cout << "depth " << depth << ": &local = " << &local << "\n";
    if (depth < 3) call(depth + 1);          // each call pushes a new frame
}

int main() {
    call(1);
}
```
```text
depth 1: &local = 0x7fff15634724
depth 2: &local = 0x7fff156346f4
depth 3: &local = 0x7fff156346c4
```

**How it works:**
1. Each nested call gets its own frame with its own `local`, at a **lower** address: the stack grows down. Here each frame is 48 bytes (`0x30`).
2. When `call(3)` returns, its frame is popped and its `local` no longer exists. A pointer to it would now dangle.

The compiler's output shows the single instruction that reserves the locals. For a function with a 400-byte local array:

```cpp
int work(int x) {
    int a[100];                 // 400 bytes of locals
    a[0] = x;
    a[99] = x * 2;
    return a[0] + a[99];
}
```
```bash
$ g++ -O0 -S -o - frame.cpp | grep -E 'pushq|subq.*rsp|leave|ret'
	pushq	%rbp
	subq	$432, %rsp
	leave
	ret
```

`subq $432, %rsp` moves the stack pointer down 432 bytes: the array, a copy of `x`, a stack-protector value and alignment padding. `leave` and `ret` give it all back. The stack's whole address range is set aside for it in advance, but RAM for each page arrives on first touch, like any other memory (lesson 27).

## How big the stack is, and stack overflow

**Meaning:** the stack has a fixed maximum size. On Linux the main thread's limit is set by `ulimit -s` (in KiB), typically **8192 = 8 MB**. Every thread has its own stack. A program that needs more, through very deep recursion or a huge local array, goes past the limit and the kernel kills it with `SIGSEGV`: a **stack overflow**.

```cpp
#include <cstdio>
#include <cstdlib>
#include <iostream>

void useStack(int depth, int limit) {
    char label[1024];                                  // 1 KiB in every frame
    std::snprintf(label, sizeof label, "%d frames", depth);
    if (depth % 2000 == 0) std::cout << label << std::endl;
    if (depth < limit) useStack(depth + 1, limit);     // one more frame
}

int main(int argc, char* argv[]) {
    int limit = argc > 1 ? std::atoi(argv[1]) : 1000;
    useStack(1, limit);
    std::cout << "done: " << limit << " frames\n";
}
```
```bash
$ ulimit -s                          # the limit, in KiB
8192
$ g++ -std=c++17 -o overflow overflow.cpp
$ ./overflow 20000; echo "exit code $?"
2000 frames
4000 frames
6000 frames
Segmentation fault
exit code 139
$ (ulimit -s 65536; ./overflow 20000 | tail -1)   # a subshell with a 64 MiB limit
done: 20000 frames
```

**How it works:**
1. Each frame holds a 1 KiB array, so 20,000 frames need about 20 MB. With an 8 MB limit the program dies after about 8,000 frames.
2. Exit code 139 = 128 + 11, and 11 is `SIGSEGV`.
3. Raising the limit for one subshell lets the same program finish. The real fix is not to need it: move big data to the heap (`std::vector`), and turn very deep recursion into a loop.

## The heap: flexible but slower

**Meaning:** heap memory is requested at run time with `new` (or `malloc`), in any size, and stays until it is freed. The allocator (glibc's `malloc` on Linux) must find a free block big enough, record its size, and from time to time ask the kernel for more memory. That work is why heap allocation costs more than a stack allocation. In exchange, the size can be decided at run time and the block can outlive the function that created it.

```cpp
#include <iostream>

int* makeSquares(int n) {               // n is known only at run time
    int* arr = new int[n];              // heap: survives the end of this function
    for (int i = 0; i < n; i++) arr[i] = i * i;
    return arr;
}

int main() {
    int n = 5;                          // imagine it was read from a file
    int* squares = makeSquares(n);
    std::cout << squares[4] << "\n";
    delete[] squares;                   // nobody frees it for you

    char* small = new char[64];
    char* big   = new char[1 << 20];    // 1 MiB
    std::cout << static_cast<void*>(small) << "\n" << static_cast<void*>(big) << "\n";
    delete[] small;
    delete[] big;
}
```
```text
16
0x56017df952e0
0x7f0a1f616010
```

**How it works:**
1. `makeSquares` returns heap memory, which is still valid in `main`. A local array would have died with the function's frame.
2. The 1 MiB block comes from a different area (`0x7f...`). glibc serves big requests (128 KiB and up, by default) with a separate `mmap` from the kernel; small ones come from the `[heap]` area, which grows upward.
3. Freed blocks of different sizes leave holes between used ones, so the heap can **fragment** (lesson 26).

The syntax of creating objects on the stack or heap is in lesson 34, and `new` / `delete` in detail in lesson 35.

## Stack vs heap: which one to use

| | Stack | Heap |
|---|---|---|
| Allocation | move the stack pointer (one instruction) | allocator call: find a block, bookkeeping |
| Freed by | automatically, when the scope ends | you (`delete`), or an owner object |
| Lifetime | until the end of the enclosing `{ }` | until freed, can outlive the function |
| Size limit | small: 8 MB for the main thread (typical Linux) | large: limited by available memory |
| Size known | at compile time | can be decided at run time |
| Fragmentation | none (strict last-in, first-out) | possible |
| Threads | each thread has its own stack | one heap shared by all threads |
| Typical bugs | overflow, pointer to a dead local | leak, double delete, use after free |

**When to use the stack:** the default for local variables and small objects of fixed size that are only needed inside the current function.

**When to use the heap:**
- The data is big (large arrays, images, buffers).
- The size is known only at run time.
- The object must outlive the function that creates it, or be shared.
- The exact type is chosen at run time (a `Base*` pointing to a derived object, lesson 14).

You rarely need `new` for this: a `std::vector` or `std::string` keeps its elements on the heap and frees them itself.

## Memory leaks, and the modern answer

**Meaning:** a **leak** is heap memory that is never freed: the last pointer to it is gone (out of scope or overwritten), so nobody can free it any more. A server that leaks on every request grows until it runs out of memory. The cure is to give each heap block an **owner object** whose destructor frees it: this is **RAII** (lesson 39).

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Buffer {
    Buffer()  { std::cout << "acquire\n"; }
    ~Buffer() { std::cout << "release\n"; }
    void use() const { std::cout << "use\n"; }
};

void leaky() {
    Buffer* b = new Buffer;              // raw new: someone must delete it
    b->use();
}                                        // the pointer b dies here; the Buffer is leaked

void safe() {
    auto b = std::make_unique<Buffer>(); // an owner object on the stack
    b->use();
}                                        // its destructor deletes the Buffer

int main() {
    leaky();
    safe();
    std::vector<int> v(1000000);         // 4 MB on the heap, freed by the vector itself
    std::cout << "end\n";
}
```
```output
acquire
use
acquire
use
release
end
```

**How it works:**
1. `leaky()` never deletes its `Buffer`: there is only one `release`. Even a `delete b;` at the end could be skipped by an early `return` or an exception.
2. In `safe()`, the `std::unique_ptr` is a stack object that owns the heap `Buffer`. When the function ends, its destructor deletes the `Buffer`, on every path out.
3. `std::vector` does the same for its elements. Smart pointers are covered in lesson 40.
4. Built with `g++ -fsanitize=address`, the program reports the leak at exit: `Direct leak of 1 byte(s) in 1 object(s)` (lesson 23).

## Common mistakes

- **Returning the address of a local.** The frame is gone after the return, so the pointer dangles (UB, lesson 39). Return by value instead.
- **Huge local arrays.** `int big[10'000'000];` (40 MB) as a local overflows an 8 MB stack. Use `std::vector<int> big(10'000'000);`.
- **Unbounded recursion.** Every call costs a frame; recursion depth that grows with the input can overflow. Use a loop for deep cases.
- **Mismatched frees.** `new` pairs with `delete`, `new[]` with `delete[]`; mixing them, or deleting twice, is UB (lesson 35).
- **"The pointer is on the heap."** In `int* p = new int;` the pointer `p` is a local on the stack; only the `int` is on the heap.
- **"The stack is pre-loaded in RAM."** Only its address range is set aside; each page gets RAM on first touch. The speed comes from the pointer move.
- **Using `new` where a local would do.** Heap allocation costs more than a stack allocation; in a tight loop the difference adds up. Keep small, short-lived objects on the stack.

## ⚠ Easily confused

- **stack vs heap** — Stack = automatic, scope-bound, fast, small (8 MB main thread on typical Linux). Heap = freed by you or an owner object, lives until freed, flexible, slower to allocate.
- **grows down vs 'top'** — The stack grows toward LOWER addresses, so the 'top' (most recent push) is the LOWEST address.
- **&ptr vs ptr** — For a heap pointer `p`: `p` is the heap address; `&p` is the address of `p`'s own slot on the stack (when `p` is a local).
- **data vs bss** — Both hold globals and statics for the whole run. **data**: a non-zero initial value stored in the program file. **bss**: zero or no initializer; only its size is stored, and it is zero-filled at start.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 03).