# 27 — Demand Paging, Page Faults & Swapping

*Category: OS Memory & Systems*

> Pages get a frame only when first touched; when RAM runs short, the kernel evicts cold pages to disk, choosing them with a replacement policy.

## Must-remember points

- **Demand paging**: memory is reserved virtually and gets a frame only on **first use**. `malloc(100 MiB)` costs almost nothing until you touch the pages.
- Touching a page that isn't present raises a **page fault**: the kernel finds a frame, fills it (zeros, file data or swap), updates the page table and **restarts the instruction**, invisibly.
- **Minor** fault = no disk I/O (fresh zero page, page already in the page cache, copy-on-write). **Major** fault = the page must be read from disk: far slower.
- When RAM is full, the kernel evicts a page. **Replacement policies**: **FIFO** (oldest), **LRU** (least recently used), **Clock** (cheap LRU approximation with a referenced bit), **Optimal** (farthest future use; the unreachable benchmark).
- **Belady's anomaly**: with FIFO, more frames can mean **more** faults. LRU and Optimal never do this.
- **Copy-on-write**: after `fork`, parent and child share every frame read-only; a page is copied only when one of them writes to it.
- **Swapping**: cold anonymous pages go to a swap area on disk so their frames can be reused. Working set bigger than RAM = constant faults = **thrashing**.
- Linux **overcommits**: `malloc` can succeed for more than is free, because frames come later. If RAM and swap really run out, the **OOM killer** kills a process.

## Demand paging and page faults

**Meaning:** the kernel doesn't load a whole program or fill a whole allocation up front; it only records which virtual pages are valid. The first access to such a page finds the present bit 0, and the CPU raises a **page fault**:
1. The CPU traps into the kernel with the faulting address.
2. The kernel checks the address is in a valid region; if not, the program gets `SIGSEGV`.
3. It takes a free frame (evicting a page if RAM is full) and fills it: zeros for new memory, or data from the file or from swap.
4. It sets the page table entry (present = 1) and **restarts the instruction**.

`getrusage` counts a process's page faults:

```cpp
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <sys/resource.h>

long minorFaults() {
    rusage ru{};
    getrusage(RUSAGE_SELF, &ru);
    return ru.ru_minflt;                                  // faults solved without disk I/O
}

int main() {
    const size_t size = 100UL << 20;                      // 100 MiB = 25600 pages of 4 KiB
    long f0 = minorFaults();
    char* p = static_cast<char*>(std::malloc(size));      // reserves virtual pages only
    long f1 = minorFaults();
    std::memset(p, 1, size / 2);                          // first touch of the first half
    long f2 = minorFaults();
    std::memset(p, 2, size / 2);                          // the same half again
    long f3 = minorFaults();
    std::cout << "malloc 100 MiB:    " << f1 - f0 << " faults\n";
    std::cout << "touch 50 MiB:      " << f2 - f1 << " faults\n";
    std::cout << "touch same 50 MiB: " << f3 - f2 << " faults\n";
    std::free(p);
}
```
```text
malloc 100 MiB:    1 faults
touch 50 MiB:      12801 faults
touch same 50 MiB: 0 faults
```

**How it works:**
1. `malloc` of 100 MiB only reserves addresses; the one fault is malloc writing its small header.
2. Writing 50 MiB touches 12,800 pages for the first time: one fault each.
3. The second pass has 0 faults. The cost is paid **once per page**; programs reuse a small set of pages (**locality**), so faults stay rare.
4. These faults are **minor**: the kernel hands out zero-filled frames, no disk involved.

## Minor and major page faults

**Meaning:** a fault is cheap when the data is already in RAM and only the mapping is missing, and expensive when the kernel must wait for the disk.

| | Minor fault | Major fault |
|---|---|---|
| Disk I/O | none | yes: read from the file or from swap |
| Typical causes | first touch of new memory (zero page), file page already in the page cache, copy-on-write copy | first read of a file page not cached, page that was swapped out |
| Cost | microseconds or less | waits for the disk: microseconds on an SSD, milliseconds on a hard disk |
| Counter | `ru_minflt` | `ru_majflt` |

Both are normal. A **segmentation fault** is different: the address is invalid or the access forbidden, so the kernel stops the program.

## Page replacement: FIFO, LRU, Clock, Optimal

**Meaning:** when a fault needs a frame and none is free, the kernel must evict a page (writing it out first if it is dirty). The ideal victim is the page needed again latest. **FIFO** evicts the oldest page. **LRU** (least recently used) evicts the page unused for longest. **Clock** (second chance) keeps pages in a circle with a referenced bit (the accessed bit): the hand clears set bits as it passes and evicts the first page whose bit is already 0. **Optimal** evicts the page whose next use is farthest away; it needs the future, so it is only a benchmark.

A trace with 3 frames and the references 1, 2, 3, 1, 4, 1, 5, 1 (frames listed oldest or least recent first):

