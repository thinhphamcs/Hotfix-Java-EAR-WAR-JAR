# CFR Decompiler

Place `cfr.jar` in this directory before running the app.

Download from: https://github.com/leibnitz27/cfr/releases

The app will look for `cfr.jar` at this exact path:
- Dev: `resources/cfr/cfr.jar` (project root)
- Production: packaged automatically by electron-builder into the app's resources

Tested with CFR 0.152+. The app shells out: `java -jar cfr.jar <class-file> --silent true`
