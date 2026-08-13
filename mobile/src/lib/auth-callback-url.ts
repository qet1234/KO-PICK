export type AuthCallbackRouteParams = Record<
  string,
  string | string[] | undefined
>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function authCallbackUrlFromRouteParams(
  params: AuthCallbackRouteParams,
  baseUrl = 'kopick://auth/callback',
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, rawValue]) => {
    if (key === '#') return;

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach((value) => {
      if (value !== undefined) query.append(key, value);
    });
  });

  const fragment = firstValue(params['#'])?.replace(/^#/, '') ?? '';
  const queryString = query.toString();

  if (!queryString && !fragment) return null;

  return `${baseUrl}${queryString ? `?${queryString}` : ''}${
    fragment ? `#${fragment}` : ''
  }`;
}
