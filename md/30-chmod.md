# 30 — chmod

*Category: Linux*

> chmod changes a file's permission bits: a numeric mode sets them all at once, a symbolic mode adds, removes or sets only the bits you name.

## Must-remember points

- `chmod MODE file` changes the permission bits (meaning: lesson 29). Only the **file's owner** or root may do it.
- **Numeric** mode sets every bit at once, whatever was there before: `chmod 755 f` (rwxr-xr-x), `644` (rw-r--r--), `600` (rw-------).
- **Symbolic** mode = who (`u` owner, `g` group, `o` others, `a` all) + operator (`+` add, `-` remove, `=` set exactly) + bits (`rwx`). Combine with commas: `chmod u+x,g-w,o= f`.
- With no who letter (`chmod +x f`) the change applies to everyone, except bits set in the **umask**: under umask 022, `chmod +w` adds write for the owner only.
- `chmod -R 644 dir` strips `x` from the directories and locks users out. Use `chmod -R u=rwX,go=rX dir`: capital **X** adds `x` only to directories and already-executable files.
- A **fourth leading digit** sets the special bits: `4755` setuid, `2775` setgid directory, `1777` sticky directory.
- `chmod -v` prints the mode before and after. A missing `x` is the #1 cause of "Permission denied" on `./script.sh`.
- In C/C++: `chmod(path, 0644)`. The leading 0 makes it **octal**; `chmod(path, 644)` sets a completely different mode.

## Numeric modes

**Meaning:** one octal digit per triplet (r=4, w=2, x=1), written owner-group-others. A numeric mode is **absolute**: it replaces all the bits, so the result doesn't depend on the old mode. (As in lesson 29, the sessions run as the ordinary user `sam`; `sudo` runs a command as root.)

```bash
$ touch report.txt
$ ls -l report.txt
-rw-r--r-- 1 sam sam 0 Oct 31 01:38 report.txt
$ chmod 640 report.txt
$ ls -l report.txt
-rw-r----- 1 sam sam 0 Oct 31 01:38 report.txt
$ chmod -v 600 report.txt
mode of 'report.txt' changed from 0640 (rw-r-----) to 0600 (rw-------)
```

| Mode | `ls -l` | Typical use |
|---|---|---|
| 644 | `rw-r--r--` | normal files: source code, documents |
| 755 | `rwxr-xr-x` | programs, scripts, directories |
| 640 / 750 | `rw-r-----` / `rwxr-x---` | the group may read, others nothing |
| 600 / 700 | `rw-------` / `rwx------` | private: SSH keys, `~/.ssh` |
| 666 / 777 | all bits for everyone | almost never: anyone can change it |

## Symbolic modes: who, operator, bits

**Meaning:** a symbolic mode changes only the bits you name. It has three parts: **who** (`u` owner, `g` group, `o` others, `a` all), an **operator** (`+` add, `-` remove, `=` set exactly, clearing the others), and the **bits** (`r`, `w`, `x`). Several changes are joined with commas, without spaces.

```bash
$ touch run.sh
$ chmod -v u+x run.sh
mode of 'run.sh' changed from 0644 (rw-r--r--) to 0744 (rwxr--r--)
$ chmod -v g+w,o-r run.sh
mode of 'run.sh' changed from 0744 (rwxr--r--) to 0760 (rwxrw----)
$ chmod -v go= run.sh
mode of 'run.sh' changed from 0760 (rwxrw----) to 0700 (rwx------)
$ chmod -v a=r run.sh
mode of 'run.sh' changed from 0700 (rwx------) to 0444 (r--r--r--)
$ chmod -v +w run.sh
mode of 'run.sh' changed from 0444 (r--r--r--) to 0644 (rw-r--r--)
$ chmod -v a+w run.sh
mode of 'run.sh' changed from 0644 (rw-r--r--) to 0666 (rw-rw-rw-)
```

**How it works:**
1. `u+x` added one bit; everything else stayed. `g+w,o-r` made two changes at once.
2. `=` sets exactly: `go=` (nothing after `=`) cleared group and others; `a=r` left only read for all.
3. `+w` without a who letter skipped the bits in the umask (022 = group and others write), so only the owner got `w`. `a+w` ignores the umask.

## Numeric or symbolic?

| | Numeric (`chmod 755 f`) | Symbolic (`chmod u+x f`) |
|---|---|---|
| Effect | sets all bits; the old mode doesn't matter | changes only the named bits |
| Result | the same on every file | depends on each file's current mode |
| Readability | needs octal in your head | says what changes |
| On a mixed tree with `-R` | dangerous: files and directories get the same mode | safe with `X` |

**When to use which:**
- Numeric: to put one file into a known state (`chmod 600 key.pem`, install scripts).
- Symbolic: to adjust a bit and keep the rest (`chmod +x build.sh`, `chmod o-rwx secret/`), and for recursive changes.

## Recursive changes: -R and capital X

**Meaning:** `chmod -R` applies the mode to a directory and everything below it. A numeric mode treats files and directories the same, which is almost never right: directories need `x` to be entered, ordinary files shouldn't have it. Capital **`X`** means: execute, but only for directories and files that already have an `x` somewhere.