| Ref | FIFO frames | FIFO | LRU frames | LRU |
|---|---|---|---|---|
| 1 | 1 | fault | 1 | fault |
| 2 | 1 2 | fault | 1 2 | fault |
| 3 | 1 2 3 | fault | 1 2 3 | fault |
| 1 | 1 2 3 | hit | 2 3 1 | hit |
| 4 | 2 3 4 | fault, evict 1 | 3 1 4 | fault, evict 2 |
| 1 | 3 4 1 | fault, evict 2 | 3 4 1 | hit |
| 5 | 4 1 5 | fault, evict 3 | 4 1 5 | fault, evict 3 |
| 1 | 4 1 5 | hit | 4 5 1 | hit |

FIFO: 6 faults; LRU: 5. FIFO threw out page 1, the busiest page, only because it was the oldest.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

// FIFO and LRU differ in one line: LRU moves a page to the back on every hit.
int faults(const std::vector<int>& refs, int frames, bool lru) {
    std::vector<int> mem;                                  // front = next page to evict
    int count = 0;
    for (int p : refs) {
        auto it = std::find(mem.begin(), mem.end(), p);
        if (it != mem.end()) {                             // hit
            if (lru) { mem.erase(it); mem.push_back(p); }  // now the most recently used
            continue;
        }
        count++;                                           // fault
        if ((int)mem.size() == frames) mem.erase(mem.begin());
        mem.push_back(p);
    }
    return count;
}

int main() {
    std::vector<int> a = {7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1};
    std::vector<int> b = {1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};
    std::cout << "string A, 3 frames: FIFO " << faults(a, 3, false) << ", LRU " << faults(a, 3, true) << "\n";
    std::cout << "string B, 3 frames: FIFO " << faults(b, 3, false) << ", LRU " << faults(b, 3, true) << "\n";
    std::cout << "string B, 4 frames: FIFO " << faults(b, 4, false) << ", LRU " << faults(b, 4, true) << "\n";
}
```
```output
string A, 3 frames: FIFO 15, LRU 12
string B, 3 frames: FIFO 9, LRU 10
string B, 4 frames: FIFO 10, LRU 8
```

**How it works:**
1. String A is the classic textbook string. On it Optimal gives 9 faults, LRU 12, Clock 14 (new pages start with the bit set) and FIFO 15: Clock lands between LRU and FIFO.
2. String B shows **Belady's anomaly**: FIFO with **4** frames faults **more** (10) than with 3 (9). LRU and Optimal can't do this: the pages they keep with n frames are always kept with n + 1 frames too.

| Policy | Strength | Weakness |
|---|---|---|
| FIFO | trivial: one queue | evicts busy pages; Belady's anomaly |
| LRU | close to Optimal in practice | exact tracking costs work on every access |
| Clock | cheap: the hardware sets the accessed bit | rougher than LRU |
| Optimal | fewest faults possible | needs the future: benchmark only |

Linux uses an LRU approximation built on the accessed bit (active and inactive lists, or the newer multi-generational LRU).

## Copy-on-write after fork

**Meaning:** `fork` would be slow if it copied all of the parent's memory. Instead the child gets a copy of the **page table**: both processes point at the same frames, now marked read-only. Reads are free. The first write to a page causes a fault; the kernel copies that one page into a new frame for the writer and makes it writable. This is **copy-on-write** (COW).

```cpp
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <sys/resource.h>
#include <sys/wait.h>
#include <unistd.h>

long minorFaults() {
    rusage ru{};
    getrusage(RUSAGE_SELF, &ru);
    return ru.ru_minflt;
}

int main() {
    const size_t size = 40UL << 20;                       // 40 MiB = 10240 pages
    char* p = static_cast<char*>(std::malloc(size));
    std::memset(p, 1, size);                              // the parent owns 40 MiB of real frames

    pid_t pid = fork();                                   // the child shares every frame, read-only
    if (pid == 0) {
        long f0 = minorFaults();
        long sum = 0;
        for (size_t i = 0; i < size; i += 4096) sum += p[i];   // read every page
        long f1 = minorFaults();
        for (size_t i = 0; i < size; i += 4096) p[i] = 2;      // write every page
        long f2 = minorFaults();
        std::cout << "child read 10240 pages:  " << f1 - f0 << " faults (sum " << sum << ")\n";
        std::cout << "child wrote 10240 pages: " << f2 - f1 << " faults\n";
        return 0;
    }
    waitpid(pid, nullptr, 0);
    std::cout << "parent still sees: " << int(p[0]) << "\n";
    std::free(p);
}
```
```text
child read 10240 pages:  0 faults (sum 10240)
child wrote 10240 pages: 10240 faults
parent still sees: 1
```

**How it works:**
1. After `fork`, reads cost nothing: the child uses the parent's frames.
2. Each first write to a page faults once and the kernel copies just that page: 10,240 writes, 10,240 copies. The parent's frames are untouched, so it still sees 1.
3. This makes `fork` + `exec` cheap: the child replaces its memory before copying much. A child that writes everything ends up doubling the RAM in use.

## Swapping and thrashing

**Meaning:** **swapping** moves cold **anonymous** pages (heap, stack: memory with no file behind it) to a swap partition or swap file, freeing their frames. Clean file pages, such as program code, are simply dropped and read again from the file later. This lets the total memory in use exceed RAM. `vm.swappiness` (0-200, default 60) tells the kernel how willing it is to swap anonymous pages rather than drop file cache.

```bash
$ free -h
               total        used        free      shared  buff/cache   available
