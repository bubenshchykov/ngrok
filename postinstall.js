require('./download')(err => {
  process.exit(err ? 1 : 0);
});
