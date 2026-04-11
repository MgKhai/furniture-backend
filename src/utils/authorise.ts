export const authorise: any = (
  permissions: boolean,
  userRole: string,
  ...roles: string[]
) => {
  let grant = true;

  if (permissions && !roles.includes(userRole)) {
    grant = false;
  }

  if (!permissions && roles.includes(userRole)) {
    grant = false;
  }

  return grant;
};
