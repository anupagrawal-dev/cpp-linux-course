# 18 — Arrays & Memory Contiguity

*Category: C++ Language & Safety*

> A raw array is a fixed number of elements side by side in memory: indexing is one multiply-and-add, iteration is cache-friendly, and the array forgets its size when passed to a function.

## Must-remember points

- `int a[5] = {10, 20};` makes 5 ints; **missing initializers become 0**. `int b[] = {1, 2, 3};` deduces the size. Indexes run **0 to N-1**. `std::size(a)` gives the element count.
- A local array with **no initializer** holds garbage; reading it is undefined behaviour. `int c[5] = {};` zeroes it.
- An array is **contiguous**: `a[i]` is `*(a + i)`, the address `base + i * sizeof(element)`. One multiply-and-add, so indexing is **O(1)**.
- **Decay**: passed to a function, an array becomes a **pointer to its first element** and loses its size (`sizeof` gives 8 on x86-64). Pass the size too, or use a template reference, `std::array` or `std::vector`.
- Raw arrays **can't be assigned** (`a = b` doesn't compile), and `a == b` compares **addresses**, not elements.
- A 2D array `int m[R][C]` is **row-major**: row 0, then row 1, in one block. Loop **row by row** (inner loop over the last index).
- Contiguous data is **cache-friendly**: the CPU loads memory in 64-byte cache lines and prefetches the next ones, so walking an array in order is much faster than jumping around.
- Contiguity is needed in **virtual** address space only; the pages can sit in scattered physical frames. Big arrays belong on the **heap** (`std::vector`): the stack is often 8 MB.

## Raw array basics

**Meaning:** a raw (C-style) array is a fixed number of elements of one type, stored one after another. The size is part of its type (`int[5]`) and must be a compile-time constant (lesson 17). Elements are numbered from 0.

```cpp
#include <iostream>
#include <iterator>   // std::size

int main() {
    int a[5] = {10, 20};          // a[2], a[3], a[4] become 0
    int b[] = {1, 2, 3};          // size deduced from the list: 3
    int c[4] = {};                // all zeros
    a[4] = 50;                    // valid indexes: 0..4

    std::cout << std::size(a) << " " << std::size(b) << " " << sizeof(a) / sizeof(a[0]) << "\n";
    for (int x : a) std::cout << x << " ";      // range-for knows the size of a real array
    std::cout << "\n" << c[3] << "\n";
    // int d[5]; std::cout << d[0];             // uninitialized local: never read it (item 3)
}
```
```output
5 3 5
10 20 0 0 50
0
```

**How it works:**
1. With an initializer list shorter than the array, the remaining elements are set to 0. `{}` zeroes everything.
2. `std::size(a)` (C++17) and the older `sizeof(a) / sizeof(a[0])` both give 5: total bytes divided by bytes per element.
3. A local array without an initializer is **not** zeroed: its elements hold whatever was in that memory, and reading them is undefined behaviour. (Global and `static` arrays are zeroed.)
4. Nothing stops `a[5]` or `a[-1]` from compiling. Indexing is not checked; going out of range is undefined behaviour (lesson 20).

## Contiguity and indexing

**Meaning:** the elements sit directly next to each other, with no gaps. So the address of element `i` is **`base + i * sizeof(element)`**, and `a[i]` is defined as `*(a + i)`. Pointer arithmetic counts in elements, not bytes: `p + 1` moves `sizeof(int)` bytes forward.

```cpp
#include <iostream>

int main() {
    int arr[4] = {10, 20, 30, 40};
    int* p = arr;                                    // the array name converts to &arr[0]
    for (int i = 0; i < 4; i++) {
        long offset = reinterpret_cast<char*>(&arr[i]) - reinterpret_cast<char*>(arr);
        std::cout << arr[i] << " == " << *(p + i) << ", byte offset " << offset << "\n";
    }
}
```
```output
10 == 10, byte offset 0
20 == 20, byte offset 4
30 == 30, byte offset 8
40 == 40, byte offset 12
```

**How it works:**
1. `int* p = arr;` stores the address of the first element. `*(p + i)` and `arr[i]` read the same element.
2. Each element is 4 bytes further on (an `int` is 4 bytes on x86-64 with g++). There are no gaps.
3. That is why indexing is **O(1)**: one multiply and one add, whatever the index. It is also why an array must be contiguous: the formula only works if element `i` is exactly `i` elements after the start.

