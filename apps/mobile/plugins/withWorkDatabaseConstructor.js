const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Room instantiates this generated WorkManager database through reflection at startup.
const keepDatabase = '-keep class androidx.work.impl.WorkDatabase_Impl { <init>(); }';

module.exports = function withWorkDatabaseConstructor(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const rules = path.join(mod.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
    const contents = await fs.readFile(rules, 'utf8');
    if (!contents.includes(keepDatabase)) {
      await fs.appendFile(rules, '\n' + keepDatabase + '\n');
    }
    return mod;
  }]);
};
