import process from 'node:process';

process.stderr.write(
  'NOT_RUN: performance harness is introduced by IP-17; no benchmark result exists yet.\n',
);
process.exitCode = 1;
