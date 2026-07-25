# Free `id1` game data (LibreQuake)

DarkPlaces expects a Quake-compatible `id1/` next to the `shipgame/` mod.
Without `pak0.pak` / menu graphics it shows:

> The required files were not found.  
> You may consider adding `-basedir /path/to/game` to your launch commandline.

**This project does not ship proprietary id Software Quake paks.**

## Flatpak

CI installs [LibreQuake](https://github.com/lavenderdotpet/LibreQuake) lite into this directory inside the Flatpak basedir (`/app/share/ship-game/darkplaces`).

## Local runs

```bash
./scripts/dp-fetch-librequake.sh
./scripts/dp-run.sh ocean1
```

`pak0.pak` / `pak1.pak` are gitignored — fetch them with the script above.
