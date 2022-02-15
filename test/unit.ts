export type TestCase<I, O> = { input: I; output: O }
export type TestCaseValidator<I, O, R> = (testcase: TestCase<I, O>, got: O) => R
export type TestContext<I, O> = {
  testCases: TestCase<I, O>[]
  validate: TestCaseValidator<I, O, void>
}
