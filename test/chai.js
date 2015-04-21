var chai = require('chai');
global.expect = chai.expect;
chai.Assertion.includeStack = true;

// workaround for ngrok 2.0 bug
// when all tunnels need need authtoken
require('..').authtoken('3VF2Ln9PfRjRYwcsGQ6Pe_4rZqDcKrB1Srzrs1CGkFr');