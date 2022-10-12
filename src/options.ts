export function validate(options: any) {
  const vpairs = [
    {invalid: 'uri', expected: 'url'},
    {invalid: 'json', expected: 'data'},
    {invalid: 'qs', expected: 'params'},
  ];
  for (const pair of vpairs) {
    if (options[pair.invalid]) {
      const e = `'${pair.invalid}' is not a valid configuration option. Please use '${pair.expected}' instead. This library is using Axios for requests. Please see https://github.com/axios/axios to learn more about the valid request options.`;
      throw new Error(e);
    }
  }
}
