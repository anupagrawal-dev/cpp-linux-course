# 25 — MMU, TLB & Multi-level Paging

*Category: OS Memory & Systems*

> The MMU translates every virtual address in hardware, the TLB caches recent translations, and a multi-level page table keeps the tables small.

## Must-remember points

- The **MMU** is hardware in the CPU that translates virtual to physical on **every** access and checks the permission bits. A missing page or a forbidden access raises a **page fault** for the kernel.
- A virtual address = **page number + offset**. With 4 KiB pages the low **12 bits** are the offset (kept as-is); the page number goes through the page table to a frame.
- A flat table would be huge (x86-64: 2^36 entries x 8 B = **512 GiB** per process), so **multi-level paging** uses a tree of small tables (512 entries, 4 KiB each). Only the branches in use exist.
- x86-64 uses **4 levels**: 9+9+9+9 index bits + 12-bit offset = 48 bits (newer CPUs offer 5 levels, 57 bits).
- The **TLB** caches recent page-to-frame translations. Hit: no walk. Miss: a **page walk** of up to 4 memory reads before the real access. A TLB miss is **not** a page fault.
- **Process switch** = new page table, so old TLB entries are wrong: they are flushed, or tagged with an address-space ID (**PCID** on x86, **ASID** on ARM). Threads share one page table: no flush.
- **Huge pages** (2 MiB or 1 GiB on x86-64): one TLB entry covers 512x more memory, so fewer misses and shorter walks. Linux offers **transparent huge pages** (THP).
- **Locality**: walking memory in order reuses each page, TLB entry and cache line; jumping around (column-wise over a big matrix) misses again and again.

## The MMU and the address split

**Meaning:** the **MMU** (memory management unit) is part of the CPU. On every load, store and instruction fetch it turns the virtual address into a physical one, using the current process's page table. The kernel only builds the tables and handles faults; the translation is hardware. The MMU splits the address into the **offset** (low 12 bits with 4 KiB pages, since 2^12 = 4096), copied unchanged, and the **page number** (the rest), which the page table turns into a frame number. On x86-64 the page number is four 9-bit indexes, one per level of the table tree.

```cpp
#include <cstdint>
#include <iostream>

void split(uint64_t va) {                          // 4 KiB pages, 4-level x86-64 paging
    std::cout << std::hex << "0x" << va << std::dec
              << ": page " << (va >> 12) << ", offset " << (va & 0xFFF)
              << " | indexes L4 " << ((va >> 39) & 0x1FF) << ", L3 " << ((va >> 30) & 0x1FF)
              << ", L2 " << ((va >> 21) & 0x1FF) << ", L1 " << ((va >> 12) & 0x1FF) << "\n";
}

int main() {
    split(12290);                                  // 3 * 4096 + 2
    split(0x7f3a12345678);                         // a typical shared-library address
}
```
```output
0x3002: page 3, offset 2 | indexes L4 0, L3 0, L2 0, L1 3
0x7f3a12345678: page 34152194885, offset 1656 | indexes L4 254, L3 232, L2 145, L1 325
```

**How it works:**
1. `va & 0xFFF` keeps the low 12 bits (the offset); `va >> 12` drops them (the page number). 12290 = 3 x 4096 + 2: page 3, offset 2.
2. `(va >> 39) & 0x1FF` takes 9 bits (0x1FF = 511): an index into a 512-entry table.
3. The walk: the L4 entry points to an L3 table, that entry to an L2 table, then an L1 table, whose entry holds the frame number.
4. Physical address = frame number x 4096 + offset. If an entry on the way isn't present, or the bits forbid the access, the MMU raises a page fault (lesson 27).

## Multi-level page tables

**Meaning:** a 48-bit address space has 2^36 pages of 4 KiB. A flat table with an 8-byte entry for each would take 2^36 x 8 bytes = **512 GiB per process**, though a process uses a tiny part of its address space. A **tree** of small tables solves this: each table is one 4 KiB page of 512 entries, created only for address ranges that are used. `VmPTE` in `/proc/self/status` shows how much memory a process's page tables take.

