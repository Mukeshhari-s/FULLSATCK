export const saveReturnTo = (path) => {
  sessionStorage.setItem('returnTo', path);
};

export const getReturnTo = () => {
  const returnTo = sessionStorage.getItem('returnTo');
  sessionStorage.removeItem('returnTo'); // Clear it after getting it
  return returnTo || '/';
};
