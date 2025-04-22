export interface SuccessData<T> {
    data: T;
    statusCode: number;
}

export interface SuccessAction {
    statusCode: number;
    message: string;
}

export interface ErrorResponse extends SuccessAction {
    error: string;
}