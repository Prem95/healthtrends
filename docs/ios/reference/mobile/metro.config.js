// The app shares the pure domain logic (units, ranges, status, trend,
// plausibility) with the web app instead of copying it. Those files live
// outside this project, in ../src/lib/domain, so Metro has to be told to
// watch that folder. They import nothing from node_modules, which is what
// makes this safe on Expo's build servers (only mobile/ dependencies are
// installed there).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../src/lib/domain')];

module.exports = config;
