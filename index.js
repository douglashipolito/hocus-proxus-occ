#!/usr/bin/env node

const path = require('path');
const os = require('os');
const HocusProxus = require('hocus-proxus');
const proxy = new HocusProxus({
  hocusProxusUserPath: path.join(os.homedir(), "hocus-proxus-occ"),
  rulesPath: path.join(__dirname, 'rules'),
  enabledRule: 'oe-rules'
});

proxy.start();
