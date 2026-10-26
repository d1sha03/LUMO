import sys

if sys.version_info < (3, 10):  # the code uses `X | None` type syntax
    raise RuntimeError("LUMO Samjho needs Python 3.10 or newer (found %s)." % sys.version.split()[0])
