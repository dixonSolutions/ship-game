# Maps

`ocean1.map` — free CC0 Quake map source (simple ocean arena box).  
`ocean1.bsp` — compiled with [ericw-tools](https://github.com/ericwa/ericw-tools) `qbsp`.  
`start.bsp` — copy of `ocean1.bsp` (DarkPlaces defaults to map `start` before `+map` / `quake.rc`).

Recompile:

```bash
qbsp ocean1.map
cp -f ocean1.bsp start.bsp
```

No proprietary Quake textures are embedded; the compiler uses its built-in palette.
