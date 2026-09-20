const os = require('node:os');

try {
  os.userInfo();
} catch (error) {
  if (error && error.code === 'ERR_SYSTEM_ERROR') {
    os.userInfo = () => ({
      gid: -1,
      homedir: process.cwd(),
      shell: null,
      uid: -1,
      username: process.env.USERNAME || 'local',
    });
  } else {
    throw error;
  }
}

require('../node_modules/drizzle-kit/bin.cjs');