Mem:            15Gi       838Mi        14Gi        15Mi       638Mi        14Gi
Swap:             0B          0B          0B
$ vmstat 1 3
procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st gu
 1  0      0 15195724   9248 645024    0    0   389    67  669    1  4  2 93  0  0  0
 1  0      0 15212328   9248 645080    0    0     0    76  980  620 22  4 74  0  0  0
 1  0      0 15216968   9248 645040    0    0     0   332 1048  613 21  5 73  0  0  0
```

**How it works:**
1. `free -h` shows RAM and swap; this machine has no swap configured (`swapon --show` lists swap areas). `available` is what new programs can get without swapping: free memory plus droppable cache.
2. In `vmstat`, `si` and `so` are memory swapped in and out per second. Steady non-zero values in both are the warning sign.

**Thrashing:** the **working set** (the pages the running programs actively use) is bigger than RAM. Every page brought in pushes out one needed a moment later, so the system spends its time on major faults: `si`/`so` stay high and everything crawls. Fixes: more RAM, fewer processes at once, a smaller working set.

## Overcommit and the OOM killer

**Meaning:** because frames are only given on first touch, Linux lets processes reserve more memory than is free: **overcommit**. The default mode (`vm.overcommit_memory = 0`) refuses only allocations that obviously can't fit. If programs later really touch more than RAM + swap, the kernel's **OOM killer** picks a process (usually the largest) and kills it with `SIGKILL`; `dmesg` then shows "Out of memory: Killed process ...".

```cpp
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>

long rssKB() {                                            // RAM this process really uses
    std::ifstream f("/proc/self/status");
    std::string key;
    long kb = 0;
    while (f >> key)
        if (key == "VmRSS:") { f >> kb; return kb; }
    return -1;
}

int main() {
    void* a = std::malloc(8UL << 30);                     // 8 GiB
    std::cout << "malloc(8 GiB): " << (a ? "OK" : "failed") << ", RSS " << rssKB() << " kB\n";
    void* b = std::malloc(1UL << 40);                     // 1 TiB: far more than RAM + swap
    std::cout << "malloc(1 TiB): " << (b ? "OK" : "failed") << "\n";
    std::free(a);
    std::free(b);
}
```
```text
malloc(8 GiB): OK, RSS 3440 kB
malloc(1 TiB): failed
```

**How it works:**
1. On this 16 GB machine, 8 GiB is granted at once, yet the process uses 3.4 MB of RAM: nothing was touched.
2. 1 TiB is more than RAM + swap could ever hold, so even the default mode refuses it and `malloc` returns `nullptr`.
3. Mode 2 (`vm.overcommit_memory = 2`) turns on strict accounting: `malloc` fails up front instead of the OOM killer acting later. Mode 1 never refuses.

So in C++ on Linux, `new` rarely throws `std::bad_alloc` for lack of RAM; running out shows up later as the OOM killer. `oom_score_adj` in `/proc/<pid>/` makes a process more or less likely to be chosen.

## Common mistakes

- **Treating every page fault as an error.** Page faults are normal (demand paging, COW). A segmentation fault is the error: invalid address or forbidden access.
- **Measuring memory by what `malloc` returned.** Untouched memory has no frames. Look at RSS (`VmRSS`, `top`), not the virtual size.
- **Expecting `fork` to copy memory.** It copies page tables; pages are copied on write.
- **Thinking swap is "virtual memory".** Virtual memory is address translation; swap is one place a page can live.
- **Expecting more frames to always mean fewer faults.** FIFO can get worse (Belady's anomaly).
- **Counting on `nullptr` or `bad_alloc` when memory runs out.** With overcommit the allocation succeeds and the OOM killer acts later. Services that must not die are tuned with `oom_score_adj` or strict overcommit.

## ⚠ Easily confused

- **demand paging vs swapping** — Demand paging = load a page in on first use. Swapping = push cold pages out to disk when RAM is full. Two directions of the same virtual-memory system.
- **minor vs major page fault** — Minor = no disk I/O (zero page, page cache, COW copy). Major = must read from disk (file not cached, or swapped out).
- **page fault vs segfault** — A page fault is normal: the OS supplies the page and the instruction restarts. A segmentation fault is an illegal access the OS refuses.
- **LRU vs Clock** — LRU evicts the exact least recently used page (costly to track). Clock approximates it with one accessed bit per page and a rotating hand (cheap).
- **Optimal vs LRU** — Optimal looks into the future (farthest next use): a benchmark only. LRU looks into the past (least recently used) and is a practical approximation.
- **swapping vs thrashing** — Swapping = moving cold pages to disk, normal in moderation. Thrashing = the working set doesn't fit in RAM, so pages are swapped constantly and work stalls.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 27).