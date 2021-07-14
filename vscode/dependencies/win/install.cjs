'use strict';
const https = require('https');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const GITHUB_REPO = 'https://github.com/FedericoCarboni/node-ntsuspend';

const fetch = (input) => {
  return new Promise((resolve, reject) => {
    https
      .request(input, (res) => {
        if (res.statusCode >= 400) {
          reject(`${res.statusCode}: ${res.statusMessage}`);
        }

        if (res.statusCode === 302) {
          resolve(fetch(res.headers.location));
        } else {
          resolve(res);
        }
      })
      .end();
  });
};

const install = async () => {
  const filename = `win32-${process.arch}_lib.node`;
  const download = `${GITHUB_REPO}/releases/download/v1.0.2/${filename}`;

  const sep = path.sep;
  const dest = path.join(`${__dirname}..${sep}..${sep}..${sep}dependencies${sep}win${sep}`, filename);
  console.error('__dirname', __dirname);
  console.error('dest', dest);
  const stream = fs.createWriteStream(dest);
  stream.once('close', () => {
    const ntsuspend = require(`..${sep}..${sep}dependencies${sep}win${sep}win32-${process.arch}_lib.node`);
    assert.strictEqual(typeof ntsuspend.suspend, 'function');
    assert.strictEqual(typeof ntsuspend.resume, 'function');
    console.log(`Success: '${dest}' installed from remote '${download}'`);
  });

  try {
    const response = await fetch(download);
    response.pipe(stream);
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

const {
  platform,
  arch,
  env: { SKIP_NTSUSPEND_BINARY },
} = process;
if (!SKIP_NTSUSPEND_BINARY && platform === 'win32' && ['x64', 'ia32'].indexOf(arch) >= 0) install();