## Array decay: passing arrays to functions

**Meaning:** in most expressions an array converts ("decays") to a pointer to its first element. A function parameter written `int a[]` or even `int a[5]` is really `int* a`. Inside the function the size is gone: `sizeof(a)` is the size of a pointer.

```cpp
#include <iostream>
#include <iterator>

void printBad(int a[]) {                              // really: void printBad(int* a)
    std::cout << "inside: " << sizeof(a) << " bytes\n";   // size of a pointer, not of the array
}

void printWithSize(const int* a, std::size_t n) {     // C style: pass the size separately
    for (std::size_t i = 0; i < n; i++) std::cout << a[i] << " ";
    std::cout << "\n";
}

template <std::size_t N>
void printRef(const int (&a)[N]) {                    // reference to an array: the size is kept
    std::cout << "N = " << N << ", last = " << a[N - 1] << "\n";
}

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    std::cout << "outside: " << sizeof(arr) << " bytes\n";
    printBad(arr);
    printWithSize(arr, std::size(arr));
    printRef(arr);
}
```
```output
outside: 20 bytes
inside: 8 bytes
1 2 3 4 5
N = 5, last = 5
```

**How it works:**
1. In `main`, `arr` is a real array: 5 ints, 20 bytes.
2. `printBad(arr)` passes `&arr[0]`. Inside, `sizeof(a)` is 8, the size of a pointer on x86-64. g++ even warns: `'sizeof' on array function parameter 'a' will return size of 'int*'`.
3. `printWithSize` is the usual C fix: pointer plus count.
4. `printRef` takes a **reference to an array of N ints**, so no decay happens and the compiler deduces `N = 5`.

**Better fixes in C++:** pass a `std::array<int, 5>` or `std::vector<int>` by `const&` (they know their size), or a `std::span<const int>` (C++20), which is a pointer plus a size in one object. Lesson 21 compares the containers.

## 2D arrays are row-major

**Meaning:** `int m[2][3]` is an array of 2 rows, each an array of 3 ints. C++ stores it **row-major**: all of row 0, then all of row 1, in one contiguous block. `m[r][c]` is at element offset `r * 3 + c` from the start.

```cpp
#include <iostream>

int main() {
    int m[2][3] = {{1, 2, 3}, {4, 5, 6}};
    const int* first = &m[0][0];
    for (int r = 0; r < 2; r++)
        for (int c = 0; c < 3; c++)
            std::cout << "m[" << r << "][" << c << "] = " << m[r][c] << " at offset " << (&m[r][c] - first) << "\n";
    std::cout << "sizeof(m) = " << sizeof(m) << ", sizeof(m[0]) = " << sizeof(m[0]) << "\n";
}
```
```output
m[0][0] = 1 at offset 0
m[0][1] = 2 at offset 1
m[0][2] = 3 at offset 2
m[1][0] = 4 at offset 3
m[1][1] = 5 at offset 4
m[1][2] = 6 at offset 5
sizeof(m) = 24, sizeof(m[0]) = 12
```

**How it works:**
1. The offsets run 0 to 5 without a gap: `m[1][0]` comes straight after `m[0][2]`.
2. `m[0]` is a whole row (3 ints, 12 bytes); `m` is two rows (24 bytes).
3. Walking with the **last** index in the inner loop visits memory in order. The next section shows why that matters.

## Why contiguity is fast: the cache

**Meaning:** the CPU doesn't fetch single bytes from RAM. It fetches a **cache line** (64 bytes on this machine: `getconf LEVEL1_DCACHE_LINESIZE` prints 64) and keeps it in a small, fast cache. Reading one `int` brings the whole 64-byte line around it (16 ints) into the cache, and the hardware **prefetcher** notices a forward walk and loads the next lines early. Data visited in memory order is therefore much faster than data visited by jumping around.