```cpp
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <string>

long pageTableKB() {                                       // memory used by this process's page tables
    std::ifstream status("/proc/self/status");
    std::string key;
    long kb = 0;
    while (status >> key)
        if (key == "VmPTE:") { status >> kb; return kb; }
    return -1;
}

int main() {
    const size_t size = 1UL << 30;                         // 1 GiB = 262144 pages
    std::cout << "at start:            " << pageTableKB() << " kB\n";
    char* p = static_cast<char*>(std::malloc(size));
    std::cout << "after malloc(1 GiB): " << pageTableKB() << " kB\n";
    std::memset(p, 1, size);                               // touch every page
    std::cout << "after touching it:   " << pageTableKB() << " kB\n";
    std::free(p);
}
```
```text
at start:            52 kB
after malloc(1 GiB): 60 kB
after touching it:   2108 kB
```

**How it works:**
1. At start the program (code, libraries, stack) needs about 52 kB of tables, not 512 GiB: only a few branches exist.
2. `malloc(1 GiB)` only reserves addresses, so the tables barely grow.
3. Touching every page fills 262,144 entries x 8 bytes = 2 MiB of last-level tables: from 60 kB to 2108 kB.

## The TLB: caching translations

**Meaning:** walking four tables on every access would multiply the cost of memory. The **TLB** (translation lookaside buffer) is a small, very fast cache in the CPU that keeps recent page-to-frame translations. On each access:
1. The MMU looks up the page number in the TLB. **Hit:** the frame number is there at once.
2. **Miss:** the hardware walks the four tables (up to 4 memory reads; they are often in the CPU caches) and stores the result in the TLB.
3. Only if the walk finds no valid entry, or the bits forbid the access, is there a **page fault**, handled by the kernel (lesson 27).

Programs mostly reuse a small set of pages (locality), so most accesses hit. The TLB has a limited number of entries, so a program that jumps across many pages misses often.

**Context switches.** Each process has its own page table, so a translation cached for process A is wrong for process B.

| Switch | Page table changes? | What happens to the TLB |
|---|---|---|
| Between two threads of one process | No: threads share it | Nothing: entries stay valid |
| Between two processes, without tags | Yes | Flushed: B starts with an empty TLB and misses at first |
| Between two processes, with **PCID** (x86) / **ASID** (ARM) | Yes | Entries carry an address-space ID, so A's entries can stay for when A runs again |

## Locality: row-wise vs column-wise traversal

**Meaning:** the order of memory accesses can matter more than their number. A 2D array is stored row by row (row-major, lesson 18). Reading it **row by row** uses each page, TLB entry and cache line fully before moving on. Reading it **column by column** jumps a whole row ahead on every access.

```cpp
#include <chrono>
#include <iostream>
#include <vector>

const int N = 4096;                                   // 4096 x 4096 ints = 64 MiB; one row = 16 KiB

void sum(const std::vector<int>& m, bool byRow) {
    auto t0 = std::chrono::steady_clock::now();
    long long s = 0;
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            s += byRow ? m[i * N + j]                 // the next int in memory
                       : m[j * N + i];                // 16 KiB (4 pages) further on
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();
    std::cout << (byRow ? "row by row:       " : "column by column: ") << s << " in " << ms << " ms\n";
}

int main() {
    std::vector<int> m(N * N, 1);                     // row-major: row r starts at m[r * N]
    sum(m, true);
    sum(m, false);
}
```
```text
row by row:       16777216 in 27 ms
column by column: 16777216 in 169 ms
```

**How it works:**
1. Both passes add the same 16,777,216 ones; only the order differs (one run, built with `g++ -O2`).
2. Row by row, 1024 consecutive ints share one 4 KiB page: one TLB lookup serves 1024 reads, and each 64-byte cache line serves 16.
3. Column by column, consecutive reads are 16 KiB apart, so every read lands on a new page and a new cache line. One column touches 4096 pages, more than the TLB holds, so the TLB and the caches miss over and over. The next section isolates the TLB part.
4. Fix: let the innermost loop walk the last index.

## Huge pages

**Meaning:** besides 4 KiB pages, x86-64 supports **2 MiB** and **1 GiB** pages. A 2 MiB page is mapped directly by an L2 entry, so the walk is one level shorter and one TLB entry covers 512 times more memory. Linux offers **transparent huge pages** (THP), used automatically or on request with `madvise`, and reserved pools (`hugetlbfs`) used by databases and DPDK.

