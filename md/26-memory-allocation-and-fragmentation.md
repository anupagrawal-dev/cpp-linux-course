# 26 — Allocation Methods & Fragmentation

*Category: OS Memory & Systems*

> Contiguous allocation, paging and segmentation place memory in different ways; each wastes some of it, inside blocks (internal) or between them (external).

## Must-remember points

- Allocation schemes: **contiguous** (one block per process), and non-contiguous: **paging** (fixed-size pages, lesson 24) and **segmentation** (variable-size logical segments).
- **Internal fragmentation** = space wasted **inside** an allocated block, because the block is bigger than the request: the unused end of a region's last page, `malloc(13)` getting a 24-byte block, a fixed partition bigger than its process.
- **External fragmentation** = free memory split into holes **between** allocated blocks: the total is enough, but no single hole is big enough for the request.
- Paging cures external fragmentation (any frame fits any page) and keeps internal waste small (under one page per region). Contiguous allocation and segmentation suffer it: external fragmentation is a **problem**, not a method.
- **Placement strategies** for variable-size holes: **first-fit** (first hole big enough, fast), **best-fit** (smallest that fits, leaves tiny holes), **worst-fit** (largest, eats the big holes).
- **Compaction** moves blocks together so the holes merge. It needs relocatable addresses (base registers, page tables), so a C/C++ heap, full of raw pointers, can't be compacted.
- A C++ heap fragments too: headers and rounding (internal), holes between live blocks (external). Reduce it with fewer allocations, pools and arenas.

## Allocation schemes at a glance

**Meaning:** the OS must decide where in RAM each process goes, and an allocator where each block goes inside a process. **Contiguous** allocation gives each process one block (a base and a limit). **Paging** splits memory into equal pages and frames, and any page goes in any frame (lesson 24). **Segmentation** splits a program by meaning (code, data, stack) into segments of different sizes, each one contiguous.

| | Contiguous | Paging | Segmentation |
|---|---|---|---|
| Unit | one block per process | fixed-size page | variable-size segment |
| Contiguous in RAM | the whole process | only inside one page | each segment |
| Lookup | base + limit | page table | segment table (base + limit each) |
| External fragmentation | yes | no | yes |
| Internal fragmentation | only with fixed partitions | yes: end of the last page | almost none |
| Used today | systems without an MMU | every modern OS | a leftover on x86-64 |

## Contiguous allocation and placement strategies

**Meaning:** with **fixed partitions**, memory is cut in advance into blocks of set sizes and a process takes a whole one, wasting the rest. With **variable partitions**, each process gets exactly what it asks for; when processes end they leave **holes**, and for each new request the OS must choose a hole (as `malloc` must). **First-fit** takes the first hole big enough, **best-fit** the smallest hole big enough, **worst-fit** the largest.

```cpp
#include <iostream>
#include <vector>

enum Strategy { FirstFit, BestFit, WorstFit };

// Index of the hole to use for a request, or -1 if no hole is big enough.
int choose(const std::vector<int>& holes, int request, Strategy s) {
    int pick = -1;
    for (int i = 0; i < (int)holes.size(); i++) {
        if (holes[i] < request) continue;                          // too small
        if (s == FirstFit) return i;                               // the first one that fits
        if (pick == -1 || (s == BestFit && holes[i] < holes[pick]) // the smallest that fits
                       || (s == WorstFit && holes[i] > holes[pick]))  // the largest
            pick = i;
    }
    return pick;
}

void run(const char* name, Strategy s) {
    std::vector<int> holes = {100, 500, 200, 300, 600};           // free holes in KB, in address order
    std::cout << name << ":";
    for (int request : {212, 417, 112, 426}) {
        int i = choose(holes, request, s);
        if (i == -1) { std::cout << "  " << request << "->WAIT"; continue; }
        std::cout << "  " << request << "->" << holes[i];
        holes[i] -= request;                                       // the rest stays a smaller hole
    }
    std::cout << "  | holes left:";
    for (int h : holes) std::cout << " " << h;
    std::cout << "\n";
}

int main() {
    run("first-fit", FirstFit);
    run("best-fit ", BestFit);
    run("worst-fit", WorstFit);
}
```
```output
first-fit:  212->500  417->600  112->288  426->WAIT  | holes left: 100 176 200 300 183
best-fit :  212->300  417->500  112->200  426->600  | holes left: 100 83 88 88 174
worst-fit:  212->600  417->500  112->388  426->WAIT  | holes left: 100 83 200 300 276
```