```cpp
#include <chrono>
#include <iostream>

const int N = 4096;
static int grid[N][N];                      // 64 MB, one block, row-major

long long sumRows() {                       // inner loop walks along a row: next int in memory
    long long s = 0;
    for (int r = 0; r < N; r++)
        for (int c = 0; c < N; c++) s += grid[r][c];
    return s;
}

long long sumColumns() {                    // inner loop walks down a column: jumps 16 KB each step
    long long s = 0;
    for (int c = 0; c < N; c++)
        for (int r = 0; r < N; r++) s += grid[r][c];
    return s;
}

template <typename F>
void timeIt(const char* name, F f) {
    auto t0 = std::chrono::steady_clock::now();
    long long s = f();
    auto t1 = std::chrono::steady_clock::now();
    std::cout << name << std::chrono::duration_cast<std::chrono::milliseconds>(t1 - t0).count()
              << " ms (sum " << s << ")\n";
}

int main() {
    for (auto& row : grid) for (int& x : row) x = 1;
    timeIt("row by row:       ", sumRows);
    timeIt("column by column: ", sumColumns);
}
```
```text
row by row:       10 ms (sum 16777216)
column by column: 169 ms (sum 16777216)
```

**How it works:**
1. Both functions add the same 16,777,216 ints. Only the order differs. (Timings are from one run with `-O2` on this machine; yours will differ, but the gap stays large.)
2. Row by row, each 64-byte line serves 16 consecutive additions, and the prefetcher stays ahead.
3. Column by column, each step jumps `4096 * 4` bytes, to a different cache line. Every line loaded is used for one int and is often evicted before the loop comes back for its neighbours.

**The lesson:** prefer contiguous containers (`std::array`, `std::vector`) over node-based ones (`std::list`) when you iterate, and loop over the last index innermost.

## Where arrays live; virtual vs physical contiguity

**Meaning:** where an array lives depends on how it is declared (lesson 3):

| Declaration | Where | Limit |
|---|---|---|
| `int a[N];` inside a function | the stack | the stack size, often 8 MB (`ulimit -s` prints 8192, in KB) |
| `int a[N];` global, or `static` | static storage, zeroed | fixed when the program loads |
| `std::vector<int> v(N);` / `new int[N]` | the heap | available memory |

An `int` is 4 bytes, so `int a[100000]` is about 400 KB. That fits, but it uses a big slice of the stack in one frame, and a few million ints overflow it with a crash. Put big arrays in a `std::vector`.

**Contiguous in virtual memory only:** the program sees **virtual** addresses, and those are what `base + i * size` uses. The OS maps virtual pages (4 KB here: `getconf PAGESIZE`) onto physical frames through the page table (lesson 24). A 400 KB array covers about 100 pages. Inside a page the bytes are physically adjacent; the next page may be in any physical frame. Indexing never notices, because the virtual addresses stay continuous. With demand paging, a page gets its physical frame only when it is first touched (lesson 27).

## Common mistakes

- **Indexing out of range.** `a[5]` on a 5-element array compiles and may even "work". It is undefined behaviour (lesson 20).
- **`sizeof` on a parameter.** Inside `void f(int a[])`, `sizeof(a)` is the pointer size. Pass the size, or use `std::array` / `std::vector` / `std::span`.
- **Assigning or comparing arrays.** `a = b` fails with `invalid array assignment`; `a == b` compares addresses (g++ warns `comparison between two arrays`). Use `std::array` (lesson 21), or `std::copy` / `std::equal`.
- **Returning a local array.** `int* make() { int a[3] = {1, 2, 3}; return a; }` returns a pointer to memory that dies with the function.
- **Reading an uninitialized local array.** Write `= {}` if you need zeros.
- **Walking a 2D array column by column.** Same result, many times slower. Put the last index in the inner loop.
- **Huge local arrays.** They overflow the stack. Use `std::vector`.

## ⚠ Easily confused

- **array vs pointer** — An array is a block of N elements; `sizeof` gives the whole block. A pointer holds one address; `sizeof` gives 8 on x86-64. An array decays to a pointer to its first element when passed to a function.
- **`a[i]` vs `*(a + i)`** — The same thing: `a[i]` is defined as `*(a + i)`, the element `i * sizeof(element)` bytes after the start.
- **row-major vs column-major order** — C++ stores `m[r][c]` row by row, so `m[0][2]` is followed by `m[1][0]`. Loop with `c` (the last index) innermost to walk memory in order.
- **virtual-contiguous vs physical-scattered** — The array is one continuous run of VIRTUAL addresses (what indexing uses). In physical RAM its pages can be in scattered frames, mapped by the page table.
- **stack array vs heap array** — `int a[N]` as a local = on the stack (small and fast, risky for big N). `std::vector<int> v(N)` / `new int[N]` = on the heap (large).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 18).