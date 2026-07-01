const { execFile } = require('child_process');
const path         = require('path');

const BINARY = path.resolve(
  __dirname, '..', process.env.CPP_ENGINE_PATH || '../graph-engine/build/graph-engine'
);

const MAX_BUFFER = 50 * 1024 * 1024; // 50 MB
const TIMEOUT_MS = 30_000;           // 30 seconds

/**
 * Run the C++ graph engine with a JSON payload and command string.
 * @param {object} payload  - { nodes, edges, args?, temporal? }
 * @param {string} command  - one of trust-path | recommend | backbone | pagerank |
 *                            communities | echo-chambers | stability | conflicts |
 *                            simulate-spread | simulate-removal | friendship-risk |
 *                            full-analytics
 * @returns {Promise<object>} Parsed JSON result from the engine
 */
const runGraphEngine = (payload, command) => {
  return new Promise((resolve, reject) => {
    const args = [JSON.stringify(payload), command];

    execFile(BINARY, args, { maxBuffer: MAX_BUFFER, timeout: TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(
            `Engine error [${command}]: ${stderr?.trim() || error.message}`
          ));
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`Engine returned invalid JSON for command: ${command}`));
        }
      }
    );
  });
};

module.exports = { runGraphEngine };
