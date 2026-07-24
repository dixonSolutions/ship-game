import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
const app = createApp(config);

app.listen(config.PORT, () => {
  console.log(`[ship-game-server] listening on http://localhost:${config.PORT}`);
  console.log(`[ship-game-server] MOCK_AWS=${config.MOCK_AWS}`);
});
