# 19 — Endianness

*Category: C++ Language & Safety*

> The order in which the bytes of a multi-byte value sit in memory. It is invisible in values and visible in raw bytes, files and network data.

## Must-remember points

- **Endianness** = the order of the **bytes** of a multi-byte value in memory. **Little-endian** puts the least-significant byte at the lowest address (x86-64, most ARM systems). **Big-endian** puts the most-significant byte first.
- We write numbers most-significant first, like big-endian. On little-endian, `0x01020304` is stored `04 03 02 01`: reverse the bytes to read the value.
- Applies to **every multi-byte value**: `short`, `int`, `long`, `float`, pointers (a pointer is an 8-byte integer on x86-64). Single bytes (`char`, `uint8_t`) are unaffected.
- Visible only in **raw bytes** (a `unsigned char*` walk, a hex dump, a file, network data). `cout`/`printf` print the value, never reversed. Shifts and masks work on values: same result on every machine.
- **Network byte order is big-endian.** Convert with `htonl`/`htons` (host to network) and `ntohl`/`ntohs` (network to host) from `<arpa/inet.h>`. On a big-endian host they do nothing.
- It matters when bytes cross machines or tools: **network protocols**, **binary files**, **memory dumps**. Portable code builds bytes with **shifts**. C++20 `std::endian::native` (`<bit>`) tells you the host's order.
- Endianness is about **byte** order. Bits inside a byte have no address, so C++ code never sees a "bit order".

## What endianness is

**Meaning:** an `int` is 4 bytes, and memory addresses count single bytes. So the CPU must decide which byte of the value goes at the lowest address. **Little-endian** stores the least-significant byte (the "little end") first; **big-endian** stores the most-significant byte first. You can see it by reading the object's bytes through an `unsigned char*`.

```cpp
#include <cstdio>

void dump(const char* name, const void* p, std::size_t n) {
    const unsigned char* b = static_cast<const unsigned char*>(p);   // look at raw bytes
    std::printf("%-12s", name);
    for (std::size_t i = 0; i < n; i++) std::printf("%02X ", b[i]);  // lowest address first
    std::printf("\n");
}

int main() {
    int x = 0x01020304;
    int y = 500;                       // 0x000001F4
    short s = 0x0A0B;
    dump("0x01020304:", &x, sizeof x);
    dump("500:", &y, sizeof y);
    dump("0x0A0B:", &s, sizeof s);
    std::printf("value of y: %d (0x%08X)\n", y, y);
}
```
```output
0x01020304: 04 03 02 01
500:        F4 01 00 00
0x0A0B:     0B 0A
value of y: 500 (0x000001F4)
```

**How it works:**
1. `dump` prints the bytes starting at the lowest address. Reading memory as `unsigned char` is always allowed.
2. On x86-64 (little-endian) the low byte `04` comes first. Reverse `F4 01 00 00` to get `0x000001F4` = 500.
3. The last line prints the **value**: the CPU puts the bytes back in order when it loads the `int`, so printing never shows them reversed.

| Value `0x01020304` | address +0 | +1 | +2 | +3 |
|---|---|---|---|---|
| Little-endian (x86-64, most ARM) | `04` | `03` | `02` | `01` |
| Big-endian (network order, some older CPUs) | `01` | `02` | `03` | `04` |

## Detecting the byte order

**Meaning:** C++20 gives the answer at compile time with `std::endian::native` from `<bit>`. Older code checks at run time: store 1 in an integer and look at its first byte.

```cpp
// C++20: std::endian
#include <bit>
#include <cstdint>
#include <cstring>
#include <iostream>

int main() {
    if constexpr (std::endian::native == std::endian::little)
        std::cout << "compile time: little-endian\n";
    else if constexpr (std::endian::native == std::endian::big)
        std::cout << "compile time: big-endian\n";

    std::uint32_t one = 1;
    unsigned char first;
    std::memcpy(&first, &one, 1);            // copy the byte at the lowest address
    std::cout << "run time: " << (first == 1 ? "little" : "big") << "-endian\n";
}
```
```output
compile time: little-endian
run time: little-endian
```

**How it works:**
1. `if constexpr` keeps only the branch that matches the machine, so the check costs nothing at run time.
2. On a little-endian machine the `01` byte of `one` is at the lowest address, so `first == 1`; on big-endian it would be `00`.
3. You rarely need to branch on it yourself: `htonl` and the shift technique below already work on either kind of machine.

## Network byte order: htonl, htons, ntohl, ntohs

**Meaning:** internet protocols (IP, TCP, UDP headers) send multi-byte numbers **big-endian**, called **network byte order**. Before putting a number into a packet header or socket address you convert it from host order with `htonl` (32-bit) or `htons` (16-bit). After receiving, you convert back with `ntohl` / `ntohs`. On a little-endian host they swap the bytes; on a big-endian host they do nothing.

```cpp
#include <arpa/inet.h>   // htonl, htons, ntohl, ntohs (POSIX)
#include <cstdint>
#include <cstdio>

void dump(const char* name, const void* p, std::size_t n) {
    const unsigned char* b = static_cast<const unsigned char*>(p);
    std::printf("%-11s", name);
    for (std::size_t i = 0; i < n; i++) std::printf("%02X ", b[i]);
    std::printf("\n");
}

int main() {
    std::uint32_t ip = 0xC0A80001;           // 192.168.0.1
    std::uint16_t port = 8080;               // 0x1F90
    std::uint32_t netIp = htonl(ip);         // host to network order (big-endian)
    std::uint16_t netPort = htons(port);
    dump("ip host:", &ip, 4);
    dump("ip net:", &netIp, 4);
    dump("port host:", &port, 2);
    dump("port net:", &netPort, 2);
    std::printf("back: 0x%08X %u\n", ntohl(netIp), ntohs(netPort));   // network to host
    std::printf("port without htons, as the peer reads it: %u\n", ntohs(port));
}
```
```output
ip host:   01 00 A8 C0
ip net:    C0 A8 00 01
port host: 90 1F
port net:  1F 90
back: 0xC0A80001 8080
port without htons, as the peer reads it: 36895
```