**How it works:**
1. `212->500` means the 212 KB request went into a 500 KB hole; the other 288 KB stays a hole.
2. **First-fit**: 112 lands in that 288 KB leftover, then 426 must wait. 959 KB are free, but the biggest hole is 300 KB: **external fragmentation**.
3. **Best-fit** places all four here, but leaves slivers (83, 88, 88 KB) that few requests will fit.
4. **Worst-fit** spends the 600 KB hole on the first request, so 426 finds no hole.

| Strategy | Speed | Typical effect |
|---|---|---|
| First-fit | fast: stops at the first match | small holes collect at the start of memory |
| Best-fit | slow: checks every hole (unless kept sorted) | many tiny leftover holes |
| Worst-fit | slow: checks every hole | big holes vanish, large requests fail |

No strategy avoids external fragmentation; they only change its shape. Real allocators such as glibc's `malloc` keep free lists per size class and look for a good fit.

## Internal and external fragmentation

**Meaning:**
- **Internal fragmentation:** space wasted **inside** an allocated block, because the block is bigger than the request. It has an owner, so nobody else can use it. Examples: `malloc` rounding up; the end of a region's last page (10 KB in 4 KB pages takes 3 frames, wasting 2 KB); a fixed partition bigger than its process; a 2 MiB huge page holding a few KB.
- **External fragmentation:** free space split into holes **between** blocks. The total is enough, but no single hole is (the 426 KB request above).

```cpp
#include <cstdlib>
#include <iostream>
#include <malloc.h>

int main() {
    char* a = static_cast<char*>(std::malloc(13));
    char* b = static_cast<char*>(std::malloc(13));
    std::cout << "two malloc(13) blocks start " << b - a << " bytes apart\n";
    for (size_t want : {1, 13, 24, 25, 100}) {
        void* p = std::malloc(want);
        size_t got = malloc_usable_size(p);              // glibc: the real size of the block
        std::cout << "malloc(" << want << "): usable " << got << ", wasted " << got - want << "\n";
        std::free(p);
    }
    std::free(a);
    std::free(b);
}
```
```text
two malloc(13) blocks start 32 bytes apart
malloc(1): usable 24, wasted 23
malloc(13): usable 24, wasted 11
malloc(24): usable 24, wasted 0
malloc(25): usable 40, wasted 15
malloc(100): usable 104, wasted 4
```

**How it works:**
1. glibc on x86-64 adds an 8-byte header to each block and rounds the total up to a multiple of 16, with 32 bytes as the minimum. So a 13-byte request takes 32 bytes of heap: 13 used, 19 wasted.
2. `malloc_usable_size` (glibc only) shows the usable part: 24 bytes for any request up to 24, then 40.
3. The waste sits inside blocks the program owns: internal fragmentation. Tiny allocations waste the most.

| | Internal | External |
|---|---|---|
| Where | inside an allocated block | between allocated blocks |
| Cause | blocks come in fixed sizes or are rounded up | variable sizes, freed in random order |
| Found in | paging, fixed partitions, `malloc` rounding, huge pages | contiguous allocation, segmentation, heaps |
| Size | less than one unit (page, size class) per block | can grow until large requests fail |
| Remedy | smaller units, better-fitting size classes | paging, compaction, pools |

## Compaction

**Meaning:** **compaction** moves the allocated blocks next to each other, so all the small holes merge into one big hole.

| | Memory layout (KB) | Free | Largest hole |
|---|---|---|---|
| Before | A 100, hole 50, B 200, hole 80, C 120, hole 70 | 200 | 80 |
| After | A 100, B 200, C 120, hole 200 | 200 | 200 |

