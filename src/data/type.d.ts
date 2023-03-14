type Command = {
  name: string,             // SECDATA
  params: string[]          // VAL1, VAL2, VAL3, . . . , VAL12
  detail: string,           // Retrieves a value and stores it as a scalar parameter or part of an array parameter.
  namespace?: string,       // APDL: Parameters
  options?: OptionItem,
};

type OptionItem = {
  index?: number,
  match?: string,
  detail?: string,
  options?: OptionItem[],
  next?: OptionItem,
  prev?: OptionItem | undefined,
};