**How it works:**
1. In host order (little-endian) the address bytes are reversed. After `htonl` they read `C0 A8 00 01`, which is 192.168.0.1 in the order the protocol expects.
2. `ntohl` / `ntohs` undo the conversion, giving back the original values.
3. The last line shows the classic bug: forget `htons` when filling `sockaddr_in::sin_port`, and the other side reads bytes `90 1F` as port 36895, not 8080.

## Binary files and memory dumps

**Meaning:** writing a variable's bytes straight to a file (`fwrite(&x, sizeof x, 1, f)`) stores them in the host's byte order. A program on a machine with the other order, or a file format that specifies big-endian, reads a different number. Hex dumps and debuggers show raw bytes too, so you must reverse them by eye on x86-64.

```bash
$ cat write_int.cpp
#include <cstdio>
int main() {
    int x = 500;
    std::FILE* f = std::fopen("data.bin", "wb");
    std::fwrite(&x, sizeof x, 1, f);       // writes the 4 bytes exactly as they sit in memory
    std::fclose(f);
}
$ g++ write_int.cpp -o write_int && ./write_int
$ od -An -tx1 data.bin
 f4 01 00 00
```

Read on a big-endian machine, those bytes mean `0xF4010000` = 4093706240, not 500. File formats therefore state their byte order (PNG and Java class files: big-endian; BMP and WAV: little-endian), and readers convert explicitly.

## Endian-independent code with shifts

**Meaning:** shifts and masks act on the **value**, not on memory. `x >> 24` is always the most-significant byte, on any machine. So the portable way to write or read a fixed byte order is to build each byte with shifts. The code needs no `#ifdef` and no `htonl`.

```cpp
#include <cstdint>
#include <cstdio>

void putBE32(unsigned char* out, std::uint32_t x) {    // write big-endian on ANY host
    out[0] = x >> 24; out[1] = x >> 16; out[2] = x >> 8; out[3] = x;
}

std::uint32_t getBE32(const unsigned char* in) {       // read big-endian on ANY host
    return std::uint32_t(in[0]) << 24 | std::uint32_t(in[1]) << 16 | std::uint32_t(in[2]) << 8 | in[3];
}

int main() {
    unsigned char buf[4];
    putBE32(buf, 500);
    std::printf("%02X %02X %02X %02X -> %u\n", buf[0], buf[1], buf[2], buf[3], getBE32(buf));
}
```
```output
00 00 01 F4 -> 500
```

**How it works:**
1. Storing a `uint32_t` into an `unsigned char` keeps its low 8 bits, so `out[1] = x >> 16` stores the second-highest byte.
2. `getBE32` rebuilds the value in the stated order. The cast to `uint32_t` before `<< 24` avoids shifting into the sign bit of a promoted `int`.
3. The same source gives the same bytes on any machine, and costs nothing: with `-O2` on x86-64, g++ compiles each function to a single `bswap` instruction.

## Byte order vs bit order

**Meaning:** endianness is about the order of **bytes**, because each byte has its own address. The bits inside a byte have no address, so a program can't observe their "order". `x & 1` is always the least-significant bit, and `(x >> 8) & 0xFF` is always the second byte of the value, whatever the machine.

```cpp
#include <iostream>

int main() {
    unsigned x = 0x01020304;
    std::cout << ((x >> 8) & 0xFF) << " " << (x & 1) << " " << (x >> 24) << "\n";   // same on every machine
}
```
```output
3 0 1
```

Bit order exists only where you rarely touch it: **on the wire** (a serial link sends each byte's bits in a fixed order; the hardware handles it) and in **bit-field layout** (`unsigned a : 3;`), which is implementation-defined. Don't use bit-fields to match an external format; use shifts and masks.

## Common mistakes

- **Casting a byte buffer to `int*`.** `uint32_t v = *(uint32_t*)buf;` on received data ignores byte order, and can break alignment and aliasing rules (undefined behaviour, lesson 20). Use `std::memcpy(&v, buf, 4); v = ntohl(v);` or the shift technique.
- **Forgetting `htons` on a port** (8080 becomes 36895), or converting twice (the second call swaps the bytes back).
- **`fwrite`-ing whole structs** to files or sockets. That bakes in the host's byte order **and** its padding. Serialize field by field.
- **Thinking printing shows reversed bytes.** `cout << x` prints the value. Only raw-byte views show the order.
- **Converting single bytes.** A `char` or `uint8_t` has no byte order. Strings of bytes (UTF-8 text) are unaffected.
- C++23 adds `std::byteswap` (`<bit>`) to reverse the bytes of an integer when you really need it.

## ⚠ Easily confused

- **little vs big endian** — Little = least-significant byte at the lowest address (reversed from how we write). Big = most-significant byte first (reads naturally). x86-64 is little; network order is big.
- **stored bytes vs the value** — Raw bytes depend on the endianness. The value you print or compute with is always the same: the CPU reorders the bytes when it loads them.
- **htonl vs ntohl** — `htonl`: host order to network (big-endian) order, before sending. `ntohl`: network to host order, after receiving. `l` = 32-bit, `s` = 16-bit.
- **byte order vs bit order** — Endianness orders bytes, which have addresses. Bits inside a byte have no address; shifts and masks behave the same on every machine.
- **cout pointer vs raw bytes** — `cout << p` prints the real address. Walking `(unsigned char*)&p` shows its bytes, reversed on little-endian.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 19).