**How it works:**
1. B and C are copied down; the free space ends up in one piece. Copying takes time, and the moved processes must pause.
2. Every moved block has a new address, so everything that refers to it must change. That works only when addresses are **relocatable**: a base register per process, or a page table, where the kernel changes an entry and the program never notices.
3. Linux does this with physical memory: the `kcompactd` kernel thread migrates pages to build free 2 MiB blocks for huge pages (lesson 25). Garbage-collected languages (Java, C#) move objects and fix every reference.
4. A C/C++ heap **cannot** be compacted: pointers are raw addresses stored anywhere, and the allocator can't find and fix them all.

## Segmentation

**Meaning:** a program is split by **meaning** into segments of different sizes: code, data, heap, stack. A logical address is a pair (segment number, offset). The **segment table** holds a **base** (where the segment starts in RAM) and a **limit** (its length) for each segment. If offset < limit, physical address = base + offset; otherwise the hardware traps. That trap is where the name "segmentation fault" comes from.

| Segment | Base | Limit |
|---|---|---|
| 0 (code) | 1400 | 1000 |
| 1 (data) | 6300 | 400 |
| 2 (stack) | 4300 | 400 |

**How it works:**
1. (2, 53): 53 < 400, so the physical address is 4300 + 53 = **4353**.
2. (0, 999): 999 < 1000, so 1400 + 999 = **2399**.
3. (1, 500): 500 is not below the limit 400, so the access is refused: a **trap**.

**Advantages:** protection and sharing follow the program's structure (code read-only and shareable), and each segment can grow on its own. **Disadvantages:** segments differ in size and must each be contiguous, so external fragmentation comes back.

Modern systems use paging. In 64-bit mode x86 treats most segment bases as 0; only FS and GS keep a base, used for thread-local storage.

## Fragmentation inside a C++ heap

**Meaning:** `malloc` and `new` manage the heap with the same problems: headers and rounding (internal), and holes between live blocks (external). In a long-running server, memory use can grow even though plenty of memory is free inside the heap.

```cpp
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <vector>

uintptr_t addr(void* p) { return reinterpret_cast<uintptr_t>(p); }

int main() {
    std::vector<char*> blocks(1000);
    for (char*& b : blocks) b = static_cast<char*>(std::malloc(1000));   // 1000 blocks side by side
    uintptr_t first = addr(blocks[0]), last = addr(blocks[999]);
    for (int i = 0; i < 1000; i += 2) std::free(blocks[i]);             // free every other one

    char* big = static_cast<char*>(std::malloc(100000));                // 100 KB
    bool inHoles = addr(big) >= first && addr(big) <= last;
    std::cout << "free: 500 holes of about 1000 bytes = about 500 KB\n";
    std::cout << "100 KB block placed in the holes: " << std::boolalpha << inHoles << "\n";

    std::free(big);
    for (int i = 1; i < 1000; i += 2) std::free(blocks[i]);
}
```
```output
free: 500 holes of about 1000 bytes = about 500 KB
100 KB block placed in the holes: false
```

**How it works:**
1. 1000 blocks are allocated next to each other; freeing every other one leaves 500 holes of about 1 KB.
2. Each hole sits between two live blocks, so the holes can't merge. A 100 KB request fits none of them.
3. The 100 KB comes from elsewhere; the 500 KB of holes stay useless for big requests.

**How to reduce heap fragmentation:**
- **Allocate less:** `reserve()` vectors; store objects by value in a `std::vector` instead of `new`-ing each one.
- **Pools:** same-size objects from one big block; every freed slot fits the next object.
- **Arenas:** allocate a task's objects from one buffer and release them all at once (`std::pmr::monotonic_buffer_resource`, C++17).
- **Group by lifetime:** don't interleave long-lived and short-lived allocations.
- **Another allocator** (jemalloc, tcmalloc) may fragment less: measure.

## Common mistakes

- **Defining internal fragmentation as "the last page" only.** That is the paging case. Any rounding-up waste inside a block counts: `malloc` size classes, fixed partitions, huge pages.
- **Saying paging has no fragmentation.** It has no external fragmentation, but each region wastes part of its last page.
- **Calling external fragmentation a method.** It is a problem that contiguous allocation and segmentation suffer from; paging is the method that avoids it.
- **Assuming best-fit is best.** It searches every hole and leaves slivers too small to use.
- **Expecting `free()` to give memory back to the OS.** Freed blocks usually stay in the heap for reuse.
- **Expecting compaction to fix a C/C++ heap.** Raw pointers can't be updated, so blocks can never move.

## ⚠ Easily confused

- **internal vs external fragmentation** — Internal = waste INSIDE an allocated block that is bigger than needed (last page, malloc rounding). External = free space in holes BETWEEN blocks, too small to use.
- **paging vs segmentation** — Paging = fixed-size pages: no external fragmentation, a little internal. Segmentation = variable-size logical segments: good protection and sharing, but external fragmentation returns.
- **problem vs method** — External fragmentation is a side effect (a problem). Contiguous allocation, paging and segmentation are methods. You don't 'do external fragmentation'.
- **first-fit vs best-fit** — First-fit takes the first hole big enough: fast. Best-fit takes the smallest hole big enough: slower, and leaves tiny leftovers.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 26).