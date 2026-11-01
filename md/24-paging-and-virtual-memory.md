# 24 — Paging & Virtual Memory

*Category: OS Memory & Systems*

> Virtual memory is cut into fixed-size pages and RAM into frames of the same size. A page table per process maps each page to the frame that holds it.

## Must-remember points

- A process's virtual address space is cut into equal **pages**; physical RAM into **frames** of the same size (4 KiB on x86-64 Linux: `getconf PAGESIZE`). Each page is stored in one frame.
- **One frame holds exactly one page.** The pages of one program (code, heap, stack) can sit in any free frames, in any order.
- The **page table** (one per process) maps each virtual page to its frame. Each entry also holds bits: **present**, **writable**, **user**, **accessed**, **dirty**, **no-execute**.
- The program sees a clean **contiguous virtual** layout; the pages sit in **scattered physical** frames. Every pointer you print is a **virtual** address.
- Each process has its **own** page table, so the same virtual address in two processes can hold different data (parent and child after `fork`).
- Paging removes the need for one big contiguous block of RAM, so it solves **external fragmentation** (it leaves a little internal fragmentation, lesson 26).
- Bonuses: **isolation**, **protection** (per-page permissions; a forbidden access ends in a segfault), **sharing** (one copy of libc's code for all processes) and **virtual memory** larger than RAM (lesson 27).

## Pages, frames and the page size

**Meaning:** the kernel manages memory in fixed-size blocks. A block of a process's **virtual** address space is a **page**. A block of **physical** RAM is a **frame**. Both have the same size, so any page fits in any frame. On x86-64 Linux the size is 4096 bytes (4 KiB). Some ARM64 systems use 16 KiB or 64 KiB pages, so a program asks the system instead of assuming.

```bash
$ getconf PAGESIZE
4096
```

```cpp
#include <iostream>
#include <unistd.h>

int main() {
    long pageSize = sysconf(_SC_PAGESIZE);            // ask the OS; don't hardcode 4096
    long bytes = 10000;
    long pages = (bytes + pageSize - 1) / pageSize;   // round up to whole pages
    std::cout << "page size: " << pageSize << " bytes\n";
    std::cout << bytes << " bytes need " << pages << " pages\n";
}
```
```text
page size: 4096 bytes
10000 bytes need 3 pages
```

**How it works:**
1. `sysconf(_SC_PAGESIZE)` returns the page size of the machine the program runs on. `getconf PAGESIZE` asks the same question from the shell.
2. The kernel maps memory in whole pages, so a 10,000-byte region needs 3 pages (12,288 bytes). The unused end of the last page is internal fragmentation (lesson 26).
3. A page is **content** (a slice of the program's memory); a frame is a **slot** in RAM. "Page 3 is in frame 47" means page 3's bytes physically sit in frame 47.

## The page table: from virtual page to frame

**Meaning:** each process has a **page table** that says, for every virtual page, which frame holds it. The CPU's MMU looks it up on every memory access (lesson 25). The program only ever uses virtual addresses, so its memory looks like one neat block, while the frames behind it are scattered anywhere in RAM.

| Virtual page | Holds | Frame | Present |
|---|---|---|---|
| 0 | code | 7 | yes |
| 1 | code | 2 | yes |
| 2 | heap | 9 | yes |
| 3 | heap | none yet | no: the first use causes a page fault (lesson 27) |

Linux lets a process read its own mapping in `/proc/self/pagemap` (one 8-byte entry per virtual page). The frame numbers are shown only to root; a normal user sees 0.

```cpp
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <iostream>
#include <unistd.h>

int main() {
    long ps = sysconf(_SC_PAGESIZE);
    char* buf = static_cast<char*>(std::aligned_alloc(ps, 4 * ps));   // 4 pages, page-aligned
    std::memset(buf, 1, 4 * ps);                       // touch them, so each one gets a frame
    int fd = open("/proc/self/pagemap", O_RDONLY);     // 8 bytes per virtual page
    for (int i = 0; i < 4; i++) {
        uint64_t page = reinterpret_cast<uintptr_t>(buf + i * ps) / ps;
        uint64_t entry = 0;
        pread(fd, &entry, sizeof entry, page * sizeof entry);
        uint64_t frame = entry & ((1ULL << 55) - 1);   // bits 0-54: the frame number
        std::cout << std::hex << "virtual page " << page << " -> frame " << frame << "\n";
    }
    close(fd);
    std::free(buf);
}
```
```text
virtual page 55ab288d1 -> frame 170e45
virtual page 55ab288d2 -> frame 168f4d
virtual page 55ab288d3 -> frame 125870
virtual page 55ab288d4 -> frame 17027b
```

**How it works:**
1. `aligned_alloc` returns 4 pages that are **contiguous in virtual memory**: the page numbers go up by 1.
2. `memset` touches every page, so the kernel gives each one a frame.
3. The entry for page `p` is at byte `p * 8` of `/proc/self/pagemap`; its bits 0-54 hold the frame number (run as root to see real numbers).
4. The four frames are **not** next to each other. Contiguous virtual pages, scattered physical frames: the page table hides the difference. That's why an array only has to be contiguous in virtual memory (lesson 18).

## What a page table entry holds

**Meaning:** besides the frame number, each entry (8 bytes on x86-64) carries flag bits. The kernel sets them; the hardware checks them on every access and sets the accessed and dirty bits itself.

| Field | Meaning | Used for |
|---|---|---|
| Frame number | where the page is in RAM | building the physical address |
| Present | the page is in RAM | 0: an access raises a page fault (lesson 27) |
| Writable | writes are allowed | code and constants are read-only |
| User | user programs may touch it | kernel memory is off-limits to programs |
| Accessed | the CPU sets it when the page is used | choosing which page to evict (lesson 27) |
| Dirty | the CPU sets it when the page is written | a dirty page must be saved before its frame is reused |
| No-execute (NX) | instructions can't run from it | the stack and heap are not executable |

You can see the result of these bits in `/proc/self/maps`, which lists a process's regions with their permissions:

```cpp
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

int main() {
    void* heap = std::malloc(100);                       // make sure the heap exists
    std::ifstream maps("/proc/self/maps");               // one line per region of this process
    std::string line;
    while (std::getline(maps, line)) {
        std::istringstream in(line);
        std::string range, perms, offset, dev, inode, path;
        in >> range >> perms >> offset >> dev >> inode >> path;
        std::string name = path.substr(path.rfind('/') + 1);
        if (name == "maps" || name == "[heap]" || name == "[stack]" || name == "libc.so.6")
            std::cout << range << "  " << perms << "  " << name << "\n";
    }
    std::free(heap);
}
```
```text
560f9eb25000-560f9eb27000  r--p  maps
560f9eb27000-560f9eb28000  r-xp  maps
560f9eb28000-560f9eb29000  r--p  maps
560f9eb29000-560f9eb2a000  r--p  maps
560f9eb2a000-560f9eb2b000  rw-p  maps
560fca2cb000-560fca2ec000  rw-p  [heap]
7f1868000000-7f1868028000  r--p  libc.so.6
7f1868028000-7f18681b0000  r-xp  libc.so.6
7f18681b0000-7f18681ff000  r--p  libc.so.6
7f18681ff000-7f1868203000  r--p  libc.so.6
7f1868203000-7f1868205000  rw-p  libc.so.6
7ffdda523000-7ffdda546000  rw-p  [stack]
```

**How it works:**
1. The program is called `maps`. Its machine code is `r-xp` (read and execute, not write). Its constants are `r--p`; its global variables, the heap and the stack are `rw-p` (write, not execute). The layout of these regions is lesson 3.
2. Every range starts and ends on a multiple of 0x1000 (4096): permissions are set per **page**.
3. The final `p` means private: this process's writes are not seen by others (`s` would be shared).
4. A write to an `r-x` page, or a jump into an `rw-` page, breaks the bits. The MMU raises a fault, the kernel sees the access is illegal and sends `SIGSEGV`: a segmentation fault.
5. `libc.so.6` is mapped in every process. Its read-only pages use the same frames in all of them: one copy in RAM, shared.

## One page table per process: same address, different data

**Meaning:** every process has its own page table, so a virtual address only means something inside its own process. After `fork`, parent and child have the same virtual layout, yet a write in one is invisible to the other.

```cpp
#include <iostream>
#include <sys/wait.h>
#include <unistd.h>

int value = 1;                                  // a global: same virtual address in parent and child

int main() {
    pid_t pid = fork();                         // the child gets a copy of the address space
    if (pid == 0) {                             // child
        value = 2;
        std::cout << "child : &value = " << &value << ", value = " << value << "\n";
        return 0;
    }
    waitpid(pid, nullptr, 0);                   // parent: wait for the child to finish
    std::cout << "parent: &value = " << &value << ", value = " << value << "\n";
}
```
```text
child : &value = 0x5642cfadf010, value = 2
parent: &value = 0x5642cfadf010, value = 1
```

**How it works:**
1. `fork` creates a child whose address space is a copy of the parent's, so `&value` is the same number in both.
2. The child writes 2. The kernel gives the child its own copy of that page in a new frame (copy-on-write, lesson 27) and updates **the child's** page table only.
3. The parent's page table still points at the original frame, which holds 1.
4. So never pass a raw pointer to another process: it means nothing there. Processes share data through shared memory, pipes, sockets or files.

## Why paging: benefits and costs

**Meaning:** the page table is a level of indirection between the program and RAM. Almost every memory feature of a modern OS is built on it.

**Advantages:**
- **No external fragmentation:** any free frame can hold any page, so there's no need for one big contiguous block (lesson 26).
- **Isolation:** a process can only reach the frames its own page table points to.
- **Protection:** per-page bits make code read-only and the stack non-executable.
- **Sharing:** two page tables can point at the same frame: shared libraries, shared memory, parent and child after `fork`.
- **Virtual memory:** a page can be absent from RAM (not loaded yet, or swapped out) and fetched on first use, so programs can reserve more than RAM (lesson 27).

**Disadvantages:**
- Every access needs a translation. The MMU and its TLB make it fast (lesson 25), but a TLB miss costs extra memory reads.
- Page tables take memory themselves; multi-level tables keep them small (lesson 25).
- Memory is mapped in whole pages, so the end of each region wastes up to one page minus one byte (internal fragmentation, lesson 26).

## Common mistakes

- **Thinking a pointer is a physical address.** Every address a program prints is virtual. Only the kernel and the MMU see frame numbers.
- **Thinking virtual memory means swap.** Virtual memory is the translation through page tables. Swap is one thing it makes possible; a machine with no swap still uses virtual memory for every access.
- **Hardcoding 4096.** Use `sysconf(_SC_PAGESIZE)`: some ARM64 systems use 16 KiB or 64 KiB pages.
- **Thinking a page can be split across frames, or a frame can hold parts of several pages.** One page goes into exactly one frame; they are the same size.
- **Thinking `malloc(1 GB)` takes 1 GB of RAM at once.** It reserves virtual pages; frames are attached when each page is first touched (lesson 27).
- **Sharing pointers between processes.** The same number points to different data in another process (the `fork` example).

## ⚠ Easily confused

- **page vs frame** — Page = content (a slice of a process's virtual memory). Frame = container (a slot in physical RAM). Same size; one page per frame.
- **virtual vs physical address** — Virtual = per-process, what the program sees and prints. Physical = the real RAM location; only the kernel and MMU see it. The page table translates one into the other.
- **contiguous-virtual vs scattered-physical** — Contiguous in virtual space, scattered across frames physically. The page table bridges the two, so the program never notices.
- **page table vs `/proc/self/maps`** — The page table maps each page to a frame (hardware format, one entry per page). `/proc/self/maps` is the kernel's readable list of regions with their permissions, built from the same information.
- **page fault vs segmentation fault** — Page fault: the MMU found no valid entry, the kernel handles it (often by loading the page) and the program continues. Segfault: the access breaks the permissions or hits no mapping, so the kernel kills the program (lesson 27).

➡ Questions for this topic: `questions/master-question-sheet.md` (section 24).