```bash
$ mkdir -p site/css
$ touch site/index.html site/css/main.css site/deploy.sh
$ chmod 755 site/deploy.sh
$ chmod -R 644 site
chmod: cannot access 'site/index.html': Permission denied
chmod: cannot access 'site/deploy.sh': Permission denied
chmod: cannot access 'site/css': Permission denied
$ chmod -R u=rwX,go=rX site
$ ls -lR site
site:
total 4
drwxr-xr-x 2 sam sam 4096 Oct 31 01:38 css
-rwxr-xr-x 1 sam sam    0 Oct 31 01:38 deploy.sh
-rw-r--r-- 1 sam sam    0 Oct 31 01:38 index.html

site/css:
total 0
-rw-r--r-- 1 sam sam 0 Oct 31 01:38 main.css
```

**How it works:**
1. `chmod -R 644 site` changed `site` first, removing its `x`, and then could no longer reach the entries inside. Run by root, it succeeds everywhere and locks every other user out of every directory.
2. `u=rwX,go=rX`: directories get `rwxr-xr-x`, plain files `rw-r--r--`, and `deploy.sh`, which was executable, keeps its `x`.
3. The other common fix uses `find`: `find site -type d -exec chmod 755 {} +` and `find site -type f -exec chmod 644 {} +`.
4. The opposite mistake, `chmod -R 755`, makes every file executable.

## Four-digit modes: the special bits

**Meaning:** a fourth digit in front sets setuid (4), setgid (2) and sticky (1); their meaning is in lesson 29. Symbolic forms: `u+s`, `g+s`, `+t`.

```bash
$ touch tool
$ chmod -v 4755 tool
mode of 'tool' changed from 0644 (rw-r--r--) to 4755 (rwsr-xr-x)
$ mkdir team drop
$ chmod -v 2775 team
mode of 'team' changed from 0755 (rwxr-xr-x) to 2775 (rwxrwsr-x)
$ chmod -v 1777 drop
mode of 'drop' changed from 0755 (rwxr-xr-x) to 1777 (rwxrwxrwt)
$ chmod -v 755 team
mode of 'team' changed from 2775 (rwxrwsr-x) to 2755 (rwxr-sr-x)
$ chmod -v g-s team
mode of 'team' changed from 2755 (rwxr-sr-x) to 0755 (rwxr-xr-x)
$ sudo touch rootfile
$ chmod 666 rootfile
chmod: changing permissions of 'rootfile': Operation not permitted
```

**How it works:**
1. `4755` = setuid + 755; `2775` = a group-shared directory; `1777` = a shared drop directory like `/tmp`.
2. A three-digit mode on a **directory** does not clear its setuid or setgid bit (GNU chmod keeps them on purpose). Use `g-s`, or five digits: `chmod 00755 team`. On a regular file, `chmod 755` clears them.
3. `rootfile` belongs to root, so `sam` may not change its mode, even though `sam` can see it. Only the owner or root may run chmod on a file.

## chmod from C++

**Meaning:** the `chmod` command is a thin wrapper around the `chmod()` system call in `<sys/stat.h>`. Modes are octal, so in C and C++ they must be written with a leading `0`.

```cpp
#include <cstdlib>
#include <iostream>
#include <sys/stat.h>
#include <unistd.h>

void show(const char* path) {
    struct stat st;
    stat(path, &st);
    std::cout << std::oct << (st.st_mode & 07777) << "\n";   // the permission bits, in octal
}

int main() {
    char path[] = "/tmp/modeXXXXXX";
    close(mkstemp(path));      // create a new, unique file: mode 600
    show(path);
    chmod(path, 0640);         // leading 0: an octal literal, rw-r-----
    show(path);
    chmod(path, 640);          // no leading 0: decimal 640, which is octal 1200
    show(path);
    unlink(path);              // delete the file
}
```
```output
600
640
1200
```

**How it works:**
1. `mkstemp` creates a file with a unique name and mode 600, the safe choice for temporary files.
2. `0640` is octal: `rw-r-----`. `640` is decimal 640 = octal 1200: sticky plus owner write (`-w------T`). No warning, just a wrong mode.
3. `stat()` reads the mode back; `& 07777` drops the file-type bits.
4. Portable C++17 alternative: `std::filesystem::permissions(p, std::filesystem::perms::owner_exec, std::filesystem::perm_options::add)`.

## Common mistakes

- **`chmod -R 644` or `chmod -R 755` on a tree.** Directories lose `x`, or every file gains it. Use `u=rwX,go=rX` or `find -type d` / `-type f`.
- **`chmod 777` as a fix.** It hides the real problem (wrong owner or group, lesson 31) and lets anyone modify the file.
- **Expecting `chmod +w` to give write to everyone.** Without a who letter the umask filters it. Write `a+w` (and ask whether you really want that).
- **Spaces in a symbolic list.** `chmod u+x, g-w f` fails (`invalid mode: 'u+x,'`): the shell splits at the space. Write `u+x,g-w`.
- **Decimal modes in code.** `chmod(path, 755)` is octal 1363. Always write `0755`.
- **Assuming a numeric mode clears setgid on a directory.** `chmod 755 dir` keeps it; use `g-s`.

## ⚠ Easily confused

- **numeric vs symbolic chmod** — Numeric (`755`) sets all bits at once; the old mode is irrelevant. Symbolic (`u+x`) changes only the bits named.
- **chmod vs chown** — chmod changes the permission BITS; chown changes the OWNER and group (lesson 31).
- **`x` vs `X`** — `x` adds execute to everything selected. `X` adds it only to directories and to files that are already executable for someone.
- **`+x` vs `a+x`** — Both target everyone, but `+x` (no who letter) leaves alone the bits set in the umask; `a+x` doesn't look at the umask.

➡ Questions for this topic: `questions/master-question-sheet.md` (section 30).