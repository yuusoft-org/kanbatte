const createDebouncer = (delay) => {
  let timer = null;
  return (fn) => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };
};

export { createDebouncer };
