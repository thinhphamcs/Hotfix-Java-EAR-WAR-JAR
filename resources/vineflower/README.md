# Vineflower Decompiler

Place `vineflower.jar` in this directory before running the app.

Download from: https://github.com/Vineflower/vineflower/releases

The app will look for `vineflower.jar` at this exact path:
- Dev: `resources/vineflower/vineflower.jar` (project root)
- Production: packaged automatically by electron-builder into the app's resources

Tested with Vineflower 1.10+. The app shells out: `java -jar vineflower.jar <class-file> <output-dir>`
