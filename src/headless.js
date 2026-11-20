// Đảo Đèn Lồng — chế độ headless (Test Contract v1.0).
// Chạy logic game không cần cửa sổ/GPU và ghi kết quả JSONL.
//
// Cú pháp:
//   node src/headless.js --seed <int> --night 1 [--scenario <file.json>]
//                        [--inputs <file.json>] --ticks <int> --out <file.jsonl>
//                        [--snapshot-every <int, mặc định 10>]

import { readFile, writeFile } from 'node:fs/promises';
import { Game } from './core/sim.js';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    if (val == null || val.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = val;
      i++;
    }
  }
  return args;
}

function fail(msg, code) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.seed == null) fail('missing required argument: --seed', 1);
  if (args.ticks == null) fail('missing required argument: --ticks', 1);
  if (args.out == null) fail('missing required argument: --out', 1);
  if (args.night == null) fail('missing required argument: --night', 1);

  const seed = Number(args.seed);
  if (!Number.isInteger(seed)) fail('--seed must be an integer', 1);

  const night = Number(args.night);
  if (night !== 1) fail('unsupported night: ' + args.night + ' (only 1 supported)', 1);

  const ticks = Number(args.ticks);
  if (!Number.isInteger(ticks) || ticks < 0) fail('--ticks must be a non-negative integer', 1);

  const snapshotEvery = args['snapshot-every'] != null ? Number(args['snapshot-every']) : 10;
  if (!Number.isInteger(snapshotEvery) || snapshotEvery < 1) {
    fail('--snapshot-every must be a positive integer', 1);
  }

  let scenario = null;
  if (args.scenario != null) scenario = await readJson(args.scenario, 'scenario');

  let frames = null;
  if (args.inputs != null) frames = await readInputs(args.inputs);

  const game = new Game({ seed });
  game.buildScenario(scenario);

  const framesByTick = new Map();
  if (frames) for (const f of frames) framesByTick.set(f.tick, f);

  const out = [];
  out.push(JSON.stringify(game.snapshot()));

  let ended = false;
  for (let k = 0; k < ticks; k++) {
    const frame = framesByTick.get(k) || null;
    const events = game.step(frame);
    for (const e of events) out.push(JSON.stringify(e));
    if (game.state !== 'playing') {
      out.push(JSON.stringify(game.endLine()));
      ended = true;
      break;
    }
    if (game.tick % snapshotEvery === 0) out.push(JSON.stringify(game.snapshot()));
  }
  if (!ended) out.push(JSON.stringify(game.endLine()));

  await writeFile(args.out, out.join('\n') + '\n', 'utf8');
  process.exit(0);
}

async function readJson(path, label) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (e) {
    fail('cannot read file: ' + path + ' (' + e.message + ')', 2);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    fail('invalid JSON in ' + label + ' file: ' + path + ' (' + e.message + ')', 2);
  }
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    fail(label + ' file must contain a JSON object: ' + path, 2);
  }
  return data;
}

async function readInputs(path) {
  const data = await readJson(path, 'inputs');
  if (!Array.isArray(data.frames)) {
    fail('inputs file must have a "frames" array: ' + path, 2);
  }
  let lastTick = -1;
  for (const f of data.frames) {
    if (f == null || typeof f !== 'object' || !Number.isInteger(f.tick)) {
      fail('each frame must have an integer "tick": ' + path, 2);
    }
    if (f.tick <= lastTick) {
      fail('frame ticks must be strictly increasing: ' + path, 2);
    }
    lastTick = f.tick;
    if (f.move != null) {
      if (
        !Array.isArray(f.move) ||
        f.move.length !== 2 ||
        f.move.some((v) => typeof v !== 'number')
      ) {
        fail('frame.move must be [x, z] of numbers: ' + path, 2);
      }
    }
  }
  return data.frames;
}

main().catch((e) => {
  fail('unexpected error: ' + (e && e.stack ? e.stack : e), 1);
});
