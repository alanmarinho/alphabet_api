import { Response } from 'express';

interface ISuccessActions {
  refresh?: boolean;
  logout?: boolean;
  validateEmail?: boolean;
}

interface ISuccessReturn {
  res: Response;
  msg: string;
  status: number;
  data?: any;
  actions?: ISuccessActions;
}

export function SuccessReturn({ res, msg, actions, data, status }: ISuccessReturn) {
  const successReturn = {
    status: status,
    msg: msg,
    ...(data && { data: data }),
    ...(actions && { actions: actions }),
  };
  res.status(status).json(successReturn);
}
