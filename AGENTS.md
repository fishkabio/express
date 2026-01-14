- Write comments in code in English.

- Use assertTruthy/assertHttp instead of if () throw new Error.

- Try to avoid using any. Use unknown in TypeScript.

- Comment format for public classes/methods/fields: /**..... */. Comments should end with a dot.

- Function/method names should start with a verb. Their comments too.

- Never commit or push the code.

- Never try to make tests that blindly match the code they test. Re-check that the tested code is correct.

- Avoid using range or contains-like comparisons in tests. Make exact value testing if possible.

- Do not check in tests what is already checked and guaranteed by TypeScript compiler. 

- Avoid creation of excessive MD files unless asked.

- If you decide to test an issue, consider creating a standard test for the project that can be included into
  the codebase instead of writing your own mini-scripts. Use mini-scripts only if they can speed up the
  investigation compared to regular tests.

- Once you finish coding, run build & lint for the workspace.

- Do not write obvious (garbage) comments for code that is already clear. Comment only about non-obvious
  behavior.