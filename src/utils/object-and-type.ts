export function pick<T>(obj: any, props: any[]) {
  return props.reduce(function (result: {[key: string | number]: T}, prop) {
    result[prop] = obj[prop] as T;
    return result;
  }, {});
}
