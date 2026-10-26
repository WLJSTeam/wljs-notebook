export default class FinalAttemptOnlyReporter {
  printsToStdio() {
    return false;
  }

  onBegin(_config, suite) {
    this.suite = suite;
  }

  onEnd() {
    for (const test of this.suite.allTests()) {
      if (test.results.length < 2) continue;

      const finalAttempt = test.results.at(-1);
      test.results.splice(0, test.results.length, finalAttempt);
    }
  }
}