```bash
$ cat /sys/kernel/mm/transparent_hugepage/enabled
always [madvise] never
```

```cpp
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <sys/mman.h>

long hugeMiB() {                                      // memory of this process in huge pages
    std::ifstream f("/proc/self/smaps_rollup");
    std::string key;
    long kb = 0;
    while (f >> key)
        if (key == "AnonHugePages:") { f >> kb; return kb / 1024; }
    return -1;
}

void run(const char* name, int advice) {
    const size_t size = 1UL << 30;                    // 1 GiB
    char* p = static_cast<char*>(std::aligned_alloc(2UL << 20, size));   // start on a 2 MiB boundary
    madvise(p, size, advice);                         // ask for huge pages, or forbid them
    std::memset(p, 1, size);
    uint64_t x = 1, sum = 0;
    auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < 20000000; i++) {
        x = x * 6364136223846793005ULL + 1442695040888963407ULL;   // cheap pseudo-random number
        sum += p[(x >> 20) % size];                   // read one byte somewhere in the 1 GiB
    }
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - t0).count();
    std::cout << name << ": " << hugeMiB() << " MiB in huge pages, " << sum << " reads in " << ms << " ms\n";
    std::free(p);
}

int main() {
    run("4 KiB pages", MADV_NOHUGEPAGE);
    run("2 MiB pages", MADV_HUGEPAGE);
}
```
```text
4 KiB pages: 0 MiB in huge pages, 20000000 reads in 597 ms
2 MiB pages: 1024 MiB in huge pages, 20000000 reads in 315 ms
```

**How it works:**
1. `[madvise]` means THP is used only where a program asks with `madvise(MADV_HUGEPAGE)`. A huge page must start on a 2 MiB boundary, hence `aligned_alloc`.
2. `AnonHugePages` in `/proc/self/smaps_rollup` confirms that all 1024 MiB got huge pages in the second run.
3. Both runs read the same random bytes, so they miss the CPU caches equally. The difference is the TLB: 1 GiB is 262,144 small pages but only 512 huge ones, so with small pages almost every read needs a walk (one run, `g++ -O2`).

**Advantages:** fewer TLB misses, shorter walks, smaller page tables.

**Disadvantages:**
- More internal fragmentation: a whole 2 MiB page is used even if a few KB are needed.
- The kernel needs 2 MiB of contiguous physical memory, which may require compaction (lesson 26). With THP `always` this can cause latency spikes, so some databases recommend `madvise` or `never`.

**When to use it:** large, long-lived, randomly accessed memory: databases, JVM heaps, big hash tables, virtual machines.

## Common mistakes

- **Mixing up MMU and TLB.** The MMU is the translator; the TLB is its cache of recent translations; the page table is the data in RAM it reads.
- **Calling a TLB miss a page fault.** On x86 a TLB miss is solved by the hardware walk, with no kernel involvement. A page fault happens only when the walk finds no valid entry or the access is forbidden.
- **Thinking the kernel translates addresses in software.** It builds the tables and handles faults; translation is hardware, on every access.
- **Ignoring access order.** Looping column-wise over a row-major array (or chasing pointers across a big linked structure) touches a new page on almost every access.
- **Turning THP to `always` without measuring.** It can raise memory use and cause latency spikes.
- **Benchmarking at `-O0` or from one run.** Build with `-O2` and repeat the runs.

## ⚠ Easily confused

- **MMU vs TLB** — MMU = the hardware translator (walks the page table, checks the bits). TLB = a small cache inside the MMU holding recent page-to-frame translations.
- **page number vs offset** — Page number = WHICH page (looked up to get the frame). Offset = WHERE inside the page (copied unchanged). With 4 KiB pages the offset is the low 12 bits.
- **flat vs multi-level page table** — Flat = one giant table (512 GiB per process on x86-64, impossible). Multi-level = a tree of 4 KiB tables; only the branches in use exist.
- **TLB miss vs page fault** — TLB miss = the translation isn't cached; the hardware walks the tables (a few memory reads). Page fault = the walk found no valid entry or the access is forbidden; the kernel must step in (lesson 27).
- **4 KiB page vs huge page** — 4 KiB: fine-grained, little waste, many TLB entries needed. 2 MiB / 1 GiB: one TLB entry covers far more memory, but more waste and harder to allocate.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 25).